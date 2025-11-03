-- 更新会员相关函数以支持新的套餐类型

-- 更新兑换函数中的默认值逻辑
CREATE OR REPLACE FUNCTION process_membership_redemption(
    p_user_id UUID,
    p_plan_type TEXT
) RETURNS JSONB AS $$
DECLARE
    plan_info RECORD;
    end_date TIMESTAMP WITH TIME ZONE;
    member_daily_points INTEGER;
BEGIN
    -- 获取套餐信息
    SELECT * INTO plan_info
    FROM membership_plans
    WHERE plan_type = p_plan_type
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '会员套餐不存在或已下架');
    END IF;

    -- 计算结束日期
    end_date := CURRENT_TIMESTAMP + (plan_info.duration_days || ' days')::INTERVAL;

    -- 获取每日点数
    member_daily_points := plan_info.daily_points;

    -- 更新用户会员状态
    UPDATE user_points
    SET
        points = points,
        daily_points = member_daily_points,
        is_member = true,
        membership_expires_at = end_date
    WHERE user_id = p_user_id;

    -- 记录会员购买
    INSERT INTO membership_purchases (
        user_id,
        plan_type,
        start_date,
        end_date,
        points_cost,
        is_active
    ) VALUES (
        p_user_id,
        p_plan_type,
        CURRENT_TIMESTAMP,
        end_date,
        0, -- 兑换码免费获取
        true
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', '会员兑换成功',
        'plan_type', p_plan_type,
        'daily_points', member_daily_points,
        'expires_at', end_date
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', '会员兑换失败: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 更新检查会员状态函数以支持新套餐
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
            NULL::TIMESTAMP WITH TIME ZONE as expires_at,
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

-- 验证函数
-- SELECT * FROM check_membership_status('your-user-id');