-- 修复重复购买会员问题
-- 在Supabase SQL编辑器中执行此脚本

-- 重新创建会员购买函数，处理重复购买
CREATE OR REPLACE FUNCTION purchase_membership(
    p_user_id UUID,
    p_plan_type TEXT,
    p_points_cost INTEGER
)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    plan_info RECORD;
    current_membership RECORD;
    new_purchase_id UUID;
    transaction_id UUID;
    new_end_date TIMESTAMP WITH TIME ZONE;
    current_points INTEGER;
    member_daily_points INTEGER;
    final_points INTEGER;
    previous_end_date TIMESTAMP WITH TIME ZONE;
    days_to_add INTEGER;
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

    member_daily_points := plan_info.daily_points;
    days_to_add := plan_info.duration_days;

    -- 检查当前会员状态
    SELECT
        up.membership_expires_at,
        up.is_member,
        up.daily_points
    INTO current_membership
    FROM user_points up
    WHERE up.user_id = p_user_id;

    -- 处理有效期叠加
    previous_end_date := current_membership.membership_expires_at;

    IF current_membership.is_member = true
       AND previous_end_date IS NOT NULL
       AND previous_end_date > CURRENT_TIMESTAMP THEN
        -- 已有会员资格且未过期，在现有基础上累加时间
        new_end_date := previous_end_date + (days_to_add || ' days')::INTERVAL;
    ELSE
        -- 没有会员资格或已过期，从今天开始计算
        new_end_date := CURRENT_TIMESTAMP + (days_to_add || ' days')::INTERVAL;
    END IF;

    -- 处理积分叠加：每次购买都增加对应的积分
    final_points := current_points + member_daily_points;

    -- 更新用户积分和会员状态
    UPDATE user_points
    SET
        points = final_points,
        daily_points = member_daily_points,
        is_member = true,
        membership_expires_at = new_end_date,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    -- 记录交易
    INSERT INTO point_transactions (
        user_id, type, amount, description, related_id, metadata
    ) VALUES (
        p_user_id,
        'EARN',
        member_daily_points,
        '购买' || plan_info.name || '获得' || member_daily_points || '积分',
        plan_info.id,
        jsonb_build_object(
            'plan_type', p_plan_type,
            'original_points', current_points,
            'bonus_points', member_daily_points,
            'final_points', final_points,
            'previous_end_date', previous_end_date,
            'new_end_date', new_end_date,
            'days_added', days_to_add,
            'is_renewal', CASE
                WHEN current_membership.is_member = true AND previous_end_date > CURRENT_TIMESTAMP
                THEN true
                ELSE false
            END
        )
    ) RETURNING id INTO transaction_id;

    -- 创建购买记录
    INSERT INTO membership_purchases (
        user_id, plan_type, points_cost, start_date, end_date, transaction_id
    ) VALUES (
        p_user_id, p_plan_type, 0, CURRENT_TIMESTAMP, new_end_date, transaction_id
    ) RETURNING id INTO new_purchase_id;

    -- 记录日志
    INSERT INTO daily_reset_logs (
        user_id, reset_date, previous_points, new_points, plan_type, reset_type
    ) VALUES (
        p_user_id, CURRENT_DATE, current_points, final_points, p_plan_type, 'MEMBERSHIP_UPGRADE'
    );

    -- 构建返回消息
    DECLARE
        message_text TEXT;
        days_extended INTEGER;
    BEGIN
        days_extended := EXTRACT(DAYS FROM (new_end_date - CURRENT_TIMESTAMP))::INTEGER;

        IF current_membership.is_member = true AND previous_end_date > CURRENT_TIMESTAMP THEN
            message_text := '续费成功！积分增加' || member_daily_points || '，有效期延长' || days_to_add || '天，总有效期至' ||
                           TO_CHAR(new_end_date, 'YYYY-MM-DD') || '（共' || days_extended || '天）';
        ELSE
            message_text := '购买成功！积分增加' || member_daily_points || '，有效期至' ||
                           TO_CHAR(new_end_date, 'YYYY-MM-DD') || '（共' || days_extended || '天）';
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'purchase_id', new_purchase_id,
            'plan_type', p_plan_type,
            'original_points', current_points,
            'bonus_points', member_daily_points,
            'final_points', final_points,
            'previous_end_date', previous_end_date,
            'new_end_date', new_end_date,
            'days_added', days_to_add,
            'total_days', days_extended,
            'is_renewal', CASE
                WHEN current_membership.is_member = true AND previous_end_date > CURRENT_TIMESTAMP
                THEN true
                ELSE false
            END,
            'message', message_text
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;

-- 验证修复效果
DO $$
BEGIN
    RAISE NOTICE '重复购买会员问题修复完成！';
    RAISE NOTICE '积分叠加：每次购买都增加对应积分';
    RAISE NOTICE '时间叠加：续费在现有基础上累加天数';
    RAISE NOTICE '=========================================';
END $$;