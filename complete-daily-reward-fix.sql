-- 完整修复每日奖励安全漏洞（修正PostgreSQL语法）
-- 在Supabase SQL编辑器中运行此脚本

-- 1. 创建健壮的每日奖励函数（包含完整事务和防重复检查）
DROP FUNCTION IF EXISTS public.claim_daily_reward(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.claim_daily_reward(
    p_user_id UUID,
    p_reward_points INTEGER DEFAULT 25
)
RETURNS JSON AS $$
DECLARE
    current_date TEXT;
    transaction_exists BOOLEAN;
    current_points INTEGER;
BEGIN
    -- 获取当前日期（北京时间）
    current_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD');

    -- 检查今天是否已经有交易记录（原子性检查）
    SELECT EXISTS (
        SELECT 1 FROM public.point_transactions
        WHERE user_id = p_user_id
        AND type = 'BONUS'
        AND description = '每日登录奖励 - ' || current_date
    ) INTO transaction_exists;

    -- 如果今日已经领取，返回错误
    IF transaction_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', '今天已经领取过每日奖励了',
            'alreadyClaimed', true
        );
    END IF;

    -- 获取当前积分
    SELECT COALESCE(points, 0) INTO current_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    -- 更新积分（使用INSERT ON CONFLICT确保原子性）
    INSERT INTO public.user_points (user_id, points, last_updated)
    VALUES (p_user_id, current_points + p_reward_points, NOW())
    ON CONFLICT (user_id) DO UPDATE
        SET points = points + p_reward_points, last_updated = NOW();

    -- 记录交易
    INSERT INTO public.point_transactions (user_id, type, amount, description, created_at)
    VALUES (p_user_id, 'BONUS', p_reward_points, '每日登录奖励 - ' || current_date, NOW());

    -- 返回成功结果
    RETURN json_build_object(
        'success', true,
        'message', '恭喜！获得每日登录奖励 ' || p_reward_points || ' 积分',
        'pointsAdded', p_reward_points,
        'newPoints', current_points + p_reward_points,
        'date', current_date
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', '发放奖励失败: ' || SQLERRM,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权函数
GRANT EXECUTE ON FUNCTION public.claim_daily_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_reward TO anon;

-- 创建检查函数，防止客户端绕过验证
CREATE OR REPLACE FUNCTION public.has_claimed_today(
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    current_date TEXT;
BEGIN
    current_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD');

    RETURN EXISTS (
        SELECT 1 FROM public.point_transactions
        WHERE user_id = p_user_id
        AND type = 'BONUS'
        AND description = '每日登录奖励 - ' || current_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 优化索引，提升查询性能
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_date
ON public.point_transactions(user_id, type, description);

CREATE INDEX IF NOT EXISTS idx_user_points_user_id
ON public.user_points(user_id, points);

-- 验证函数创建
SELECT
    'Complete Security Functions Created' as info,
    proname as function_name,
    'Status' as status
FROM pg_proc
WHERE proname IN ('claim_daily_reward', 'has_claimed_today')
ORDER BY proname;

-- 创建一个简单的每日奖励状态检查API使用的表（可选优化）
CREATE TABLE IF NOT EXISTS public.daily_reward_status (
    user_id UUID PRIMARY KEY,
    last_claimed_date TEXT,
    claim_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建触发器自动维护状态表
CREATE OR REPLACE FUNCTION public.update_daily_reward_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.daily_reward_status (user_id, last_claimed_date, claim_count, updated_at)
    VALUES (
        NEW.id,
        TO_CHAR(NOW() AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD'),
        1,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        last_claimed_date = EXCLUDED.last_claimed_date,
        claim_count = claim_count + 1,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS update_daily_reward_status_trigger ON public.point_transactions;
CREATE TRIGGER update_daily_reward_status_trigger
    AFTER INSERT ON public.point_transactions
    FOR EACH ROW
    WHEN (NEW.type = 'BONUS' AND NEW.description LIKE '每日登录奖励-%')
    EXECUTE FUNCTION public.update_daily_reward_status();

-- 清理用户状态表，只保留最近30天的数据
DELETE FROM public.daily_reward_status
WHERE updated_at < NOW() - INTERVAL '30 days';

-- 查看用户当前积分状态和安全警告
SELECT
    'Current User Points Status' as info,
    u.email as user_email,
    up.points as current_points,
    up.last_updated as last_updated,
    drs.claim_count as total_claims,
    drs.last_claimed_date as last_claimed,
    CASE
        WHEN up.points >= 200 THEN '🚨 CRITICAL SECURITY RISK'
        WHEN up.points >= 100 THEN '⚠️ HIGH SECURITY RISK'
        WHEN up.points >= 50 THEN '⚠️ Warning: High points'
        ELSE '✅ Normal'
    END as security_status,
    CASE
        WHEN drs.claim_count >= 3 AND drs.last_claimed_date = TO_CHAR(NOW() AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') THEN '🚨 CRITICAL: Multiple claims today!'
        WHEN drs.claim_count >= 2 AND drs.last_claimed_date = TO_CHAR(NOW() AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') THEN '⚠️ Warning: Multiple claims today'
        ELSE '✅ Normal'
    END as claim_status
FROM public.users u
JOIN public.user_points up ON u.id = up.user_id
LEFT JOIN public.daily_reward_status drs ON u.id = drs.user_id
ORDER BY up.last_updated DESC
LIMIT 5;