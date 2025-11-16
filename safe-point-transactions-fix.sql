-- 安全的 point_transactions 表修复脚本
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 创建 point_transactions 表（如果不存在）
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

-- 2. 启用行级安全策略（如果未启用）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' 
        AND c.relname = 'point_transactions' 
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 3. 删除现有策略（如果存在）然后重新创建
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.point_transactions;

-- 4. 创建RLS策略
CREATE POLICY "Users can view own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at ON public.point_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON public.point_transactions(type);

-- 6. 插入一些示例数据（可选，仅当表为空时）
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
  WHERE pt.user_id = u.id AND pt.type = 'BONUS' AND pt.description = '新用户注册奖励'
)
AND u.id IS NOT NULL;

-- 完成
SELECT 'point_transactions 表安全修复完成！' as message;








