-- 调试点数记录问题
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 检查表是否存在
SELECT
    table_name,
    table_type,
    table_comment
FROM information_schema.tables
WHERE table_name IN ('point_transactions', 'user_points', 'users', 'auth.users')
    AND table_schema = 'public'
ORDER BY table_name;

-- 2. 检查 point_transactions 表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'point_transactions'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. 检查 user_points 表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_points'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. 查看所有 point_transactions 数据
SELECT
    id,
    user_id,
    type,
    amount,
    description,
    related_id,
    metadata,
    created_at,
    CASE
        WHEN metadata IS NOT NULL THEN 'has_metadata'
        ELSE 'no_metadata'
    END as metadata_status
FROM public.point_transactions
ORDER BY created_at DESC
LIMIT 10;

-- 5. 查看所有 user_points 数据
SELECT
    id,
    user_id,
    points,
    last_updated
FROM public.user_points
ORDER BY last_updated DESC
LIMIT 10;

-- 6. 检查 auth.users 表中的用户数量
SELECT COUNT(*) as total_users FROM auth.users;

-- 7. 如果有用户，查看一些用户ID
SELECT
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 8. 检查是否有交易记录，但用户ID不匹配的情况
SELECT
    pt.id,
    pt.user_id,
    pt.description,
    pt.amount,
    pt.created_at,
    CASE
        WHEN au.id IS NOT NULL THEN 'user_exists'
        ELSE 'user_missing'
    END as user_status
FROM public.point_transactions pt
LEFT JOIN auth.users au ON pt.user_id = au.id
ORDER BY pt.created_at DESC
LIMIT 10;

-- 9. 检查 RLS (Row Level Security) 策略
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('point_transactions', 'user_points')
ORDER BY tablename, policyname;

-- 10. 统计信息
SELECT
    'point_transactions_count' as metric,
    COUNT(*) as value
FROM public.point_transactions
UNION ALL
SELECT
    'user_points_count' as metric,
    COUNT(*) as value
FROM public.user_points
UNION ALL
SELECT
    'auth_users_count' as metric,
    COUNT(*) as value
FROM auth.users;