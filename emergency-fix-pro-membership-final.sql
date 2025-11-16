-- 紧急修复PRO会员积分问题
-- 完全停止所有自动重置功能，确保PRO会员积分保持不变
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 禁用所有自动重置函数
DROP FUNCTION IF EXISTS public.reset_all_daily_points() CASCADE;

-- 2. 重新创建会员购买函数，彻底修复PRO会员积分逻辑
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

    -- 【核心修复】保持用户原有积分不变，只更新会员状态
    UPDATE user_points
    SET
        points = current_points,  -- 原积分完全保持不变！
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
            'daily_points', member_daily_points,
            'points_kept', current_points  -- 明确记录保持的积分
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

    -- 记录重置日志（仅用于记录会员状态变更，积分不变）
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
        'final_points', current_points,  -- 积分保持不变
        'message', plan_info.name || '激活成功，原有积分完全保留',
        'important_note', 'PRO会员积分保持不变，不会被重置为800'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建安全的每日重置函数（仅用于免费用户，不重置付费会员）
CREATE OR REPLACE FUNCTION reset_daily_points_safe(p_user_id UUID, p_manual_reset BOOLEAN DEFAULT false)
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

    -- 【关键修复】只有免费用户才重置积分，付费会员保持积分不变
    IF membership_info.is_member = true THEN
        -- 付费会员：不重置积分，只更新状态
        UPDATE user_points
        SET
            points = points,  -- 积分保持不变！
            daily_points = membership_info.daily_points,
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
            user_id, reset_date, previous_points, new_points, plan_type, reset_type
        ) VALUES (
            p_user_id,
            CURRENT_DATE,
            previous_points,
            previous_points,  -- 积分保持不变
            membership_info.plan_type,
            reset_type
        ) RETURNING id INTO log_id;

        RETURN jsonb_build_object(
            'success', true,
            'new_points', previous_points,
            'plan_type', membership_info.plan_type,
            'is_member', membership_info.is_member,
            'log_id', log_id,
            'previous_points', previous_points,
            'reset_type', reset_type,
            'message', '付费会员积分保持不变'
        );
    ELSE
        -- 免费用户：正常重置为25积分
        new_daily_points := 25;

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
            user_id, reset_date, previous_points, new_points, plan_type, reset_type
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
            'reset_type', reset_type,
            'message', '免费用户积分已重置为25'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 删除原有的危险重置函数
DROP FUNCTION IF EXISTS public.reset_daily_points(UUID, BOOLEAN);

-- 5. 创建权限
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_points_safe TO authenticated;

-- 6. 验证修复效果
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PRO会员积分问题紧急修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '1. 删除了危险的 reset_all_daily_points() 函数';
    RAISE NOTICE '2. 重新创建 purchase_membership() 函数，确保积分保持不变';
    RAISE NOTICE '3. 创建安全的 reset_daily_points_safe() 函数';
    RAISE NOTICE '4. 付费会员积分永不被重置';
    RAISE NOTICE '5. 只有免费用户才会重置为25积分';
    RAISE NOTICE '';
    RAISE NOTICE '现在的逻辑：';
    RAISE NOTICE '- PRO会员购买：原积分保持不变，获得每日800重置资格';
    RAISE NOTICE '- PRO会员每日重置：积分保持不变，不会重置为800';
    RAISE NOTICE '- 免费用户每日重置：重置为25积分';
    RAISE NOTICE '=========================================';
END $$;

-- 7. 查看当前PRO会员的积分情况（用于验证）
SELECT
    u.email,
    up.points as current_points,
    up.daily_points,
    up.is_member,
    up.membership_expires_at,
    CASE
        WHEN up.is_member = true AND up.daily_points >= 800 THEN 'PRO会员'
        WHEN up.is_member = true AND up.daily_points >= 500 THEN 'PREMIUM会员'
        ELSE '免费用户'
    END as member_type,
    up.last_updated
FROM users u
JOIN user_points up ON u.id = up.user_id
WHERE up.is_member = true
ORDER BY up.points DESC
LIMIT 10;