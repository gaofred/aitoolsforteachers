-- 完整修复所有表的RLS策略
-- 在 Supabase SQL 编辑器中运行此脚本

-- ========================================
-- 1. 修复 point_transactions 表
-- ========================================

-- 确保表存在
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('REDEEM', 'GENERATE', 'REFUND', 'BONUS', 'PURCHASE', 'MEMBERSHIP')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  related_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.point_transactions;

-- 创建新策略 - 用户只能查看自己的交易记录
CREATE POLICY "Users can view own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 创建新策略 - 用户只能插入自己的交易记录
CREATE POLICY "Users can insert own transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at ON public.point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);

-- ========================================
-- 2. 修复 ai_generations 表
-- ========================================

-- 检查表是否存在，如果不存在则创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'ai_generations'
  ) THEN
    CREATE TABLE public.ai_generations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
      tool_type TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      input_data JSONB,
      output_data JSONB,
      model_type TEXT,
      points_cost NUMERIC,
      status TEXT DEFAULT 'COMPLETED',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- 启用RLS
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "Users can view own generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Authenticated users can insert generations" ON public.ai_generations;
DROP POLICY IF EXISTS "Service role can manage generations" ON public.ai_generations;

-- 创建新策略 - 用户只能查看自己的生成记录
CREATE POLICY "Users can view own generations" ON public.ai_generations
  FOR SELECT USING (auth.uid() = user_id);

-- 创建新策略 - 用户只能插入自己的生成记录
CREATE POLICY "Users can insert own generations" ON public.ai_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON public.ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON public.ai_generations(created_at DESC);

-- ========================================
-- 3. 修复 user_points 表
-- ========================================

-- 确保表存在
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  points NUMERIC DEFAULT 25,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update own points" ON public.user_points;

-- 创建新策略 - 用户只能查看自己的点数
CREATE POLICY "Users can view own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

-- 创建新策略 - 用户只能更新自己的点数
CREATE POLICY "Users can update own points" ON public.user_points
  FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 4. 验证修复结果
-- ========================================

SELECT 
  'point_transactions' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'point_transactions'
UNION ALL
SELECT 
  'ai_generations' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'ai_generations'
UNION ALL
SELECT 
  'user_points' as table_name,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'user_points'
ORDER BY table_name, policyname;

-- 显示修复完成信息
SELECT '✅ RLS策略修复完成！现在用户可以正常查看积分记录和使用AI功能了。' as status;

