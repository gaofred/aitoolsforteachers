-- 简单修复：完全禁用RLS策略进行测试
-- 在Supabase SQL编辑器中运行此脚本

-- 临时禁用所有表的RLS
ALTER TABLE public.point_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS已禁用（仅用于测试）。现在应该能看到积分记录了！' as status;