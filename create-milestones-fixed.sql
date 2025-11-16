-- ========================================
-- 修复版本：创建里程碑奖励配置表（带唯一约束）
-- ========================================

-- 1. 创建里程碑奖励配置表（如果不存在）
CREATE TABLE IF NOT EXISTS invitation_milestones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    threshold INTEGER NOT NULL UNIQUE, -- 添加唯一约束
    bonus_points INTEGER NOT NULL, -- 奖励点数
    description TEXT, -- 里程碑描述
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建唯一索引（如果表已存在但没有约束）
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitation_milestones_threshold
ON invitation_milestones(threshold);

-- 3. 插入默认里程碑奖励（现在ON CONFLICT会工作）
INSERT INTO invitation_milestones (threshold, bonus_points, description, is_active)
VALUES
    (10, 100, '成功邀请10位朋友', true),
    (20, 300, '成功邀请20位朋友', true)
ON CONFLICT (threshold) DO UPDATE SET
    bonus_points = EXCLUDED.bonus_points,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 4. 验证结果
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

-- 5. 检查索引
SELECT '=== 索引信息 ===' as info;
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'invitation_milestones'
    AND schemaname = 'public';

SELECT '=== 创建完成 ===' as status;