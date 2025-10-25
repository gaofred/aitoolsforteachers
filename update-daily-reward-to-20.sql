-- 更新每日签到奖励：从25点数调整为20点数
-- 在Supabase SQL编辑器中运行此脚本

-- 更新 add_daily_reward 函数，将奖励从25改为20
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

    -- 增加20积分（从25调整为20）
    new_points := current_points + 20;

    -- 更新积分记录
    UPDATE public.user_points
    SET points = new_points, last_updated = NOW()
    WHERE user_id = user_uuid;

    -- 创建交易记录
    INSERT INTO public.point_transactions (user_id, type, amount, description, created_at)
    VALUES (user_uuid, 'BONUS', 20, '每日登录奖励 - ' || TO_CHAR(NOW(), 'YYYY-MM-DD'), NOW());

    -- 返回成功结果
    RETURN json_build_object(
        'success', true,
        'message', '恭喜！获得每日登录奖励 20 积分',
        'pointsAdded', 20,
        'newPoints', new_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 确保权限正确
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO anon;

-- 验证函数更新成功
SELECT
    'Daily Reward Function Updated' as status,
    proname as function_name,
    'Reward amount changed from 25 to 20 points' as change_description
FROM pg_proc
WHERE proname = 'add_daily_reward';