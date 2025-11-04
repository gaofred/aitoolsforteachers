-- 调试兑换码功能
-- 检查表结构和数据
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 检查redemption_codes表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'redemption_codes'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 检查redemption_codes表中的数据
SELECT id, code, type, value, is_used, used_by, used_at, expires_at, created_at
FROM public.redemption_codes
ORDER BY created_at DESC
LIMIT 10;

-- 3. 检查user_points表结构，确保有会员相关字段
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_points'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. 检查membership_redemptions表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'membership_redemptions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. 检查兑换码函数是否存在
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'redeem_code'
AND routine_schema = 'public';

-- 6. 检查最近的兑换记录
SELECT
    rc.code,
    rc.type,
    rc.value,
    rc.is_used,
    rc.used_by,
    rc.used_at,
    u.email as used_by_email,
    up.points as user_points_after
FROM public.redemption_codes rc
LEFT JOIN public.users u ON rc.used_by = u.id
LEFT JOIN public.user_points up ON rc.used_by = up.user_id
WHERE rc.is_used = true
ORDER BY rc.used_at DESC
LIMIT 5;

-- 7. 检查会员兑换记录
SELECT
    mr.*,
    rc.code as redemption_code,
    u.email as user_email
FROM public.membership_redemptions mr
JOIN public.redemption_codes rc ON mr.redemption_code_id = rc.id
JOIN public.users u ON mr.user_id = u.id
ORDER BY mr.created_at DESC
LIMIT 5;