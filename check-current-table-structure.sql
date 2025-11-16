-- 检查当前数据库表结构
-- 在Supabase SQL编辑器中运行此脚本

-- 检查所有相关表的字段名和类型
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_name IN ('user_points', 'point_transactions', 'ai_generations', 'ai_tool_configs')
    AND t.table_schema = 'public'
    AND c.column_name IN ('points', 'amount', 'points_cost', 'standard_cost', 'pro_cost')
ORDER BY t.table_name, c.ordinal_position;

-- 检查这些表是否存在
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name IN ('user_points', 'point_transactions', 'ai_generations', 'ai_tool_configs')
    AND table_schema = 'public'
ORDER BY table_name;