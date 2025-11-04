-- 修复Supabase数据库PRO会员积分逻辑（免费购买版本）
-- 解决PRO会员购买时原积分被重置为800的问题
-- 会员购买不消耗点数，只是激活会员资格
-- 在Supabase SQL编辑器中执行此脚本

-- 重新创建会员购买函数，修复PRO会员积分逻辑
CREATE OR REPLACE FUNCTION purchase_membership(
    p_user_id UUID,
    p_plan_type TEXT,
    p_points_cost INTEGER  -- 保留参数但不再使用，因为购买不消耗点数
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

    -- 【关键修复】不再检查点数是否足够，因为购买不消耗点数

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
        -- 保持原有积分不变！
        points = current_points,
        -- 只更新会员相关字段
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
        'EARN',  -- 使用EARN类型表示获得权益
        0,  -- 积分变化为0，因为不消耗积分
        '激活' || plan_info.name || '资格',
        plan_info.id,
        jsonb_build_object(
            'plan_type', p_plan_type,
            'duration_days', plan_info.duration_days,
            'original_points', current_points,
            'daily_points', member_daily_points,
            'points_cost', 0  -- 实际花费为0
        )
    ) RETURNING id INTO transaction_id;

    -- 创建会员购买记录（记录购买行为）
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

    -- 记录重置日志（仅用于记录会员状态变更）
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
        'points_deducted', 0,  -- 实际扣除为0
        'message', plan_info.name || '激活成功，原有积分已保留',
        'membership_info', jsonb_build_object(
            'daily_reset_points', member_daily_points,
            'duration_days', plan_info.duration_days,
            'expires_at', end_date
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限（根据你的Supabase配置调整）
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;

-- 验证修复效果
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PRO会员积分逻辑修复完成（免费购买版本）！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '1. 会员购买不再消耗积分';
    RAISE NOTICE '2. 用户原有积分完全保留';
    RAISE NOTICE '3. 只更新会员状态和每日重置额度';
    RAISE NOTICE '4. 记录详细的交易和状态变更日志';
    RAISE NOTICE '';
    RAISE NOTICE '现在的逻辑：';
    RAISE NOTICE '- 用户有1000积分，购买PRO会员 → 仍保持1000积分，获得每日800重置';
    RAISE NOTICE '- 用户有0积分，购买PRO会员 → 仍保持0积分，获得每日800重置';
    RAISE NOTICE '- 用户有任何积分，购买任何会员 → 积分保持不变';
    RAISE NOTICE '=========================================';
END $$;

-- 查看当前会员套餐配置
SELECT
    plan_type,
    name,
    daily_points,
    points_cost,  -- 这个字段现在仅供参考
    duration_days,
    is_active
FROM membership_plans
WHERE is_active = true
ORDER BY plan_type;