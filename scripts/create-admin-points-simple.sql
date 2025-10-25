-- 为管理员账号创建积分记录（最简单版本）

-- 直接为每个管理员账号插入积分记录
-- 使用手动指定UUID，避免复杂的查询

INSERT INTO public.user_points (user_id, points, last_updated)
SELECT
  auth.users.id as user_id,
  25 as points,
  NOW() as last_updated
FROM auth.users
WHERE auth.users.email IN (
  '17687027169@163.com'
)
ON CONFLICT (user_id)
DO UPDATE SET
  points = public.user_points.points + 25,
  last_updated = NOW()
WHERE public.user_points.user_id = EXCLUDED.public.user_points.user_id;