-- 修复auth.users表查询：使用app_metadata获取provider
-- 在Supabase SQL编辑器中运行此脚本

-- 首先检查auth.users表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'auth'
ORDER BY ordinal_position;

-- 查看auth.users表的实际数据结构
SELECT
    id,
    email,
    created_at,
    last_sign_in_at,
    raw_user_meta_data,
    app_metadata,
    aud
FROM auth.users
LIMIT 1;

-- 正确的修复方案：使用app_metadata获取provider
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- 为每个auth用户按顺序创建业务记录
    FOR user_record IN
        SELECT id, email, raw_user_meta_data, app_metadata
        FROM auth.users
        WHERE id NOT IN (SELECT id FROM public.users)
    LOOP
        -- 1. 先创建public.users记录
        INSERT INTO public.users (id, email, name, avatar_url, provider, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.raw_user_meta_data->>'name', user_record.email),
            user_record.raw_user_meta_data->>'avatar_url',
            CASE
                WHEN user_record.app_metadata->>'provider' = 'google' THEN 'google'
                ELSE 'email'
            END,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;

        -- 2. 然后创建user_points记录（25积分）
        INSERT INTO public.user_points (user_id, points, last_updated)
        VALUES (user_record.id, 25, NOW())
        ON CONFLICT (user_id) DO NOTHING;

        -- 3. 最后创建memberships记录
        INSERT INTO public.memberships (user_id, membership_type, is_active, created_at, updated_at)
        VALUES (user_record.id, 'FREE', true, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;

        RAISE NOTICE '用户 % 的业务数据已创建，初始25积分', user_record.email;
    END LOOP;
END $$;

-- 验证修复结果
SELECT
    '修复后状态' as status,
    au.email,
    CASE
        WHEN pu.id IS NOT NULL THEN '✅ public.users'
        ELSE '❌ 缺失 public.users'
    END as users_status,
    CASE
        WHEN up.user_id IS NOT NULL THEN '✅ user_points(' || up.points || '积分)'
        ELSE '❌ 缺失 user_points'
    END as points_status,
    CASE
        WHEN m.user_id IS NOT NULL THEN '✅ memberships'
        ELSE '❌ 缺失 memberships'
    END as membership_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.user_points up ON au.id = up.user_id
LEFT JOIN public.memberships m ON au.id = m.user_id
ORDER BY au.created_at DESC
LIMIT 10;