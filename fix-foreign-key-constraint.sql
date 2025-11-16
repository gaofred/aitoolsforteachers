-- 修复外键约束错误：确保正确的插入顺序
-- 在Supabase SQL编辑器中运行此脚本

-- 首先检查当前状态
SELECT
    'auth.users' as table_name,
    COUNT(*) as count
FROM auth.users

UNION ALL

SELECT
    'public.users' as table_name,
    COUNT(*) as count
FROM public.users

UNION ALL

SELECT
    'public.user_points' as table_name,
    COUNT(*) as count
FROM public.user_points;

-- 临时禁用外键约束（需要超级用户权限，可能不工作）
-- ALTER TABLE public.user_points DISABLE TRIGGER ALL;

-- 正确的修复方案：按顺序创建记录
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- 为每个auth用户按顺序创建业务记录
    FOR user_record IN
        SELECT id, email, raw_user_meta_data, provider
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
                WHEN user_record.provider = 'google' THEN 'google'
                ELSE 'email'
            END,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;

        -- 2. 然后创建user_points记录
        INSERT INTO public.user_points (user_id, points, last_updated)
        VALUES (user_record.id, 0, NOW())
        ON CONFLICT (user_id) DO NOTHING;

        -- 3. 最后创建memberships记录
        INSERT INTO public.memberships (user_id, membership_type, is_active, created_at, updated_at)
        VALUES (user_record.id, 'FREE', true, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING;

        RAISE NOTICE '用户 % 的业务数据已创建', user_record.email;
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
        WHEN up.user_id IS NOT NULL THEN '✅ user_points'
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