-- 通用修复：为所有缺失业务数据的用户创建记录
-- 在Supabase SQL编辑器中运行此脚本

-- 禁用RLS以允许批量插入（需要管理员权限）
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships DISABLE ROW LEVEL SECURITY;

-- 为所有用户创建缺失的业务记录
INSERT INTO public.users (id, email, provider, role, created_at, updated_at)
SELECT
    au.id,
    au.email,
    CASE
        WHEN au.provider = 'google' THEN 'google'
        ELSE 'email'
    END,
    'USER',
    NOW(),
    NOW()
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users);

INSERT INTO public.user_points (user_id, points, last_updated)
SELECT
    au.id,
    25,
    NOW()
FROM auth.users au
WHERE au.id NOT IN (SELECT user_id FROM public.user_points);

INSERT INTO public.memberships (user_id, membership_type, is_active, created_at, updated_at)
SELECT
    au.id,
    'FREE',
    true,
    NOW(),
    NOW()
FROM auth.users au
WHERE au.id NOT IN (SELECT user_id FROM public.memberships);

-- 重新启用RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 显示修复结果
SELECT
    'auth.users' as table_name,
    COUNT(*) as record_count
FROM auth.users

UNION ALL

SELECT
    'public.users' as table_name,
    COUNT(*) as record_count
FROM public.users

UNION ALL

SELECT
    'public.user_points' as table_name,
    COUNT(*) as record_count
FROM public.user_points

UNION ALL

SELECT
    'public.memberships' as table_name,
    COUNT(*) as record_count
FROM public.memberships

ORDER BY table_name;