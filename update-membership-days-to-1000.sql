-- ========================================
-- 更新兑换码表支持1000天会员天数
-- ========================================

-- 为 redemption_codes 表的 membership_days 字段添加约束，支持1-1000天
ALTER TABLE redemption_codes
DROP CONSTRAINT IF EXISTS redemption_codes_membership_days_check;

ALTER TABLE redemption_codes
ADD CONSTRAINT redemption_codes_membership_days_check
CHECK (membership_days >= 1 AND membership_days <= 1000);

-- 为 membership_redemptions 表的 days_awarded 字段添加约束，支持1-1000天
ALTER TABLE membership_redemptions
DROP CONSTRAINT IF EXISTS membership_redemptions_days_awarded_check;

ALTER TABLE membership_redemptions
ADD CONSTRAINT membership_redemptions_days_awarded_check
CHECK (days_awarded >= 1 AND days_awarded <= 1000);

-- 更新注释
COMMENT ON COLUMN redemption_codes.membership_days IS '会员天数，仅当type为MEMBERSHIP_DAYS时有效（1-1000天）';
COMMENT ON COLUMN membership_redemptions.days_awarded IS '兑换的会员天数（1-1000天）';

-- 验证约束是否添加成功
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('redemption_codes', 'membership_redemptions')
  AND (tc.constraint_name LIKE '%membership_days%' OR tc.constraint_name LIKE '%days_awarded%');

-- 测试插入1000天的兑换码（可选测试）
-- INSERT INTO redemption_codes (code, type, membership_type, membership_days, description, is_active)
-- VALUES ('TEST_1000_DAYS', 'MEMBERSHIP_DAYS', 'PRO', 1000, '测试1000天会员兑换码', true);

-- 如果测试成功，可以删除测试数据
-- DELETE FROM redemption_codes WHERE code = 'TEST_1000_DAYS';

SELECT '✅ 兑换码表已更新支持1000天会员天数' as status;