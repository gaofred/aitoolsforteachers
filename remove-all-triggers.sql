-- 删除所有可能的自动重置触发器
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

-- 删除所有触发器
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    LOOP
        BEGIN
            EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name ||
                    ' ON ' || trigger_record.event_object_table || ' CASCADE';
            RAISE NOTICE '删除触发器: % ON %',
                     trigger_record.trigger_name,
                     trigger_record.event_object_table;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '删除触发器失败: %, 错误: %',
                     trigger_record.trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 验证所有触发器已删除
SELECT COUNT(*) as remaining_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 创建最终版的兑换码函数（不依赖任何触发器）
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

        -- 只增加积分，不做任何重置操作
        final_points := current_points + member_daily_points;

        -- 计算新的到期时间
        DECLARE
            previous_end_date TIMESTAMP WITH TIME ZONE;
        BEGIN
            previous_end_date := user_points.membership_expires_at;

            IF user_points.is_member = true
               AND previous_end_date IS NOT NULL
               AND previous_end_date > NOW() THEN
                new_end_date := previous_end_date + (days_to_add || ' days')::INTERVAL;
            ELSE
                new_end_date := NOW() + (days_to_add || ' days')::INTERVAL;
            END IF;
        END;

        -- 直接更新所有字段，不依赖任何触发器
        UPDATE public.user_points
        SET
            points = final_points,
            daily_points = member_daily_points,
            is_member = true,
            membership_expires_at = new_end_date,
            last_reset_date = CURRENT_DATE,
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
        'final_points', final_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限
GRANT EXECUTE ON FUNCTION public.redeem_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_code TO anon;

-- 创建手动每日重置函数（不依赖触发器）
CREATE OR REPLACE FUNCTION manual_daily_reset(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_points RECORD;
    current_points INTEGER;
    required_points INTEGER;
    new_points INTEGER;
BEGIN
    -- 获取用户信息
    SELECT * INTO user_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    current_points := COALESCE(user_points.points, 0);
    required_points := COALESCE(user_points.daily_points, 25);

    -- 检查是否需要重置
    IF user_points.last_reset_date = CURRENT_DATE THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', '今日已重置',
            'current_points', current_points
        );
    END IF;

    -- 执行保底重置逻辑
    IF current_points >= required_points THEN
        -- 积分充足，保持不变
        new_points := current_points;
    ELSE
        -- 积分不足，补充到保底
        new_points := required_points;
    END IF;

    -- 更新用户积分
    UPDATE public.user_points
    SET
        points = new_points,
        last_reset_date = CURRENT_DATE,
        last_updated = NOW()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', '重置完成',
        'previous_points', current_points,
        'new_points', new_points,
        'required_points', required_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建权限
GRANT EXECUTE ON FUNCTION public.manual_daily_reset TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_daily_reset TO anon;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE '所有触发器已删除！';
    RAISE NOTICE '兑换码现在只会增加积分！';
    RAISE NOTICE '请使用手动重置函数: manual_daily_reset(user_id)';
    RAISE NOTICE '=========================================';
END $$;