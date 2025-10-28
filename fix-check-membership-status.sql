-- ========================================
-- 修复 check_membership_status 函数
-- ========================================

-- 删除现有函数
DROP FUNCTION IF EXISTS check_membership_status(p_user_id UUID);

-- 重新创建函数（修复返回结构问题）
CREATE OR REPLACE FUNCTION check_membership_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    current_membership RECORD;
    days_left INTEGER;
    result JSONB;
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
        result := jsonb_build_object(
            'is_member', false,
            'plan_type', 'FREE',
            'daily_points', 25,
            'expires_at', NULL,
            'days_remaining', 0
        );
    ELSE
        result := jsonb_build_object(
            'is_member', true,
            'plan_type', current_membership.plan_type,
            'daily_points', current_membership.daily_points,
            'expires_at', current_membership.expires_at,
            'days_remaining', GREATEST(0, current_membership.days_remaining)
        );
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 测试函数
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'check_membership_status 函数修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '函数返回类型已修改为 JSONB';
    RAISE NOTICE '现在可以通过 API 调用测试函数功能';
    RAISE NOTICE '=========================================';
END $$;