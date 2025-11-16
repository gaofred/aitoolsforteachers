-- Supabase 数据库升级脚本
-- 在现有 supabase-setup.sql 基础上添加新功能
-- 在 Supabase SQL 编辑器中运行此脚本

-- 1. 添加缺失的字段到现有表
ALTER TABLE public.ai_generations 
ADD COLUMN IF NOT EXISTS tool_name TEXT,
ADD COLUMN IF NOT EXISTS model_type TEXT DEFAULT 'STANDARD' CHECK (model_type IN ('STANDARD', 'ADVANCED', 'PREMIUM'));

-- 2. 创建AI工具配置表
CREATE TABLE IF NOT EXISTS public.ai_tool_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tool_type TEXT UNIQUE NOT NULL,
    tool_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    standard_cost INTEGER NOT NULL,
    pro_cost INTEGER,
    is_pro_only BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 为兑换码表添加新的类型
ALTER TABLE public.redemption_codes 
DROP CONSTRAINT IF EXISTS redemption_codes_type_check;

ALTER TABLE public.redemption_codes 
ADD CONSTRAINT redemption_codes_type_check 
CHECK (type IN ('MEMBERSHIP_DAYS', 'POINTS', 'PURCHASE'));

-- 4. 为积分交易记录表添加新的类型
ALTER TABLE public.point_transactions 
DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE public.point_transactions 
ADD CONSTRAINT point_transactions_type_check 
CHECK (type IN ('REDEEM', 'GENERATE', 'REFUND', 'BONUS', 'PURCHASE', 'MEMBERSHIP'));

-- 5. 创建更新时间戳的触发器
CREATE TRIGGER update_ai_tool_configs_updated_at BEFORE UPDATE ON public.ai_tool_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 启用RLS
ALTER TABLE public.ai_tool_configs ENABLE ROW LEVEL SECURITY;

-- 7. 创建RLS策略
-- AI工具配置对所有认证用户可见
CREATE POLICY "Authenticated users can view tool configs" ON public.ai_tool_configs
    FOR SELECT USING (auth.role() = 'authenticated');

-- 8. 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_tool_configs_tool_type ON public.ai_tool_configs(tool_type);
CREATE INDEX IF NOT EXISTS idx_ai_tool_configs_category ON public.ai_tool_configs(category);
CREATE INDEX IF NOT EXISTS idx_ai_generations_tool_type ON public.ai_generations(tool_type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_model_type ON public.ai_generations(model_type);

-- 9. 创建新的数据库函数（从 supabase-functions.sql 中提取）
-- 扣除用户点数的函数
CREATE OR REPLACE FUNCTION deduct_user_points(
    p_user_id UUID,
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

-- 增加用户点数的函数
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id UUID,
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

-- 使用AI工具的函数
CREATE OR REPLACE FUNCTION use_ai_tool(
    p_user_id UUID,
    p_tool_type TEXT,
    p_tool_name TEXT,
    p_input_data JSONB,
    p_output_data JSONB,
    p_model_type TEXT,
    p_cost INTEGER
) RETURNS JSONB AS $$
DECLARE
    generation_id UUID;
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

-- 兑换码兑换函数
CREATE OR REPLACE FUNCTION redeem_code(
    p_user_id UUID,
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

-- 10. 创建用户统计视图
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

-- 11. 创建获取用户统计信息的函数
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    name TEXT,
    points INTEGER,
    membership_type TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    total_transactions BIGINT,
    total_earned BIGINT,
    total_spent BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM user_stats WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 12. 插入AI工具配置数据
INSERT INTO public.ai_tool_configs (tool_type, tool_name, description, category, standard_cost, pro_cost, is_pro_only, is_active) VALUES
-- 阅读教学工具
('text-analysis', '阅读文本深度分析', '输入英语文章，AI将提供详细的语言分析报告，包括词汇、语法、文体等多维度分析', 'reading', 3, 2, false, true),
('text-generator', '阅读文本生成神器', '输入主题和要求，AI将为您生成高质量的英语阅读文章，适合不同难度和学习目标', 'reading', 4, 3, false, true),
('cd-questions', 'CD篇改编', '改编阅读理解文章，生成适合教学的CD篇练习', 'reading', 5, 4, false, true),
('structure-analysis', '篇章结构分析', '分析文章结构，帮助学生理解文本组织方式', 'reading', 4, 3, false, true),
('cloze-adaptation', '完形填空改编与命题', '生成完形填空练习，支持多种难度和题型', 'reading', 6, 5, false, true),

-- 语法练习工具
('single-grammar-fill', '单句语法填空', '生成单句语法填空练习', 'grammar', 2, 1, false, true),
('grammar-generator', '单句语法填空生成器', 'AI生成语法练习，支持多种语法点', 'grammar', 4, 3, false, true),
('grammar-questions', '语法填空命题', '创建语法测试题目，支持批量生成', 'grammar', 5, 4, false, true),

-- 写作教学工具
('application-writing', '应用文高分范文', '生成应用文范文，包含评分标准和写作技巧', 'writing', 4, 3, false, true),
('application-lesson', '应用文学案', '创建应用文教学方案，包含教学目标和方法', 'writing', 6, 5, false, true),
('continuation-writing', '读后续写范文', '生成读后续写示例，提供写作指导', 'writing', 5, 4, false, true),
('continuation-lesson', '读后续写学案', '制作读后续写教学材料，包含练习和评估', 'writing', 7, 6, false, true),

-- 翻译与多媒体工具
('listening-generator', '英语听力生成器', '生成听力材料，支持多种语速和难度', 'translation', 8, 6, false, true),
('en-to-cn', '地道英译汉', '提供地道的中文翻译，保持原文风格', 'translation', 3, 2, false, true),
('multi-translation', '一句多译', '展示多种翻译方式，帮助学生理解语言多样性', 'translation', 4, 3, false, true),
('cn-to-en', '地道汉译英', '提供地道的英文翻译，符合英语表达习惯', 'translation', 3, 2, false, true),

-- 词汇学习工具
('vocabulary-practice', '词汇练习生成', '创建词汇练习，支持多种题型和难度', 'vocabulary', 3, 2, false, true),
('word-analysis', '词汇分析工具', '分析词汇使用，提供词汇学习建议', 'vocabulary', 4, 3, false, true)
ON CONFLICT (tool_type) DO UPDATE SET
    tool_name = EXCLUDED.tool_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    standard_cost = EXCLUDED.standard_cost,
    pro_cost = EXCLUDED.pro_cost,
    is_pro_only = EXCLUDED.is_pro_only,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 13. 插入示例兑换码
INSERT INTO public.redemption_codes (code, type, value, description, expires_at) VALUES
('WELCOME50', 'POINTS', 50, '新用户欢迎礼包', NOW() + INTERVAL '30 days'),
('PRO30', 'MEMBERSHIP_DAYS', 30, '30天Pro会员体验', NOW() + INTERVAL '7 days'),
('BONUS100', 'POINTS', 100, '节日福利点数', NOW() + INTERVAL '15 days'),
('STUDENT25', 'POINTS', 25, '学生专享福利', NOW() + INTERVAL '60 days')
ON CONFLICT (code) DO NOTHING;

-- 完成升级
SELECT 'Supabase数据库升级完成！' as message;









