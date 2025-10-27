-- ========================================
-- 详细检查邀请相关表
-- ========================================

-- 1. 检查所有表
SELECT '=== 所有数据库表 ===' as info;
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 检查所有视图
SELECT '=== 所有数据库视图 ===' as info;
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 3. 搜索包含"invite"的表名
SELECT '=== 包含invite的表 ===' as info;
SELECT
    tablename,
    'table' as type
FROM pg_tables
WHERE schemaname = 'public'
    AND (tablename LIKE '%invite%' OR tablename LIKE '%milestone%')
UNION ALL
SELECT
    viewname as tablename,
    'view' as type
FROM pg_views
WHERE schemaname = 'public'
    AND (viewname LIKE '%invite%' OR viewname LIKE '%milestone%');

-- 4. 检查表结构
SELECT '=== invitation_codes表结构 ===' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'invitation_codes'
    AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== invitations表结构 ===' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'invitations'
    AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== invitation_rewards表结构 ===' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'invitation_rewards'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. 检查是否有milestones相关的表
SELECT '=== milestones相关表 ===' as info;
SELECT
    tablename,
    'exists' as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename LIKE '%milestone%';

-- 6. 检查是否有用户积分相关表
SELECT '=== 用户积分相关表 ===' as info;
SELECT
    tablename,
    'exists' as status
FROM pg_tables
WHERE schemaname = 'public'
    AND (tablename LIKE '%point%' OR tablename LIKE '%user%');