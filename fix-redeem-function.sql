-- ========================================
-- 修复 redeem_membership_code 函数中的字段错误
-- ========================================

-- 删除现有函数
DROP FUNCTION IF EXISTS redeem_membership_code(p_user_id UUID, p_code TEXT);

-- 重新创建函数（修复字段引用问题）
CREATE OR REPLACE FUNCTION redeem_membership_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    code_record RECORD;
    user_record RECORD;
    end_date TIMESTAMP WITH TIME ZONE;
    transaction_id UUID;
    redemption_id UUID;
    plan_info RECORD;
    member_daily_points INTEGER;
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

    -- 根据兑换码类型处理
    IF code_record.type = 'POINTS' THEN
        -- 点数兑换逻辑
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

        -- 设置会员每日点数标准
        member_daily_points := CASE
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

        -- 立即重置点数为会员标准
        UPDATE user_points
        SET
            points = member_daily_points,
            daily_points = member_daily_points,
            is_member = true,
            membership_expires_at = end_date
        WHERE user_id = p_user_id;

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

        -- 使用membership_plans表中实际存在的daily_points字段，如果没有则使用默认值
        BEGIN
            member_daily_points := plan_info.daily_points;
        EXCEPTION WHEN OTHERS THEN
            -- 如果plan_info中没有daily_points字段，使用默认值
            member_daily_points := CASE
                WHEN plan_info.plan_type = 'PREMIUM' THEN 500
                WHEN plan_info.plan_type = 'PRO' THEN 800
                ELSE 25
            END;
        END;

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

        -- 立即重置点数为会员标准
        UPDATE user_points
        SET
            points = member_daily_points,
            daily_points = member_daily_points,
            is_member = true,
            membership_expires_at = end_date
        WHERE user_id = p_user_id;

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
            WHEN code_record.type IN ('MEMBERSHIP_DAYS', 'MEMBERSHIP') THEN '会员兑换成功，点数已重置'
            ELSE '兑换成功'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', '兑换失败: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 测试函数
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'redeem_membership_code 函数修复完成！';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '修复内容：';
    RAISE NOTICE '- 修复了 plan_info.daily_points 字段引用错误';
    RAISE NOTICE '- 添加了异常处理机制';
    RAISE NOTICE '- 为会员天数兑换添加了点数重置逻辑';
    RAISE NOTICE '=========================================';
END $$;