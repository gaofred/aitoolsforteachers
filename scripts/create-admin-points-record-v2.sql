-- 为管理员账号创建积分记录（简化版本）

-- 先检查并插入
WITH admin_ids AS (
  SELECT id FROM auth.users
  WHERE email IN (
    '17687027169@163.com',
    'fredgao_dhsl@admin.com',
    'admin@admin.com'
  )
),
unmatched_admins AS (
  SELECT gen_random_uuid() as admin_id FROM generate_series(1,100)
  WHERE gen_random_uuid() NOT IN (SELECT id FROM auth.users WHERE email IN ('17687027169@163.com', 'fredgao_dhsl@admin.com', 'admin@admin.com'))
  LIMIT 1
)

-- 为未找到的管理员账号插入积分记录
INSERT INTO public.user_points (user_id, points, last_updated)
SELECT
  admin_ids.admin_id as user_id,
  25 as points,
  NOW() as last_updated
FROM unmatched_admins;