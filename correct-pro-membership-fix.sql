-- 正确的PRO会员积分逻辑修复
- PRO会员购买时：保持原积分不变
- PRO会员每日重置：重置为800积分（正常逻辑）
- 在Supabase SQL编辑器中执行此脚本

-- 1. 删除危险的批量重置函数
DROP FUNCTION IF EXISTS public.reset_all_daily_points() CASCADE;

-- 2. 修复会员购买函数 - 购买时保持原积分不变
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

    -- 核心修复：购买时保持用户原有积分不变，但设置每日重置额度
    UPDATE user_points
    SET
        points = current_points,  -- 购买时积分保持不变！
        daily_points = member_daily_points,  -- 设置每日重置额度
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
            'daily_points', member_daily_points,
            'note', '购买时积分保持不变，每日重置为' || member_daily_points || '积分'
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
        'daily_points', member_daily_points,
        'message', plan_info.name || '激活成功！积分保持不变，每日重置为' || member_daily_points || '积分'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 修复每日重置函数 - 正常的重置逻辑
CREATE OR REPLACE FUNCTION reset_daily_points(p_user_id UUID, p_manual_reset BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    membership_info RECORD;
    previous_points INTEGER;
    new_points INTEGER;
    reset_type TEXT;
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

    -- 确定重置积分
    new_points := membership_info.daily_points;
    reset_type := CASE WHEN p_manual_reset THEN 'MANUAL' ELSE 'DAILY' END;

    -- 更新用户积分（正常重置逻辑）
    UPDATE user_points
    SET
        points = new_points,  -- 重置为每日标准积分
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
        p_user_id, CURRENT_DATE, previous_points, new_points, membership_info.plan_type, reset_type
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_points', new_points,
        'plan_type', membership_info.plan_type,
        'is_member', membership_info.is_member,
        'previous_points', previous_points,
        'reset_type', reset_type,
        'message', '积分已重置为' || new_points || '（' || membership_info.plan_type || '）'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建安全的批量重置函数（只重置需要重置的用户）
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
    -- 获取所有需要重置的用户（今天没有重置过的）
    FOR user_record IN
        SELECT user_id
        FROM user_points
        WHERE last_reset_date < CURRENT_DATE
        OR last_reset_date IS NULL
    LOOP
        BEGIN
            -- 执行安全的重置
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

-- 5. 更新cron任务，使用安全的批量重置函数
-- 注意：需要更新 src/app/api/cron/daily-points-reset/route.ts 文件
-- 将 reset_all_daily_points 改为 reset_all_daily_points_safe

-- 6. 创建权限
GRANT EXECUTE ON FUNCTION public.purchase_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_daily_points_safe TO authenticated;

-- 7. 完成提示
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '正确的PRO会员积分逻辑修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '1. PRO会员购买时：保持原积分不变';
    RAISE NOTICE '2. PRO会员每日重置：重置为800积分（正常）';
    RAISE NOTICE '3. PREMIUM会员每日重置：重置为500积分';
    RAISE NOTICE '4. 免费用户每日重置：重置为25积分';
    RAISE NOTICE '5. 删除了危险的批量重置函数';
    RAISE NOTICE '6. 创建了安全的批量重置函数';
    RAISE NOTICE '';
    RAISE NOTICE '现在的逻辑：';
    RAISE NOTICE '- 用户有1000积分，购买PRO会员 → 仍保持1000积分';
    RAISE NOTICE '- 第二天自动重置 → 重置为800积分';
    RAISE NOTICE '- 第三天自动重置 → 重置为800积分';
    RAISE NOTICE '=========================================';
END $$;

-- 8. 查看当前会员状态
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
    END as member_type
FROM users u
JOIN user_points up ON u.id = up.user_id
WHERE up.is_member = true
ORDER BY up.points DESC
LIMIT 10;