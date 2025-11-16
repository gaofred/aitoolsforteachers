-- ========================================
-- 邀请积分发放问题排查脚本
-- ========================================

-- 1. 检查最近的邀请记录
SELECT '=== 最近邀请记录 ===' as info;
SELECT
    i.id,
    i.inviter_id,
    i.invited_user_id,
    i.status,
    i.registered_at,
    i.completed_at,
    u1.name as inviter_name,
    u2.name as invited_name,
    u1.email as inviter_email,
    u2.email as invited_email
FROM invitations i
LEFT JOIN users u1 ON i.inviter_id = u1.id
LEFT JOIN users u2 ON i.invited_user_id = u2.id
ORDER BY i.created_at DESC
LIMIT 10;

-- 2. 检查积分交易记录
SELECT '=== 最近积分交易记录（邀请相关） ===' as info;
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
WHERE pt.description LIKE '%邀请%' OR pt.description LIKE '%invite%'
ORDER BY pt.created_at DESC
LIMIT 10;

-- 3. 检查用户积分状态
SELECT '=== 用户积分状态 ===' as info;
SELECT
    up.user_id,
    up.points,
    up.last_updated,
    u.name as user_name,
    u.email as user_email
FROM user_points up
LEFT JOIN users u ON up.user_id = u.id
ORDER BY up.points DESC
LIMIT 10;

-- 4. 检查邀请奖励发放记录
SELECT '=== 邀请奖励发放记录 ===' as info;
SELECT
    irp.id,
    irp.invitation_id,
    irp.inviter_id,
    irp.invited_user_id,
    irp.points_awarded,
    irp.bonus_applied,
    irp.payout_description,
    irp.created_at,
    u1.name as inviter_name,
    u2.name as invited_name
FROM invitation_reward_payouts irp
LEFT JOIN users u1 ON irp.inviter_id = u1.id
LEFT JOIN users u2 ON irp.invited_user_id = u2.id
ORDER BY irp.created_at DESC
LIMIT 10;

-- 5. 检查邀请码状态
SELECT '=== 邀请码状态 ===' as info;
SELECT
    ic.id,
    ic.inviter_id,
    ic.code,
    ic.total_invitations,
    ic.successful_invitations,
    ic.is_active,
    ic.created_at,
    u.name as inviter_name,
    u.email as inviter_email
FROM invitation_codes ic
LEFT JOIN users u ON ic.inviter_id = u.id
ORDER BY ic.created_at DESC
LIMIT 10;

-- 6. 检查里程碑奖励配置
SELECT '=== 里程碑奖励配置 ===' as info;
SELECT
    threshold,
    bonus_points,
    description,
    is_active,
    created_at
FROM invitation_milestones
WHERE is_active = true
ORDER BY threshold;

-- 7. 检查最近注册用户是否有邀请记录
SELECT '=== 最近注册用户的邀请情况 ===' as info;
SELECT
    u.id,
    u.name,
    u.email,
    u.created_at,
    CASE
        WHEN i.id IS NOT NULL THEN '有邀请记录'
        ELSE '无邀请记录'
    END as has_invitation,
    i.status as invitation_status,
    i.inviter_id,
    inviter.name as inviter_name
FROM users u
LEFT JOIN invitations i ON u.id = i.invited_user_id
LEFT JOIN users inviter ON i.inviter_id = inviter.id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY u.created_at DESC
LIMIT 10;

-- 8. 检查是否有错误或失败的积分交易
SELECT '=== 检查可能的积分交易问题 ===' as info;
SELECT
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN type = 'BONUS' THEN 1 END) as bonus_transactions,
    COUNT(CASE WHEN description LIKE '%邀请%' THEN 1 END) as invite_transactions,
    MIN(created_at) as earliest_transaction,
    MAX(created_at) as latest_transaction
FROM point_transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';