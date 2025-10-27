-- 调试邀请系统的SQL脚本

-- 1. 检查现有的邀请码
SELECT
    ic.code,
    ic.is_active,
    ic.created_at,
    u.name as inviter_name,
    u.email as inviter_email
FROM invitation_codes ic
JOIN users u ON ic.inviter_id = u.id
WHERE ic.is_active = true
ORDER BY ic.created_at DESC;

-- 2. 检查最近的用户注册情况
SELECT
    id,
    name,
    email,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 3. 检查邀请记录
SELECT
    i.id,
    i.status,
    i.created_at,
    ic.code,
    inviter.name as inviter_name,
    invited_user.name as invited_user_name,
    invited_user.email as invited_user_email
FROM invitations i
JOIN invitation_codes ic ON i.invitation_code_id = ic.id
JOIN users inviter ON ic.inviter_id = inviter.id
JOIN users invited_user ON i.invited_user_id = invited_user.id
ORDER BY i.created_at DESC;

-- 4. 检查邀请奖励记录
SELECT
    ir.id,
    ir.base_points,
    ir.bonus_points,
    ir.status,
    ir.created_at,
    inviter.name as inviter_name,
    ic.code as invitation_code
FROM invitation_rewards ir
JOIN invitation_codes ic ON ir.invitation_code_id = ic.id
JOIN users inviter ON ic.inviter_id = inviter.id
ORDER BY ir.created_at DESC;

-- 5. 检查积分交易记录
SELECT
    up.user_id,
    u.name,
    u.email,
    up.points,
    up.last_updated
FROM user_points up
JOIN users u ON up.user_id = u.id
ORDER BY up.last_updated DESC;

-- 6. 检查积分交易历史中是否有邀请奖励
SELECT
    pt.id,
    pt.points_change,
    pt.description,
    pt.created_at,
    u.name as user_name
FROM point_transactions pt
JOIN users u ON pt.user_id = u.id
WHERE pt.description LIKE '%邀请%' OR pt.type = 'BONUS'
ORDER BY pt.created_at DESC;