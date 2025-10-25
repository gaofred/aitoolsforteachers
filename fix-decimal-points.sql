-- 修复0.5点数小数格式问题
-- 在Supabase SQL编辑器中运行此脚本

-- 检查当前点数字段的类型
SELECT
    'current_decimal_fields' as check_type,
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    column_default
FROM information_schema.columns
WHERE table_name IN ('user_points', 'point_transactions', 'ai_generations')
    AND column_name IN ('points', 'amount', 'points_cost')
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 修复字段类型以支持小数
DO $$
BEGIN
    -- 修复 user_points.points
    BEGIN
        ALTER TABLE public.user_points
        ALTER COLUMN points TYPE NUMERIC(10,2) USING points::NUMERIC;
        RAISE NOTICE '✅ 修复 user_points.points 为 NUMERIC(10,2)';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '⚠️ user_points.points 修复失败或已存在: %', SQLERRM;
    END;

    -- 修复 point_transactions.amount
    BEGIN
        ALTER TABLE public.point_transactions
        ALTER COLUMN amount TYPE NUMERIC(10,2) USING amount::NUMERIC;
        RAISE NOTICE '✅ 修复 point_transactions.amount 为 NUMERIC(10,2)';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '⚠️ point_transactions.amount 修复失败或已存在: %', SQLERRM;
    END;

    -- 修复 ai_generations.points_cost
    BEGIN
        ALTER TABLE public.ai_generations
        ALTER COLUMN points_cost TYPE NUMERIC(10,2) USING points_cost::NUMERIC;
        RAISE NOTICE '✅ 修复 ai_generations.points_cost 为 NUMERIC(10,2)';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '⚠️ ai_generations.points_cost 修复失败或已存在: %', SQLERRM;
    END;
END $$;

-- 更新数据库函数以支持小数
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
        RAISE NOTICE 'add_user_points error: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新授权
GRANT EXECUTE ON FUNCTION public.add_user_points TO authenticated;

-- 验证修复结果
SELECT
    'final_verification' as check_type,
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name IN ('user_points', 'point_transactions', 'ai_generations')
    AND column_name IN ('points', 'amount', 'points_cost')
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 测试小数点数功能（可选，取消注释后执行）
-- SELECT public.add_user_points(
--     (SELECT id FROM auth.users LIMIT 1),
--     0.5,
--     'TEST',
--     '测试小数点数功能'
-- );

SELECT '✅ 小数点数修复完成！' as status;