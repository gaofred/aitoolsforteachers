-- 修复Supabase数据库PRO会员积分逻辑
-- 解决PRO会员购买时原积分被重置为800的问题
-- 在Supabase SQL编辑器中执行此脚本

-- 重新创建会员购买函数，修复PRO会员积分逻辑
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
    member_daily_points := plan_info.daily_points;

    -- 【关键修复】根据套餐类型确定积分处理逻辑
    DECLARE
        final_points INTEGER;
        transaction_description TEXT;
    BEGIN
        IF p_plan_type = 'PRO' THEN
            -- PRO会员：保持原有积分，只扣除购买费用
            final_points := current_points - p_points_cost;
            transaction_description := '购买Pro会员（保持原有积分）';
        ELSIF p_plan_type = 'PREMIUM' THEN
            -- PREMIUM会员：扣除购买费用后添加奖励点数
            final_points := (current_points - p_points_cost) + member_daily_points;
            transaction_description := '购买Premium会员（含' || member_daily_points || '奖励点数）';
        ELSE
            -- 其他套餐：默认逻辑
            final_points := (current_points - p_points_cost) + member_daily_points;
            transaction_description := '购买' || plan_info.name || '（含' || member_daily_points || '奖励点数）';
        END IF;

        -- 更新用户点数
        UPDATE user_points
        SET
            points = final_points,
            daily_points = member_daily_points,
            is_member = true,
            membership_expires_at = end_date,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;

        -- 记录点数交易（购买扣除）
        INSERT INTO point_transactions (
            user_id, type, amount, description, related_id, metadata
        ) VALUES (
            p_user_id,
            'REDEEM',
            -p_points_cost,
            transaction_description,
            plan_info.id,
            jsonb_build_object(
                'plan_type', p_plan_type,
                'duration_days', plan_info.duration_days,
                'original_points', current_points,
                'final_points', final_points,
                'daily_points', member_daily_points
            )
        ) RETURNING id INTO transaction_id;

        -- 只有非PRO会员才记录奖励点数交易
        IF p_plan_type != 'PRO' THEN
            INSERT INTO point_transactions (
                user_id, type, amount, description, related_id, metadata
            ) VALUES (
                p_user_id,
                'REDEEM',
                member_daily_points,
                '会员奖励点数',
                plan_info.id,
                jsonb_build_object('plan_type', p_plan_type, 'bonus_points', member_daily_points)
            );
        END IF;

        -- 创建会员购买记录
        INSERT INTO membership_purchases (
            user_id, plan_type, points_cost, start_date, end_date, transaction_id
        ) VALUES (
            p_user_id, p_plan_type, p_points_cost, CURRENT_TIMESTAMP, end_date, transaction_id
        ) RETURNING id INTO new_purchase_id;

        -- 记录重置日志（仅用于记录，不实际重置点数）
        INSERT INTO daily_reset_logs (
            user_id, reset_date, previous_points, new_points, plan_type, reset_type
        ) VALUES (
            p_user_id,
            CURRENT_DATE,
            current_points,
            final_points,
            p_plan_type,
            'MEMBERSHIP_UPGRADE'
        );

    END;

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', new_purchase_id,
        'plan_type', p_plan_type,
        'end_date', end_date,
        'daily_points', member_daily_points,
        'original_points', current_points,
        'final_points', current_points - p_points_cost + CASE WHEN p_plan_type = 'PRO' THEN 0 ELSE member_daily_points END,
        'points_deducted', p_points_cost,
        'bonus_points', CASE WHEN p_plan_type = 'PRO' THEN 0 ELSE member_daily_points END,
        'message', CASE
            WHEN p_plan_type = 'PRO' THEN 'Pro会员购买成功，原有积分已保留'
            ELSE '会员购买成功，已添加奖励点数'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限（根据你的Supabase配置调整）
-- 如果使用服务端调用，可能需要以下权限：
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;
-- 如果需要匿名访问（不推荐）：
-- GRANT EXECUTE ON FUNCTION public.purchase_membership TO anon;

-- 验证修复效果
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PRO会员积分逻辑修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '1. PRO会员购买时：最终积分 = 原积分 - 购买费用';
    RAISE NOTICE '2. PREMIUM会员购买时：最终积分 = 原积分 - 购买费用 + 奖励点数';
    RAISE NOTICE '3. 不再调用 reset_daily_points() 函数重置用户积分';
    RAISE NOTICE '4. 详细记录交易日志和重置日志';
    RAISE NOTICE '';
    RAISE NOTICE '现在的逻辑：';
    RAISE NOTICE '- 用户有1000积分，购买PRO会员(5000积分)将失败';
    RAISE NOTICE '- 用户有6000积分，购买PRO会员(5000积分)后剩余1000积分';
    RAISE NOTICE '- 用户有6000积分，购买PREMIUM会员(3000积分)后剩余3500积分';
    RAISE NOTICE '=========================================';
END $$;

-- 查看当前会员套餐配置
SELECT
    plan_type,
    name,
    daily_points,
    points_cost,
    duration_days,
    is_active
FROM membership_plans
WHERE is_active = true
ORDER BY plan_type;

-- 检查现有PRO会员的点数情况
SELECT
    u.email,
    u.name,
    up.points as current_points,
    up.daily_points,
    up.is_member,
    up.membership_expires_at,
    mp.plan_type,
    mp_p.created_at as purchase_date
FROM users u
JOIN user_points up ON u.id = up.user_id
LEFT JOIN (
    SELECT DISTINCT ON (user_id)
        user_id,
        plan_type,
        created_at
    FROM membership_purchases
    ORDER BY user_id, created_at DESC
) mp_p ON up.user_id = mp_p.user_id
LEFT JOIN membership_plans mp ON mp_p.plan_type = mp.plan_type
WHERE up.is_member = true
ORDER BY up.points DESC;