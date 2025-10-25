# CD篇改编API修正记录

## 修正内容

根据用户反馈，将进阶版使用的API从CloudMist API修正为云雾API。

### 修改详情

1. **API URL修正**：
   - 进阶版API URL从 `https://api.cloudmist.ai/v1/chat/completions` 改为 `https://yunwu.ai/v1/chat/completions`

2. **模型修正**：
   - 进阶版模型从 `gemini-2.5-pro` 改为 `gpt-3.5-turbo`

3. **错误信息修正**：
   - 将错误日志中的 "Gemini" 改为 "云雾API"
   - 将错误信息中的 "谷歌模型" 改为 "云雾API"

4. **元数据修正**：
   - 将API提供商标识从 "cloudmist" 改为 "yunwu"

### 云雾API使用说明

根据用户提供的示例，云雾API的使用方式如下：

```bash
curl https://yunwu.ai/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "user", "content": "Say this is a test!"}],
  "temperature": 0.7
}'
```

### 当前配置

- **基础版**：使用火山引擎豆包模型 (`doubao-seed-1-6-251015`)
- **进阶版**：使用云雾API GPT-3.5-turbo模型

### 环境变量

确保以下环境变量已正确配置：
- `VOLCENGINE_API_KEY`: 火山引擎API密钥
- `CLOUDMIST_GOOGLE_API_KEY`: 云雾API密钥（用于进阶版）

## 注意事项

1. 云雾API使用标准的OpenAI兼容格式
2. 模型名称使用 `gpt-3.5-turbo`
3. API端点使用 `https://yunwu.ai/v1/chat/completions`

## 测试建议

建议测试以下场景：
1. 基础版功能是否正常工作（使用火山引擎）
2. 进阶版功能是否正常工作（使用云雾API）
3. 点数扣除是否正确
4. 错误处理是否完善








