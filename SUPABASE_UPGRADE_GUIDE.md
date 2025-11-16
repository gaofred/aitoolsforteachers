# Supabase数据库升级指南

## 📋 概述

本指南将帮助您将现有的Supabase数据库升级到支持完整点数管理和会员功能的新版本。

## ✅ 兼容性说明

**重要：您不需要删除现有的数据表！**

本升级是向后兼容的，只会：
- 添加缺失的字段
- 创建新的表
- 添加新的函数和触发器
- 插入初始数据

**您的现有数据将完全保留！**

## 🚀 升级步骤

### 1. 备份现有数据（推荐）

虽然升级是安全的，但建议先备份：

1. 转到Supabase Dashboard
2. 转到 "Database" > "Backups"
3. 创建手动备份

### 2. 执行升级脚本

1. 转到Supabase项目的 "SQL Editor"
2. 复制 `supabase-upgrade.sql` 文件中的所有SQL代码
3. 粘贴到SQL编辑器中
4. 点击 "Run" 执行

### 3. 验证升级结果

执行完成后，您应该看到：
```
Supabase数据库升级完成！
```

## 📊 升级内容详情

### 新增字段

1. **ai_generations表新增字段**：
   - `tool_name` - AI工具名称
   - `model_type` - AI模型类型（STANDARD/ADVANCED/PREMIUM）

### 新增表

1. **ai_tool_configs** - AI工具配置表
   - 存储所有AI工具的配置信息
   - 包括标准费用、Pro费用、是否仅Pro可用等

### 新增函数

1. **deduct_user_points()** - 扣除用户点数
2. **add_user_points()** - 增加用户点数
3. **use_ai_tool()** - 使用AI工具
4. **redeem_code()** - 兑换兑换码
5. **get_user_stats()** - 获取用户统计信息

### 新增视图

1. **user_stats** - 用户统计信息视图

### 新增数据

1. **18个AI工具配置**：
   - 阅读教学工具：5个
   - 语法练习工具：3个
   - 写作教学工具：4个
   - 翻译与多媒体工具：4个
   - 词汇学习工具：2个

2. **4个示例兑换码**：
   - `WELCOME50` - 50点数
   - `PRO30` - 30天Pro会员
   - `BONUS100` - 100点数
   - `STUDENT25` - 25点数

## 🔍 升级后验证

### 1. 检查新表是否创建

```sql
-- 检查AI工具配置表
SELECT COUNT(*) FROM ai_tool_configs;
-- 应该返回 18

-- 检查兑换码
SELECT COUNT(*) FROM redemption_codes;
-- 应该返回 4
```

### 2. 检查新字段是否添加

```sql
-- 检查AI生成记录表的新字段
SELECT tool_name, model_type FROM ai_generations LIMIT 1;
```

### 3. 检查函数是否创建

```sql
-- 检查函数是否存在
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('deduct_user_points', 'add_user_points', 'use_ai_tool', 'redeem_code');
```

## 🎯 升级后功能

### 1. 点数系统

- ✅ 实时点数显示
- ✅ 点数交易记录
- ✅ 兑换码功能
- ✅ 自动点数扣除

### 2. 会员系统

- ✅ 会员等级管理
- ✅ 功能差异化
- ✅ 自动会员创建

### 3. AI工具管理

- ✅ 工具配置管理
- ✅ 费用计算
- ✅ 使用记录

## 🔧 故障排除

### 常见问题

1. **升级脚本执行失败**：
   ```
   错误：relation already exists
   解决：这是正常的，脚本使用了 IF NOT EXISTS，重复执行是安全的
   ```

2. **新字段未添加**：
   ```
   错误：column does not exist
   解决：检查是否成功执行了 ALTER TABLE 语句
   ```

3. **函数调用失败**：
   ```
   错误：function does not exist
   解决：确保所有函数都成功创建
   ```

### 回滚方案

如果升级出现问题，可以：

1. 使用备份恢复数据库
2. 或者手动删除新增的表和字段：

```sql
-- 删除新增的表
DROP TABLE IF EXISTS ai_tool_configs;

-- 删除新增的字段
ALTER TABLE ai_generations DROP COLUMN IF EXISTS tool_name;
ALTER TABLE ai_generations DROP COLUMN IF EXISTS model_type;

-- 删除新增的函数
DROP FUNCTION IF EXISTS deduct_user_points(UUID, INTEGER, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS add_user_points(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS use_ai_tool(UUID, TEXT, TEXT, JSONB, JSONB, TEXT, INTEGER);
DROP FUNCTION IF EXISTS redeem_code(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_stats(UUID);
```

## 📞 获取帮助

如果在升级过程中遇到问题：

1. 检查Supabase Dashboard的错误日志
2. 查看SQL编辑器的执行结果
3. 参考本文档的故障排除部分
4. 确认所有步骤都正确执行

## ✅ 升级完成

升级完成后，您的Supabase数据库将支持：

- ✅ 完整的点数管理系统
- ✅ 会员等级和功能差异化
- ✅ AI工具配置和使用记录
- ✅ 兑换码功能
- ✅ 用户统计和数据分析

所有现有功能将继续正常工作，新功能将无缝集成到您的应用中！


























