-- ========================================
-- 创建缺失的邀请系统表
-- ========================================

-- 1. 创建里程碑奖励配置表
CREATE TABLE IF NOT EXISTS invitation_milestones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    threshold INTEGER NOT NULL, -- 里程碑人数
    bonus_points INTEGER NOT NULL, -- 奖励点数
    description TEXT, -- 里程碑描述
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 插入默认里程碑奖励
INSERT INTO invitation_milestones (threshold, bonus_points, description, is_active)
VALUES
    (10, 100, '成功邀请10位朋友', true),
    (20, 300, '成功邀请20位朋友', true)
ON CONFLICT (threshold) DO UPDATE SET
    bonus_points = EXCLUDED.bonus_points,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 3. 检查并修复邀请码表结构（如果需要）
DO $$
BEGIN
    -- 检查是否有必要的列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitation_codes' AND column_name = 'qr_code_url'
    ) THEN
        ALTER TABLE invitation_codes ADD COLUMN qr_code_url TEXT;
    END IF;
END $$;

-- 4. 检查并修复邀请记录表结构（如果需要）
DO $$
BEGIN
    -- 检查是否有必要的列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitations' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE invitations ADD COLUMN ip_address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invitations' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE invitations ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- 5. 验证所有表都存在
SELECT '=== 表创建验证 ===' as info;

SELECT
    tablename as table_name,
    'table' as object_type
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename LIKE '%invite%'
UNION ALL
SELECT
    viewname as table_name,
    'view' as object_type
FROM pg_views
WHERE schemaname = 'public'
    AND viewname LIKE '%invite%'
ORDER BY table_name;

-- 6. 插入里程碑数据后的验证
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

-- 7. 创建必要的索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_invitation_milestones_threshold ON invitation_milestones(threshold);
CREATE INDEX IF NOT EXISTS idx_invitation_milestones_active ON invitation_milestones(is_active);

SELECT '=== 创建完成 ===' as status;