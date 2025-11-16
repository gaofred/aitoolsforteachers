-- 修复数据库函数权限
-- 在 Supabase SQL 编辑器中运行此脚本

-- ========================================
-- 1. 修复 add_user_points 函数
-- ========================================

CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id UUID,
    p_amount NUMERIC,
    p_type VARCHAR,
    p_description TEXT,
    p_related_id VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_points NUMERIC;
BEGIN
    -- 获取当前积分
    SELECT points INTO current_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    -- 如果没有找到记录，创建新记录
    IF current_points IS NULL THEN
        INSERT INTO public.user_points (user_id, points, last_updated)
        VALUES (p_user_id, GREATEST(p_amount, 0), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            points = GREATEST(public.user_points.points + p_amount, 0),
            last_updated = NOW()
        RETURNING points INTO current_points;
    ELSE
        -- 更新积分，确保不低于0
        UPDATE public.user_points
        SET points = GREATEST(points + p_amount, 0), last_updated = NOW()
        WHERE user_id = p_user_id
        RETURNING points INTO current_points;
    END IF;

    -- 记录交易
    INSERT INTO public.point_transactions (user_id, type, amount, description, related_id, metadata, created_at)
    VALUES (p_user_id, p_type, p_amount, p_description, p_related_id, p_metadata, NOW());

    -- 返回成功
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- 记录错误日志
        RAISE NOTICE 'add_user_points error: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权给认证用户
GRANT EXECUTE ON FUNCTION public.add_user_points TO authenticated;

-- ========================================
-- 2. 修复 deduct_user_points 函数
-- ========================================

CREATE OR REPLACE FUNCTION public.deduct_user_points(
    p_user_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_related_id VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_points NUMERIC;
    new_points NUMERIC;
BEGIN
    -- 获取当前积分
    SELECT points INTO current_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    -- 检查积分是否足够
    IF current_points IS NULL OR current_points < p_amount THEN
        RETURN FALSE;
    END IF;

    -- 扣除积分
    new_points := current_points - p_amount;

    UPDATE public.user_points
    SET points = new_points, last_updated = NOW()
    WHERE user_id = p_user_id;

    -- 记录交易（负数表示扣除）
    INSERT INTO public.point_transactions (user_id, type, amount, description, related_id, metadata, created_at)
    VALUES (p_user_id, 'GENERATE', -p_amount, p_description, p_related_id, p_metadata, NOW());

    -- 返回成功
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- 记录错误日志
        RAISE NOTICE 'deduct_user_points error: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权给认证用户
GRANT EXECUTE ON FUNCTION public.deduct_user_points TO authenticated;

-- ========================================
-- 3. 验证函数权限
-- ========================================

SELECT 
    proname as function_name,
    prosecdef as is_security_definer,
    proacl as permissions
FROM pg_proc
WHERE proname IN ('add_user_points', 'deduct_user_points')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

SELECT '✅ 数据库函数权限修复完成！' as status;

