-- 更新每日签到奖励：调整为10点数
-- 在Supabase SQL编辑器中运行此脚本

-- 删除旧的函数（如果存在）
DROP FUNCTION IF EXISTS public.add_daily_reward(user_uuid UUID);

-- 重新创建函数，奖励改为10点数
CREATE OR REPLACE FUNCTION public.add_daily_reward(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    current_points INTEGER;
    new_points INTEGER;
BEGIN
    -- 获取当前积分
    SELECT points INTO current_points
    FROM public.user_points
    WHERE user_id = user_uuid;

    -- 如果没有找到记录，返回错误
    IF current_points IS NULL THEN
        RETURN json_build_object('success', false, 'message', '找不到用户积分记录');
    END IF;

    -- 增加10积分
    new_points := current_points + 10;

    -- 更新积分记录
    UPDATE public.user_points
    SET points = new_points, last_updated = NOW()
    WHERE user_id = user_uuid;

    -- 创建交易记录
    INSERT INTO public.point_transactions (user_id, type, amount, description, created_at)
    VALUES (user_uuid, 'BONUS', 10, '每日登录奖励 - ' || TO_CHAR(NOW(), 'YYYY-MM-DD'), NOW());

    -- 返回成功结果
    RETURN json_build_object(
        'success', true,
        'message', '恭喜！获得每日登录奖励 10 积分',
        'pointsAdded', 10,
        'newPoints', new_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确保权限正确
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO anon;

-- 验证函数更新成功
SELECT
    'Daily Reward Function Updated to 10 points' as status,
    proname as function_name
FROM pg_proc
WHERE proname = 'add_daily_reward';








