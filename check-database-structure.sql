-- 检查Supabase数据库表结构
-- 在Supabase SQL编辑器中执行此脚本

-- 查看所有表
SELECT
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 查看user_points表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_points'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 查看users表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 查看point_transactions表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'point_transactions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 查看是否有membership相关的表
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%membership%' OR table_name LIKE '%member%')
ORDER BY table_name;