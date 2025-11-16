-- 修复PRO会员充值逻辑 - 保持原有积分并叠加
-- 解决PRO会员充值时原积分被重置为800的问题

-- 删除现有函数并重新创建
DROP FUNCTION IF EXISTS public.purchase_membership CASCADE;

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
    final_points INTEGER;
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

    -- 【关键修复】根据套餐类型确定最终点数逻辑
    IF p_plan_type = 'PRO' THEN
        -- PRO会员：保持原有积分，只扣除购买费用，不添加奖励点数到余额
        final_points := current_points - p_points_cost;
    ELSIF p_plan_type = 'PREMIUM' THEN
        -- PREMIUM会员：扣除购买费用后添加奖励点数
        final_points := (current_points - p_points_cost) + member_bonus_points;
    ELSE
        -- 其他套餐：默认逻辑
        final_points := (current_points - p_points_cost) + member_bonus_points;
    END IF;

    -- 扣除购买点数
    UPDATE user_points
    SET points = final_points
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
        jsonb_build_object('plan_type', p_plan_type, 'duration_days', plan_info.duration_days, 'original_points', current_points)
    ) RETURNING id INTO transaction_id;

    -- 创建会员购买记录
    INSERT INTO membership_purchases (
        user_id, plan_type, points_cost, start_date, end_date, transaction_id
    ) VALUES (
        p_user_id, p_plan_type, p_points_cost, CURRENT_TIMESTAMP, end_date, transaction_id
    ) RETURNING id INTO new_purchase_id;

    -- 更新会员状态和每日点数
    UPDATE user_points
    SET
        daily_points = member_bonus_points,
        is_member = true,
        membership_expires_at = end_date,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    -- 只有非PRO会员才记录奖励点数交易
    IF p_plan_type != 'PRO' THEN
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
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', new_purchase_id,
        'plan_type', p_plan_type,
        'end_date', end_date,
        'daily_points', member_bonus_points,
        'bonus_points', CASE WHEN p_plan_type = 'PRO' THEN 0 ELSE member_bonus_points END,
        'original_points', current_points,
        'final_points', final_points,
        'points_deducted', p_points_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建必要的权限
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_membership TO anon;

-- 验证修复效果
-- 查看当前会员套餐配置
SELECT plan_type, name, daily_points, points_cost, duration_days, is_active
FROM membership_plans
WHERE is_active = true
ORDER BY plan_type;

-- 查看现有PRO会员的点数情况
SELECT
    u.email,
    u.name,
    up.points as current_points,
    up.daily_points,
    up.is_member,
    up.membership_expires_at,
    mp.plan_type
FROM users u
JOIN user_points up ON u.id = up.user_id
LEFT JOIN (
    SELECT DISTINCT ON (user_id) user_id, plan_type
    FROM membership_purchases
    ORDER BY user_id, created_at DESC
) mp ON up.user_id = mp.user_id
WHERE up.is_member = true AND mp.plan_type = 'PRO'
ORDER BY up.points DESC;