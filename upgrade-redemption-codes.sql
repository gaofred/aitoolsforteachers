-- ========================================
-- 兑换码系统升级脚本 - 支持会员兑换
-- ========================================

-- 1. 修改 redemption_codes 表，支持会员兑换
ALTER TABLE redemption_codes
ADD COLUMN IF NOT EXISTS membership_type TEXT CHECK (membership_type IN ('PREMIUM', 'PRO')),
ADD COLUMN IF NOT EXISTS membership_days INTEGER DEFAULT 30;

-- 2. 更新现有兑换码类型检查约束
ALTER TABLE redemption_codes
DROP CONSTRAINT IF EXISTS redemption_codes_type_check;

ALTER TABLE redemption_codes
ADD CONSTRAINT redemption_codes_type_check
CHECK (type IN ('POINTS', 'MEMBERSHIP_DAYS', 'MEMBERSHIP'));

-- 3. 创建会员兑换使用记录表
CREATE TABLE IF NOT EXISTS membership_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  redemption_code_id UUID REFERENCES redemption_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('PREMIUM', 'PRO')),
  days_awarded INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  transaction_id UUID REFERENCES point_transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 更新兑换码类型枚举说明
COMMENT ON COLUMN redemption_codes.type IS '兑换码类型: POINTS(点数), MEMBERSHIP_DAYS(会员天数), MEMBERSHIP(会员套餐)';
COMMENT ON COLUMN redemption_codes.membership_type IS '会员类型，仅当type为MEMBERSHIP或MEMBERSHIP_DAYS时有效';
COMMENT ON COLUMN redemption_codes.membership_days IS '会员天数，仅当type为MEMBERSHIP_DAYS时有效';

-- 5. 创建会员兑换函数
CREATE OR REPLACE FUNCTION redeem_membership_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    code_record RECORD;
    user_record RECORD;
    end_date TIMESTAMP WITH TIME ZONE;
    transaction_id UUID;
    redemption_id UUID;
    plan_info RECORD;
BEGIN
    -- 查找兑换码
    SELECT * INTO code_record
    FROM redemption_codes
    WHERE code = p_code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '兑换码无效或已过期');
    END IF;

    -- 检查用户是否存在
    SELECT * INTO user_record
    FROM public.users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    -- 根据兑换码类型处理
    IF code_record.type = 'POINTS' THEN
        -- 点数兑换逻辑保持不变
        UPDATE user_points
        SET points = points + code_record.value
        WHERE user_id = p_user_id;

        -- 记录交易
        INSERT INTO point_transactions (
            user_id, type, amount, description, related_id
        ) VALUES (
            p_user_id, 'REDEEM', code_record.value,
            '兑换码兑换点数', code_record.id
        ) RETURNING id INTO transaction_id;

    ELSIF code_record.type = 'MEMBERSHIP_DAYS' THEN
        -- 会员天数兑换
        end_date := CURRENT_TIMESTAMP + (code_record.membership_days || ' days')::INTERVAL;

        -- 创建会员记录
        INSERT INTO membership_purchases (
            user_id, plan_type, points_cost, start_date, end_date, transaction_id
        ) VALUES (
            p_user_id, code_record.membership_type, 0, CURRENT_TIMESTAMP, end_date, NULL
        ) RETURNING id INTO redemption_id;

        -- 记录兑换
        INSERT INTO membership_redemptions (
            redemption_code_id, user_id, membership_type, days_awarded,
            start_date, end_date, transaction_id
        ) VALUES (
            code_record.id, p_user_id, code_record.membership_type,
            code_record.membership_days, CURRENT_TIMESTAMP, end_date, transaction_id
        ) RETURNING id INTO redemption_id;

        -- 立即重置点数
        PERFORM reset_daily_points(p_user_id, true);

    ELSIF code_record.type = 'MEMBERSHIP' THEN
        -- 完整会员套餐兑换
        SELECT * INTO plan_info
        FROM membership_plans
        WHERE plan_type = code_record.membership_type
        AND is_active = true;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', '会员套餐不存在或已下架');
        END IF;

        end_date := CURRENT_TIMESTAMP + (plan_info.duration_days || ' days')::INTERVAL;

        -- 创建会员记录
        INSERT INTO membership_purchases (
            user_id, plan_type, points_cost, start_date, end_date, transaction_id
        ) VALUES (
            p_user_id, plan_info.plan_type, 0, CURRENT_TIMESTAMP, end_date, NULL
        ) RETURNING id INTO redemption_id;

        -- 记录兑换
        INSERT INTO membership_redemptions (
            redemption_code_id, user_id, membership_type, days_awarded,
            start_date, end_date, transaction_id
        ) VALUES (
            code_record.id, p_user_id, plan_info.plan_type,
            plan_info.duration_days, CURRENT_TIMESTAMP, end_date, transaction_id
        ) RETURNING id INTO redemption_id;

        -- 立即重置点数
        PERFORM reset_daily_points(p_user_id, true);

    ELSE
        RETURN jsonb_build_object('success', false, 'error', '不支持的兑换码类型');
    END IF;

    -- 标记兑换码为已使用
    UPDATE redemption_codes
    SET is_used = true, used_by = p_user_id, used_at = CURRENT_TIMESTAMP
    WHERE id = code_record.id;

    -- 返回成功结果
    RETURN jsonb_build_object(
        'success', true,
        'type', code_record.type,
        'value', code_record.value,
        'membership_type', code_record.membership_type,
        'membership_days', code_record.membership_days,
        'redemption_id', redemption_id,
        'message', CASE
            WHEN code_record.type = 'POINTS' THEN '点数兑换成功'
            WHEN code_record.type IN ('MEMBERSHIP_DAYS', 'MEMBERSHIP') THEN '会员兑换成功'
            ELSE '兑换成功'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', '兑换失败: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_redemption_codes_type ON redemption_codes(type);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_membership_type ON redemption_codes(membership_type);
CREATE INDEX IF NOT EXISTS idx_membership_redemptions_user_id ON membership_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_redemptions_redemption_code_id ON membership_redemptions(redemption_code_id);

-- 7. 插入一些示例会员兑换码（可选）
INSERT INTO redemption_codes (code, type, membership_type, membership_days, description, value) VALUES
('MEMBER30PREMIUM', 'MEMBERSHIP_DAYS', 'PREMIUM', 30, 'Premium会员30天体验卡', 0),
('MEMBER30PRO', 'MEMBERSHIP_DAYS', 'PRO', 30, 'Pro会员30天体验卡', 0),
('MEMBER90PREMIUM', 'MEMBERSHIP_DAYS', 'PREMIUM', 90, 'Premium会员90天体验卡', 0)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 升级完成提示
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '兑换码系统升级完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '新增功能：';
    RAISE NOTICE '- 支持会员天数兑换码 (MEMBERSHIP_DAYS)';
    RAISE NOTICE '- 支持会员套餐兑换码 (MEMBERSHIP)';
    RAISE NOTICE '- 新增会员兑换记录表 (membership_redemptions)';
    RAISE NOTICE '';
    RAISE NOTICE '兑换码类型说明：';
    RAISE NOTICE '- POINTS: 点数兑换码（原有功能）';
    RAISE NOTICE '- MEMBERSHIP_DAYS: 会员天数兑换码（新增）';
    RAISE NOTICE '- MEMBERSHIP: 会员套餐兑换码（新增）';
    RAISE NOTICE '';
    RAISE NOTICE '新增函数：';
    RAISE NOTICE '- redeem_membership_code() (统一兑换函数)';
    RAISE NOTICE '=========================================';
END $$;