-- 优化数据库函数：减少连接和查询时间
-- 在Supabase SQL编辑器中运行此脚本

-- 删除旧的函数（重新创建优化版本）
DROP FUNCTION IF EXISTS public.add_daily_reward(UUID) CASCADE;

-- 创建优化的每日奖励函数（减少查询步骤）
CREATE OR REPLACE FUNCTION public.add_daily_reward(user_uuid UUID)
RETURNS JSON AS $$
BEGIN
    -- 直接更新积分，不需要单独查询
    UPDATE public.user_points
    SET points = points + 25, last_updated = NOW()
    WHERE user_id = user_uuid
    RETURNING points;

    -- 如果没有找到记录，创建新记录
    IF NOT FOUND THEN
        INSERT INTO public.user_points (user_id, points, last_updated)
        VALUES (user_uuid, 25, NOW())
        RETURNING points;
    END IF;

    -- 记录交易（使用当前日期）
    INSERT INTO public.point_transactions (user_id, type, amount, description, created_at)
    VALUES (user_uuid, 'BONUS', 25, '每日登录奖励 - ' || TO_CHAR(NOW(), 'YYYY-MM-DD'), NOW());

    -- 返回成功结果
    RETURN json_build_object(
        'success', true,
        'message', '恭喜！获得每日登录奖励 25 积分',
        'pointsAdded', 25
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', '发放奖励失败: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权调用
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_reward TO anon;

-- 创建一个简化版本的积分查询函数
CREATE OR REPLACE FUNCTION public.get_current_points(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    current_points INTEGER;
BEGIN
    SELECT points INTO current_points
    FROM public.user_points
    WHERE user_id = user_uuid;

    RETURN COALESCE(current_points, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_current_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_points TO anon;

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_points_user_id_updated
ON public.user_points(user_id, last_updated);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_date
ON public.point_transactions(user_id, created_at);

-- 验证函数创建
SELECT
    'Optimized Functions Created' as status,
    proname as function_name
FROM pg_proc
WHERE proname IN ('add_daily_reward', 'get_current_points')
ORDER BY proname;