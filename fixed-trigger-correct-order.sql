-- 修复触发器：确保正确的插入顺序（先users再user_points）
-- 在Supabase SQL编辑器中运行此脚本

-- 删除旧的触发器函数
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 重新创建触发器函数，确保正确的插入顺序
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

    -- 2. 然后创建积分记录（0积分）
    INSERT INTO public.user_points (user_id, points, last_updated)
    VALUES (NEW.id, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. 最后创建会员记录
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
    'Trigger Function Fixed' as status,
    proname as function_name
FROM pg_proc
WHERE proname = 'handle_new_user';

SELECT
    'Trigger Fixed' as status,
    tgname as trigger_name,
    tgenabled as is_enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';