-- ========================================
-- 邀请有礼系统数据库表结构
-- ========================================

-- 1. 邀请码表
-- 存储每个用户的邀请码和基础信息
CREATE TABLE invitation_codes (
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

-- 2. 邀请记录表
-- 详细记录每次邀请的状态和信息
CREATE TABLE invitations (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 防刷约束
    CONSTRAINT invitations_no_duplicate_pending UNIQUE (invited_email, status)
);

-- 3. 邀请奖励配置表
-- 系统奖励参数配置
CREATE TABLE invitation_rewards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    reward_type TEXT NOT NULL DEFAULT 'points',
    points_per_invitation INTEGER DEFAULT 30,
    max_rewards_per_user INTEGER DEFAULT 50,
    max_daily_registrations_per_ip INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.1. 里程碑奖励配置表
-- 支持多个里程碑奖励
CREATE TABLE invitation_milestones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    threshold INTEGER NOT NULL, -- 里程碑人数
    bonus_points INTEGER NOT NULL, -- 奖励点数
    description TEXT, -- 里程碑描述
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认里程碑奖励
INSERT INTO invitation_milestones (threshold, bonus_points, description, is_active) VALUES
    (10, 100, '成功邀请10位朋友', true),
    (20, 300, '成功邀请20位朋友', true);

-- 4. 邀请奖励发放记录表
-- 记录所有奖励发放详情
CREATE TABLE invitation_reward_payouts (
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

-- 5. 邀请统计视图
-- 方便查询邀请统计数据
CREATE VIEW invitation_stats AS
SELECT
    ic.id,
    ic.inviter_id,
    u.name as inviter_name,
    u.email as inviter_email,
    ic.code,
    ic.total_invitations,
    ic.successful_invitations,
    ic.created_at,
    COALESCE(SUM(irp.points_awarded), 0) as total_rewards_earned,
    COUNT(CASE WHEN i.status = 'registered' THEN 1 END) as pending_registrations,
    COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_invitations
FROM invitation_codes ic
LEFT JOIN users u ON ic.inviter_id = u.id
LEFT JOIN invitations i ON ic.id = i.invitation_code_id
LEFT JOIN invitation_reward_payouts irp ON i.id = irp.invitation_id
GROUP BY ic.id, u.name, u.email;

-- ========================================
-- 索引优化
-- ========================================

-- 邀请码表索引
CREATE INDEX idx_invitation_codes_inviter_id ON invitation_codes(inviter_id);
CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX idx_invitation_codes_active ON invitation_codes(is_active);

-- 邀请记录表索引
CREATE INDEX idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX idx_invitations_invited_user_id ON invitations(invited_user_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_ip_address ON invitations(ip_address);
CREATE INDEX idx_invitations_registered_at ON invitations(registered_at);

-- 奖励发放记录表索引
CREATE INDEX idx_invitation_reward_payouts_inviter_id ON invitation_reward_payouts(inviter_id);
CREATE INDEX idx_invitation_reward_payouts_invitation_id ON invitation_reward_payouts(invitation_id);

-- ========================================
-- 数据库函数
-- ========================================

-- 生成唯一邀请码的函数
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

-- 创建邀请码的函数
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

-- 处理邀请奖励的函数
CREATE OR REPLACE FUNCTION process_invitation_reward(
    p_invite_code TEXT,
    p_new_user_id UUID,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    invitation_code_id TEXT;
    inviter_id UUID;
    reward_config RECORD;
    points_to_award INTEGER := 0;
    bonus_points INTEGER := 0;
    total_points INTEGER := 0;
    transaction_id UUID;
    payout_id TEXT;
    description TEXT;
BEGIN
    -- 1. 查找邀请码
    SELECT ic.*, i.id as invitation_id
    INTO invitation_record
    FROM invitation_codes ic
    LEFT JOIN invitations i ON ic.id = i.invitation_code_id AND i.invited_user_id = p_new_user_id
    WHERE ic.code = p_invite_code AND ic.is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive invitation code');
    END IF;

    -- 2. 检查是否已经处理过
    IF invitation_record.invitation_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation already processed');
    END IF;

    invitation_code_id := invitation_record.id;
    inviter_id := invitation_record.inviter_id;

    -- 3. 获取奖励配置
    SELECT * INTO reward_config FROM invitation_rewards WHERE is_active = true LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active reward configuration');
    END IF;

    -- 4. 检查IP限制（防刷）
    IF p_ip_address IS NOT NULL THEN
        DECLARE
            today_registrations INTEGER;
        BEGIN
            SELECT COUNT(*) INTO today_registrations
            FROM invitations i
            WHERE i.ip_address = p_ip_address
              AND i.status IN ('registered', 'completed')
              AND DATE(i.created_at) = CURRENT_DATE;

            IF today_registrations >= reward_config.max_daily_registrations_per_ip THEN
                RETURN jsonb_build_object('success', false, 'error', 'Daily registration limit exceeded for this IP');
            END IF;
        END;
    END IF;

    -- 5. 检查邀请者奖励上限
    DECLARE
        total_rewards_given INTEGER;
    BEGIN
        SELECT COUNT(*) INTO total_rewards_given
        FROM invitation_reward_payouts
        WHERE inviter_id = inviter_id;

        IF total_rewards_given >= reward_config.max_rewards_per_user THEN
            RETURN jsonb_build_object('success', false, 'error', 'Inviter has reached maximum reward limit');
        END IF;
    END;

    -- 6. 创建邀请记录
    INSERT INTO invitations (
        invitation_code_id,
        inviter_id,
        invited_user_id,
        status,
        ip_address,
        user_agent,
        registered_at,
        completed_at
    ) VALUES (
        invitation_code_id,
        inviter_id,
        p_new_user_id,
        'completed',
        p_ip_address,
        p_user_agent,
        now(),
        now()
    ) RETURNING id INTO invitation_record.invitation_id;

    -- 7. 计算奖励
    points_to_award := reward_config.points_per_invitation;

    -- 检查是否有里程碑奖励
    DECLARE
        successful_invites INTEGER;
    BEGIN
        SELECT COUNT(*) INTO successful_invites
        FROM invitations i
        WHERE i.inviter_id = inviter_id
          AND i.status = 'completed';

        IF successful_invites = reward_config.bonus_points_threshold THEN
            bonus_points := reward_config.bonus_points_amount;
        END IF;
    END;

    total_points := points_to_award + bonus_points;

    -- 8. 发放积分奖励
    SELECT add_user_points(inviter_id, total_points, 'Invitation reward: ' || p_invite_code)
    INTO transaction_id;

    -- 9. 创建奖励发放记录
    description := '基础奖励: ' || points_to_award || '点';
    IF bonus_points > 0 THEN
        description := description || ', 里程碑奖励: ' || bonus_points || '点';
    END IF;

    INSERT INTO invitation_reward_payouts (
        invitation_id,
        inviter_id,
        invited_user_id,
        reward_type,
        points_awarded,
        bonus_applied,
        payout_description,
        transaction_id
    ) VALUES (
        invitation_record.invitation_id,
        inviter_id,
        p_new_user_id,
        'points',
        total_points,
        bonus_points > 0,
        description,
        transaction_id
    ) RETURNING id INTO payout_id;

    -- 10. 更新邀请码统计
    UPDATE invitation_codes
    SET
        successful_invitations = successful_invitations + 1,
        total_invitations = total_invitations + 1,
        updated_at = now()
    WHERE id = invitation_code_id;

    -- 返回成功结果
    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', invitation_record.invitation_id,
        'points_awarded', total_points,
        'base_points', points_to_award,
        'bonus_points', bonus_points,
        'transaction_id', transaction_id,
        'payout_id', payout_id
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 触发器
-- ========================================

-- 新用户注册时自动创建邀请码
CREATE OR REPLACE FUNCTION auto_create_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    -- 为新用户异步创建邀请码（使用事务安全的方式）
    PERFORM pg_notify('create_invitation_code', NEW.id::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_create_invitation_code ON users;
CREATE TRIGGER on_user_create_invitation_code
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_invitation_code();

-- ========================================
-- 行级安全策略 (RLS)
-- ========================================

-- 启用RLS
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_reward_payouts ENABLE ROW LEVEL SECURITY;

-- 邀请码表RLS策略
CREATE POLICY "Users can view their own invitation codes" ON invitation_codes
    FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "Users can insert their own invitation codes" ON invitation_codes
    FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- 邀请记录表RLS策略
CREATE POLICY "Users can view invitations related to them" ON invitations
    FOR SELECT USING (inviter_id = auth.uid() OR invited_user_id = auth.uid());

-- 奖励发放记录表RLS策略
CREATE POLICY "Users can view their own reward payouts" ON invitation_reward_payouts
    FOR SELECT USING (inviter_id = auth.uid());

-- ========================================
-- 初始数据
-- ========================================

-- 插入默认奖励配置
INSERT INTO invitation_rewards (
    reward_type,
    points_per_invitation,
    bonus_points_threshold,
    bonus_points_amount,
    max_rewards_per_user,
    max_daily_registrations_per_ip
) VALUES (
    'points',
    30,
    10,
    300,
    50,
    3
) ON CONFLICT DO NOTHING;

-- ========================================
-- 使用说明
-- ========================================

/*
创建邀请码：
SELECT create_invitation_code('user_id');

处理邀请奖励：
SELECT process_invitation_reward('INVITE_ABC_1234567890', 'new_user_id', '192.168.1.1', 'Mozilla/5.0...');

查询用户邀请统计：
SELECT * FROM invitation_stats WHERE inviter_id = 'user_id';

查询用户邀请记录：
SELECT * FROM invitations WHERE inviter_id = 'user_id' ORDER BY created_at DESC;

-- ========================================
-- 里程碑奖励计算函数
-- ========================================

-- 计算里程碑奖励的函数
CREATE OR REPLACE FUNCTION calculate_milestone_reward(p_inviter_id UUID)
RETURNS TABLE(
    threshold INTEGER,
    bonus_points INTEGER,
    description TEXT,
    is_achieved BOOLEAN
) AS $$
DECLARE
    current_invite_count INTEGER;
BEGIN
    -- 获取当前成功邀请人数
    SELECT COUNT(*) INTO current_invite_count
    FROM invitations
    WHERE inviter_id = p_inviter_id AND status = 'completed';

    -- 返回所有里程碑及其达成状态
    RETURN QUERY
    SELECT
        m.threshold,
        m.bonus_points,
        m.description,
        (current_invite_count >= m.threshold) as is_achieved
    FROM invitation_milestones m
    WHERE m.is_active = true
    ORDER BY m.threshold;
END;
$$ LANGUAGE plpgsql;

查询用户奖励记录：
SELECT * FROM invitation_reward_payouts WHERE inviter_id = 'user_id' ORDER BY created_at DESC;
*/