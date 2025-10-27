-- ========================================
-- 检查邀请系统数据的SQL脚本
-- ========================================

-- 1. 检查邀请码表中的数据
SELECT '=== 邀请码表 (invitation_codes) ===' as info;
SELECT
    id,
    inviter_id,
    code,
    total_invitations,
    successful_invitations,
    is_active,
    created_at,
    updated_at
FROM invitation_codes
ORDER BY created_at DESC;

-- 2. 检查邀请记录表中的数据
SELECT '=== 邀请记录表 (invitations) ===' as info;
SELECT
    i.id,
    i.invitation_code_id,
    i.inviter_id,
    i.invited_user_id,
    i.status,
    i.registered_at,
    i.completed_at,
    i.created_at,
    ic.code as invite_code
FROM invitations i
LEFT JOIN invitation_codes ic ON i.invitation_code_id = ic.id
ORDER BY i.created_at DESC;

-- 3. 检查奖励配置表
SELECT '=== 奖励配置表 (invitation_rewards) ===' as info;
SELECT * FROM invitation_rewards;

-- 4. 检查奖励发放记录表
SELECT '=== 奖励发放记录表 (invitation_reward_payouts) ===' as info;
SELECT
    irp.id,
    irp.invitation_id,
    irp.inviter_id,
    irp.invited_user_id,
    irp.points_awarded,
    irp.bonus_applied,
    irp.payout_description,
    irp.created_at,
    ic.code as invite_code
FROM invitation_reward_payouts irp
LEFT JOIN invitations i ON irp.invitation_id = i.id
LEFT JOIN invitation_codes ic ON i.invitation_code_id = ic.id
ORDER BY irp.created_at DESC;

-- 5. 检查相关的积分交易记录
SELECT '=== 相关积分交易记录 (point_transactions) ===' as info;
SELECT
    pt.id,
    pt.user_id,
    pt.points_change,
    pt.type,
    pt.description,
    pt.created_at,
    u.name as user_name,
    u.email as user_email
FROM point_transactions pt
LEFT JOIN users u ON pt.user_id = u.id
WHERE pt.description LIKE '%邀请%' OR pt.description LIKE '%invitation%'
ORDER BY pt.created_at DESC;

-- 6. 检查用户积分变化
SELECT '=== 用户积分状态 ===' as info;
SELECT
    u.id as user_id,
    u.name,
    u.email,
    up.points as current_points,
    up.last_updated
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
WHERE u.id IN (
    SELECT DISTINCT inviter_id FROM invitation_codes
    UNION
    SELECT DISTINCT inviter_id FROM invitations
    UNION
    SELECT DISTINCT inviter_id FROM invitation_reward_payouts
)
ORDER BY up.last_updated DESC;

-- 7. 统计信息
SELECT '=== 邀请统计信息 ===' as info;
SELECT
    COUNT(*) as total_invitation_codes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_codes,
    SUM(total_invitations) as total_invitations_generated,
    SUM(successful_invitations) as total_successful_invitations
FROM invitation_codes;

SELECT '=== 奖励统计信息 ===' as info;
SELECT
    COUNT(*) as total_payouts,
    SUM(points_awarded) as total_points_awarded,
    COUNT(CASE WHEN bonus_applied = true THEN 1 END) as bonus_payouts,
    SUM(CASE WHEN bonus_applied = true THEN points_awarded ELSE 0 END) as total_bonus_points
FROM invitation_reward_payouts;