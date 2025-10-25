-- 立即修复：为gaoxi1991app@163.com用户创建积分记录
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 首先找到用户的ID
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'gaoxi1991app@163.com';

    IF user_uuid IS NULL THEN
        RAISE EXCEPTION '用户 gaoxi1991app@163.com 不存在';
    END IF;

    -- 2. 为用户创建积分记录（如果不存在）
    INSERT INTO public.user_points (user_id, points, last_updated)
    VALUES (user_uuid, 25, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. 为用户创建会员记录（如果不存在）
    INSERT INTO public.memberships (user_id, membership_type, is_active, created_at, updated_at)
    VALUES (user_uuid, 'FREE', true, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. 为用户创建基础信息记录（如果不存在）
    INSERT INTO public.users (id, email, provider, role, created_at, updated_at)
    VALUES (user_uuid, 'gaoxi1991app@163.com', 'email', 'USER', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '用户数据修复完成！用户ID: %', user_uuid;
END $$;

-- 5. 验证修复结果
SELECT
  au.email,
  au.id as user_id,
  up.points,
  up.last_updated,
  m.membership_type,
  m.is_active
FROM auth.users au
LEFT JOIN public.user_points up ON au.id = up.user_id
LEFT JOIN public.memberships m ON au.id = m.user_id
WHERE au.email = 'gaoxi1991app@163.com';