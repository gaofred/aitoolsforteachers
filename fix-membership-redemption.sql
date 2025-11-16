-- 修复会员兑换码功能
-- 支持积分叠加和有效期累加
-- 在Supabase SQL编辑器中执行此脚本

-- 重新创建兑换码函数，支持会员兑换
CREATE OR REPLACE FUNCTION public.redeem_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    redemption_record RECORD;
    user_points RECORD;
    current_membership RECORD;
    plan_info RECORD;
    result JSONB;
    message TEXT;
    transaction_id UUID;
    redemption_id UUID;
    current_points INTEGER;
    member_daily_points INTEGER;
    final_points INTEGER;
    new_end_date TIMESTAMP WITH TIME ZONE;
    previous_end_date TIMESTAMP WITH TIME ZONE;
    days_to_add INTEGER;
BEGIN
    -- 查找兑换码
    SELECT * INTO redemption_record
    FROM public.redemption_codes
    WHERE code = p_code AND is_used = FALSE;

    -- 检查兑换码是否存在
    IF NOT FOUND THEN
        result := jsonb_build_object(
            'success', false,
            'message', '兑换码不存在或已使用'
        );
        RETURN result;
    END IF;

    -- 检查是否已过期
    IF redemption_record.expires_at IS NOT NULL AND redemption_record.expires_at < NOW() THEN
        result := jsonb_build_object(
            'success', false,
            'message', '兑换码已过期'
        );
        RETURN result;
    END IF;

    -- 获取用户当前信息
    SELECT * INTO user_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        result := jsonb_build_object(
            'success', false,
            'message', '用户不存在'
        );
        RETURN result;
    END IF;

    current_points := COALESCE(user_points.points, 0);

    -- 根据类型处理兑换
    IF redemption_record.type = 'POINTS' THEN
        -- 增加点数
        INSERT INTO public.point_transactions (
            user_id, type, amount, description, related_id, metadata
        ) VALUES (
            p_user_id,
            'REDEEM',
            redemption_record.value,
            '兑换码兑换: ' || p_code,
            redemption_record.id::TEXT,
            jsonb_build_object('code', p_code, 'redemption_id', redemption_record.id)
        ) RETURNING id INTO transaction_id;

        -- 更新用户积分
        final_points := current_points + redemption_record.value;
        UPDATE public.user_points
        SET points = final_points,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        message := '兑换成功！获得 ' || redemption_record.value || ' 点数，当前积分: ' || final_points;

    ELSIF redemption_record.type = 'MEMBERSHIP_DAYS' THEN
        -- 处理会员天数兑换
        days_to_add := redemption_record.value;

        -- 检查当前会员状态
        SELECT
            up.membership_expires_at,
            up.is_member,
            up.daily_points
        INTO current_membership
        FROM public.user_points up
        WHERE up.user_id = p_user_id;

        -- 确定会员类型和每日积分
        IF days_to_add >= 365 THEN
            -- PRO会员（365天及以上）
            member_daily_points := 800;
        ELSIF days_to_add >= 90 THEN
            -- PREMIUM II会员（90-364天）
            member_daily_points := 500;
        ELSIF days_to_add >= 30 THEN
            -- PREMIUM I会员（30-89天）
            member_daily_points := 500;
        ELSE
            -- 默认为PREMIUM
            member_daily_points := 500;
        END IF;

        -- 处理有效期叠加
        previous_end_date := current_membership.membership_expires_at;

        IF current_membership.is_member = true
           AND previous_end_date IS NOT NULL
           AND previous_end_date > NOW() THEN
            -- 已有会员资格且未过期，在现有基础上累加时间
            new_end_date := previous_end_date + (days_to_add || ' days')::INTERVAL;
        ELSE
            -- 没有会员资格或已过期，从今天开始计算
            new_end_date := NOW() + (days_to_add || ' days')::INTERVAL;
        END IF;

        -- 处理积分叠加：PRO会员增加800积分，其他增加500积分
        final_points := current_points + member_daily_points;

        -- 更新用户积分和会员状态
        UPDATE public.user_points
        SET
            points = final_points,
            daily_points = member_daily_points,
            is_member = true,
            membership_expires_at = new_end_date,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        -- 记录交易
        INSERT INTO public.point_transactions (
            user_id, type, amount, description, related_id, metadata
        ) VALUES (
            p_user_id,
            'REDEEM',
            member_daily_points,
            '兑换码获得会员资格: ' || p_code,
            redemption_record.id::TEXT,
            jsonb_build_object(
                'code', p_code,
                'redemption_id', redemption_record.id,
                'membership_days', days_to_add,
                'daily_points', member_daily_points,
                'previous_end_date', previous_end_date,
                'new_end_date', new_end_date
            )
        ) RETURNING id INTO transaction_id;

        -- 创建会员兑换记录
        INSERT INTO public.membership_redemptions (
            redemption_code_id,
            user_id,
            membership_type,
            days_awarded,
            start_date,
            end_date,
            transaction_id
        ) VALUES (
            redemption_record.id,
            p_user_id,
            CASE
                WHEN member_daily_points >= 800 THEN 'PRO'
                WHEN member_daily_points >= 500 THEN 'PREMIUM'
                ELSE 'PREMIUM'
            END,
            days_to_add,
            NOW(),
            new_end_date,
            transaction_id
        ) RETURNING id INTO redemption_id;

        -- 记录日志
        INSERT INTO public.daily_reset_logs (
            user_id, reset_date, previous_points, new_points, plan_type, reset_type
        ) VALUES (
            p_user_id, CURRENT_DATE, current_points, final_points,
            CASE
                WHEN member_daily_points >= 800 THEN 'PRO'
                WHEN member_daily_points >= 500 THEN 'PREMIUM'
                ELSE 'PREMIUM'
            END,
            'MEMBERSHIP_UPGRADE'
        );

        message := '兑换成功！获得' || days_to_add || '天会员资格，增加' || member_daily_points || '积分，有效期至' ||
                   TO_CHAR(new_end_date, 'YYYY-MM-DD');

    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', '不支持的兑换码类型: ' || redemption_record.type
        );
        RETURN result;
    END IF;

    -- 更新兑换码状态为已使用
    UPDATE public.redemption_codes
    SET is_used = TRUE,
        used_by = p_user_id,
        used_at = NOW()
    WHERE id = redemption_record.id;

    -- 返回成功结果
    result := jsonb_build_object(
        'success', true,
        'message', message,
        'type', redemption_record.type,
        'value', redemption_record.value
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限
GRANT EXECUTE ON FUNCTION public.redeem_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_code TO anon;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '会员兑换码功能修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '1. 积分兑换码：直接增加积分';
    RAISE NOTICE '2. 会员兑换码：增加积分+会员天数';
    RAISE NOTICE '3. 支持重复兑换：积分和有效期叠加';
    RAISE NOTICE '4. 自动判断会员类型：根据天数确定PRO/PREMIUM';
    RAISE NOTICE '';
    RAISE NOTICE '兑换码逻辑：';
    RAISE NOTICE '- 365天及以上：PRO会员+800积分';
    RAISE NOTICE '- 90-364天：PREMIUM会员+500积分';
    RAISE NOTICE '- 30-89天：PREMIUM会员+500积分';
    RAISE NOTICE '=========================================';
END $$;