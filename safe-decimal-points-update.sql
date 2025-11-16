-- 安全的小数点数更新脚本
-- 在Supabase SQL编辑器中运行此脚本

-- 首先检查并创建必要的表结构（如果不存在）

-- 创建 user_points 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points NUMERIC(10,2) DEFAULT 25.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 point_transactions 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    related_id VARCHAR,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 ai_tool_configs 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.ai_tool_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_type VARCHAR UNIQUE NOT NULL,
    tool_name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR,
    standard_cost NUMERIC(10,2) NOT NULL DEFAULT 1.0,
    pro_cost NUMERIC(10,2),
    is_pro_only BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建 ai_generations 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.ai_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_type VARCHAR NOT NULL,
    tool_name VARCHAR NOT NULL,
    input_data JSONB,
    output_data JSONB,
    final_output JSONB,
    model_type VARCHAR DEFAULT 'STANDARD',
    tokens_used INTEGER DEFAULT 0,
    points_cost NUMERIC(10,2) DEFAULT 0.0,
    status VARCHAR DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在但字段类型不对，则尝试修改
DO $$
BEGIN
    -- 检查并修改 user_points.points
    BEGIN
        ALTER TABLE public.user_points ALTER COLUMN points TYPE NUMERIC(10,2) USING points::NUMERIC;
    EXCEPTION WHEN undefined_column THEN
        -- 字段不存在，添加它
        ALTER TABLE public.user_points ADD COLUMN IF NOT EXISTS points NUMERIC(10,2) DEFAULT 25.0;
    END;

    -- 检查并修改 point_transactions.amount
    BEGIN
        ALTER TABLE public.point_transactions ALTER COLUMN amount TYPE NUMERIC(10,2) USING amount::NUMERIC;
    EXCEPTION WHEN undefined_column THEN
        -- 字段不存在，添加它
        ALTER TABLE public.point_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 0.0;
    END;

    -- 检查并修改 ai_generations.points_cost
    BEGIN
        ALTER TABLE public.ai_generations ALTER COLUMN points_cost TYPE NUMERIC(10,2) USING points_cost::NUMERIC;
    EXCEPTION WHEN undefined_column THEN
        -- 字段不存在，添加它
        ALTER TABLE public.ai_generations ADD COLUMN IF NOT EXISTS points_cost NUMERIC(10,2) DEFAULT 0.0;
    END;

    -- 检查并修改 ai_tool_configs.standard_cost
    BEGIN
        ALTER TABLE public.ai_tool_configs ALTER COLUMN standard_cost TYPE NUMERIC(10,2) USING standard_cost::NUMERIC;
    EXCEPTION WHEN undefined_column THEN
        -- 字段不存在，添加它
        ALTER TABLE public.ai_tool_configs ADD COLUMN IF NOT EXISTS standard_cost NUMERIC(10,2) DEFAULT 1.0;
    END;

    -- 检查并修改 ai_tool_configs.pro_cost
    BEGIN
        ALTER TABLE public.ai_tool_configs ALTER COLUMN pro_cost TYPE NUMERIC(10,2) USING pro_cost::NUMERIC;
    EXCEPTION WHEN undefined_column THEN
        -- 字段不存在，添加它
        ALTER TABLE public.ai_tool_configs ADD COLUMN IF NOT EXISTS pro_cost NUMERIC(10,2);
    END;
END $$;

-- 创建或更新数据库函数
CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id UUID,
    p_amount NUMERIC,
    p_type VARCHAR,
    p_description TEXT,
    p_related_id VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_points NUMERIC;
BEGIN
    -- 获取当前积分
    SELECT points INTO current_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    -- 如果没有找到记录，创建新记录
    IF current_points IS NULL THEN
        INSERT INTO public.user_points (user_id, points, last_updated)
        VALUES (p_user_id, GREATEST(p_amount, 0), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            points = GREATEST(public.user_points.points + p_amount, 0),
            last_updated = NOW()
        RETURNING points INTO current_points;
    ELSE
        -- 更新积分，确保不低于0
        UPDATE public.user_points
        SET points = GREATEST(points + p_amount, 0), last_updated = NOW()
        WHERE user_id = p_user_id
        RETURNING points INTO current_points;
    END IF;

    -- 记录交易
    INSERT INTO public.point_transactions (user_id, type, amount, description, related_id, metadata, created_at)
    VALUES (p_user_id, p_type, p_amount, p_description, p_related_id, p_metadata, NOW());

    -- 返回成功
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- 记录错误日志
        RAISE NOTICE 'add_user_points error: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建积分扣除函数
CREATE OR REPLACE FUNCTION public.deduct_user_points(
    p_user_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_related_id VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_points NUMERIC;
BEGIN
    -- 获取当前积分
    SELECT points INTO current_points
    FROM public.user_points
    WHERE user_id = p_user_id;

    -- 检查积分是否足够
    IF current_points IS NULL OR current_points < p_amount THEN
        RETURN FALSE;
    END IF;

    -- 扣除积分
    UPDATE public.user_points
    SET points = points - p_amount, last_updated = NOW()
    WHERE user_id = p_user_id;

    -- 记录交易（负数表示扣除）
    INSERT INTO public.point_transactions (user_id, type, amount, description, related_id, metadata, created_at)
    VALUES (p_user_id, 'GENERATE', -p_amount, p_description, p_related_id, p_metadata, NOW());

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'deduct_user_points error: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建查询积分函数
CREATE OR REPLACE FUNCTION public.get_current_points(user_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    current_points NUMERIC;
BEGIN
    SELECT points INTO current_points
    FROM public.user_points
    WHERE user_id = user_uuid;

    RETURN COALESCE(current_points, 0::NUMERIC);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权
GRANT EXECUTE ON FUNCTION public.add_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_points TO authenticated;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);

-- 验证结果
SELECT
    'Tables and Functions Created/Updated' as status,
    'success' as result;

-- 显示表结构
SELECT
    table_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name IN ('user_points', 'point_transactions', 'ai_generations', 'ai_tool_configs')
    AND column_name IN ('points', 'amount', 'points_cost', 'standard_cost', 'pro_cost')
ORDER BY table_name, column_name;