-- 修复现有用户积分：将初始积分改为25
-- 在Supabase SQL编辑器中运行此脚本

-- 更新所有积分为0的用户改为25积分
UPDATE public.user_points
SET points = 25, last_updated = NOW()
WHERE points = 0 AND user_id IN (
    SELECT id FROM auth.users
);

-- 为所有缺失积分记录的用户创建25积分记录
INSERT INTO public.user_points (user_id, points, last_updated)
SELECT
    au.id,
    25,
    NOW()
FROM auth.users au
LEFT JOIN public.user_points up ON au.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
    points = 25,
    last_updated = NOW();

-- 查看修复结果
SELECT
    au.email,
    au.created_at as user_created_at,
    up.points,
    up.last_updated,
    CASE
        WHEN up.points = 25 THEN '✅ 已修复 (25积分)'
        WHEN up.points > 25 THEN '⚠️ 高积分用户'
        ELSE '❌ 需要修复'
    END as status
FROM auth.users au
LEFT JOIN public.user_points up ON au.id = up.user_id
ORDER BY au.created_at DESC
LIMIT 10;

-- 统计总用户和积分分布
SELECT
    'Total Users' as metric,
    COUNT(*) as count
FROM auth.users

UNION ALL

SELECT
    'Users with 25 points' as metric,
    COUNT(*)
FROM public.user_points
WHERE points = 25

UNION ALL

SELECT
    'Users with other points' as metric,
    COUNT(*)
FROM public.user_points
WHERE points != 25;