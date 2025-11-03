import { NextRequest, NextResponse } from 'next/server';

// 极客智坊API配置（使用qwen-plus模型）
const GEEKAI_API_URL = 'https://geekai.co/api/v1/chat/completions';
const GEEKAI_API_KEY = process.env.GEEKAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { sentence, requirements } = await request.json();

    if (!sentence || !sentence.trim()) {
      return NextResponse.json({
        success: false,
        error: '未提供要润色的句子'
      }, { status: 400 });
    }

    // 检查API Key配置
    if (!GEEKAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: '极客智坊API Key未配置，请检查环境变量 GEEKAI_API_KEY'
      }, { status: 500 });
    }

    // 构建润色提示词
    let prompt = `请润色以下英文句子。严格要求：只修正语法错误，不要添加任何新内容。

【原句】
${sentence}

【严格禁止】
- 禁止添加任何新信息、细节或描述
- 禁止扩展成多个句子
- 禁止添加从句（除非原句就有）
- 禁止改变句子结构
- 禁止添加原句中没有的词汇

【允许操作】
- 修正语法错误（如时态、主谓一致）
- 修正拼写错误
- 替换不当词汇为更合适的词汇
- 调整语序使其更自然

【润色要求】`;

    if (requirements && requirements.length > 0) {
      let hasSpecificRequirements = false;
      
      requirements.forEach((req: any) => {
        // 处理必须使用的词汇
        if (req.requiredWords && req.requiredWords.length > 0) {
          prompt += `\n✓ 必须包含词汇：${req.requiredWords.join(', ')}`;
          hasSpecificRequirements = true;
        }
        
        // 处理必须使用的语法结构
        if (req.requiredStructures && req.requiredStructures.length > 0) {
          const structures = req.requiredStructures.map((struct: string) => {
            const structMap: { [key: string]: string } = {
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
            return structMap[struct] || struct;
          });
          prompt += `\n✓ 必须使用语法结构：${structures.join('；')}`;
          hasSpecificRequirements = true;
        }
        
        // 处理额外要求说明
        if (req.notes && req.notes.trim()) {
          prompt += `\n✓ 特殊要求：${req.notes.trim()}`;
          hasSpecificRequirements = true;
        }
      });
      
      // 如果没有具体要求，添加默认要求
      if (!hasSpecificRequirements) {
        prompt += `
✓ 仅修正明显的语法错误和拼写错误
✓ 仅在必要时改进词汇选择
✓ 仅在必要时优化句式结构
✓ 严格保持原意不变，绝对不添加额外信息
✓ 保持句子简洁，绝对不要复杂化
✓ 如果原句已经基本正确，保持不变`;
      }
    } else {
      prompt += `
✓ 仅修正明显的语法错误和拼写错误
✓ 仅在必要时改进词汇选择
✓ 仅在必要时优化句式结构
✓ 严格保持原意不变，绝对不添加额外信息
✓ 保持句子简洁，绝对不要复杂化
✓ 如果原句已经基本正确，保持不变`;
    }

    prompt += `

【错误示例】
原句：At the thought of returning to the home and eating delicious ice - cream, I felt my heart exciting, because the weather was so hot.
❌ 错误润色：When I thought about returning home and eating delicious ice cream, which had been patiently waiting for me in the freezer, my heart began to race with excitement; however, the scorching heat made the journey seem unbearable.
✅ 正确润色：At the thought of returning home and eating delicious ice cream, I felt my heart racing with excitement, because the weather was so hot.

【输出要求】
- 只输出润色后的句子，不要任何解释
- 如果原句基本正确，直接输出原句
- 润色后的句子长度不能超过原句太多
- 绝对不要添加新词汇或新概念
- 保持句子结构不变

润色后的句子：`;

    // 调用极客智坊API的qwen-plus模型
    const response = await fetch(GEEKAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEEKAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的英语写作专家，擅长润色和改进英文句子。严格遵守：1. 绝对不要扩展句子内容 2. 绝对不要添加新信息 3. 只修正语法错误和词汇 4. 保持句子长度基本不变 5. 如果原句基本正确就不要改动'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,  // 极低温度，最小化创造性
        max_completion_tokens: 100,  // 严格限制输出长度
        stream: false,
        enable_thinking: false,
        enable_search: false,
        enable_url_context: false
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('极客智坊API调用失败:', errorData);
      
      return NextResponse.json({
        success: false,
        error: `AI服务调用失败: ${response.status}`
      }, { status: 500 });
    }

    const data = await response.json();
    
    console.log('极客智坊API响应数据:', JSON.stringify(data, null, 2));
    
    // 解析响应（极客智坊API使用OpenAI兼容格式）
    let polishedText = '';
    if (data.choices && data.choices[0]) {
      polishedText = data.choices[0].message?.content || '';
    }

    console.log('提取的原始文本:', polishedText);

    // 清理结果：移除可能的解释性文字
    polishedText = polishedText.trim();
    
    // 如果AI返回了说明性文字，尝试提取句子部分
    const lines = polishedText.split('\n');
    const firstLine = lines[0]?.trim() || '';
    
    // 如果第一行看起来像是一个完整的句子，使用它
    if (firstLine.length > 10 && /[.!?]$/.test(firstLine)) {
      polishedText = firstLine;
    } else {
      // 否则使用整个文本，但移除常见的说明性前缀
      polishedText = polishedText
        .replace(/^润色后的句子[：:]\s*/i, '')
        .replace(/^润色后[：:]\s*/i, '')
        .replace(/^结果[：:]\s*/i, '')
        .trim();
    }

    console.log('清理后的文本:', polishedText);

    if (!polishedText) {
      console.error('AI返回空结果，原始响应:', data);
      // 如果AI返回空结果，使用原句作为备选
      polishedText = sentence;
      console.log('使用原句作为备选:', polishedText);
    }

    return NextResponse.json({
      success: true,
      result: polishedText,
      model: '云雾API (GLM-4.6)'
    });

  } catch (error) {
    console.error('句子润色API错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}

