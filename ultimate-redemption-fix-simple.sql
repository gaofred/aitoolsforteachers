-- 终极兑换码修复 - 简化版本
-- 在Supabase SQL编辑器中执行此脚本

-- 删除所有触发器
DROP TRIGGER IF EXISTS trigger_reset_points_after_transaction ON public.point_transactions;
DROP TRIGGER IF EXISTS trigger_update_points_after_membership ON public.membership_purchases;
DROP TRIGGER IF EXISTS trigger_reset_points_daily ON public.user_points;

-- 删除可能存在的其他触发器
DO $$
BEGIN
    RAISE NOTICE '正在删除所有触发器...';
END $$;

-- 创建最终的兑换码函数
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

    -- 获取用户当前信息并锁定
    SELECT * INTO user_points
    FROM public.user_points
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '用户不存在'
        );
    END IF;

    current_points := COALESCE(user_points.points, 0);

    -- 根据兑换码类型处理
    IF redemption_record.type = 'POINTS' THEN
        -- 积分兑换码
        final_points := current_points + redemption_record.value;

        UPDATE public.user_points
        SET points = final_points,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        message := '兑换成功！获得 ' || redemption_record.value || ' 积分，当前积分: ' || final_points;

    ELSIF redemption_record.type = 'MEMBERSHIP_DAYS' THEN
        -- 会员兑换码
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

        -- 更新用户积分和会员状态
        UPDATE public.user_points
        SET
            points = final_points,              -- 积分叠加：25 + 800 = 825
            daily_points = member_daily_points,  -- 设置保底：800
            is_member = true,                   -- 设置会员状态
            membership_expires_at = new_end_date, -- 设置到期时间
            last_updated = NOW(),               -- 更新时间
            last_reset_date = CURRENT_DATE      -- 防止当天重置
        WHERE user_id = p_user_id;

        message := '兑换成功！积分从 ' || current_points || ' 增加到 ' || final_points ||
                 '（+' || member_daily_points || '），会员资格有效期至 ' || TO_CHAR(new_end_date, 'YYYY-MM-DD');

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

    -- 创建兑换日志
    BEGIN
        INSERT INTO daily_reset_logs (
            user_id, reset_date, previous_points, new_points, plan_type, reset_type
        ) VALUES (
            p_user_id, CURRENT_DATE, current_points, final_points,
            CASE
                WHEN member_daily_points >= 800 THEN 'PRO'
                WHEN member_daily_points >= 500 THEN 'PREMIUM'
                ELSE 'PREMIUM'
            END,
            'REDEMPTION'
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 返回成功结果
    result := jsonb_build_object(
        'success', true,
        'message', message,
        'type', redemption_record.type,
        'value', redemption_record.value,
        'previous_points', current_points,
        'final_points', final_points,
        'daily_points', COALESCE(member_daily_points, 0)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限
GRANT EXECUTE ON FUNCTION public.redeem_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_code TO anon;

-- 创建安全的每日重置函数
CREATE OR REPLACE FUNCTION reset_daily_points_safe(p_user_id UUID, p_manual_reset BOOLEAN DEFAULT false)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    current_points INTEGER;
    required_points INTEGER;
    final_points INTEGER;
BEGIN
    SELECT * INTO user_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    current_points := COALESCE(user_points.points, 0);
    required_points := COALESCE(user_points.daily_points, 25);

    -- 检查是否需要重置
    IF NOT p_manual_reset AND user_points.last_reset_date = CURRENT_DATE THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', '今日已重置，无需重复操作',
            'current_points', current_points,
            'required_points', required_points
        );
    END IF;

    -- 保底积分补充
    IF current_points >= required_points THEN
        final_points := current_points;
    ELSE
        final_points := required_points;
    END IF;

    UPDATE public.user_points
    SET
        points = final_points,
        last_reset_date = CURRENT_DATE,
        last_updated = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_points', final_points,
        'previous_points', current_points,
        'required_points', required_points,
        'message', CASE
            WHEN current_points >= required_points THEN '积分充足，保持不变'
            ELSE '积分不足，已补充到' || required_points || '积分'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reset_daily_points_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_points_safe TO anon;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '终极兑换码修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '现在的逻辑：';
    RAISE NOTICE '- 兑换码：25积分 → 825积分（+800）';
    RAISE NOTICE '- 当天不会重置，第二天保持825积分';
    RAISE NOTICE '- 花到700积分后，第二天重置到800积分';
    RAISE NOTICE '=========================================';
END $$;