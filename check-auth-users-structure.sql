-- 检查auth.users表的完整结构
-- 在Supabase SQL编辑器中运行此脚本

-- 查看auth.users表的所有列
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'auth'
ORDER BY ordinal_position;

-- 查看auth.users表的样本数据
SELECT *
FROM auth.users
LIMIT 1;

-- 查看所有用户的基本信息
SELECT
    id,
    email,
    created_at,
    last_sign_in_at,
    confirmation_sent_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;