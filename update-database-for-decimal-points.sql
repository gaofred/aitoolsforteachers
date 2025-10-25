-- 修改数据库表结构支持小数点数
-- 在Supabase SQL编辑器中运行此脚本

-- 首先检查表结构
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name IN ('user_points', 'point_transactions', 'ai_generations', 'ai_tool_configs')
    AND column_name IN ('points', 'amount', 'points_cost', 'standard_cost', 'pro_cost')
ORDER BY table_name, column_name;

-- 1. 修改 user_points 表的 points 字段为 NUMERIC
ALTER TABLE public.user_points
ALTER COLUMN points TYPE NUMERIC(10,2) USING points::NUMERIC;

-- 2. 修改 point_transactions 表的 amount 字段为 NUMERIC
ALTER TABLE public.point_transactions
ALTER COLUMN amount TYPE NUMERIC(10,2) USING amount::NUMERIC;

-- 3. 修改 ai_generations 表的 points_cost 字段为 NUMERIC
ALTER TABLE public.ai_generations
ALTER COLUMN points_cost TYPE NUMERIC(10,2) USING points_cost::NUMERIC;

-- 4. 修改 ai_tool_configs 表的 standard_cost 字段为 NUMERIC
ALTER TABLE public.ai_tool_configs
ALTER COLUMN standard_cost TYPE NUMERIC(10,2) USING standard_cost::NUMERIC;

-- 5. 修改 ai_tool_configs 表的 pro_cost 字段为 NUMERIC
ALTER TABLE public.ai_tool_configs
ALTER COLUMN pro_cost TYPE NUMERIC(10,2) USING pro_cost::NUMERIC;

-- 6. 更新 add_user_points 函数以支持小数
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
    transaction_success BOOLEAN := FALSE;
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

-- 7. 更新 deduct_user_points 函数以支持小数
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

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'deduct_user_points error: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 更新 get_current_points 函数返回小数
CREATE OR REPLACE FUNCTION public.get_current_points(user_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    current_points NUMERIC;
BEGIN
    SELECT points INTO current_points
    FROM public.user_points
    WHERE user_id = user_uuid;

    RETURN COALESCE(current_points, 0::NUMERIC);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 授权执行
GRANT EXECUTE ON FUNCTION public.add_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_points TO authenticated;

-- 10. 验证修改结果
SELECT
    'Schema Updated' as status,
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name IN ('user_points', 'point_transactions', 'ai_generations', 'ai_tool_configs')
    AND column_name IN ('points', 'amount', 'points_cost', 'standard_cost', 'pro_cost')
ORDER BY table_name, column_name;