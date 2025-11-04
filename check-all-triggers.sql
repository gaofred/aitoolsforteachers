-- 检查所有可能影响积分的数据库对象
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 查看所有触发器
SELECT '=== 所有触发器 ===' as info;
SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2. 查看所有函数（寻找可能的重置函数）
SELECT '=== 所有函数 ===' as info;
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%reset%'
ORDER BY routine_name;

-- 3. 查看 user_points 表的所有触发器
SELECT '=== user_points 表触发器 ===' as info;
SELECT
    trigger_name,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'user_points';

-- 4. 查看是否有其他表可能影响 user_points
SELECT '=== 可能影响 user_points 的表触发器 ===' as info;
SELECT
    trigger_name,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND action_statement ILIKE '%user_points%'
AND action_statement ILIKE '%reset%';

-- 5. 检查兑换码函数当前的代码
SELECT '=== redeem_code 函数代码 ===' as info;
SELECT
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'redeem_code';