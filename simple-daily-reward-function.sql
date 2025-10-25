-- 简化的每日奖励数据库函数
-- 在Supabase SQL编辑器中运行此脚本

-- 删除有问题的函数
DROP FUNCTION IF EXISTS public.add_daily_reward(UUID) CASCADE;

-- 创建一个简单的版本
CREATE OR REPLACE FUNCTION public.add_daily_reward_simple(
    p_user_id UUID,
    p_current_points INTEGER,
    p_reward_points INTEGER DEFAULT 25
)
RETURNS JSON AS $$
BEGIN
    -- 直接更新积分
    UPDATE public.user_points
    SET points = points + p_reward_points, last_updated = NOW()
    WHERE user_id = p_user_id
    RETURNING points;

    -- 如果没有记录，创建新记录
    IF NOT FOUND THEN
        INSERT INTO public.user_points (user_id, points, last_updated)
        VALUES (p_user_id, p_current_points + p_reward_points, NOW())
        RETURNING points;
    END IF;

    -- 记录交易
    INSERT INTO public.point_transactions (user_id, type, amount, description, created_at)
    VALUES (p_user_id, 'BONUS', p_reward_points, '每日登录奖励 - ' || TO_CHAR(NOW(), 'YYYY-MM-DD'), NOW());

    -- 返回成功结果
    RETURN json_build_object(
        'success', true,
        'message', '恭喜！获得每日登录奖励 ' || p_reward_points || ' 积分',
        'pointsAdded', p_reward_points
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', '发放奖励失败: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权
GRANT EXECUTE ON FUNCTION public.add_daily_reward_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_reward_simple TO anon;

-- 验证函数创建
SELECT
    'Simple Function Created' as status,
    proname as function_name
FROM pg_proc
WHERE proname = 'add_daily_reward_simple';