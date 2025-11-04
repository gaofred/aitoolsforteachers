-- 只删除影响兑换的触发器，保留定时任务触发器
-- 在Supabase SQL编辑器中执行此脚本

-- 查看所有触发器
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 只删除与point_transactions表相关的触发器（这些会在兑换时被触发）
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        AND event_object_table IN ('point_transactions', 'membership_purchases', 'membership_redemptions')
    LOOP
        BEGIN
            EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name ||
                    ' ON ' || trigger_record.event_object_table || ' CASCADE';
            RAISE NOTICE '删除影响兑换的触发器: % ON %',
                     trigger_record.trigger_name,
                     trigger_record.event_object_table;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '删除触发器失败: %, 错误: %',
                     trigger_record.trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 保留user_points表的触发器，这些用于定时任务

-- 创建兑换码函数，避免触发交易表相关的触发器
CREATE OR REPLACE FUNCTION public.redeem_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    redemption_record RECORD;
    user_points RECORD;
    result JSONB;
    message TEXT;
    current_points INTEGER;
    member_daily_points INTEGER;
    final_points INTEGER;
    days_to_add INTEGER;
    new_end_date TIMESTAMP WITH TIME ZONE;
    previous_end_date TIMESTAMP WITH TIME ZONE;
    transaction_id UUID;
BEGIN
    -- 查找兑换码
    SELECT * INTO redemption_record
    FROM public.redemption_codes
    WHERE code = p_code AND is_used = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '兑换码不存在或已使用'
        );
    END IF;

    -- 检查是否过期
    IF redemption_record.expires_at IS NOT NULL AND redemption_record.expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '兑换码已过期'
        );
    END IF;

    -- 获取用户当前信息
    SELECT * INTO user_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '用户不存在'
        );
    END IF;

    current_points := COALESCE(user_points.points, 0);

    -- 根据兑换码类型处理
    IF redemption_record.type = 'POINTS' THEN
        -- 积分兑换码 - 直接更新，不记录交易避免触发器
        final_points := current_points + redemption_record.value;

        UPDATE public.user_points
        SET points = final_points,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        message := '兑换成功！获得 ' || redemption_record.value || ' 积分，当前积分: ' || final_points;

    ELSIF redemption_record.type = 'MEMBERSHIP_DAYS' THEN
        -- 会员兑换码 - 直接更新，不记录交易避免触发器
        days_to_add := redemption_record.value;

        -- 确定奖励积分
        IF days_to_add >= 365 THEN
            member_daily_points := 800;
        ELSIF days_to_add >= 30 THEN
            member_daily_points := 500;
        ELSE
            member_daily_points := 500;
        END IF;

        -- 计算最终积分
        final_points := current_points + member_daily_points;

        -- 计算新的到期时间
        previous_end_date := user_points.membership_expires_at;

        IF user_points.is_member = true
           AND previous_end_date IS NOT NULL
           AND previous_end_date > NOW() THEN
            new_end_date := previous_end_date + (days_to_add || ' days')::INTERVAL;
        ELSE
            new_end_date := NOW() + (days_to_add || ' days')::INTERVAL;
        END IF;

        -- 直接更新用户积分和会员状态（不记录交易，避免触发器）
        UPDATE public.user_points
        SET
            points = final_points,
            daily_points = member_daily_points,
            is_member = true,
            membership_expires_at = new_end_date,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        message := '兑换成功！积分从 ' || current_points || ' 增加到 ' || final_points ||
                 '（+' || member_daily_points || '），会员有效期至 ' || TO_CHAR(new_end_date, 'YYYY-MM-DD');

    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', '不支持的兑换码类型'
        );
    END IF;

    -- 标记兑换码为已使用
    UPDATE public.redemption_codes
    SET is_used = TRUE,
        used_by = p_user_id,
        used_at = NOW()
    WHERE id = redemption_record.id;

    -- 返回成功结果
    RETURN jsonb_build_object(
        'success', true,
        'message', message,
        'type', redemption_record.type,
        'value', redemption_record.value,
        'previous_points', current_points,
        'final_points', final_points,
        'daily_points', COALESCE(member_daily_points, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限
GRANT EXECUTE ON FUNCTION public.redeem_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_code TO anon;

-- 创建安全的每日重置函数
CREATE OR REPLACE FUNCTION reset_daily_points(p_user_id UUID, p_manual_reset BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    membership_info RECORD;
    current_points INTEGER;
    required_points INTEGER;
    final_points INTEGER;
    reset_type TEXT;
BEGIN
    -- 获取用户当前点数信息
    SELECT * INTO user_points
    FROM user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    current_points := COALESCE(user_points.points, 0);

    -- 检查是否需要重置（自动重置只在日期变化时进行）
    IF NOT p_manual_reset AND user_points.last_reset_date = CURRENT_DATE THEN
        RETURN jsonb_build_object('success', true, 'message', '今日已重置，无需重复操作');
    END IF;

    -- 获取会员信息
    required_points := COALESCE(user_points.daily_points, 25);
    reset_type := CASE WHEN p_manual_reset THEN 'MANUAL' ELSE 'DAILY' END;

    -- 核心逻辑：保底积分补充
    IF current_points >= required_points THEN
        -- 积分充足，保持不变
        final_points := current_points;
    ELSE
        -- 积分不足，补充到保底
        final_points := required_points;
    END IF;

    -- 更新用户积分
    UPDATE user_points
    SET
        points = final_points,
        last_reset_date = CURRENT_DATE,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    -- 记录重置日志
    INSERT INTO daily_reset_logs (
        user_id, reset_date, previous_points, new_points, plan_type, reset_type
    ) VALUES (
        p_user_id, CURRENT_DATE, current_points, final_points,
        CASE
            WHEN required_points >= 800 THEN 'PRO'
            WHEN required_points >= 500 THEN 'PREMIUM'
            ELSE 'FREE'
        END,
        reset_type
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_points', final_points,
        'previous_points', current_points,
        'required_points', required_points,
        'reset_type', reset_type,
        'message', CASE
            WHEN current_points >= required_points THEN '积分充足，保持不变'
            ELSE '积分不足，已补充到' || required_points || '积分'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限
GRANT EXECUTE ON FUNCTION public.reset_daily_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_points TO anon;

-- 创建批量重置函数（用于定时任务）
CREATE OR REPLACE FUNCTION reset_all_daily_points()
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
                (reset_result->>'required_points')::INTEGER as plan_type,
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

-- 创建权限
GRANT EXECUTE ON FUNCTION public.reset_all_daily_points TO authenticated;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '兑换码触发器修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '1. 删除了影响兑换的触发器';
    RAISE NOTICE '2. 保留了定时任务触发器';
    RAISE NOTICE '3. 兑换码现在只增加积分';
    RAISE NOTICE '4. 每日重置通过函数调用进行';
    RAISE NOTICE '';
    RAISE NOTICE '现在的逻辑：';
    RAISE NOTICE '- 兑换时：25积分 → 825积分（不触发重置）';
    RAISE NOTICE '- 每日定时任务：检查并补充保底积分';
    RAISE NOTICE '=========================================';
END $$;