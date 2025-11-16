-- 检查user_points表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_points'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 检查现有数据
SELECT * FROM public.user_points LIMIT 5;

-- 检查当前用户的积分记录
SELECT
  au.email,
  up.user_id,
  up.points,
  up.last_updated
FROM auth.users au
LEFT JOIN public.user_points up ON au.id = up.user_id
WHERE au.email = 'gaoxi1991app@163.com';