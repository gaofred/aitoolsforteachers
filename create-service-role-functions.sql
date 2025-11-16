-- 创建使用Service Role的函数来绕过RLS限制
-- 在Supabase SQL编辑器中运行此脚本

-- 创建一个函数来更新用户积分（使用service role权限）
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

    -- 增加25积分
    new_points := current_points + 25;

    -- 更新积分记录
    UPDATE public.user_points
    SET points = new_points, last_updated = NOW()
    WHERE user_id = user_uuid;

    -- 创建交易记录
    INSERT INTO public.point_transactions (user_id, type, amount, description, created_at)
    VALUES (user_uuid, 'BONUS', 25, '每日登录奖励 - ' || TO_CHAR(NOW(), 'YYYY-MM-DD'), NOW());

    -- 返回成功结果
    RETURN json_build_object(
        'success', true,
        'message', '恭喜！获得每日登录奖励 25 积分',
        'pointsAdded', 25,
        'newPoints', new_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权认证用户调用这个函数
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO anon;

-- 创建一个函数来获取用户积分
CREATE OR REPLACE FUNCTION public.get_user_points(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    user_points_record RECORD;
BEGIN
    -- 获取用户积分记录
    SELECT * INTO user_points_record
    FROM public.user_points
    WHERE user_id = user_uuid;

    -- 如果没有找到记录，返回null
    IF user_points_record IS NULL THEN
        RETURN json_build_object('points', 0, 'last_updated', NULL);
    END IF;

    -- 返回积分信息
    RETURN json_build_object(
        'points', user_points_record.points,
        'last_updated', user_points_record.last_updated
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权认证用户调用这个函数
GRANT EXECUTE ON FUNCTION public.get_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_points TO anon;

-- 验证函数创建成功
SELECT
    'Service Role Functions Created' as status,
    proname as function_name,
    prosrc as function_source
FROM pg_proc
WHERE proname IN ('add_daily_reward', 'get_user_points')
ORDER BY proname;