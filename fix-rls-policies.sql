-- 修复RLS策略，让用户登录后能访问自己的积分记录
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 删除现有的限制性策略（如果存在）
DROP POLICY IF EXISTS "Users can view own point_transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can view own user_points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view own users" ON public.users;
DROP POLICY IF EXISTS "Users can manage own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.point_transactions;

-- 2. 创建新的RLS策略 - point_transactions表（允许查看自己的记录）
CREATE POLICY "Users can view own point_transactions" ON public.point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 3. 创建新的RLS策略 - user_points表（允许查看自己的记录）
CREATE POLICY "Users can view own user_points" ON public.user_points
    FOR SELECT USING (auth.uid() = user_id);

-- 4. 创建新的RLS策略 - users表（只能查看自己的信息）
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- 5. 确保RLS已启用
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. 验证策略创建结果
SELECT
    'RLS Policies Fixed' as info_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('point_transactions', 'user_points', 'users')
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. 显示修复完成信息
SELECT '✅ RLS策略修复完成！用户登录后应该能看到自己的积分记录了。' as status;

-- 使用说明：
-- 1. 在Supabase控制台的SQL编辑器中运行此脚本
-- 2. 运行后，用户登录网站就能看到自己的积分历史记录了
-- 3. 用户只能看到自己的记录，看不到其他用户的数据