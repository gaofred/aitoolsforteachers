-- 创建测试交易记录（如果需要）
-- 在Supabase SQL编辑器中运行此脚本

-- 首先检查是否有任何交易记录
DO $$
DECLARE
    transaction_count INTEGER;
    user_count INTEGER;
BEGIN
    -- 检查交易记录数量
    SELECT COUNT(*) INTO transaction_count FROM public.point_transactions;

    -- 检查用户数量
    SELECT COUNT(*) INTO user_count FROM auth.users;

    RAISE NOTICE '当前交易记录数量: %', transaction_count;
    RAISE NOTICE '当前用户数量: %', user_count;

    -- 如果没有交易记录，创建一些测试数据
    IF transaction_count = 0 AND user_count > 0 THEN
        RAISE NOTICE '创建测试交易记录...';

        -- 为第一个用户创建测试记录
        INSERT INTO public.point_transactions (user_id, type, amount, description, metadata, created_at)
        SELECT
            au.id,
            'BONUS',
            25.0,
            '新用户注册奖励',
            '{"source": "registration"}',
            NOW()
        FROM auth.users au
        ORDER BY au.created_at
        LIMIT 1;

        INSERT INTO public.point_transactions (user_id, type, amount, description, metadata, created_at)
        SELECT
            au.id,
            'GENERATE',
            -0.5,
            '快速语法检查',
            '{"toolType": "quick-grammar-check", "modelType": "STANDARD"}',
            NOW() - INTERVAL '1 hour'
        FROM auth.users au
        ORDER BY au.created_at
        LIMIT 1;

        INSERT INTO public.point_transactions (user_id, type, amount, description, metadata, created_at)
        SELECT
            au.id,
            'GENERATE',
            -0.5,
            '单词释义查询',
            '{"toolType": "word-definition", "modelType": "STANDARD"}',
            NOW() - INTERVAL '2 hours'
        FROM auth.users au
        ORDER BY au.created_at
        LIMIT 1;

        INSERT INTO public.point_transactions (user_id, type, amount, description, metadata, created_at)
        SELECT
            au.id,
            'GENERATE',
            0.0,
            'OCR图像识别',
            '{"toolType": "image-recognition", "modelType": "STANDARD"}',
            NOW() - INTERVAL '3 hours'
        FROM auth.users au
        ORDER BY au.created_at
        LIMIT 1;

        -- 确保用户有积分记录
        INSERT INTO public.user_points (user_id, points, last_updated)
        SELECT
            au.id,
            25.0,
            NOW()
        FROM auth.users au
        LEFT JOIN public.user_points up ON au.id = up.user_id
        WHERE up.user_id IS NULL
        ORDER BY au.created_at
        LIMIT 1;

        RAISE NOTICE '测试交易记录创建完成';
    END IF;
END $$;

-- 显示结果
SELECT 'Transaction Creation Status' as status;

-- 显示最新的交易记录
SELECT
    id,
    user_id,
    type,
    amount,
    description,
    metadata,
    created_at
FROM public.point_transactions
ORDER BY created_at DESC
LIMIT 10;

-- 显示用户积分
SELECT
    id,
    user_id,
    points,
    last_updated
FROM public.user_points
ORDER BY last_updated DESC
LIMIT 10;