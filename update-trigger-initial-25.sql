-- 更新触发器：新用户初始积分改为25
-- 在Supabase SQL编辑器中运行此脚本

-- 删除旧的触发器函数
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 重新创建触发器函数，新用户初始25积分
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. 先创建用户扩展信息
    INSERT INTO public.users (id, email, name, avatar_url, provider, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        CASE
            WHEN NEW.provider = 'google' THEN 'google'
            ELSE 'email'
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. 创建初始积分记录（25积分）
    INSERT INTO public.user_points (user_id, points, last_updated)
    VALUES (NEW.id, 25, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. 创建会员记录
    INSERT INTO public.memberships (user_id, membership_type, is_active, created_at, updated_at)
    VALUES (NEW.id, 'FREE', true, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 验证触发器创建成功
SELECT
    'Trigger Updated - Initial Points: 25' as status,
    proname as function_name
FROM pg_proc
WHERE proname = 'handle_new_user';