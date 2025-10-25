-- 为管理员账号创建积分记录
-- 管理员账号的UUID需要从 auth.users 表中获取

-- 首先获取管理员账号的UUID
INSERT INTO public.user_points (user_id, points, last_updated)
SELECT
  auth.users.id as user_id,
  25 as points,
  NOW() as last_updated
FROM auth.users
WHERE auth.users.email IN (
  '17687027169@163.com'  -- 管理员邮箱
  'fredgao_dhsl@admin.com'   -- 假设的管理员邮箱
  'admin@admin.com'        -- 默认管理员账号邮箱
);

-- 如果上述查询没有找到记录，则使用默认UUID
-- 这可能发生在管理员账号不是通过Supabase Auth创建的情况下

-- 回退方案：直接插入使用假设的UUID（仅作为临时方案）
INSERT INTO public.user_points (user_id, points, last_updated)
VALUES
  '00000000-0000-0000-0000-0000-0000-0001', 25, NOW()
ON CONFLICT (user_id)
DO UPDATE SET
  points = public.user_points.points + 25,
  last_updated = NOW()
WHERE public.user_points.user_id = EXCLUDED.public.user_points.user_id;

-- 注意：这是一个临时方案
-- 正确的解决方案是确保管理员账号通过正常的用户注册流程创建
-- 这样会自动触发触发器，在user_points表中创建初始记录