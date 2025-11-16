-- ========================================
-- 创建里程碑奖励表并初始化数据
-- 支持10人50点，20人100点的里程碑奖励
-- ========================================

-- 创建里程碑奖励配置表
CREATE TABLE IF NOT EXISTS invitation_milestones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    threshold INTEGER NOT NULL UNIQUE, -- 里程碑人数
    bonus_points INTEGER NOT NULL, -- 奖励点数
    description TEXT, -- 里程碑描述
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invitation_milestones_updated_at
    BEFORE UPDATE ON invitation_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 插入或更新里程碑奖励配置
INSERT INTO invitation_milestones (threshold, bonus_points, description, is_active) VALUES
    (10, 50, '成功邀请10位朋友', true),
    (20, 100, '成功邀请20位朋友', true)
ON CONFLICT (threshold) DO UPDATE SET
    bonus_points = EXCLUDED.bonus_points,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 确保基础奖励配置表存在
CREATE TABLE IF NOT EXISTS invitation_rewards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    reward_type TEXT NOT NULL DEFAULT 'points',
    points_per_invitation INTEGER NOT NULL DEFAULT 30,
    max_rewards_per_user INTEGER DEFAULT 50,
    max_daily_registrations_per_ip INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 为基础奖励表也添加更新触发器
CREATE TRIGGER update_invitation_rewards_updated_at
    BEFORE UPDATE ON invitation_rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 更新基础奖励配置
UPDATE invitation_rewards
SET
    points_per_invitation = 30,
    max_rewards_per_user = 50,
    max_daily_registrations_per_ip = 3,
    is_active = true
WHERE id = (SELECT id FROM invitation_rewards ORDER BY created_at DESC LIMIT 1);

-- 如果没有基础奖励配置记录，插入默认配置
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

-- 验证创建结果
SELECT '=== 里程碑奖励表结构 ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invitation_milestones'
ORDER BY ordinal_position;

SELECT '=== 里程碑奖励配置 ===' as info;
SELECT
    threshold,
    bonus_points,
    description,
    is_active,
    created_at,
    updated_at
FROM invitation_milestones
WHERE is_active = true
ORDER BY threshold;

SELECT '=== 基础奖励配置 ===' as info;
SELECT
    points_per_invitation,
    max_rewards_per_user,
    max_daily_registrations_per_ip,
    is_active,
    updated_at
FROM invitation_rewards
ORDER BY updated_at DESC
LIMIT 1;