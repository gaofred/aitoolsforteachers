-- 创建兑换码表
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 创建兑换码表
CREATE TABLE IF NOT EXISTS public.redemption_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES public.users(id),
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 2. 启用行级安全策略
ALTER TABLE public.redemption_codes ENABLE ROW LEVEL SECURITY;

-- 3. 创建RLS策略
-- 管理员可以查看所有兑换码
CREATE POLICY "Admins can view all redemption codes" ON public.redemption_codes
  FOR SELECT USING (true);

-- 管理员可以创建兑换码
CREATE POLICY "Admins can create redemption codes" ON public.redemption_codes
  FOR INSERT WITH CHECK (true);

-- 管理员可以更新兑换码
CREATE POLICY "Admins can update redemption codes" ON public.redemption_codes
  FOR UPDATE USING (true);

-- 管理员可以删除兑换码
CREATE POLICY "Admins can delete redemption codes" ON public.redemption_codes
  FOR DELETE USING (true);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON public.redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_used_by ON public.redemption_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_is_used ON public.redemption_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_expires_at ON public.redemption_codes(expires_at);

-- 5. 验证表创建成功
SELECT 'redemption_codes 表创建成功！' as message;
