-- 为管理员账号创建积分记录（最终版本）
-- 简单的INSERT语句，避免复杂的CONFLICT和跨数据库引用

-- 方法1：直接插入，如果已有记录则忽略
INSERT INTO public.user_points (user_id, points, last_updated)
SELECT
  auth.users.id as user_id,
  25 as points,
  NOW() as last_updated
FROM auth.users
WHERE auth.users.email = '17687027169@163.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_points
    WHERE public.user_points.user_id = auth.users.id
  );

-- 方法2：或使用更简单的INSERT ... DO UPDATE语法
-- 这里提供一个替代方案，如果上面的INSERT语句有问题的话

-- 注释：这种方法更安全，不需要复杂的EXCLUDE语法
-- 只是简单地检查是否已存在记录，如果不存在则插入

-- 推荐使用方法1