-- 创建IP注册记录表
-- 用于跟踪每个IP地址的注册次数，防止滥用
-- 每个IP地址每天最多可以注册3个账户

CREATE TABLE IF NOT EXISTS ip_registration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL, -- 支持IPv6
  attempt_date DATE NOT NULL, -- 注册尝试日期
  count INTEGER NOT NULL DEFAULT 1, -- 当天尝试次数
  last_attempt_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), -- 最后尝试时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_ip_registration_logs_ip_date ON ip_registration_logs(ip_address, attempt_date);
CREATE INDEX IF NOT EXISTS idx_ip_registration_logs_date ON ip_registration_logs(attempt_date);

-- 添加唯一约束防止重复记录
ALTER TABLE ip_registration_logs ADD CONSTRAINT unique_ip_date UNIQUE (ip_address, attempt_date);

-- 创建更新时间戳的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ip_registration_logs_updated_at
    BEFORE UPDATE ON ip_registration_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE ip_registration_logs IS 'IP地址注册记录表，用于防止同一IP地址过度注册账户';
COMMENT ON COLUMN ip_registration_logs.ip_address IS '客户端IP地址，支持IPv4和IPv6';
COMMENT ON COLUMN ip_registration_logs.attempt_date IS '注册尝试日期（YYYY-MM-DD）';
COMMENT ON COLUMN ip_registration_logs.count IS '当天该IP的注册尝试次数';
COMMENT ON COLUMN ip_registration_logs.last_attempt_date IS '最后一次注册尝试的时间戳';