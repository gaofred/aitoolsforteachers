-- 修复策略冲突的简单脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 删除所有现有的策略（安全操作）
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.point_transactions;

-- 2. 重新创建必要的策略
CREATE POLICY "Users can view own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. 验证策略创建成功
SELECT 
    '策略修复完成！' as message,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'point_transactions';

-- 4. 测试表访问
SELECT 
    'point_transactions 表可以正常访问' as message,
    COUNT(*) as record_count
FROM public.point_transactions;







