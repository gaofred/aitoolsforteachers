-- ========================================
-- 快速修复邀请里程碑数据
-- ========================================

-- 1. 插入里程碑数据
INSERT INTO invitation_milestones (threshold, bonus_points, description, is_active)
VALUES
    (10, 100, '成功邀请10位朋友', true),
    (20, 300, '成功邀请20位朋友', true)
ON CONFLICT (threshold) DO UPDATE SET
    bonus_points = EXCLUDED.bonus_points,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 2. 验证插入结果
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

-- 3. 显示当前的邀请奖励配置
SELECT '=== 邀请奖励配置 ===' as info;
SELECT
    points_per_invitation,
    max_rewards_per_user,
    max_daily_registrations_per_ip,
    is_active,
    created_at,
    updated_at
FROM invitation_rewards
ORDER BY updated_at DESC
LIMIT 1;

SELECT '=== 修复完成 ===' as status;