-- 创建完整的会员系统（如果不存在）
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 检查并升级user_points表，添加会员相关字段
DO $$
BEGIN
    -- 检查user_points表是否存在会员相关字段，如果没有则添加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_points'
        AND column_name = 'daily_points'
    ) THEN
        ALTER TABLE user_points ADD COLUMN daily_points INTEGER DEFAULT 25;
        RAISE NOTICE '添加字段：user_points.daily_points';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_points'
        AND column_name = 'last_reset_date'
    ) THEN
        ALTER TABLE user_points ADD COLUMN last_reset_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE '添加字段：user_points.last_reset_date';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_points'
        AND column_name = 'is_member'
    ) THEN
        ALTER TABLE user_points ADD COLUMN is_member BOOLEAN DEFAULT false;
        RAISE NOTICE '添加字段：user_points.is_member';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_points'
        AND column_name = 'membership_expires_at'
    ) THEN
        ALTER TABLE user_points ADD COLUMN membership_expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '添加字段：user_points.membership_expires_at';
    END IF;
END $$;

-- 2. 创建会员套餐表
CREATE TABLE IF NOT EXISTS membership_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('PREMIUM', 'PRO')),
    name TEXT NOT NULL,
    daily_points INTEGER NOT NULL DEFAULT 500,
    points_cost INTEGER NOT NULL,  -- 保留此字段供参考，但实际购买不消耗
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
    points_cost INTEGER NOT NULL,  -- 实际花费，现在应该为0
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
('PREMIUM', 'Premium会员', 500, 0, 30, '享受500点数每日重置和更多特权',
 '{"daily_points": 500, "priority_support": true, "advanced_tools": true}'),
('PRO', 'Pro会员', 800, 0, 30, '享受800点数每日重置和全部功能特权',
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
    -- 首先检查user_points表中的会员状态
    SELECT
        up.is_member,
        up.membership_expires_at,
        up.daily_points
    INTO current_membership
    FROM user_points up
    WHERE up.user_id = p_user_id;

    -- 如果没有找到用户信息，返回默认免费用户信息
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            false as is_member,
            'FREE' as plan_type,
            25 as daily_points,
            NULL as expires_at,
            0 as days_remaining;
        RETURN;
    END IF;

    -- 检查会员是否过期
    IF current_membership.is_member = false OR
       current_membership.membership_expires_at IS NULL OR
       current_membership.membership_expires_at <= CURRENT_TIMESTAMP THEN

        -- 会员已过期或不是会员，返回免费用户信息
        RETURN QUERY
        SELECT
            false as is_member,
            'FREE' as plan_type,
            25 as daily_points,
            NULL as expires_at,
            0 as days_remaining;
    ELSE
        -- 计算剩余天数
        days_left := EXTRACT(DAYS FROM (current_membership.membership_expires_at - CURRENT_TIMESTAMP))::INTEGER;

        -- 根据每日点数判断会员类型
        DECLARE
            member_plan TEXT := 'FREE';
        BEGIN
            IF current_membership.daily_points >= 800 THEN
                member_plan := 'PRO';
            ELSIF current_membership.daily_points >= 500 THEN
                member_plan := 'PREMIUM';
            END IF;

            RETURN QUERY
            SELECT
                true as is_member,
                member_plan as plan_type,
                current_membership.daily_points,
                current_membership.membership_expires_at,
                GREATEST(0, days_left) as days_remaining;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建会员购买函数（免费购买版本）
CREATE OR REPLACE FUNCTION purchase_membership(
    p_user_id UUID,
    p_plan_type TEXT,
    p_points_cost INTEGER  -- 保留参数但实际不使用
)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    plan_info RECORD;
    new_purchase_id UUID;
    transaction_id UUID;
    end_date TIMESTAMP WITH TIME ZONE;
    current_points INTEGER;
    member_daily_points INTEGER;
BEGIN
    -- 检查用户是否存在
    SELECT * INTO user_points
    FROM user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    -- 获取当前积分
    current_points := COALESCE(user_points.points, 0);

    -- 获取套餐信息
    SELECT * INTO plan_info
    FROM membership_plans
    WHERE plan_type = p_plan_type AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '套餐不存在或已下架');
    END IF;

    -- 计算结束日期
    end_date := CURRENT_TIMESTAMP + (plan_info.duration_days || ' days')::INTERVAL;
    member_daily_points := plan_info.daily_points;

    -- 保持用户原有积分不变，只更新会员状态
    UPDATE user_points
    SET
        points = current_points,  -- 保持原有积分不变！
        daily_points = member_daily_points,
        is_member = true,
        membership_expires_at = end_date,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    -- 记录交易（类型为EARN，表示获得会员资格，积分变化为0）
    INSERT INTO point_transactions (
        user_id, type, amount, description, related_id, metadata
    ) VALUES (
        p_user_id,
        'EARN',
        0,  -- 积分变化为0
        '激活' || plan_info.name || '资格',
        plan_info.id,
        jsonb_build_object(
            'plan_type', p_plan_type,
            'duration_days', plan_info.duration_days,
            'original_points', current_points,
            'daily_points', member_daily_points
        )
    ) RETURNING id INTO transaction_id;

    -- 创建会员购买记录
    INSERT INTO membership_purchases (
        user_id, plan_type, points_cost, start_date, end_date, transaction_id
    ) VALUES (
        p_user_id,
        p_plan_type,
        0,  -- 实际花费为0
        CURRENT_TIMESTAMP,
        end_date,
        transaction_id
    ) RETURNING id INTO new_purchase_id;

    -- 记录重置日志
    INSERT INTO daily_reset_logs (
        user_id, reset_date, previous_points, new_points, plan_type, reset_type
    ) VALUES (
        p_user_id,
        CURRENT_DATE,
        current_points,
        current_points,  -- 积分保持不变
        p_plan_type,
        'MEMBERSHIP_UPGRADE'
    );

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', new_purchase_id,
        'plan_type', p_plan_type,
        'end_date', end_date,
        'daily_points', member_daily_points,
        'original_points', current_points,
        'final_points', current_points,
        'message', plan_info.name || '激活成功，原有积分已保留'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 创建每日点数重置函数
CREATE OR REPLACE FUNCTION reset_daily_points(p_user_id UUID, p_manual_reset BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    membership_info RECORD;
    new_daily_points INTEGER;
    reset_type TEXT := 'DAILY';
    log_id UUID;
    previous_points INTEGER;
BEGIN
    -- 获取用户当前点数信息
    SELECT * INTO user_points
    FROM user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    -- 保存原始点数
    previous_points := user_points.points;

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
        membership_expires_at = membership_info.expires_at,
        last_updated = CURRENT_TIMESTAMP
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
        previous_points,
        new_daily_points,
        membership_info.plan_type,
        reset_type
    ) RETURNING id INTO log_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_points', new_daily_points,
        'plan_type', membership_info.plan_type,
        'is_member', membership_info.is_member,
        'log_id', log_id,
        'previous_points', previous_points,
        'reset_type', reset_type
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 创建权限
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_membership_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_points TO authenticated;

-- 10. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_points_is_member ON user_points(is_member);
CREATE INDEX IF NOT EXISTS idx_user_points_last_reset_date ON user_points(last_reset_date);
CREATE INDEX IF NOT EXISTS idx_membership_purchases_user_id ON membership_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_purchases_end_date ON membership_purchases(end_date);
CREATE INDEX IF NOT EXISTS idx_daily_reset_logs_user_id ON daily_reset_logs(user_id);

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '完整会员系统创建完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '已创建/更新的表：';
    RAISE NOTICE '- user_points (已添加会员字段)';
    RAISE NOTICE '- membership_plans (会员套餐表)';
    RAISE NOTICE '- membership_purchases (购买记录表)';
    RAISE NOTICE '- daily_reset_logs (重置日志表)';
    RAISE NOTICE '';
    RAISE NOTICE '已创建的函数：';
    RAISE NOTICE '- purchase_membership() (购买会员，免费)';
    RAISE NOTICE '- check_membership_status() (检查会员状态)';
    RAISE NOTICE '- reset_daily_points() (每日重置)';
    RAISE NOTICE '=========================================';
END $$;