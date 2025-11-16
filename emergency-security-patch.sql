-- 紧急安全补丁：立即停止每日奖励漏洞
-- 在Supabase SQL编辑器中立即执行此脚本

-- 1. 立即删除有问题的函数，停止安全漏洞
DROP FUNCTION IF EXISTS public.add_daily_reward CASCADE;
DROP FUNCTION IF EXISTS public.add_daily_reward_simple CASCADE;

-- 2. 创建临时的安全函数（拒绝所有请求）
CREATE OR REPLACE FUNCTION public.add_daily_reward(
    user_uuid UUID,
    p_current_points INTEGER DEFAULT 0,
    p_reward_points INTEGER DEFAULT 25
)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'success', false,
        'message', '每日奖励功能正在维护中，请稍后再试',
        'error', 'TEMPORARY_SECURITY_PATCH'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO anon;

-- 3. 创建简单的防重复检查函数
CREATE OR REPLACE FUNCTION public.check_daily_reward_status(
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    today_claimed BOOLEAN;
    current_date TEXT;
BEGIN
    current_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD');

    -- 检查今天是否已经领取过
    SELECT EXISTS (
        SELECT 1 FROM public.point_transactions
        WHERE user_id = p_user_id
        AND type = 'BONUS'
        AND description = '每日登录奖励 - ' || current_date
    ) INTO today_claimed;

    RETURN json_build_object(
        'hasClaimedToday', today_claimed,
        'message', CASE
            WHEN today_claimed THEN '今天已经领取过奖励了'
            ELSE '可以领取今日奖励'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权
GRANT EXECUTE ON FUNCTION public.check_daily_reward_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_daily_reward_status TO anon;

-- 4. 查看当前状态
SELECT
    'Emergency Security Patch Applied' as status,
    'Daily reward function disabled' as action,
    NOW() as patch_time;

-- 5. 显示当前积分最高的用户（安全监控）
SELECT
    u.email,
    up.points,
    up.last_updated,
    CASE
        WHEN up.points > 100 THEN '🚨 SECURITY ALERT - High Points'
        WHEN up.points > 50 THEN '⚠️ Warning - Elevated Points'
        ELSE '✅ Normal'
    END as security_status
FROM public.users u
JOIN public.user_points up ON u.id = up.user_id
ORDER BY up.points DESC
LIMIT 10;