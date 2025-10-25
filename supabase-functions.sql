-- Supabase数据库函数和触发器
-- 用于处理点数管理、AI工具使用等业务逻辑

-- 1. 扣除用户点数的函数
CREATE OR REPLACE FUNCTION deduct_user_points(
    p_user_id TEXT,
    p_amount INTEGER,
    p_description TEXT,
    p_related_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_points INTEGER;
BEGIN
    -- 获取当前点数
    SELECT points INTO current_points 
    FROM user_points 
    WHERE user_id = p_user_id;
    
    -- 检查点数是否足够
    IF current_points IS NULL OR current_points < p_amount THEN
        RAISE EXCEPTION '点数不足';
    END IF;
    
    -- 扣除点数
    UPDATE user_points 
    SET points = points - p_amount,
        last_updated = NOW()
    WHERE user_id = p_user_id;
    
    -- 记录交易
    INSERT INTO point_transactions (
        user_id, type, amount, description, related_id, metadata
    ) VALUES (
        p_user_id, 'GENERATE', -p_amount, p_description, p_related_id, p_metadata
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2. 增加用户点数的函数
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id TEXT,
    p_amount INTEGER,
    p_type TEXT,
    p_description TEXT,
    p_related_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- 增加点数（使用upsert）
    INSERT INTO user_points (user_id, points)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        points = user_points.points + p_amount,
        last_updated = NOW();
    
    -- 记录交易
    INSERT INTO point_transactions (
        user_id, type, amount, description, related_id, metadata
    ) VALUES (
        p_user_id, p_type, p_amount, p_description, p_related_id, p_metadata
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. 使用AI工具的函数
CREATE OR REPLACE FUNCTION use_ai_tool(
    p_user_id TEXT,
    p_tool_type TEXT,
    p_tool_name TEXT,
    p_input_data JSONB,
    p_output_data JSONB,
    p_model_type TEXT,
    p_cost INTEGER
) RETURNS JSONB AS $$
DECLARE
    generation_id TEXT;
    result JSONB;
BEGIN
    -- 扣除点数
    PERFORM deduct_user_points(
        p_user_id, 
        p_cost, 
        '使用' || p_tool_name,
        NULL,
        jsonb_build_object(
            'tool_type', p_tool_type,
            'model_type', p_model_type
        )
    );
    
    -- 创建AI生成记录
    INSERT INTO ai_generations (
        user_id, tool_type, tool_name, input_data, output_data, 
        model_type, points_cost, status
    ) VALUES (
        p_user_id, p_tool_type, p_tool_name, p_input_data, p_output_data,
        p_model_type, p_cost, 'COMPLETED'
    ) RETURNING id INTO generation_id;
    
    -- 返回结果
    result := jsonb_build_object(
        'generation_id', generation_id,
        'success', true
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. 兑换码兑换函数
CREATE OR REPLACE FUNCTION redeem_code(
    p_user_id TEXT,
    p_code TEXT
) RETURNS JSONB AS $$
DECLARE
    redemption_record RECORD;
    result JSONB;
    message TEXT;
BEGIN
    -- 查找兑换码
    SELECT * INTO redemption_record 
    FROM redemption_codes 
    WHERE code = p_code;
    
    -- 检查兑换码是否存在
    IF redemption_record IS NULL THEN
        RAISE EXCEPTION '兑换码不存在';
    END IF;
    
    -- 检查是否已使用
    IF redemption_record.is_used THEN
        RAISE EXCEPTION '兑换码已被使用';
    END IF;
    
    -- 检查是否过期
    IF redemption_record.expires_at IS NOT NULL AND redemption_record.expires_at < NOW() THEN
        RAISE EXCEPTION '兑换码已过期';
    END IF;
    
    -- 标记兑换码为已使用
    UPDATE redemption_codes 
    SET is_used = TRUE, used_by = p_user_id, used_at = NOW()
    WHERE id = redemption_record.id;
    
    -- 根据类型处理兑换
    IF redemption_record.type = 'POINTS' THEN
        -- 增加点数
        PERFORM add_user_points(
            p_user_id,
            redemption_record.value,
            'REDEEM',
            '兑换码兑换: ' || p_code,
            redemption_record.id,
            jsonb_build_object('code', p_code)
        );
        
        message := '兑换成功！获得 ' || redemption_record.value || ' 点数';
        
    ELSIF redemption_record.type = 'MEMBERSHIP_DAYS' THEN
        -- 增加会员天数
        INSERT INTO memberships (user_id, membership_type, expires_at, is_active)
        VALUES (p_user_id, 'PREMIUM', NOW() + INTERVAL '1 day' * redemption_record.value, TRUE)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            membership_type = 'PREMIUM',
            expires_at = GREATEST(memberships.expires_at, NOW()) + INTERVAL '1 day' * redemption_record.value,
            is_active = TRUE;
        
        -- 记录交易
        INSERT INTO point_transactions (
            user_id, type, amount, description, related_id, metadata
        ) VALUES (
            p_user_id, 'MEMBERSHIP', 0, '兑换码兑换会员: ' || p_code, 
            redemption_record.id, jsonb_build_object('code', p_code, 'days', redemption_record.value)
        );
        
        message := '兑换成功！获得 ' || redemption_record.value || ' 天会员';
    END IF;
    
    -- 返回结果
    result := jsonb_build_object(
        'success', true,
        'message', message
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. 创建触发器：自动创建用户点数记录
CREATE OR REPLACE FUNCTION create_user_points_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- 为新用户创建点数记录
    INSERT INTO user_points (user_id, points)
    VALUES (NEW.id, 25); -- 新用户赠送25点数
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_create_user_points ON users;
CREATE TRIGGER trigger_create_user_points
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_points_on_signup();

-- 6. 创建触发器：自动创建会员记录
CREATE OR REPLACE FUNCTION create_membership_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- 为新用户创建免费会员记录
    INSERT INTO memberships (user_id, membership_type, is_active)
    VALUES (NEW.id, 'FREE', TRUE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_create_membership ON users;
CREATE TRIGGER trigger_create_membership
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_membership_on_signup();

-- 7. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at ON point_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id_created_at ON ai_generations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_tool_configs_tool_type ON ai_tool_configs(tool_type);
CREATE INDEX IF NOT EXISTS idx_ai_tool_configs_category ON ai_tool_configs(category);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);

-- 8. 启用行级安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tool_configs ENABLE ROW LEVEL SECURITY;

-- 9. 创建RLS策略
-- 用户只能访问自己的数据
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can view own points" ON user_points
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own memberships" ON memberships
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own transactions" ON point_transactions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own generations" ON ai_generations
    FOR SELECT USING (auth.uid()::text = user_id);

-- AI工具配置对所有认证用户可见
CREATE POLICY "Authenticated users can view tool configs" ON ai_tool_configs
    FOR SELECT USING (auth.role() = 'authenticated');

-- 兑换码策略
CREATE POLICY "Users can view unused redemption codes" ON redemption_codes
    FOR SELECT USING (is_used = FALSE);

-- 10. 创建视图：用户统计信息
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    up.points,
    m.membership_type,
    m.expires_at,
    COUNT(pt.id) as total_transactions,
    COALESCE(SUM(CASE WHEN pt.amount > 0 THEN pt.amount ELSE 0 END), 0) as total_earned,
    COALESCE(SUM(CASE WHEN pt.amount < 0 THEN ABS(pt.amount) ELSE 0 END), 0) as total_spent
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id
LEFT JOIN memberships m ON u.id = m.user_id AND m.is_active = TRUE
LEFT JOIN point_transactions pt ON u.id = pt.user_id
GROUP BY u.id, u.email, u.name, up.points, m.membership_type, m.expires_at;

-- 11. 创建函数：获取用户统计信息
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id TEXT)
RETURNS TABLE(
    user_id TEXT,
    email TEXT,
    name TEXT,
    points INTEGER,
    membership_type TEXT,
    expires_at TIMESTAMP,
    total_transactions BIGINT,
    total_earned BIGINT,
    total_spent BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM user_stats WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 12. 创建触发器：处理Supabase Auth用户创建
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 在auth.users表插入新用户时，同步创建我们的用户记录
    INSERT INTO public.users (
        id,
        email,
        name,
        avatar_url,
        provider,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.app_metadata->>'provider', 'email'),
        NEW.email_confirmed_at,
        NEW.created_at,
        NEW.updated_at
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：监听Supabase Auth用户创建
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
