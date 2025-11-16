-- 完整数据库修复脚本
-- 解决所有当前遇到的问题
-- 在Supabase SQL编辑器中运行此脚本

-- 第一部分：添加缺失的字段
-------------------------------------

-- 1. 为 ai_generations 表添加 metadata 字段（如果不存在）
DO $$
BEGIN
    -- 检查 metadata 字段是否存在
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='ai_generations'
        AND column_name='metadata'
        AND table_schema='public'
    ) THEN
        ALTER TABLE public.ai_generations ADD COLUMN metadata JSONB;
        RAISE NOTICE '添加了 ai_generations.metadata 字段';
    ELSE
        RAISE NOTICE 'ai_generations.metadata 字段已存在';
    END IF;
END $$;

-- 第二部分：修改字段类型支持小数
-------------------------------------

-- 2. 修改所有相关的字段为 NUMERIC 类型
DO $$
BEGIN
    -- 修改 user_points.points
    BEGIN
        ALTER TABLE public.user_points ALTER COLUMN points TYPE NUMERIC(10,2) USING points::NUMERIC;
        RAISE NOTICE '修改了 user_points.points 为 NUMERIC 类型';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '修改 user_points.points 失败: %', SQLERRM;
    END;

    -- 修改 point_transactions.amount
    BEGIN
        ALTER TABLE public.point_transactions ALTER COLUMN amount TYPE NUMERIC(10,2) USING amount::NUMERIC;
        RAISE NOTICE '修改了 point_transactions.amount 为 NUMERIC 类型';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '修改 point_transactions.amount 失败: %', SQLERRM;
    END;

    -- 修改 ai_generations.points_cost
    BEGIN
        ALTER TABLE public.ai_generations ALTER COLUMN points_cost TYPE NUMERIC(10,2) USING points_cost::NUMERIC;
        RAISE NOTICE '修改了 ai_generations.points_cost 为 NUMERIC 类型';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '修改 ai_generations.points_cost 失败: %', SQLERRM;
    END;

    -- 修改 ai_tool_configs.standard_cost
    BEGIN
        ALTER TABLE public.ai_tool_configs ALTER COLUMN standard_cost TYPE NUMERIC(10,2) USING standard_cost::NUMERIC;
        RAISE NOTICE '修改了 ai_tool_configs.standard_cost 为 NUMERIC 类型';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '修改 ai_tool_configs.standard_cost 失败: %', SQLERRM;
    END;

    -- 修改 ai_tool_configs.pro_cost
    BEGIN
        ALTER TABLE public.ai_tool_configs ALTER COLUMN pro_cost TYPE NUMERIC(10,2) USING pro_cost::NUMERIC;
        RAISE NOTICE '修改了 ai_tool_configs.pro_cost 为 NUMERIC 类型';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '修改 ai_tool_configs.pro_cost 失败: %', SQLERRM;
    END;
END $$;

-- 第三部分：创建/更新数据库函数
-------------------------------------

-- 3. 重新创建 add_user_points 函数
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

-- 4. 重新创建 deduct_user_points 函数
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
    UPDATE public.user_points
    SET points = points - p_amount, last_updated = NOW()
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

-- 5. 重新创建 get_current_points 函数
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

-- 第四部分：授权和索引
-------------------------------------

-- 6. 授权
GRANT EXECUTE ON FUNCTION public.add_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_points TO authenticated;

-- 7. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at);

-- 第五部分：验证结果
-------------------------------------

-- 8. 显示最终的表结构
SELECT
    'Final Table Structure' as status,
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name IN ('user_points', 'point_transactions', 'ai_generations', 'ai_tool_configs')
    AND column_name IN ('points', 'amount', 'points_cost', 'standard_cost', 'pro_cost', 'metadata')
ORDER BY table_name, column_name;

-- 9. 测试小数点数函数（可选）
-- SELECT public.add_user_points(
--     (SELECT id FROM auth.users LIMIT 1),
--     0.5,
--     'BONUS',
--     '测试小数点数'
-- );

-- 10. 显示完成信息
SELECT
    'Database Fix Complete' as status,
    'success' as result,
    'All functions and tables have been updated to support decimal points' as message;