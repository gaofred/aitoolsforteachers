-- 修复邀请奖励函数中的歧义问题

-- 删除并重新创建 process_invitation_reward 函数
DROP FUNCTION IF EXISTS process_invitation_reward;

CREATE OR REPLACE FUNCTION process_invitation_reward(
    p_invite_code TEXT,
    p_new_user_id UUID,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    invitation_code_record RECORD;
    invitation_id UUID;
    inviter_id UUID;
    reward_config RECORD;
    points_to_award INTEGER := 0;
    bonus_points INTEGER := 0;
    total_points INTEGER := 0;
    transaction_id UUID;
    payout_id UUID;
    description TEXT;
BEGIN
    -- 1. 查找邀请码
    SELECT ic.*
    INTO invitation_code_record
    FROM invitation_codes ic
    WHERE ic.code = p_invite_code AND ic.is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or inactive invitation code');
    END IF;

    -- 2. 检查是否已经处理过
    SELECT i.id INTO invitation_id
    FROM invitations i
    WHERE i.invitation_code_id = invitation_code_record.id AND i.invited_user_id = p_new_user_id;

    IF invitation_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation already processed for this user');
    END IF;

    inviter_id := invitation_code_record.inviter_id;

    -- 3. 获取奖励配置（如果没有配置表，使用默认值）
    BEGIN
        SELECT * INTO reward_config FROM invitation_rewards WHERE is_active = true LIMIT 1;

        IF NOT FOUND THEN
            -- 使用默认奖励配置
            reward_config := ROW(30, 10, 300, true); -- points_per_invitation, bonus_points_threshold, bonus_points_amount, is_active
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- 如果表不存在，使用默认配置
        reward_config := ROW(30, 10, 300, true);
    END;

    -- 4. 检查IP限制（防刷）
    IF p_ip_address IS NOT NULL THEN
        DECLARE
            today_registrations INTEGER;
        BEGIN
            SELECT COUNT(*) INTO today_registrations
            FROM invitations
            WHERE ip_address = p_ip_address
              AND DATE(registered_at) = CURRENT_DATE;

            IF today_registrations >= 5 THEN
                RETURN jsonb_build_object('success', false, 'error', 'Too many registrations from this IP today');
            END IF;
        END;
    END IF;

    -- 5. 检查用户是否自己邀请自己
    IF inviter_id = p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot invite yourself');
    END IF;

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
        invitation_code_record.id,
        inviter_id,
        p_new_user_id,
        'completed',
        p_ip_address,
        p_user_agent,
        now(),
        now()
    ) RETURNING id INTO invitation_id;

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
        invitation_id,
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
    WHERE id = invitation_code_record.id;

    -- 11. 返回成功结果
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'invitation_id', invitation_id,
            'payout_id', payout_id,
            'transaction_id', transaction_id,
            'pointsAwarded', total_points,
            'basePoints', points_to_award,
            'bonusPoints', bonus_points,
            'inviterName', (SELECT name FROM users WHERE id = inviter_id)
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 创建简化的奖励配置表（如果不存在）
CREATE TABLE IF NOT EXISTS invitation_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    points_per_invitation INTEGER NOT NULL DEFAULT 30,
    bonus_points_threshold INTEGER NOT NULL DEFAULT 10,
    bonus_points_amount INTEGER NOT NULL DEFAULT 300,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 插入默认奖励配置
INSERT INTO invitation_rewards (points_per_invitation, bonus_points_threshold, bonus_points_amount, is_active)
VALUES (30, 10, 300, true)
ON CONFLICT DO NOTHING;

-- 验证函数创建成功
SELECT 'process_invitation_reward 函数修复成功' as status;