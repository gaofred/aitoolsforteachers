-- 修正兑换码逻辑，与购买会员完全一致
-- PRO兑换：+800积分，每天保底800积分
-- PREMIUM兑换：+500积分，每天保底500积分
-- 在Supabase SQL编辑器中执行此脚本

-- 重新创建兑换码函数
CREATE OR REPLACE FUNCTION public.redeem_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    redemption_record RECORD;
    user_points RECORD;
    current_membership RECORD;
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
        -- 积分兑换码
        INSERT INTO public.point_transactions (
            user_id, type, amount, description, related_id, metadata
        ) VALUES (
            p_user_id,
            'REDEEM',
            redemption_record.value,
            '兑换码获得积分: ' || p_code,
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
        -- 会员兑换码 - 与购买会员逻辑完全一致
        days_to_add := redemption_record.value;

        -- 检查当前会员状态
        SELECT
            up.membership_expires_at,
            up.is_member,
            up.daily_points
        INTO current_membership
        FROM public.user_points up
        WHERE up.user_id = p_user_id;

        -- 确定会员类型和每日积分（与购买逻辑一致）
        IF days_to_add >= 365 THEN
            -- PRO会员
            member_daily_points := 800;
        ELSIF days_to_add >= 30 THEN
            -- PREMIUM会员
            member_daily_points := 500;
        ELSE
            -- 默认为PREMIUM
            member_daily_points := 500;
        END IF;

        -- 处理有效期叠加（与购买逻辑一致）
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

        -- 核心逻辑：兑换时添加奖励积分（与购买逻辑完全一致）
        final_points := current_points + member_daily_points;

        -- 更新用户积分和会员状态（与购买逻辑一致）
        UPDATE public.user_points
        SET
            points = final_points,  -- 积分叠加：当前积分 + 奖励积分
            daily_points = member_daily_points,  -- 设置每日保底积分
            is_member = true,
            membership_expires_at = new_end_date,
            last_updated = NOW()
        WHERE user_id = p_user_id;

        -- 记录交易（与购买逻辑一致）
        INSERT INTO public.point_transactions (
            user_id, type, amount, description, related_id, metadata
        ) VALUES (
            p_user_id,
            'REDEEM',
            member_daily_points,  -- 奖励积分
            '兑换码获得' ||
            CASE
                WHEN member_daily_points >= 800 THEN 'PRO会员'
                WHEN member_daily_points >= 500 THEN 'PREMIUM会员'
                ELSE 'PREMIUM会员'
            END || '资格，获得' || member_daily_points || '积分',
            redemption_record.id::TEXT,
            jsonb_build_object(
                'code', p_code,
                'redemption_id', redemption_record.id,
                'membership_days', days_to_add,
                'original_points', current_points,
                'bonus_points', member_daily_points,
                'final_points', final_points,
                'previous_end_date', previous_end_date,
                'new_end_date', new_end_date,
                'note', '兑换时积分增加' || member_daily_points || '，每日保底' || member_daily_points || '积分'
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

        message := '兑换成功！积分从' || current_points || '变为' || final_points || '，每日保底' || member_daily_points || '积分，有效期至' ||
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
    RAISE NOTICE '兑换码逻辑修正完成！与购买会员完全一致';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'PRO会员兑换码：';
    RAISE NOTICE '- 兑换时：300积分 → 1100积分（+800）';
    RAISE NOTICE '- 每天：保持至少800积分';
    RAISE NOTICE '  - 当前≥800积分：保持不变';
    RAISE NOTICE '  - 当前<800积分：补充到800积分';
    RAISE NOTICE '';
    RAISE NOTICE 'PREMIUM会员兑换码：';
    RAISE NOTICE '- 兑换时：300积分 → 800积分（+500）';
    RAISE NOTICE '- 每天：保持至少500积分';
    RAISE NOTICE '  - 当前≥500积分：保持不变';
    RAISE NOTICE '  - 当前<500积分：补充到500积分';
    RAISE NOTICE '=========================================';
END $$;