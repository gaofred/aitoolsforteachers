-- ========================================
-- 快速检查邀请系统问题的SQL脚本
-- ========================================

-- 1. 检查邀请相关表是否存在
SELECT '=== 检查表是否存在 ===' as info;
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE tablename LIKE '%invitation%'
ORDER BY tablename;

-- 2. 检查邀请码数据
SELECT '=== 邀请码数据 ===' as info;
SELECT
    COUNT(*) as total_codes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_codes
FROM invitation_codes;

-- 显示前5个邀请码
SELECT
    id,
    inviter_id,
    code,
    total_invitations,
    successful_invitations,
    is_active,
    created_at
FROM invitation_codes
ORDER BY created_at DESC
LIMIT 5;

-- 3. 检查邀请记录
SELECT '=== 邀请记录数据 ===' as info;
SELECT
    COUNT(*) as total_invitations,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_invitations,
    COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered_invitations
FROM invitations;

-- 显示前5个邀请记录
SELECT
    id,
    invitation_code_id,
    inviter_id,
    invited_user_id,
    status,
    registered_at,
    completed_at,
    created_at
FROM invitations
ORDER BY created_at DESC
LIMIT 5;

-- 4. 检查奖励发放记录
SELECT '=== 奖励发放记录 ===' as info;
SELECT
    COUNT(*) as total_payouts,
    SUM(points_awarded) as total_points_awarded
FROM invitation_reward_payouts;

-- 显示前5个奖励记录
SELECT
    id,
    inviter_id,
    points_awarded,
    bonus_applied,
    payout_description,
    created_at
FROM invitation_reward_payouts
ORDER BY created_at DESC
LIMIT 5;

-- 5. 检查用户积分状态
SELECT '=== 用户积分状态 ===' as info;
SELECT
    u.id,
    u.name,
    u.email,
    up.points,
    up.last_updated
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE u.id IN (
    SELECT DISTINCT inviter_id FROM invitation_codes
    UNION
    SELECT DISTINCT invited_user_id FROM invitations WHERE invited_user_id IS NOT NULL
)
ORDER BY up.last_updated DESC;