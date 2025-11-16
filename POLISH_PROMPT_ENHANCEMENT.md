# 润色提示词优化：精准响应用户要求

## 📋 优化概述

根据用户需求，优化了润色提示词，使其能够精确地按照第二步"设置润色要求"中的具体要求进行定制化润色。

## ✅ 主要改进

### 1. 结构化提示词设计

#### 修改前（简单版本）：
```
请润色以下英文句子，保持原意的同时提升表达质量：
原句：${sentence}
润色要求：
- 必须使用词汇：...
- 必须使用语法结构：...
```

#### 修改后（专业版本）：
```
作为英语写作专家，请根据以下要求润色英文句子，确保语法正确、表达自然、符合英语习惯：

【原句】
${sentence}

【润色要求】
✓ 必须包含词汇：...
✓ 必须使用语法结构：...
✓ 特殊要求：...

【输出要求】
- 直接输出润色后的句子，不要添加任何解释或说明
- 确保润色后的句子符合所有指定要求
- 如果原句已经完美且符合所有要求，可以保持不变

【润色后的句子】
```

### 2. 详细的语法结构说明

#### 语法结构映射表：
```typescript
const structMap = {
  'relative_clause': '定语从句（使用which/that/who/whom/whose等关系词）',
  'adverbial_clause': '状语从句（使用when/while/because/if/although等连词）',
  'noun_clause': '名词性从句（使用that/what/whether/how等引导词）',
  'participle': '分词结构（现在分词V-ing或过去分词V-ed形式）',
  'infinitive': '不定式结构（to + 动词原形）',
  'passive_voice': '被动语态（be + 过去分词）',
  'present_perfect': '现在完成时（have/has + 过去分词）',
  'past_perfect': '过去完成时（had + 过去分词）',
  'modal_verbs': '情态动词（can/may/must/should/would/could等）',
  'subjunctive': '虚拟语气（wish/if only/would rather等结构）'
};
```

### 3. 智能要求处理

#### 要求类型处理：
```typescript
// 1. 必须使用的词汇
if (req.requiredWords && req.requiredWords.length > 0) {
  prompt += `\n✓ 必须包含词汇：${req.requiredWords.join(', ')}`;
}

// 2. 必须使用的语法结构
if (req.requiredStructures && req.requiredStructures.length > 0) {
  const structures = req.requiredStructures.map(struct => structMap[struct] || struct);
  prompt += `\n✓ 必须使用语法结构：${structures.join('；')}`;
}

// 3. 额外要求说明（如固定句式等）
if (req.notes && req.notes.trim()) {
  prompt += `\n✓ 特殊要求：${req.notes.trim()}`;
}
```

### 4. 默认要求优化

#### 当没有具体要求时：
```
✓ 修正语法错误和拼写错误
✓ 提升词汇表达，使用更准确、更高级的词汇
✓ 优化句式结构，使表达更加自然流畅
✓ 保持原意不变，确保信息完整
```

## 🎯 提示词特点

### 1. 专业角色定位
- **角色设定**：作为英语写作专家
- **专业要求**：确保语法正确、表达自然、符合英语习惯
- **权威性**：提升AI对任务的理解和执行质量

### 2. 清晰的结构化格式
- **【原句】**：明确标识待润色内容
- **【润色要求】**：详细列出所有要求
- **【输出要求】**：规范输出格式和质量标准
- **【润色后的句子】**：引导AI直接输出结果

### 3. 详细的语法说明
- **具体示例**：每种语法结构都有详细说明和示例
- **操作指导**：明确告诉AI如何使用这些结构
- **避免歧义**：减少AI对语法要求的误解

### 4. 智能适应性
- **有要求时**：严格按照用户设定的要求执行
- **无要求时**：使用高质量的默认润色标准
- **混合处理**：支持多种要求类型的组合

## 📊 实际应用示例

### 示例1：词汇 + 语法结构要求
```
【润色要求】
✓ 必须包含词汇：magnificent, extraordinary
✓ 必须使用语法结构：定语从句（使用which/that/who/whom/whose等关系词）
```

### 示例2：特殊要求 + 固定句式
```
【润色要求】
✓ 特殊要求：使用倒装句结构，体现强调效果
✓ 必须使用语法结构：虚拟语气（wish/if only/would rather等结构）
```

### 示例3：综合要求
```
【润色要求】
✓ 必须包含词汇：analyze, demonstrate, significant
✓ 必须使用语法结构：现在完成时（have/has + 过去分词）；被动语态（be + 过去分词）
✓ 特殊要求：使用学术写作风格，避免口语化表达
```

## 🔧 技术实现细节

### 1. 要求检测逻辑
```typescript
let hasSpecificRequirements = false;

// 检查是否有具体要求
requirements.forEach((req: any) => {
  if (req.requiredWords?.length > 0 || 
      req.requiredStructures?.length > 0 || 
      req.notes?.trim()) {
    hasSpecificRequirements = true;
  }
});

// 根据检测结果选择提示词模板
if (!hasSpecificRequirements) {
  // 使用默认要求
}
```

### 2. 语法结构处理
```typescript
const structures = req.requiredStructures.map((struct: string) => {
  return structMap[struct] || struct; // 映射到详细说明，或保持原值
});
prompt += `\n✓ 必须使用语法结构：${structures.join('；')}`;
```

### 3. 输出格式控制
```
【输出要求】
- 直接输出润色后的句子，不要添加任何解释或说明
- 确保润色后的句子符合所有指定要求
- 如果原句已经完美且符合所有要求，可以保持不变
- 润色后的句子应该语法正确、表达自然、符合英语习惯
```

## 🚀 预期效果

### 1. 精准执行用户要求
- **词汇要求**：AI会确保包含所有指定词汇
- **语法结构**：AI会使用指定的语法结构进行润色
- **特殊要求**：AI会遵循额外的润色说明和固定句式要求

### 2. 提升润色质量
- **专业性**：专家角色定位提升处理质量
- **准确性**：详细说明减少误解和错误
- **一致性**：标准化格式确保输出一致

### 3. 增强用户体验
- **可控性**：用户的每个要求都能得到精确执行
- **透明性**：清晰的要求传达和结果输出
- **灵活性**：支持各种复杂的组合要求

## 📝 使用建议

### 1. 用户设置要求时
- **明确性**：设置具体、明确的要求
- **合理性**：确保要求在语法上可行
- **适量性**：避免过多冲突的要求

### 2. 系统处理时
- **完整性**：确保所有要求都被传递给AI
- **准确性**：语法结构映射要准确
- **稳定性**：提示词格式要保持一致

---

✅ **总结**：通过结构化、专业化的提示词设计，成功实现了润色功能对用户具体要求的精准响应，大幅提升了润色的针对性和质量。


