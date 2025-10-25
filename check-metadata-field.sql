-- 检查ai_generations表结构并添加缺失的metadata字段
-- 在Supabase SQL编辑器中运行此脚本

-- 检查当前ai_generations表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ai_generations'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 添加metadata字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='ai_generations'
        AND column_name='metadata'
        AND table_schema='public'
    ) THEN
        ALTER TABLE public.ai_generations ADD COLUMN metadata JSONB;
        RAISE NOTICE '✅ 成功添加 ai_generations.metadata 字段';
    ELSE
        RAISE NOTICE '✅ ai_generations.metadata 字段已存在';
    END IF;
END $$;

-- 验证字段添加结果
SELECT
    'metadata_field_status' as check_type,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='ai_generations'
            AND column_name='metadata'
            AND table_schema='public'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as status;

-- 显示完整的ai_generations表结构
SELECT
    'final_table_structure' as info_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ai_generations'
    AND table_schema = 'public'
ORDER BY ordinal_position;