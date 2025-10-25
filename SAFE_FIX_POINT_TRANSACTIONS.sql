-- 安全的 point_transactions 表修复脚本
-- 此脚本会安全地处理已存在的策略和表

-- 1. 创建表（如果不存在）
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

-- 2. 启用行级安全策略（安全检查）
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

-- 3. 安全地删除现有策略（如果存在）
DROP POLICY IF EXISTS "Users can view own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.point_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.point_transactions;

-- 4. 重新创建策略
CREATE POLICY "Users can view own transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at 
ON public.point_transactions(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_point_transactions_type 
ON public.point_transactions(type);

CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at 
ON public.point_transactions(created_at);

-- 6. 验证表状态
SELECT 
    'point_transactions 表状态检查完成' as message,
    COUNT(*) as record_count
FROM public.point_transactions;

-- 7. 检查策略状态
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'point_transactions';







