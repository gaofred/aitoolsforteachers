-- 更新现有邀请码的URL，适配生产环境
UPDATE invitation_codes
SET invite_url = REPLACE(invite_url, 'http://localhost:', 'https://aitoolsforteachers.net')
WHERE invite_url LIKE '%localhost:%';

-- 也可以直接设置为生产环境URL
UPDATE invitation_codes
SET invite_url = 'https://aitoolsforteachers.net/invite/redirect?invite_code=' || code
WHERE invite_url NOT LIKE 'https://aitoolsforteachers.net/%';