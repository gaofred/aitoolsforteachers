-- 检查 point_transactions 表状态
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 检查表是否存在
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'point_transactions'
    ) 
    THEN '✅ point_transactions 表存在'
    ELSE '❌ point_transactions 表不存在'
  END as table_status;

-- 2. 检查表结构
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'point_transactions'
ORDER BY ordinal_position;

-- 3. 检查RLS是否启用
SELECT 
  CASE 
    WHEN relrowsecurity = true 
    THEN '✅ RLS 已启用'
    ELSE '❌ RLS 未启用'
  END as rls_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
AND c.relname = 'point_transactions';

-- 4. 检查现有策略
SELECT 
  policyname as policy_name,
  cmd as command,
  qual as condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'point_transactions';

-- 5. 检查索引
SELECT 
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'point_transactions';

-- 6. 检查记录数
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'point_transactions'
    ) 
    THEN (SELECT COUNT(*)::text || ' 条记录' FROM public.point_transactions)
    ELSE '表不存在'
  END as record_count;







