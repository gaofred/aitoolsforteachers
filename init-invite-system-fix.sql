-- ========================================
-- 邀请系统数据库修复脚本
-- 检查并创建缺失的表和数据
-- ========================================

-- 1. 检查现有表
SELECT '=== 现有表检查 ===' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%invite%' ORDER BY tablename;

-- 2. 创建邀请码表（如果不存在）
CREATE TABLE IF NOT EXISTS invitation_codes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    invite_url TEXT NOT NULL,
    qr_code_url TEXT,
    total_invitations INTEGER DEFAULT 0,
    successful_invitations INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建邀请记录表（如果不存在）
CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    invitation_code_id TEXT NOT NULL REFERENCES invitation_codes(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_email TEXT,
    invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'completed', 'expired')),
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    landing_page TEXT,
    registered_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 创建邀请奖励配置表（如果不存在）
CREATE TABLE IF NOT EXISTS invitation_rewards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    reward_type TEXT NOT NULL DEFAULT 'points',
    points_per_invitation INTEGER DEFAULT 30,
    max_rewards_per_user INTEGER DEFAULT 50,
    max_daily_registrations_per_ip INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 创建里程碑奖励配置表（如果不存在）
CREATE TABLE IF NOT EXISTS invitation_milestones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    threshold INTEGER NOT NULL, -- 里程碑人数
    bonus_points INTEGER NOT NULL, -- 奖励点数
    description TEXT, -- 里程碑描述
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 创建邀请奖励发放记录表（如果不存在）
CREATE TABLE IF NOT EXISTS invitation_reward_payouts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    invitation_id TEXT NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reward_type TEXT NOT NULL,
    points_awarded INTEGER NOT NULL,
    bonus_applied BOOLEAN DEFAULT false,
    payout_description TEXT,
    transaction_id UUID REFERENCES point_transactions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_invitation_codes_inviter_id ON invitation_codes(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_user_id ON invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- 8. 插入基础数据
-- 插入奖励配置
INSERT INTO invitation_rewards (reward_type, points_per_invitation, max_rewards_per_user, max_daily_registrations_per_ip, is_active)
VALUES ('points', 30, 50, 3, true)
ON CONFLICT DO NOTHING;

-- 插入里程碑奖励
INSERT INTO invitation_milestones (threshold, bonus_points, description, is_active)
VALUES
    (10, 100, '成功邀请10位朋友', true),
    (20, 300, '成功邀请20位朋友', true)
ON CONFLICT (threshold) DO UPDATE SET
    bonus_points = EXCLUDED.bonus_points,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 9. 创建生成唯一邀请码的函数（如果不存在）
CREATE OR REPLACE FUNCTION generate_unique_invitation_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    max_attempts INTEGER := 10;
    attempts INTEGER := 0;
BEGIN
    LOOP
        attempts := attempts + 1;

        -- 生成邀请码：INVITE_用户hash_时间戳
        new_code := 'INVITE_' ||
                   encode(gen_random_bytes(3), 'hex') || '_' ||
                   extract(epoch from now())::bigint::text;

        -- 检查是否已存在
        IF NOT EXISTS (SELECT 1 FROM invitation_codes WHERE code = new_code) THEN
            EXIT;
        END IF;

        -- 超过最大尝试次数则抛出异常
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique invitation code after % attempts', max_attempts;
        END IF;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 10. 创建邀请码的函数（如果不存在）
CREATE OR REPLACE FUNCTION create_invitation_code(p_inviter_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    invite_url TEXT;
    invitation_id TEXT;
BEGIN
    -- 生成唯一邀请码
    new_code := generate_unique_invitation_code();

    -- 构建邀请链接，指向重定向页面
    invite_url := 'https://aitoolsforteachers.net/invite/redirect?invite_code=' || new_code;

    -- 创建邀请码记录
    INSERT INTO invitation_codes (
        inviter_id,
        code,
        invite_url
    ) VALUES (
        p_inviter_id,
        new_code,
        invite_url
    ) RETURNING id INTO invitation_id;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 11. 验证结果
SELECT '=== 创建结果验证 ===' as info;
SELECT 'invitation_codes' as table_name, COUNT(*) as record_count FROM invitation_codes
UNION ALL
SELECT 'invitations' as table_name, COUNT(*) as record_count FROM invitations
UNION ALL
SELECT 'invitation_rewards' as table_name, COUNT(*) as record_count FROM invitation_rewards
UNION ALL
SELECT 'invitation_milestones' as table_name, COUNT(*) as record_count FROM invitation_milestones
UNION ALL
SELECT 'invitation_reward_payouts' as table_name, COUNT(*) as record_count FROM invitation_reward_payouts;

-- 12. 检查里程碑配置
SELECT '=== 里程碑奖励配置 ===' as info;
SELECT threshold, bonus_points, description, is_active
FROM invitation_milestones
WHERE is_active = true
ORDER BY threshold;

SELECT '=== 数据库修复完成 ===' as status;