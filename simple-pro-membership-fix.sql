-- 简化版PRO会员积分修复
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

    -- 核心修复：保持用户原有积分不变
    UPDATE user_points
    SET
        points = current_points,  -- 积分完全保持不变
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
        0,
        '激活' || plan_info.name || '资格',
        plan_info.id,
        jsonb_build_object(
            'plan_type', p_plan_type,
            'original_points', current_points,
            'final_points', current_points
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
        p_user_id, CURRENT_DATE, current_points, current_points, p_plan_type, 'MEMBERSHIP_UPGRADE'
    );

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', new_purchase_id,
        'plan_type', p_plan_type,
        'original_points', current_points,
        'final_points', current_points,
        'message', plan_info.name || '激活成功，积分保持不变'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 修复每日重置函数 - 付费会员积分不被重置
CREATE OR REPLACE FUNCTION reset_daily_points(p_user_id UUID, p_manual_reset BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    membership_info RECORD;
    previous_points INTEGER;
BEGIN
    -- 获取用户当前点数信息
    SELECT * INTO user_points
    FROM user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    previous_points := user_points.points;

    -- 检查是否需要重置（自动重置只在日期变化时进行）
    IF NOT p_manual_reset AND user_points.last_reset_date = CURRENT_DATE THEN
        RETURN jsonb_build_object('success', true, 'message', '今日已重置，无需重复操作');
    END IF;

    -- 获取会员信息
    SELECT * INTO membership_info
    FROM check_membership_status(p_user_id)
    LIMIT 1;

    -- 关键修复：付费会员积分不被重置
    IF membership_info.is_member = true THEN
        -- 付费会员：积分保持不变，只更新状态
        UPDATE user_points
        SET
            points = points,  -- 积分保持不变
            daily_points = membership_info.daily_points,
            last_reset_date = CURRENT_DATE,
            is_member = membership_info.is_member,
            membership_expires_at = membership_info.expires_at,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;

        -- 记录日志
        INSERT INTO daily_reset_logs (
            user_id, reset_date, previous_points, new_points, plan_type, reset_type
        ) VALUES (
            p_user_id, CURRENT_DATE, previous_points, previous_points, membership_info.plan_type,
            CASE WHEN p_manual_reset THEN 'MANUAL' ELSE 'DAILY' END
        );

        RETURN jsonb_build_object(
            'success', true,
            'new_points', previous_points,
            'plan_type', membership_info.plan_type,
            'message', '付费会员积分保持不变'
        );
    ELSE
        -- 免费用户：重置为25积分
        UPDATE user_points
        SET
            points = 25,
            daily_points = 25,
            last_reset_date = CURRENT_DATE,
            is_member = false,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;

        -- 记录日志
        INSERT INTO daily_reset_logs (
            user_id, reset_date, previous_points, new_points, plan_type, reset_type
        ) VALUES (
            p_user_id, CURRENT_DATE, previous_points, 25, 'FREE',
            CASE WHEN p_manual_reset THEN 'MANUAL' ELSE 'DAILY' END
        );

        RETURN jsonb_build_object(
            'success', true,
            'new_points', 25,
            'plan_type', 'FREE',
            'message', '免费用户积分已重置为25'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建权限
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_points TO authenticated;

-- 5. 完成提示
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PRO会员积分修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '1. 删除了危险的批量重置函数';
    RAISE NOTICE '2. 会员购买保持原积分不变';
    RAISE NOTICE '3. 付费会员积分永不被重置';
    RAISE NOTICE '4. 只有免费用户重置为25积分';
    RAISE NOTICE '=========================================';
END $$;