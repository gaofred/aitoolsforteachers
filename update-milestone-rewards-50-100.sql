-- ========================================
-- 更新里程碑奖励脚本
-- 将10人里程碑从100改为50点，20人里程碑从300改为100点
-- ========================================

-- 更新里程碑奖励配置
UPDATE invitation_milestones
SET
    bonus_points = 50,
    description = '成功邀请10位朋友',
    updated_at = CURRENT_TIMESTAMP
WHERE threshold = 10;

UPDATE invitation_milestones
SET
    bonus_points = 100,
    description = '成功邀请20位朋友',
    updated_at = CURRENT_TIMESTAMP
WHERE threshold = 20;

-- 如果里程碑记录不存在，则插入
INSERT INTO invitation_milestones (threshold, bonus_points, description, is_active) VALUES
    (10, 50, '成功邀请10位朋友', true),
    (20, 100, '成功邀请20位朋友', true)
ON CONFLICT (threshold) DO UPDATE SET
    bonus_points = EXCLUDED.bonus_points,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 确保基础奖励配置正确
UPDATE invitation_rewards
SET
    points_per_invitation = 30,
    updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT id FROM invitation_rewards ORDER BY created_at DESC LIMIT 1);

-- 如果没有基础奖励配置，插入默认配置
INSERT INTO invitation_rewards (
    reward_type,
    points_per_invitation,
    max_rewards_per_user,
    max_daily_registrations_per_ip,
    is_active
) VALUES (
    'points',
    30,
    50,
    3,
    true
) ON CONFLICT DO NOTHING;

-- 验证更新结果
SELECT '=== 基础奖励配置 ===' as info;
SELECT
    points_per_invitation,
    max_rewards_per_user,
    is_active,
    updated_at
FROM invitation_rewards
ORDER BY updated_at DESC
LIMIT 1;

SELECT '=== 里程碑奖励配置 ===' as info;
SELECT
    threshold,
    bonus_points,
    description,
    is_active,
    updated_at
FROM invitation_milestones
WHERE is_active = true
ORDER BY threshold;