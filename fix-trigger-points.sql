-- 修复数据库触发器：新用户初始积分改为0
-- 在Supabase SQL编辑器中运行此脚本

-- 删除旧的触发器函数
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 重新创建触发器函数，新用户初始0积分
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 创建用户扩展信息
    INSERT INTO public.users (id, email, name, avatar_url, provider)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url',
        CASE
            WHEN NEW.provider = 'google' THEN 'google'
            ELSE 'email'
        END
    );

    -- 创建初始积分记录（0积分）
    INSERT INTO public.user_points (user_id, points)
    VALUES (NEW.id, 0);

    -- 创建默认会员记录
    INSERT INTO public.memberships (user_id, membership_type)
    VALUES (NEW.id, 'FREE');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 验证触发器创建成功
SELECT
    'Trigger Function Created' as status,
    proname as function_name,
    provolatile as is_volatile
FROM pg_proc
WHERE proname = 'handle_new_user';

SELECT
    'Trigger Created' as status,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as is_enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';