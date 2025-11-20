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

    // 使用Supabase直接进行用户认证（与其他API保持一致）
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      console.error('共性问题分析API - 用户认证失败', {
        error: error?.message,
        errorCode: error?.code,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email
      });
      return NextResponse.json({
        success: false,
        error: '用户身份验证失败，请重新登录'
      }, { status: 401 });
    }

    userId = user.id;
    console.log('🔐 用户身份验证成功:', { userId, userEmail: user.email });

    // 使用SupabasePointsService检查和扣除积分
    const { SupabasePointsService } = await import('@/lib/supabase-points-service');
    const pointsCost = 3; // 共性问题分析需要3点数

    try {
      const deducted = await SupabasePointsService.deductPoints(userId, pointsCost, 'common_issues_analysis');

      if (!deducted) {
        console.log('共性问题分析API - 积分不足', { userId, pointsCost });
        return NextResponse.json({
          success: false,
          error: `积分不足，需要${pointsCost}积分才能进行共性问题分析`
        }, { status: 402 });
      }

      console.log('💰 共性问题分析积分扣除成功', { userId, pointsCost });
      pointsDeducted = true;
    } catch (pointsError) {
      console.error('❌ 共性问题分析积分处理失败:', pointsError);
      return NextResponse.json({
        success: false,
        error: '积分处理失败，请稍后重试'
      }, { status: 500 });
    }

    console.log('📝 分析参数:', {
      topicLength: topic.length,
      essaysCount: studentEssays.length,
      topic: topic.substring(0, 100) + '...'
    });

    // 构建作文内容文本
    const essaysContent = studentEssays.map((essay, index) => {
      return `
学生${index + 1}: ${essay.studentName || '未知学生'}
内容: ${essay.content || essay.originalText || '无内容'}
分数: ${essay.score || '未评分'}
反馈: ${essay.feedback || essay.detailedFeedback || '无反馈'}
---
`;
    }).join('\n');

    console.log('📝 构建的作文内容长度:', essaysContent.length);

    // 调用阿里云通义千问进行共性问题分析
    const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

    if (!DASHSCOPE_API_KEY) {
      console.error('❌ 阿里云通义千问API密钥未配置');
      // 退还积分
      if (pointsDeducted) {
        await SupabasePointsService.addPoints(userId, pointsCost, '共性问题分析API配置错误退款');
      }
      return NextResponse.json({
        success: false,
        error: '服务配置错误：API密钥未配置'
      }, { status: 500 });
    }

    const prompt = `作为一位专业的英语教师，请分析以下${studentEssays.length}篇学生作文，找出共性问题并提供教学建议。

作文题目：${topic}

学生作文：
${essaysContent}

请从以下几个方面进行分析：
1. 语法错误类型统计和频率
2. 词汇使用问题（重复、误用、搭配不当等）
3. 句式结构问题（简单句过多、复合句错误等）
4. 内容逻辑问题（跑题、结构混乱等）
5. 表达准确性问题（中式英语、不地道表达等）

请提供：
- 主要问题类型列表（按严重程度排序）
- 具体错误例子和正确表达建议
- 针对性的教学建议
- 课堂上需要重点讲解的知识点

请用中文回答，格式清晰，便于教师直接用于课堂教学。`;

    console.log('🤖 开始调用阿里云通义千问API进行共性问题分析...');

    const response = await fetch(DASHSCOPE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          {
            role: 'system',
            content: '你是一位经验丰富的英语教师，擅长分析学生作文中的共性问题并提供教学建议。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      console.error('❌ 阿里云通义千问API请求失败:', response.status, response.statusText);
      // 退还积分
      if (pointsDeducted) {
        await SupabasePointsService.addPoints(userId, pointsCost, '共性问题分析API调用失败退款');
      }
      return NextResponse.json({
        success: false,
        error: `分析服务异常，已退还${pointsCost}积分`
      }, { status: 500 });
    }

    const data = await response.json();
    const analysisResult = data.choices?.[0]?.message?.content;

    if (!analysisResult) {
      console.error('❌ API返回结果为空');
      // 退还积分
      if (pointsDeducted) {
        await SupabasePointsService.addPoints(userId, pointsCost, '共性问题分析API返回空结果退款');
      }
      return NextResponse.json({
        success: false,
        error: '分析服务返回空结果，已退还积分'
      }, { status: 500 });
    }

    console.log('✅ 共性问题分析完成，结果长度:', analysisResult.length);

    return NextResponse.json({
      success: true,
      result: analysisResult,
      analysisCount: studentEssays.length,
      topic: topic,
      pointsDeducted: pointsDeducted
    });

  } catch (error) {
    console.error('❌ 共性问题分析API处理失败:', error);

    // 如果已经扣除了积分，需要退款
    if (pointsDeducted && userId) {
      try {
        console.log('💳 系统异常，开始退款3积分...');
        const { SupabasePointsService } = await import('@/lib/supabase-points-service');

        const refundResult = await SupabasePointsService.addPoints(
          userId,
          3,
          '共性问题分析系统异常退款'
        );

        if (refundResult) {
          console.log('✅ 积分退款成功: +3积分');
          return NextResponse.json({
            success: false,
            error: `分析处理失败，已退还3积分: ${error instanceof Error ? error.message : '未知错误'}`,
            refunded: true
          }, { status: 500 });
        } else {
          console.error('❌ 积分退款失败: SupabasePointsService返回false');
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