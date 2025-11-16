-- 最终兑换码逻辑
-- 在Supabase SQL编辑器中执行此脚本

DROP FUNCTION IF EXISTS public.redeem_code(p_user_id UUID, p_code TEXT);

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
    SELECT * INTO redemption_record
    FROM public.redemption_codes
    WHERE code = p_code AND is_used = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '兑换码不存在或已使用'
        );
    END IF;

    IF redemption_record.expires_at IS NOT NULL AND redemption_record.expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '兑换码已过期'
        );
    END IF;

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

    IF redemption_record.type = 'POINTS' THEN
        final_points := current_points + redemption_record.value;

        UPDATE public.user_points
        SET points = final_points,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        message := '兑换成功！获得 ' || redemption_record.value || ' 积分，当前积分: ' || final_points;

    ELSIF redemption_record.type = 'MEMBERSHIP_DAYS' THEN
        days_to_add := redemption_record.value;

        IF days_to_add >= 365 THEN
            member_daily_points := 800;
        ELSIF days_to_add >= 30 THEN
            member_daily_points := 500;
        ELSE
            member_daily_points := 500;
        END IF;

        previous_end_date := user_points.membership_expires_at;

        IF user_points.is_member = true
           AND previous_end_date IS NOT NULL
           AND previous_end_date > NOW() THEN
            new_end_date := previous_end_date + (days_to_add || ' days')::INTERVAL;
        ELSE
            new_end_date := NOW() + (days_to_add || ' days')::INTERVAL;
        END IF;

        final_points := current_points + member_daily_points;

        UPDATE public.user_points
        SET
            points = final_points,
            daily_points = member_daily_points,
            is_member = true,
            membership_expires_at = new_end_date,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        message := '兑换成功！积分从 ' || current_points || ' 变为 ' || final_points ||
                 '（+' || member_daily_points || '），会员资格有效期至 ' || TO_CHAR(new_end_date, 'YYYY-MM-DD');

    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', '不支持的兑换码类型'
        );
    END IF;

    UPDATE public.redemption_codes
    SET is_used = TRUE,
        used_by = p_user_id,
        used_at = NOW()
    WHERE id = redemption_record.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', message,
        'type', redemption_record.type,
        'value', redemption_record.value,
        'previous_points', current_points,
        'final_points', final_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.redeem_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_code TO anon;

DO $$
BEGIN
    RAISE NOTICE '兑换码逻辑修复完成！';
    RAISE NOTICE 'PRO会员：+800积分，每天保底800积分';
    RAISE NOTICE 'PREMIUM会员：+500积分，每天保底500积分';
END $$;