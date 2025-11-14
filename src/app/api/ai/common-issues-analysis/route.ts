import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 开始共性问题分析API处理');

    const body = await request.json();
    const { topic, studentEssays } = body;

    // 积分相关变量
    let pointsDeducted = false;
    let userId = null;

    if (!topic || !studentEssays || !Array.isArray(studentEssays) || studentEssays.length === 0) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数：应用文题目和学生作文内容'
      }, { status: 400 });
    }

    // 获取用户身份并验证积分
    try {
      // 获取用户信息
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
      if (userData.user_points && userData.user_points.points < 3) {
        return NextResponse.json({
          success: false,
          error: '积分不足，需要3积分才能进行共性问题分析'
        }, { status: 402 });
      }

      console.log('💰 用户积分充足:', { currentPoints: userData.user_points.points, requiredPoints: 3 });

    } catch (authError) {
      console.error('❌ 用户身份验证失败:', authError);
      return NextResponse.json({
        success: false,
        error: '用户身份验证失败，请重新登录'
      }, { status: 401 });
    }

    console.log('📝 分析参数:', {
      topicLength: topic.length,
      essaysCount: studentEssays.length,
      topic: topic.substring(0, 100) + '...'
    });

    // 构建作文内容文本
    const essaysContent = studentEssays.map((essay, index) => {
      return `${essay.studentName}:\n${essay.content}\n`;
    }).join('\n---\n');

    // 构建给Gemini的提示词
    const prompt = `请你作为一名专业的英语教师，分析以下学生在应用文写作中的共性问题。

## 作文题目
${topic}

## 学生作文内容
${essaysContent}

**重要提示：** 在分析中请直接使用学生的真实姓名进行举例和说明，不要使用"学生1"、"学生2"等编号。这样可以让分析报告更具个性化和针对性。

请按照以下结构进行分析：

### 1. 共性问题分析
请从以下几个方面详细分析学生的共性问题：
- **语法基础错误**: 时态、语态、冠词、介词等常见错误
- **词汇运用问题**: 词汇搭配、用词准确性、词汇丰富度等
- **内容与逻辑**: 内容完整性、逻辑连贯性、结构组织等
- **语言表达**: 句式多样性、语言流畅性、表达准确性等

### 2. 高分词汇与句式结构
针对本次写作任务，推荐：
- **高分词汇**: 提供适合B1层次的高级词汇及其用法
- **黄金句式**: 提供多种实用的句式结构模板
- **连接词组**: 提升文章连贯性的过渡词和短语

### 3. 写作提升策略（B1层次）
提供具体可行的提升建议：
- **语法强化**: 针对共性语法问题的练习建议
- **词汇拓展**: 词汇学习和记忆的方法
- **结构优化**: 应用文写作结构和模板
- **练习策略**: 日常练习和提升的具体方法

请用中文回复，内容要详细、实用，适合教师指导学生使用。`;

    try {
      // 调用极客智坊Gemini 2.5 Pro API
      console.log('🔑 API密钥检查:', {
        hasApiKey: !!process.env.GEEKAI_API_KEY,
        apiKeyLength: process.env.GEEKAI_API_KEY?.length || 0
      });

      const response = await fetch('https://geekai.co/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GEEKAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-pro',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 18000,
          stream: false
        })
      });

      console.log('🔍 极客智坊 Gemini API响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 极客智坊 Gemini API调用失败:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });

        throw new Error(`极客智坊 Gemini API调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ 极客智坊 Gemini API响应成功:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        usage: data.usage
      });

      if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
        throw new Error('极客智坊 Gemini API返回了无效的响应格式');
      }

      const analysisResult = data.choices[0].message.content;

      console.log('✅ 共性问题分析完成:', {
        resultLength: analysisResult.length,
        resultPreview: analysisResult.substring(0, 200) + '...'
      });

      // 扣除用户积分
      try {
        const deductResponse = await fetch(`${requestUrl}/api/points/deduct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            userId: userId,
            points: 3,
            description: `共性问题分析 - ${studentEssays.length}名学生作文`
          })
        });

        if (deductResponse.ok) {
          pointsDeducted = true;
          console.log('💰 积分扣除成功: -3积分');
        } else {
          console.warn('⚠️ 积分扣除失败:', await deductResponse.text());
        }
      } catch (deductError) {
        console.error('❌ 积分扣除异常:', deductError);
        // 不影响主功能，继续执行
      }

      return NextResponse.json({
        success: true,
        result: analysisResult,
        analysisCount: studentEssays.length,
        topic: topic,
        pointsDeducted: pointsDeducted
      });

    } catch (apiError) {
      console.error('❌ 极客智坊 Gemini API调用失败:', apiError);

      // 如果已经扣除了积分，需要退款
      if (pointsDeducted && userId) {
        try {
          console.log('💳 开始退款3积分...');
          const refundResponse = await fetch(`${requestUrl}/api/points/add`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('Cookie') || ''
            },
            body: JSON.stringify({
              userId: userId,
              points: 3,
              description: '共性问题分析失败退款'
            })
          });

          if (refundResponse.ok) {
            console.log('✅ 积分退款成功: +3积分');
            return NextResponse.json({
              success: false,
              error: `极客智坊 Gemini API调用失败，已退还3积分: ${apiError instanceof Error ? apiError.message : '未知错误'}`,
              refunded: true
            }, { status: 500 });
          } else {
            console.error('❌ 积分退款失败:', await refundResponse.text());
          }
        } catch (refundError) {
          console.error('❌ 积分退款异常:', refundError);
        }
      }

      return NextResponse.json({
        success: false,
        error: `极客智坊 Gemini API调用失败: ${apiError instanceof Error ? apiError.message : '未知错误'}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ 共性问题分析API处理失败:', error);

    // 如果已经扣除了积分，需要退款
    if (pointsDeducted && userId) {
      try {
        console.log('💳 系统异常，开始退款3积分...');
        const refundResponse = await fetch(`${requestUrl}/api/points/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            userId: userId,
            points: 3,
            description: '共性问题分析系统异常退款'
          })
        });

        if (refundResponse.ok) {
          console.log('✅ 积分退款成功: +3积分');
          return NextResponse.json({
            success: false,
            error: `分析处理失败，已退还3积分: ${error instanceof Error ? error.message : '未知错误'}`,
            refunded: true
          }, { status: 500 });
        } else {
          console.error('❌ 积分退款失败:', await refundResponse.text());
        }
      } catch (refundError) {
        console.error('❌ 积分退款异常:', refundError);
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '分析处理失败'
    }, { status: 500 });
  }
}