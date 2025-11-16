-- 修复兑换功能相关的数据库函数
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 删除可能存在的旧版本函数
DROP FUNCTION IF EXISTS public.add_user_points CASCADE;
DROP FUNCTION IF EXISTS public.redeem_code CASCADE;

-- 2. 创建正确的 add_user_points 函数（支持UUID类型）
CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_description TEXT,
    p_related_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 增加点数（使用upsert）
    INSERT INTO public.user_points (user_id, points)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET
        points = public.user_points.points + p_amount,
        last_updated = NOW();

    -- 记录交易历史
    INSERT INTO public.point_transactions (
        user_id,
        type,
        amount,
        description,
        related_id,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        p_type,
        p_amount,
        p_description,
        p_related_id,
        p_metadata,
        NOW()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建正确的 redeem_code 函数（使用下划线命名匹配PostgreSQL）
CREATE OR REPLACE FUNCTION public.redeem_code(
    p_user_id UUID,
    p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    redemption_record RECORD;
    result JSONB;
    message TEXT;
BEGIN
    -- 查找兑换码（使用下划线命名：is_used, not isUsed）
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

    -- 更新兑换码状态为已使用（使用下划线命名，确保UUID类型匹配）
    UPDATE public.redemption_codes
    SET is_used = TRUE,
        used_by = p_user_id,
        used_at = NOW()
    WHERE id = redemption_record.id;

    -- 根据类型处理兑换（PostgreSQL枚举值）
    IF redemption_record.type = 'POINTS' THEN
        -- 增加点数
        PERFORM public.add_user_points(
            p_user_id,
            redemption_record.value,
            'REDEEM',
            '兑换码兑换: ' || p_code,
            redemption_record.id::TEXT,
            jsonb_build_object('code', p_code, 'redemption_id', redemption_record.id)
        );

        message := '兑换成功！获得 ' || redemption_record.value || ' 点数';

    ELSIF redemption_record.type = 'MEMBERSHIP_DAYS' THEN
        -- 增加会员天数
        -- 这里可以添加会员相关的逻辑
        message := '会员兑换功能暂未开放';

        result := jsonb_build_object(
            'success', false,
            'message', message
        );
        RETURN result;

    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', '不支持的兑换码类型: ' || redemption_record.type
        );
        RETURN result;
    END IF;

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

-- 4. 授权函数给认证用户和匿名用户
GRANT EXECUTE ON FUNCTION public.add_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_points TO anon;
GRANT EXECUTE ON FUNCTION public.redeem_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_code TO anon;

-- 5. 验证函数创建成功
SELECT
    'Functions Created Successfully' as status,
    routine_name as function_name,
    routine_type as type
FROM information_schema.routines
WHERE routine_name IN ('add_user_points', 'redeem_code')
    AND routine_schema = 'public'
ORDER BY routine_name;

-- 6. 测试函数
-- 测试 add_user_points 函数（需要替换为实际的用户ID）
-- SELECT public.add_user_points(
--     'your-user-id-here'::UUID,
--     100,
--     'TEST',
--     '测试增加点数',
--     NULL,
--     '{"test": true}'::JSONB
-- );

-- 测试 redeem_code 函数（需要先创建兑换码）
-- SELECT public.redeem_code(
--     'your-user-id-here'::UUID,
--     'TEST-CODE-123'
-- );