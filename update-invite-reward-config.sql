-- ========================================
-- 更新邀请奖励配置脚本
-- 将10人里程碑奖励从300改为100点
-- ========================================

-- 更新奖励配置表中的设置
UPDATE invitation_rewards
SET
    points_per_invitation = 30,
    bonus_points_threshold = 10,
    bonus_points_amount = 100,
    updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT id FROM invitation_rewards ORDER BY created_at DESC LIMIT 1);

-- 如果没有记录，插入一条默认配置
INSERT INTO invitation_rewards (
    reward_type,
    points_per_invitation,
    bonus_points_threshold,
    bonus_points_amount,
    max_rewards_per_user,
    max_daily_registrations_per_ip,
    is_active
) VALUES (
    'points',
    30,
    10,
    100,
    50,
    3,
    true
) ON CONFLICT DO NOTHING;

-- 验证更新结果
SELECT '=== 当前奖励配置 ===' as info;
SELECT
    points_per_invitation,
    bonus_points_threshold,
    bonus_points_amount,
    is_active,
    updated_at
FROM invitation_rewards
ORDER BY updated_at DESC
LIMIT 1;