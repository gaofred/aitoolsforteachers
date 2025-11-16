-- 修复会员系统点数逻辑
-- 1. 修复会员购买函数，在原有基础上添加会员奖励点数
-- 2. 修复点数重置函数，购买会员时不重置而是叠加

-- 删除现有函数并重新创建
DROP FUNCTION IF EXISTS public.purchase_membership CASCADE;
DROP FUNCTION IF EXISTS public.reset_daily_points CASCADE;

-- 创建修复后的会员购买函数
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
    member_bonus_points INTEGER;
BEGIN
    -- 检查用户点数
    SELECT * INTO user_points
    FROM user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    -- 获取当前点数
    current_points := COALESCE(user_points.points, 0);

    IF current_points < p_points_cost THEN
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

    -- 计算会员奖励点数
    member_bonus_points := plan_info.daily_points;

    -- 扣除购买点数
    UPDATE user_points
    SET points = current_points - p_points_cost
    WHERE user_id = p_user_id;

    -- 记录点数交易（扣除）
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

    -- 在扣除后的点数基础上添加会员奖励点数
    UPDATE user_points
    SET
        points = (current_points - p_points_cost) + member_bonus_points,
        daily_points = member_bonus_points,
        is_member = true,
        membership_expires_at = end_date,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    -- 记录点数交易（奖励）
    INSERT INTO point_transactions (
        user_id, type, amount, description, related_id, metadata
    ) VALUES (
        p_user_id,
        'REDEEM',
        member_bonus_points,
        '会员购买获得奖励点数',
        plan_info.id,
        jsonb_build_object('plan_type', p_plan_type, 'bonus_points', member_bonus_points)
    );

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', new_purchase_id,
        'plan_type', p_plan_type,
        'end_date', end_date,
        'daily_points', member_bonus_points,
        'bonus_points', member_bonus_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建修复后的每日点数重置函数（仅用于每日重置，不用于会员购买）
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

    -- 保存原始点数用于日志
    previous_points := user_points.points;

    -- 检查是否需要重置（自动重置只在日期变化时进行）
    IF NOT p_manual_reset AND user_points.last_reset_date = CURRENT_DATE THEN
        RETURN jsonb_build_object('success', true, 'message', '今日已重置，无需重复操作');
    END IF;

    -- 获取会员信息
    SELECT * INTO membership_info
    FROM check_membership_status(p_user_id)
    LIMIT 1;

    -- 设置新的每日点数（注意：这里只用于每日自动重置，不用于会员购买）
    new_daily_points := membership_info.daily_points;

    -- 只有在每日重置时才重置点数，手动重置时也重置
    -- 注意：会员购买时不应该调用此函数来重置点数
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

-- 创建必要的权限
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_membership TO anon;
GRANT EXECUTE ON FUNCTION public.reset_daily_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_points TO anon;