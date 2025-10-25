# 小数点数支持设置指南

## 概述
本项目的数据库现在支持小数点数，允许设置更精细的点数消耗，如0.5点数、1.5点数等。

## 已完成的修改

### 1. 数据库架构修改
文件：`update-database-for-decimal-points.sql`

**修改的表和字段：**
- `user_points.points` → NUMERIC(10,2)
- `point_transactions.amount` → NUMERIC(10,2)
- `ai_generations.points_cost` → NUMERIC(10,2)
- `ai_tool_configs.standard_cost` → NUMERIC(10,2)
- `ai_tool_configs.pro_cost` → NUMERIC(10,2)

### 2. 数据库函数更新
- `add_user_points()` - 支持小数点数
- `deduct_user_points()` - 支持小数点数
- `get_current_points()` - 返回小数

### 3. 新增小数点数工具配置
文件：`scripts/init-decimal-ai-tools.ts`

**新增工具：**
- OCR图像识别：0点数（免费）
- 快速语法检查：0.5点数
- 单词释义查询：0.5点数
- 单句翻译：0.5点数

## 使用步骤

### 第一步：应用数据库修改
1. 打开Supabase SQL编辑器
2. 复制并运行 `update-database-for-decimal-points.sql` 中的所有SQL语句
3. 确认所有表字段都已成功修改为NUMERIC类型

### 第二步：初始化小数点数工具（可选）
```bash
# 运行小数点数工具初始化脚本
npm run ts-node scripts/init-decimal-ai-tools.ts
```

### 第三步：在代码中使用小数点数
现在可以在API路由中直接使用小数点数：

```typescript
// 语法示例
const pointsCost = 0.5; // 半个点数
const { error } = await supabase.rpc('deduct_user_points', {
  p_user_id: user.id,
  p_amount: pointsCost,
  p_description: '快速语法检查'
});
```

## 注意事项

1. **数据库兼容性**：确保使用NUMERIC(10,2)类型，最多支持2位小数
2. **前端显示**：前端需要正确显示小数点数，如"0.5点数"
3. **计算精度**：数据库计算时注意浮点数精度问题
4. **向后兼容**：现有的整数点数仍然正常工作

## 验证方法

1. **检查数据库表结构：**
```sql
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'user_points' AND column_name = 'points';
```

2. **测试小数点数操作：**
```sql
SELECT public.add_user_points(user_uuid, 0.5, 'BONUS', '测试小数点数');
SELECT public.get_current_points(user_uuid);
```

3. **查看交易记录：**
```sql
SELECT * FROM point_transactions WHERE amount = 0.5 OR amount = -0.5;
```

## 故障排除

### 常见错误
1. **"invalid input syntax for type integer"**
   - 原因：数据库字段尚未修改为NUMERIC类型
   - 解决：先运行数据库修改脚本

2. **小数点数显示异常**
   - 原因：前端未正确处理小数显示
   - 解决：更新显示逻辑支持小数

3. **函数执行失败**
   - 原因：数据库函数未更新为支持小数
   - 解决：重新创建数据库函数

完成以上步骤后，系统就完全支持小数点数了！🎉