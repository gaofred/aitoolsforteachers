-- ========================================
-- 会员系统数据库升级脚本
-- 在 Supabase SQL 编辑器中运行此脚本
-- ========================================

-- 1. 修改 user_points 表，添加会员相关字段
ALTER TABLE user_points
ADD COLUMN IF NOT EXISTS daily_points INTEGER DEFAULT 25,
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. 创建会员套餐表
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('PREMIUM', 'PRO')),
  name TEXT NOT NULL,
  daily_points INTEGER NOT NULL DEFAULT 500,
  points_cost INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  description TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建会员购买记录表
CREATE TABLE IF NOT EXISTS membership_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_id UUID REFERENCES point_transactions(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建每日重置日志表
CREATE TABLE IF NOT EXISTS daily_reset_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  reset_date DATE NOT NULL,
  previous_points INTEGER NOT NULL,
  new_points INTEGER NOT NULL,
  plan_type TEXT,
  reset_type TEXT DEFAULT 'DAILY' CHECK (reset_type IN ('DAILY', 'MANUAL', 'MEMBERSHIP_UPGRADE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 插入默认会员套餐
INSERT INTO membership_plans (plan_type, name, daily_points, points_cost, duration_days, description, features) VALUES
('PREMIUM', 'Premium会员', 500, 3000, 30, '享受500点数每日重置和更多特权',
 '{"daily_points": 500, "priority_support": true, "advanced_tools": true}'),
('PRO', 'Pro会员', 800, 5000, 30, '享受800点数每日重置和全部功能特权',
 '{"daily_points": 800, "priority_support": true, "advanced_tools": true, "beta_access": true}')
ON CONFLICT DO NOTHING;

-- 6. 创建会员状态检查函数
CREATE OR REPLACE FUNCTION check_membership_status(p_user_id UUID)
RETURNS TABLE(
  is_member BOOLEAN,
  plan_type TEXT,
  daily_points INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER
) AS $$
DECLARE
    current_membership RECORD;
    days_left INTEGER;
BEGIN
    -- 获取当前有效的会员信息
    SELECT
        mp.plan_type,
        mp.daily_points,
        mp_p.end_date as expires_at,
        EXTRACT(DAYS FROM (mp_p.end_date - CURRENT_TIMESTAMP))::INTEGER as days_remaining
    INTO current_membership
    FROM membership_purchases mp_p
    JOIN membership_plans mp ON mp_p.plan_type = mp.plan_type
    WHERE mp_p.user_id = p_user_id
    AND mp_p.is_active = true
    AND mp_p.end_date > CURRENT_TIMESTAMP
    ORDER BY mp_p.end_date DESC
    LIMIT 1;

    -- 如果没有有效会员，返回默认免费用户信息
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            false as is_member,
            'FREE' as plan_type,
            25 as daily_points,
            NULL as expires_at,
            0 as days_remaining;
    ELSE
        RETURN QUERY
        SELECT
            true as is_member,
            current_membership.plan_type,
            current_membership.daily_points,
            current_membership.expires_at,
            GREATEST(0, current_membership.days_remaining) as days_remaining;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建每日点数重置函数
CREATE OR REPLACE FUNCTION reset_daily_points(p_user_id UUID, p_manual_reset BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    membership_info RECORD;
    new_daily_points INTEGER;
    reset_type TEXT := 'DAILY';
    log_id UUID;
BEGIN
    -- 获取用户当前点数信息
    SELECT * INTO user_points
    FROM user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    -- 检查是否需要重置（自动重置只在日期变化时进行）
    IF NOT p_manual_reset AND user_points.last_reset_date = CURRENT_DATE THEN
        RETURN jsonb_build_object('success', true, 'message', '今日已重置，无需重复操作');
    END IF;

    -- 获取会员信息
    SELECT * INTO membership_info
    FROM check_membership_status(p_user_id)
    LIMIT 1;

    -- 设置新的每日点数
    new_daily_points := membership_info.daily_points;

    -- 更新用户点数
    UPDATE user_points
    SET
        points = new_daily_points,
        daily_points = new_daily_points,
        last_reset_date = CURRENT_DATE,
        is_member = membership_info.is_member,
        membership_expires_at = membership_info.expires_at
    WHERE user_id = p_user_id;

    -- 记录重置日志
    IF p_manual_reset THEN
        reset_type := 'MANUAL';
    END IF;

    INSERT INTO daily_reset_logs (
        user_id,
        reset_date,
        previous_points,
        new_points,
        plan_type,
        reset_type
    ) VALUES (
        p_user_id,
        CURRENT_DATE,
        user_points.points,
        new_daily_points,
        membership_info.plan_type,
        reset_type
    ) RETURNING id INTO log_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_points', new_daily_points,
        'plan_type', membership_info.plan_type,
        'is_member', membership_info.is_member,
        'log_id', log_id
    );
END;
$$ LANGUAGE plpgsql;

-- 8. 创建会员购买函数
CREATE OR REPLACE FUNCTION purchase_membership(
    p_user_id UUID,
    p_plan_type TEXT,
    p_points_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    plan_info RECORD;
    new_purchase_id UUID;
    transaction_id UUID;
    end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 检查用户点数
    SELECT * INTO user_points
    FROM user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    IF user_points.points < p_points_cost THEN
        RETURN jsonb_build_object('success', false, 'error', '点数不足');
    END IF;

    -- 获取套餐信息
    SELECT * INTO plan_info
    FROM membership_plans
    WHERE plan_type = p_plan_type AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '套餐不存在或已下架');
    END IF;

    -- 计算结束日期
    end_date := CURRENT_TIMESTAMP + (plan_info.duration_days || ' days')::INTERVAL;

    -- 扣除点数
    UPDATE user_points
    SET points = points - p_points_cost
    WHERE user_id = p_user_id;

    -- 记录点数交易
    INSERT INTO point_transactions (
        user_id, type, amount, description, related_id, metadata
    ) VALUES (
        p_user_id,
        'REDEEM',
        -p_points_cost,
        '购买' || plan_info.name,
        plan_info.id,
        jsonb_build_object('plan_type', p_plan_type, 'duration_days', plan_info.duration_days)
    ) RETURNING id INTO transaction_id;

    -- 创建会员购买记录
    INSERT INTO membership_purchases (
        user_id, plan_type, points_cost, start_date, end_date, transaction_id
    ) VALUES (
        p_user_id, p_plan_type, p_points_cost, CURRENT_TIMESTAMP, end_date, transaction_id
    ) RETURNING id INTO new_purchase_id;

    -- 立即重置点数为会员标准
    PERFORM reset_daily_points(p_user_id, true);

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', new_purchase_id,
        'plan_type', p_plan_type,
        'end_date', end_date,
        'daily_points', plan_info.daily_points
    );
END;
$$ LANGUAGE plpgsql;

-- 9. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_points_is_member ON user_points(is_member);
CREATE INDEX IF NOT EXISTS idx_user_points_last_reset_date ON user_points(last_reset_date);
CREATE INDEX IF NOT EXISTS idx_membership_purchases_user_id ON membership_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_purchases_end_date ON membership_purchases(end_date);
CREATE INDEX IF NOT EXISTS idx_daily_reset_logs_user_id ON daily_reset_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reset_logs_reset_date ON daily_reset_logs(reset_date);

-- 10. 更新数据库类型定义注释
COMMENT ON TABLE membership_plans IS '会员套餐配置表';
COMMENT ON TABLE membership_purchases IS '会员购买记录表';
COMMENT ON TABLE daily_reset_logs IS '每日重置日志表';

-- 11. 创建批量重置函数（管理员使用）
CREATE OR REPLACE FUNCTION reset_all_daily_points()
RETURNS TABLE(
    user_id UUID,
    success BOOLEAN,
    new_points INTEGER,
    plan_type TEXT,
    error_message TEXT
) AS $$
DECLARE
    user_record RECORD;
    reset_result JSONB;
BEGIN
    -- 获取所有用户
    FOR user_record IN SELECT user_id FROM user_points LOOP
        BEGIN
            -- 执行重置
            reset_result := reset_daily_points(user_record.user_id, false);

            RETURN QUERY
            SELECT
                user_record.user_id,
                (reset_result->>'success')::BOOLEAN as success,
                (reset_result->>'new_points')::INTEGER as new_points,
                reset_result->>'plan_type' as plan_type,
                reset_result->>'error' as error_message;

        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY
            SELECT
                user_record.user_id,
                false as success,
                0 as new_points,
                'ERROR' as plan_type,
                SQLERRM as error_message;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 12. 初始化现有用户的会员状态
UPDATE user_points
SET
    is_member = false,
    daily_points = 25,
    last_reset_date = CURRENT_DATE
WHERE is_member IS NULL OR daily_points IS NULL;

-- ========================================
-- 执行完成提示
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '会员系统数据库升级完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '已创建的新表：';
    RAISE NOTICE '- membership_plans (会员套餐表)';
    RAISE NOTICE '- membership_purchases (会员购买记录表)';
    RAISE NOTICE '- daily_reset_logs (每日重置日志表)';
    RAISE NOTICE '';
    RAISE NOTICE '已添加的新字段到 user_points 表：';
    RAISE NOTICE '- daily_points (每日点数)';
    RAISE NOTICE '- last_reset_date (最后重置日期)';
    RAISE NOTICE '- is_member (是否为会员)';
    RAISE NOTICE '- membership_expires_at (会员到期时间)';
    RAISE NOTICE '';
    RAISE NOTICE '已创建的函数：';
    RAISE NOTICE '- check_membership_status() (检查会员状态)';
    RAISE NOTICE '- reset_daily_points() (重置每日点数)';
    RAISE NOTICE '- purchase_membership() (购买会员)';
    RAISE NOTICE '- reset_all_daily_points() (批量重置)';
    RAISE NOTICE '';
    RAISE NOTICE '请确保更新相关的 TypeScript 类型定义文件！';
    RAISE NOTICE '=========================================';
END $$;