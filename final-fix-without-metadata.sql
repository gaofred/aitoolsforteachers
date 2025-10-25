-- 最终修复：不使用metadata字段，直接创建基础用户记录
-- 在Supabase SQL编辑器中运行此脚本

-- 清理之前可能有问题的触发器
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 创建简化的触发器函数，不依赖metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. 先创建用户扩展信息（使用默认值）
    INSERT INTO public.users (id, email, name, provider, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email::text, -- 暂时使用email作为name
        'email', -- 默认provider
        'USER', -- 默认role
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. 创建初始积分记录（25积分）
    INSERT INTO public.user_points (user_id, points, last_updated)
    VALUES (NEW.id, 25, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. 创建会员记录
    INSERT INTO public.memberships (user_id, membership_type, is_active, created_at, updated_at)
    VALUES (NEW.id, 'FREE', true, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 批量修复现有用户（不依赖metadata字段）
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- 为每个auth用户按顺序创建业务记录
    FOR user_record IN
        SELECT id, email
        FROM auth.users
        WHERE id NOT IN (SELECT id FROM public.users)
    LOOP
        -- 1. 先创建public.users记录
        INSERT INTO public.users (id, email, name, provider, role, created_at, updated_at)
        VALUES (
            user_record.id,
            user_record.email,
            user_record.email, -- 暂时使用email作为name
            'email', -- 默认provider
            'USER', -- 默认role
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
    au.created_at as registration_date,
    pu.id as users_record_id,
    up.points,
    up.last_updated as points_last_updated,
    CASE
        WHEN pu.id IS NOT NULL AND up.user_id IS NOT NULL THEN '✅ 完整'
        WHEN pu.id IS NOT NULL THEN '⚠️ 缺少积分'
        WHEN up.user_id IS NOT NULL THEN '⚠️ 缺少用户记录'
        ELSE '❌ 缺失业务数据'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN public.user_points up ON au.id = up.user_id
ORDER BY au.created_at DESC
LIMIT 10;

-- 统计总状态
SELECT
    'Total Auth Users' as metric,
    COUNT(*) as count
FROM auth.users

UNION ALL

SELECT
    'Users with Business Records' as metric,
    COUNT(*)
FROM public.users

UNION ALL

SELECT
    'Users with Points Records' as metric,
    COUNT(*)
FROM public.user_points

UNION ALL

SELECT
    'Users with 25 Initial Points' as metric,
    COUNT(*)
FROM public.user_points
WHERE points = 25;