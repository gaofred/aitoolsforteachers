-- ========================================
-- 添加20人里程碑奖励更新脚本
-- 支持多个里程碑奖励：10人100点，20人300点
-- ========================================

-- 创建里程碑奖励配置表
CREATE TABLE IF NOT EXISTS invitation_milestones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    threshold INTEGER NOT NULL, -- 里程碑人数
    bonus_points INTEGER NOT NULL, -- 奖励点数
    description TEXT, -- 里程碑描述
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认里程碑奖励（如果不存在）
INSERT INTO invitation_milestones (threshold, bonus_points, description, is_active) VALUES
    (10, 100, '成功邀请10位朋友', true),
    (20, 300, '成功邀请20位朋友', true)
ON CONFLICT (threshold) DO UPDATE SET
    bonus_points = EXCLUDED.bonus_points,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 移除旧的奖励配置字段（如果存在）
DO $$
BEGIN
    -- 检查表是否有bonus_points_amount字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitation_rewards'
        AND column_name = 'bonus_points_amount'
    ) THEN
        ALTER TABLE invitation_rewards DROP COLUMN IF EXISTS bonus_points_amount;
    END IF;

    -- 检查表是否有bonus_points_threshold字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitation_rewards'
        AND column_name = 'bonus_points_threshold'
    ) THEN
        ALTER TABLE invitation_rewards DROP COLUMN IF EXISTS bonus_points_threshold;
    END IF;
END $$;

-- 更新奖励配置表，确保基础奖励为30点
UPDATE invitation_rewards
SET
    points_per_invitation = 30,
    updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT id FROM invitation_rewards ORDER BY created_at DESC LIMIT 1);

-- 如果没有奖励配置记录，插入默认配置
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
    created_at
FROM invitation_milestones
WHERE is_active = true
ORDER BY threshold;