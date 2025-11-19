# Nginx网关超时配置修复指南

## 问题分析
错误日志显示nginx返回504 Gateway Time-out，说明nginx网关层超时，不是应用层问题。

## 修复方案

### 1. Nginx配置修改

在服务器配置文件中添加以下超时配置：

```nginx
server {
    listen 80;
    server_name fredgao.cn;

    # 全局超时配置
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # AI API特别配置
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        send_timeout 600s;
    }

    # 其他配置...
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 实施命令

```bash
# 备份配置
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# 测试配置
sudo nginx -t

# 重启nginx
sudo systemctl restart nginx

# 验证配置
sudo nginx -T | grep timeout
```

### 3. 预期效果

- OCR识别: 支持最长10分钟处理时间
- AI批改: 支持最长10分钟处理时间
- 减少或消除504网关超时错误

### 4. 监控验证

修复后测试以下功能：
- 批量OCR识别（9张图片）
- 批量应用文批改
- 单篇应用文批改
- 读后续写批量批改

## 备选方案

如果nginx配置修改后仍有问题，可以：
1. 进一步增加超时时间到1800秒（30分钟）
2. 启用nginx的worker进程自动重启
3. 增加ECS实例规格（CPU/内存）