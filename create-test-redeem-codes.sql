-- 创建测试兑换码
-- 在Supabase SQL编辑器中执行

-- 创建点数兑换码（100点数）
INSERT INTO public.redemption_codes (code, type, points, description, is_active, created_at)
VALUES (
    'TEST100',
    'POINTS',
    100,
    '测试兑换码 - 100点数奖励',
    true,
    NOW()
);

-- 创建会员天数兑换码（Premium 7天）
INSERT INTO public.redemption_codes (code, type, membership_type, membership_days, description, is_active, created_at)
VALUES (
    'TESTPREMIUM7',
    'MEMBERSHIP_DAYS',
    'PREMIUM',
    7,
    '测试兑换码 - Premium会员7天',
    true,
    NOW()
);

-- 创建会员套餐兑换码（Pro 30天）
INSERT INTO public.redemption_codes (code, type, membership_type, membership_days, description, is_active, created_at)
VALUES (
    'TESTPRO30',
    'MEMBERSHIP',
    'PRO',
    30,
    '测试兑换码 - Pro会员30天',
    true,
    NOW()
);

-- 查看创建的兑换码
SELECT * FROM public.redemption_codes WHERE code IN ('TEST100', 'TESTPREMIUM7', 'TESTPRO30');