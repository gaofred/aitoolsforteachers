-- 为现有Supabase用户创建业务数据记录
-- 在Supabase SQL编辑器中运行此脚本

-- 为所有已存在但缺少业务数据的用户创建记录
INSERT INTO public.users (id, email, name, provider, role)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', au.email::text),
    CASE
        WHEN au.provider = 'google' THEN 'google'
        ELSE 'email'
    END,
    'USER'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 为所有已存在但缺少积分记录的用户创建积分记录
INSERT INTO public.user_points (user_id, points)
SELECT
    au.id,
    25  -- 新用户默认25积分
FROM auth.users au
LEFT JOIN public.user_points up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- 为所有已存在但缺少会员记录的用户创建会员记录
INSERT INTO public.memberships (user_id, membership_type)
SELECT
    au.id,
    'FREE'  -- 默认免费会员
FROM auth.users au
LEFT JOIN public.memberships m ON au.id = m.user_id
WHERE m.user_id IS NULL;

-- 查看结果
SELECT
    'Authentication Users' as table_name,
    COUNT(*) as count
FROM auth.users

UNION ALL

SELECT
    'Public Users' as table_name,
    COUNT(*) as count
FROM public.users

UNION ALL

SELECT
    'User Points' as table_name,
    COUNT(*) as count
FROM public.user_points

UNION ALL

SELECT
    'Memberships' as table_name,
    COUNT(*) as count
FROM public.memberships;