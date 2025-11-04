-- 最终PRO会员积分逻辑修复
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 删除危险的批量重置函数
DROP FUNCTION IF EXISTS public.reset_all_daily_points() CASCADE;

-- 2. 修复会员购买函数
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
    current_points INTEGER;
    member_daily_points INTEGER;
    final_points INTEGER;
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

    -- 核心逻辑：购买时添加奖励积分
    final_points := current_points + member_daily_points;

    -- 更新用户积分
    UPDATE user_points
    SET
        points = final_points,
        daily_points = member_daily_points,
        is_member = true,
        membership_expires_at = end_date,
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
            'final_points', final_points
        )
    ) RETURNING id INTO transaction_id;

    -- 创建购买记录
    INSERT INTO membership_purchases (
        user_id, plan_type, points_cost, start_date, end_date, transaction_id
    ) VALUES (
        p_user_id, p_plan_type, 0, CURRENT_TIMESTAMP, end_date, transaction_id
    ) RETURNING id INTO new_purchase_id;

    -- 记录日志
    INSERT INTO daily_reset_logs (
        user_id, reset_date, previous_points, new_points, plan_type, reset_type
    ) VALUES (
        p_user_id, CURRENT_DATE, current_points, final_points, p_plan_type, 'MEMBERSHIP_UPGRADE'
    );

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', new_purchase_id,
        'plan_type', p_plan_type,
        'original_points', current_points,
        'bonus_points', member_daily_points,
        'final_points', final_points,
        'message', '购买成功！积分从' || current_points || '变为' || final_points || '，每日保底' || member_daily_points || '积分'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 修复每日重置函数
CREATE OR REPLACE FUNCTION reset_daily_points(p_user_id UUID, p_manual_reset BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    membership_info RECORD;
    current_points INTEGER;
    required_points INTEGER;
    reset_type TEXT;
    final_points INTEGER;
    log_message TEXT;
BEGIN
    -- 获取用户当前点数信息
    SELECT * INTO user_points
    FROM user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    current_points := COALESCE(user_points.points, 0);

    -- 检查是否需要重置
    IF NOT p_manual_reset AND user_points.last_reset_date = CURRENT_DATE THEN
        RETURN jsonb_build_object('success', true, 'message', '今日已重置，无需重复操作');
    END IF;

    -- 获取会员信息
    SELECT * INTO membership_info
    FROM check_membership_status(p_user_id)
    LIMIT 1;

    required_points := membership_info.daily_points;
    reset_type := CASE WHEN p_manual_reset THEN 'MANUAL' ELSE 'DAILY' END;

    -- 核心逻辑：保底积分补充
    IF membership_info.is_member = true THEN
        -- 付费会员：保持至少每日保底积分
        IF current_points >= required_points THEN
            final_points := current_points;
            log_message := '积分充足，保持' || final_points || '积分（保底' || required_points || '）';
        ELSE
            final_points := required_points;
            log_message := '积分不足，补充到' || final_points || '积分（保底）';
        END IF;
    ELSE
        -- 免费用户：重置为25积分
        final_points := 25;
        log_message := '免费用户，重置为25积分';
    END IF;

    -- 更新用户积分
    UPDATE user_points
    SET
        points = final_points,
        daily_points = membership_info.daily_points,
        last_reset_date = CURRENT_DATE,
        is_member = membership_info.is_member,
        membership_expires_at = membership_info.expires_at,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    -- 记录重置日志
    INSERT INTO daily_reset_logs (
        user_id, reset_date, previous_points, new_points, plan_type, reset_type
    ) VALUES (
        p_user_id, CURRENT_DATE, current_points, final_points, membership_info.plan_type, reset_type
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_points', final_points,
        'plan_type', membership_info.plan_type,
        'is_member', membership_info.is_member,
        'previous_points', current_points,
        'required_points', required_points,
        'reset_type', reset_type,
        'message', log_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建安全的批量重置函数
CREATE OR REPLACE FUNCTION reset_all_daily_points_safe()
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
    -- 获取所有需要重置的用户
    FOR user_record IN
        SELECT user_id
        FROM user_points
        WHERE last_reset_date < CURRENT_DATE
        OR last_reset_date IS NULL
    LOOP
        BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建权限
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_daily_points_safe TO authenticated;

-- 6. 完成提示
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PRO会员积分逻辑修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复完成：';
    RAISE NOTICE 'PRO会员购买时：原积分 + 800积分';
    RAISE NOTICE 'PRO会员每天：保持至少800积分';
    RAISE NOTICE 'PREMIUM会员购买时：原积分 + 500积分';
    RAISE NOTICE 'PREMIUM会员每天：保持至少500积分';
    RAISE NOTICE '=========================================';
END $$;