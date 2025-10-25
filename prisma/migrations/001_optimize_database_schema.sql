-- 数据库架构优化迁移
-- 基于用户需求优化数据库布局

-- 1. 为 AIGeneration 表添加新字段
ALTER TABLE ai_generations 
ADD COLUMN IF NOT EXISTS tool_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS model_type VARCHAR(50) DEFAULT 'STANDARD';

-- 2. 创建 AI 工具配置表
CREATE TABLE IF NOT EXISTS ai_tool_configs (
    id VARCHAR(255) PRIMARY KEY,
    tool_type VARCHAR(255) UNIQUE NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    standard_cost INTEGER NOT NULL,
    pro_cost INTEGER,
    is_pro_only BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 插入默认的 AI 工具配置数据
INSERT INTO ai_tool_configs (id, tool_type, tool_name, description, category, standard_cost, pro_cost, is_pro_only) VALUES
('text-analysis', 'text-analysis', '阅读文本深度分析', '输入英语文章，AI将提供详细的语言分析报告', 'reading', 3, 2, false),
('text-generator', 'text-generator', '阅读文本生成神器', '输入主题和要求，AI将为您生成高质量的英语阅读文章', 'reading', 4, 3, false),
('cd-questions', 'cd-questions', 'CD篇改编', '改编阅读理解文章', 'reading', 5, 4, false),
('structure-analysis', 'structure-analysis', '篇章结构分析', '分析文章结构', 'reading', 4, 3, false),
('cloze-adaptation', '只形填空改编与命题', '完形填空改编与命题', '生成完形填空练习', 'reading', 6, 5, false),
('single-grammar-fill', 'single-grammar-fill', '单句语法填空', '生成语法填空练习', 'grammar', 2, 1, false),
('grammar-generator', 'grammar-generator', '单句语法填空生成器', 'AI生成语法练习', 'grammar', 4, 3, false),
('grammar-questions', 'grammar-questions', '语法填空命题', '创建语法测试题目', 'grammar', 5, 4, false),
('application-writing', 'application-writing', '应用文高分范文', '生成应用文范文', 'writing', 4, 3, false),
('application-lesson', 'application-lesson', '应用文学案', '创建应用文教学方案', 'writing', 6, 5, false),
('continuation-writing', 'continuation-writing', '读后续写范文', '生成读后续写示例', 'writing', 5, 4, false),
('continuation-lesson', 'continuation-lesson', '读后续写学案', '制作读后续写教学材料', 'writing', 7, 6, false),
('listening-generator', 'listening-generator', '英语听力生成器', '生成听力材料', 'translation', 8, 6, false),
('en-to-cn', 'en-to-cn', '地道英译汉', '提供地道翻译', 'translation', 3, 2, false),
('multi-translation', 'multi-translation', '一句多译', '展示多种翻译方式', 'translation', 4, 3, false),
('cn-to-en', 'cn-to-en', '地道汉译英', '中译英服务', 'translation', 3, 2, false),
('vocabulary-practice', 'vocabulary-practice', '词汇练习生成', '创建词汇练习', 'vocabulary', 3, 2, false),
('word-analysis', 'word-analysis', '词汇分析工具', '分析词汇使用', 'vocabulary', 4, 3, false);

-- 4. 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id_created_at ON ai_generations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id_created_at ON point_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_tool_configs_tool_type ON ai_tool_configs(tool_type);
CREATE INDEX IF NOT EXISTS idx_ai_tool_configs_category ON ai_tool_configs(category);

-- 5. 添加外键约束（如果不存在）
-- 注意：在生产环境中，请根据实际情况调整外键约束







