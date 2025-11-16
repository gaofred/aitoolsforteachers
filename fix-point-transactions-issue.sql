-- 修复积分交易记录表的问题
-- 在 Supabase SQL 编辑器中运行此脚本

-- 1. 检查表是否存在
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'point_transactions'
    ) 
    THEN '✅ point_transactions 表存在'
    ELSE '❌ point_transactions 表不存在，需要创建'
  END as table_status;

-- 2. 如果表不存在，创建表
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

-- 3. 启用行级安全策略
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- 4. 删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.point_transactions;

-- 5. 创建RLS策略
CREATE POLICY "Users can view own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at ON public.point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);

-- 7. 为现有用户创建初始奖励记录（如果还没有）
INSERT INTO public.point_transactions (user_id, type, amount, description, metadata) 
SELECT 
  u.id,
  'BONUS',
  25,
  '新用户注册奖励',
  jsonb_build_object('source', 'registration')
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.point_transactions pt 
  WHERE pt.user_id = u.id 
  AND pt.type = 'BONUS' 
  AND pt.description = '新用户注册奖励'
)
AND u.id IS NOT NULL;

-- 8. 验证结果
SELECT 
  '✅ 表创建完成' as status,
  (SELECT COUNT(*) FROM public.point_transactions) as total_records,
  (SELECT COUNT(DISTINCT user_id) FROM public.point_transactions) as unique_users;

