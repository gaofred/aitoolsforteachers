-- 修复会员兑换码点数叠加逻辑
-- 在Supabase SQL编辑器中执行

-- 删除现有函数并重新创建
DROP FUNCTION IF EXISTS public.redeem_membership_code CASCADE;

-- 创建修复后的兑换函数
CREATE OR REPLACE FUNCTION public.redeem_membership_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    code_record RECORD;
    user_record RECORD;
    plan_info RECORD;
    end_date TIMESTAMP;
    redemption_id UUID;
    transaction_id UUID;
    current_points INTEGER;
    member_bonus_points INTEGER;
BEGIN
    -- 查找兑换码
    SELECT * INTO code_record
    FROM redemption_codes
    WHERE code = p_code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '兑换码无效或已过期');
    END IF;

    -- 检查用户是否存在
    SELECT * INTO user_record
    FROM public.users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '用户不存在');
    END IF;

    -- 获取用户当前点数
    SELECT points INTO current_points
    FROM user_points
    WHERE user_id = p_user_id;

    -- 如果用户没有点数记录，初始化为0
    IF current_points IS NULL THEN
        current_points := 0;
        INSERT INTO user_points (user_id, points, daily_points, is_member)
        VALUES (p_user_id, 0, 25, false);
    END IF;

    -- 根据兑换码类型处理
    IF code_record.type = 'POINTS' THEN
        -- 点数兑换逻辑保持不变
        UPDATE user_points
        SET points = points + code_record.value
        WHERE user_id = p_user_id;

        -- 记录交易
        INSERT INTO point_transactions (
            user_id, type, amount, description, related_id
        ) VALUES (
            p_user_id, 'REDEEM', code_record.value,
            '兑换码兑换点数', code_record.id
        ) RETURNING id INTO transaction_id;

    ELSIF code_record.type = 'MEMBERSHIP_DAYS' THEN
        -- 会员天数兑换
        end_date := CURRENT_TIMESTAMP + (code_record.membership_days || ' days')::INTERVAL;

        -- 计算会员奖励点数
        member_bonus_points := CASE
            WHEN code_record.membership_type = 'PREMIUM' THEN 500
            WHEN code_record.membership_type = 'PRO' THEN 800
            ELSE 25 -- 默认免费用户点数
        END;

        -- 创建会员记录
        INSERT INTO membership_purchases (
            user_id, plan_type, points_cost, start_date, end_date, transaction_id
        ) VALUES (
            p_user_id, code_record.membership_type, 0, CURRENT_TIMESTAMP, end_date, NULL
        ) RETURNING id INTO redemption_id;

        -- 记录兑换
        INSERT INTO membership_redemptions (
            redemption_code_id, user_id, membership_type, days_awarded,
            start_date, end_date, transaction_id
        ) VALUES (
            code_record.id, p_user_id, code_record.membership_type,
            code_record.membership_days, CURRENT_TIMESTAMP, end_date, transaction_id
        ) RETURNING id INTO redemption_id;

        -- 在原有点数基础上添加会员奖励点数，并设置会员状态
        UPDATE user_points
        SET
            points = current_points + member_bonus_points,
            daily_points = member_bonus_points,
            is_member = true,
            membership_expires_at = end_date,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;

        -- 记录点数交易
        INSERT INTO point_transactions (
            user_id, type, amount, description, related_id
        ) VALUES (
            p_user_id, 'REDEEM', member_bonus_points,
            '会员兑换获得奖励点数', code_record.id
        ) RETURNING id INTO transaction_id;

    ELSIF code_record.type = 'MEMBERSHIP' THEN
        -- 完整会员套餐兑换
        SELECT * INTO plan_info
        FROM membership_plans
        WHERE plan_type = code_record.membership_type
        AND is_active = true;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', '会员套餐不存在或已下架');
        END IF;

        end_date := CURRENT_TIMESTAMP + (plan_info.duration_days || ' days')::INTERVAL;

        -- 计算会员奖励点数（使用plan_info中的daily_points）
        member_bonus_points := plan_info.daily_points;

        -- 创建会员记录
        INSERT INTO membership_purchases (
            user_id, plan_type, points_cost, start_date, end_date, transaction_id
        ) VALUES (
            p_user_id, plan_info.plan_type, 0, CURRENT_TIMESTAMP, end_date, NULL
        ) RETURNING id INTO redemption_id;

        -- 记录兑换
        INSERT INTO membership_redemptions (
            redemption_code_id, user_id, membership_type, days_awarded,
            start_date, end_date, transaction_id
        ) VALUES (
            code_record.id, p_user_id, plan_info.plan_type,
            plan_info.duration_days, CURRENT_TIMESTAMP, end_date, transaction_id
        ) RETURNING id INTO redemption_id;

        -- 在原有点数基础上添加会员奖励点数，并设置会员状态
        UPDATE user_points
        SET
            points = current_points + member_bonus_points,
            daily_points = member_bonus_points,
            is_member = true,
            membership_expires_at = end_date,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id;

        -- 记录点数交易
        INSERT INTO point_transactions (
            user_id, type, amount, description, related_id
        ) VALUES (
            p_user_id, 'REDEEM', member_bonus_points,
            '会员套餐兑换获得奖励点数', code_record.id
        ) RETURNING id INTO transaction_id;

    ELSE
        RETURN jsonb_build_object('success', false, 'error', '不支持的兑换码类型');
    END IF;

    -- 标记兑换码为已使用
    UPDATE redemption_codes
    SET is_used = true, used_by = p_user_id, used_at = CURRENT_TIMESTAMP
    WHERE id = code_record.id;

    -- 返回成功结果
    RETURN jsonb_build_object(
        'success', true,
        'type', code_record.type,
        'value', code_record.value,
        'membership_type', code_record.membership_type,
        'membership_days', code_record.membership_days,
        'redemption_id', redemption_id,
        'message', CASE
            WHEN code_record.type = 'POINTS' THEN '点数兑换成功'
            WHEN code_record.type IN ('MEMBERSHIP_DAYS', 'MEMBERSHIP') THEN
                format('会员兑换成功！获得%s点奖励', member_bonus_points)
            ELSE '兑换成功'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', '兑换失败: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建必要的权限
GRANT EXECUTE ON FUNCTION public.redeem_membership_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_membership_code TO anon;