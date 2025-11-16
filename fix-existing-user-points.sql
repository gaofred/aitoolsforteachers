-- 修复现有用户积分：将初始积分改为0
-- 在Supabase SQL编辑器中运行此脚本

-- 更新所有现有用户的积分记录为0（如果是25的话）
UPDATE public.user_points
SET points = 0, last_updated = NOW()
WHERE points = 25 AND user_id IN (
    SELECT id FROM auth.users
    WHERE created_at > NOW() - INTERVAL '7 days' -- 最近7天的新用户
);

-- 或者直接重置所有用户积分为0（如果你想重新开始）
-- UPDATE public.user_points SET points = 0, last_updated = NOW();

-- 查看更新结果
SELECT
    au.email,
    au.created_at as user_created_at,
    up.points,
    up.last_updated,
    CASE
        WHEN up.points = 0 THEN '✅ 已修复'
        WHEN up.points = 25 THEN '⚠️ 需要修复'
        ELSE 'ℹ️ 其他积分'
    END as status
FROM auth.users au
LEFT JOIN public.user_points up ON au.id = up.user_id
ORDER BY au.created_at DESC
LIMIT 10;