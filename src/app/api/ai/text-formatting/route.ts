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

    // 积分相关变量
    let userId = null;
    let pointsDeducted = false;

    // 获取用户身份并验证积分
    try {
      // 获取请求的基础URL，支持动态端口
      const requestUrl = request.headers.get('host')
        ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3004';

      const userResponse = await fetch(`${requestUrl}/api/auth/user`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || ''
        }
      });

      if (!userResponse.ok) {
        throw new Error('用户身份验证失败');
      }

      const userData = await userResponse.json();
      userId = userData.id;

      if (!userId) {
        return NextResponse.json({
          success: false,
          error: '用户身份验证失败，请重新登录'
        }, { status: 401 });
      }

      console.log('🔐 用户身份验证成功:', { userId, userEmail: userData.email });

      // 检查用户积分是否足够
      if (userData.user_points && userData.user_points.points < 1) {
        return NextResponse.json({
          success: false,
          error: '积分不足，需要1积分才能进行AI智能排版'
        }, { status: 402 });
      }

      console.log('💰 用户积分充足:', { currentPoints: userData.user_points.points, requiredPoints: 1 });

    } catch (authError) {
      console.error('❌ 用户身份验证失败:', authError);
      return NextResponse.json({
        success: false,
        error: '用户身份验证失败，请重新登录'
      }, { status: 401 });
    }

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
            content: '你是一个专业的英语作文排版助手。严格按照以下要求进行排版：\n1. 完全保持学生原文的所有内容，包括单词拼写、语法错误、标点符号、表达方式、数字格式一律保持原样\n2. 核心任务：解决学生文本中随意换行的问题，将分散的文字整合在一行里\n3. 具体做法：a)修复明显的文字断开（把因OCR识别造成的断开单词重新连接） b)将分散的同一行文字整合到一行 c)在合适的段落之间添加空行\n4. 绝对不要在段落中间插入换行符，保持每个段落的连续性\n5. 绝对不要修改任何标点符号，保持学生原有的逗号、句号、冒号等\n6. 不添加任何解释、说明、标题或修改\n7. 不要改变原文的任何字符，包括数字、冒号、标点等\n8. 重要示例：\n   - 如果原文是：\n     "I\'m pleased to get your letter, asking me the information\n     about our extra - curricular activities. Learning that you\n     are interested in it, I will introduce to you some details."\n   - 应该整合为：\n     "I\'m pleased to get your letter, asking me the information about our extra - curricular activities. Learning that you are interested in it, I will introduce to you some details."\n9. 示例：如果原文是"144："，输出还是"144："，不要改为其他格式\n10. 示例：如果原文有"，："，保持原样，不要改为"，："或其他组合\n最重要：解决随意换行问题，整合在一行里！保持段落内的连续性，只在段落之间添加空行！'
          },
          {
            role: 'user',
            content: `原文：\n${originalText}\n\n要求：只做排版修复（修复断开、添加分段），保持原文一字不变，包括所有标点符号和数字格式都不允许修改！`
          }
        ],
        temperature: 0.05,
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

      // 扣除用户积分
      try {
        const requestUrl = request.headers.get('host')
          ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
          : process.env.NEXTAUTH_URL || 'http://localhost:3004';

        const deductResponse = await fetch(`${requestUrl}/api/points/deduct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            userId: userId,
            points: 1,
            description: `AI智能排版服务 - 文本长度: ${originalText.length}字符`
          })
        });

        if (deductResponse.ok) {
          pointsDeducted = true;
          console.log('💰 积分扣除成功: -1积分');
        } else {
          console.warn('⚠️ 积分扣除失败:', await deductResponse.text());
        }
      } catch (deductError) {
        console.error('❌ 积分扣除异常:', deductError);
        // 不影响主功能，继续执行
      }

      console.log('🎉 AI智能排版完成:', {
        resultLength: formattedText.length,
        userId: userId,
        pointsDeducted: pointsDeducted
      });

      return NextResponse.json({
        success: true,
        formattedText: formattedText.trim(),
        originalText: originalText,
        usage: data.usage || null,
        pointsDeducted: pointsDeducted,
        pointsCost: 1
      });
    } else {
      console.error('❌ 火山引擎API返回格式异常:', data);
      throw new Error('火山引擎API返回格式异常，缺少choices字段');
    }

  } catch (error) {
    console.error('❌ AI排版处理失败:', error);

    // 如果已经扣除了积分，需要退还
    if (pointsDeducted && userId) {
      try {
        const requestUrl = request.headers.get('host')
          ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
          : process.env.NEXTAUTH_URL || 'http://localhost:3004';

        const refundResponse = await fetch(`${requestUrl}/api/points/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            userId: userId,
            points: 1,
            description: 'AI智能排版失败退款'
          })
        });

        if (refundResponse.ok) {
          console.log('💰 已退还1积分（AI排版失败退款）');
        } else {
          console.error('❌ 积分退还失败:', await refundResponse.text());
        }
      } catch (refundError) {
        console.error('❌ 积分退还错误:', refundError);
      }
    }

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
      apiError: error instanceof Error ? error.message : '未知错误',
      pointsRefunded: pointsDeducted
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