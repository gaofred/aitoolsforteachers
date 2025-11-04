import { NextRequest, NextResponse } from 'next/server';

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

export async function POST(request: NextRequest) {
  let requestBody: { text: string } | null = null;
  let originalText: string = '';

  try {
    requestBody = await request.json();
    originalText = requestBody.text;

    if (!originalText || typeof originalText !== 'string') {
      return NextResponse.json({
        success: false,
        error: '请提供有效的文本内容'
      }, { status: 400 });
    }

    console.log('🎯 开始AI智能排版处理，文本长度:', originalText.length);

    // 调用火山引擎豆包API
    const response = await fetch(VOLCENGINE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'doubao-1-5-lite-32k-250115',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的英语作文排版助手。严格按照以下要求进行排版：\n1. 完全保持学生原文的所有内容，单词拼写、语法错误、表达方式一律保持原样\n2. 只进行格式化处理：修复文字断开、添加自然段落分隔\n3. 不添加任何解释、说明、标题或修改\n4. 不改变学生的任何表达，只负责分段和格式优化\n5. 温度0.1，严格按照原文输出\n最重要：学生写什么就输出什么，只做排版，不做任何修改！'
          },
          {
            role: 'user',
            content: `原文：\n${originalText}\n\n要求：只做排版，保持原文一字不变。`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`火山引擎API调用失败: ${response.status} ${response.statusText}`);
    }

    let data;
    try {
      data = await response.json();
      console.log('🔍 火山引擎API响应:', data);
    } catch (jsonError) {
      console.error('❌ JSON解析失败:', jsonError);
      console.log('原始响应:', await response.text());
      throw new Error('火山引擎API返回无效JSON格式');
    }

    if (data.choices && data.choices.length > 0) {
      const formattedText = data.choices[0].message.content;

      if (!formattedText) {
        throw new Error('火山引擎API返回空内容');
      }

      console.log('✅ AI排版完成，输出长度:', formattedText.length);

      return NextResponse.json({
        success: true,
        formattedText: formattedText.trim(),
        originalText: originalText,
        usage: data.usage || null
      });
    } else {
      console.error('❌ 火山引擎API返回格式异常:', data);
      throw new Error('火山引擎API返回格式异常，缺少choices字段');
    }

  } catch (error) {
    console.error('❌ AI排版处理失败:', error);

    // 根据错误类型提供不同的错误信息
    let errorMessage = 'AI排版失败，使用规则排版';

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = '火山引擎API认证失败，使用规则排版';
      } else if (error.message.includes('500')) {
        errorMessage = '火山引擎服务器错误，使用规则排版';
      } else if (error.message.includes('timeout')) {
        errorMessage = '火山引擎API超时，使用规则排版';
      } else if (error.message.includes('JSON')) {
        errorMessage = '火山引擎API响应格式错误，使用规则排版';
      }
    }

    // 如果AI排版失败，返回简单的规则排版作为备选
    const simpleFormatted = fallbackFormatting(originalText);

    return NextResponse.json({
      success: true,
      formattedText: simpleFormatted,
      originalText: originalText,
      error: errorMessage,
      fallback: true,
      apiError: error instanceof Error ? error.message : '未知错误'
    });
  }
}

/**
 * 高级规则排版作为备选方案
 */
function fallbackFormatting(text: string): string {
  if (!text || text.trim().length === 0) return text;

  let formattedText = text.trim();

  // 第一步：修复文字断开问题
  formattedText = fixWordBreaks(formattedText);

  // 第二步：修复多余空格
  formattedText = formattedText.replace(/\s+/g, ' ');
  formattedText = formattedText.replace(/\s*([.,;:!?])\s*/g, '$1 '); // 标点符号前后空格
  formattedText = formattedText.replace(/\s*-\s*/g, '-'); // 连字符前后无空格

  // 第三步：修复句号后的大写字母分段
  formattedText = formattedText.replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2');

  // 第四步：智能分段
  formattedText = applyIntelligentParagraphs(formattedText);

  // 第五步：清理多余空行
  formattedText = formattedText.replace(/\n{3,}/g, '\n\n');

  return formattedText.trim();
}

/**
 * 修复单词断开问题
 */
function fixWordBreaks(text: string): string {
  // 修复常见的单词断开情况
  let fixedText = text;

  // 修复连字符断开：extra - curricular → extra-curricular
  fixedText = fixedText.replace(/\b(\w+)\s*-\s*(\w+)\b/g, '$1-$2');

  // 修复句中换行：将换行替换为空格
  fixedText = fixedText.replace(/\n(?![\n])/g, ' ');

  // 修复奇怪的符号组合：
  fixedText = fixedText.replace(/：\s*([.,;:!?])/g, '$1'); // 中文冒号+英文标点
  fixedText = fixedText.replace(/([.,;:!?])\s*：/g, '$1:'); // 英文标点+中文冒号
  fixedText = fixedText.replace(/：\s*([A-Za-z])/g, ': $1'); // 中文冒号+英文字母

  // 修复奇怪的符号：
  fixedText = fixedText.replace(/[^\w\s.,;:!?'"()\-[\]]/g, ''); // 移除非标准字符

  return fixedText;
}

/**
 * 智能分段算法
 */
function applyIntelligentParagraphs(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length === 0) return text;

  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();

    if (currentParagraph.length === 0) {
      currentParagraph.push(sentence);
      continue;
    }

    const currentParagraphLength = currentParagraph.join(' ').length;
    const sentenceLength = sentence.length;

    // 分段规则：
    // 1. 段落长度超过80个字符
    // 2. 当前段落有4-5个句子
    // 3. 遇到明显的主题转换（以"In", "Moreover", "However", "Furthermore"等开头）
    const shouldStartNewParagraph =
      currentParagraphLength > 80 ||
      currentParagraph.length >= 4 ||
      /^(In|Moreover|However|Furthermore|Therefore|First|Second|Finally|In conclusion|To sum up)\b/i.test(sentence);

    if (shouldStartNewParagraph) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [sentence];
    } else {
      currentParagraph.push(sentence);
    }
  }

  // 添加最后一个段落
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }

  return paragraphs.join('\n\n');
}