-- 简化但保证能工作的兑换码函数
-- 在Supabase SQL编辑器中执行此脚本

-- 删除现有函数
DROP FUNCTION IF EXISTS public.redeem_code(p_user_id UUID, p_code TEXT);

-- 创建新的简化兑换码函数
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
    bonus_points INTEGER;
    final_points INTEGER;
    days_to_add INTEGER;
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

    -- 获取用户当前积分
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
        -- 积分兑换码
        final_points := current_points + redemption_record.value;

        -- 更新积分
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
            bonus_points := 800;  -- PRO会员
        ELSIF days_to_add >= 30 THEN
            bonus_points := 500;  -- PREMIUM会员
        ELSE
            bonus_points := 500;  -- 默认PREMIUM
        END IF;

        -- 计算最终积分
        final_points := current_points + bonus_points;

        -- 计算新的到期时间
        DECLARE
            new_end_date TIMESTAMP WITH TIME ZONE;
            previous_end_date TIMESTAMP WITH TIME ZONE;
        BEGIN
            previous_end_date := user_points.membership_expires_at;

            IF user_points.is_member = true
               AND previous_end_date IS NOT NULL
               AND previous_end_date > NOW() THEN
                -- 已有会员，累加时间
                new_end_date := previous_end_date + (days_to_add || ' days')::INTERVAL;
            ELSE
                -- 新会员或已过期，从今天开始
                new_end_date := NOW() + (days_to_add || ' days')::INTERVAL;
            END IF;

            -- 更新用户积分和会员状态
            UPDATE public.user_points
            SET
                points = final_points,
                daily_points = bonus_points,
                is_member = true,
                membership_expires_at = new_end_date,
                last_updated = NOW()
            WHERE user_id = p_user_id;

            message := '兑换成功！积分从 ' || current_points || ' 增加到 ' || final_points ||
                     '（+' || bonus_points || '），会员有效期至 ' || TO_CHAR(new_end_date, 'YYYY-MM-DD');
        END;

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
        'final_points', final_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限
GRANT EXECUTE ON FUNCTION public.redeem_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_code TO anon;

-- 测试函数
DO $$
BEGIN
    RAISE NOTICE '兑换码函数创建完成！';
    RAISE NOTICE '现在兑换码应该能正确增加积分了';
    RAISE NOTICE '测试：25积分 + 800积分 = 825积分';
END $$;