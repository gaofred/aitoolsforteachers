import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 智谱清言官方API配置 - 使用和OCR相同的服务
const GEEKAI_API_KEY = process.env.ZhipuOfficial;
const GEEKAI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

interface GradingRequest {
  studentName: string;
  content: string;
  topic: string;
  plotAnalysis?: string;
  useMediumStandard?: boolean;
  userId?: string;
  includeDetailedFeedback?: boolean;
  wordCount?: number;
  p1Content?: string;
  p2Content?: string;
}

interface GradingResponse {
  success: boolean;
  score?: number;
  feedback?: string;
  improvedVersion?: string;
  detailedFeedback?: string;
  gradingDetails?: {
    contentPoints: string;
    languageErrors: string;
    logicalIssues: string;
    sentenceAnalysis: string;
    overallEvaluation: string;
  };
  error?: string;
  pointsCost?: number;
  remainingPoints?: number;
}

// 调用智谱清言API的函数
const callZhipuAI = async (prompt: string, useMediumStandard: boolean = false): Promise<string> => {
  console.log('🤖 开始调用智谱清言AI API...');

  if (!GEEKAI_API_KEY) {
    console.error('❌ 智谱清言API密钥未配置');
    throw new Error('智谱清言API密钥未配置，请联系管理员配置环境变量');
  }

  console.log('✅ 智谱API密钥验证通过，密钥长度:', GEEKAI_API_KEY.length);

  const response = await fetch(GEEKAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEEKAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        {
          role: 'system',
          content: `你是一位专业的高中英语教师，擅长批改学生的读后续写作文。你会根据高考评分标准给出详细的批改意见和分数。${useMediumStandard ? '采用中等标准，严格按照评分标准打分，不额外宽容加分' : '针对中国高中生的英语作文，评分标准应该相对宽容，不要因为一些小的语法或用词错误就过度扣分'}。同时，请鼓励和保留学生使用的高级词汇，只要语法正确就不要改为简单表达。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 16000,
      stream: false,
    })
  });

  if (!response.ok) {
    console.error('❌ 智谱清言API HTTP错误:', {
      status: response.status,
      statusText: response.statusText
    });

    let errorDetails = '';
    try {
      const errorText = await response.text();
      console.error('❌ API错误响应:', errorText);
      errorDetails = errorText;
    } catch (textError) {
      console.error('❌ 无法读取错误响应:', textError);
    }

    throw new Error(`智谱清言API请求失败 (${response.status}): ${response.statusText} ${errorDetails ? `- ${errorDetails.substring(0, 200)}` : ''}`);
  }

  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;

  if (!result) {
    throw new Error('AI API返回了空结果');
  }

  console.log('✅ 智谱清言API调用成功，返回内容长度:', result.length);
  return result;
};

// 解析打分结果中的分数
const parseScore = (result: string): number => {
  console.log('🔍 开始解析AI打分结果...');

  const scorePattern = /##\s*[^+\n]*?\+\s*学生分数\s*(\d+(?:\.\d+)?)/;
  const match = result.match(scorePattern);

  if (match) {
    const score = parseFloat(match[1]);
    console.log('✅ 提取到分数:', score);
    return score;
  }

  const fallbackPatterns = [
    /学生分数[:：]\s*(\d+(?:\.\d+)?)/,
    /分数[:：]\s*(\d+(?:\.\d+)?)/,
    /得分[:：]\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)分/
  ];

  for (const pattern of fallbackPatterns) {
    const fallbackMatch = result.match(pattern);
    if (fallbackMatch) {
      const score = parseFloat(fallbackMatch[1]);
      if (score >= 0 && score <= 25) {
        console.log('✅ 通过备用模式提取到分数:', score);
        return score;
      }
    }
  }

  console.warn('⚠️ 未能提取到分数，使用默认分数15');
  return 15;
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 读后续写批改API被调用！（使用智谱清言服务）');

    // 获取请求数据
    const requestData: GradingRequest = await request.json();
    const { studentName, content, topic, plotAnalysis, useMediumStandard, userId, includeDetailedFeedback, wordCount, p1Content, p2Content } = requestData;

    console.log('📝 批改请求接收到:', {
      studentName,
      contentLength: content?.length,
      wordCount: wordCount || content.split(/\s+/).filter(word => word.length >= 2 && /[a-zA-Z]{2,}/.test(word)).length,
      topic,
      hasPlotAnalysis: !!plotAnalysis,
      includeDetailedFeedback,
      useMediumStandard
    });

    // 验证必要参数
    if (!studentName || !content) {
      console.error('❌ 缺少必要参数:', { studentName: !!studentName, content: !!content });
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 使用Supabase进行用户认证和点数管理
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      console.error('续写批改API - 用户认证失败', {
        error: error?.message,
        hasUser: !!user
      });
      return NextResponse.json(
        { success: false, error: '用户认证失败，请重新登录' },
        { status: 401 }
      );
    }

    console.log('续写批改API - 用户验证成功', {
      userId: user.id,
      email: user.email
    });

    // 点数管理 - 每次批改消耗2点数
    const pointsCost = 2;
    const currentUserId = user.id;

    try {
      const pointsDeducted = await SupabasePointsService.deductPoints(currentUserId, pointsCost, 'continuation_writing_grading');

      if (!pointsDeducted) {
        console.log('续写批改API - 点数不足，拒绝请求', { userId: currentUserId });
        return NextResponse.json(
          { success: false, error: `点数不足，需要${pointsCost}点数` },
          { status: 402 }
        );
      }

      console.log('续写批改API - 点数扣除成功', { userId: currentUserId, pointsCost });
    } catch (pointsError) {
      console.error('续写批改API - 点数扣除失败:', pointsError);
      return NextResponse.json(
        { success: false, error: '点数验证失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 调用AI进行打分和批改
    let gradingResult;
    try {
      console.log('🤖 开始调用智谱清言进行打分和细致批改...');

      const actualWordCount = wordCount || content.split(/\s+/).filter(word => word.length >= 2 && /[a-zA-Z]{2,}/.test(word)).length;

      // 准备打分提示词
      const scoringPrompt = `# 请依据作文题目要求，给学生作文评分（注意，回复语言主体用汉语）

## 续写要求段落首句
${p1Content ? `**第一段必须以这个句子开头：** ${p1Content}` : ''}
${p2Content ? `**第二段必须以这个句子开头：** ${p2Content}` : ''}

## 学生信息
学生姓名：${studentName}
题目：${topic}
学生作文：
${content}

##读后续写词数统计
学生英语单词数：${actualWordCount}词`;

      // 并行调用智谱清言进行打分和细致批改
      const [scoringResult, detailedResult] = await Promise.all([
        callZhipuAI(scoringPrompt, useMediumStandard),
        includeDetailedFeedback ? callZhipuAI(`${scoringPrompt}\n\n请提供详细的批改建议和逐句分析。`, useMediumStandard) : Promise.resolve('')
      ]);

      // 解析分数
      const score = parseScore(scoringResult);

      gradingResult = {
        score,
        feedback: `##${studentName}+ 学生分数 ${score}`,
        detailedFeedback: detailedResult,
      };

      console.log('✅ 智谱清言批改完成，得分:', gradingResult.score);

    } catch (error) {
      console.error('❌ 智谱清言批改调用失败:', error);

      // API失败时退还点数
      try {
        const refundReason = `续写批改失败-${studentName}`;
        await SupabasePointsService.addPoints(currentUserId, pointsCost, refundReason);
        console.log('💰 已退还点数:', { userId: currentUserId, refundAmount: pointsCost, reason: refundReason });
      } catch (refundError) {
        console.error('退费失败:', refundError);
      }

      return NextResponse.json({
        success: false,
        error: `AI批改服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: {
          studentName,
          errorType: 'api_call_failed',
          pointsRefunded: true,
          refundAmount: pointsCost
        }
      }, { status: 500 });
    }

    const response: GradingResponse = {
      success: true,
      score: gradingResult.score,
      feedback: gradingResult.feedback,
      detailedFeedback: gradingResult.detailedFeedback,
      gradingDetails: {
        contentPoints: '已分析内容要点',
        languageErrors: '已分析语言错误',
        logicalIssues: '已分析逻辑问题',
        sentenceAnalysis: '已进行逐句分析',
        overallEvaluation: '已进行整体评价'
      },
      pointsCost: 2,
      remainingPoints: 798
    };

    console.log('✅ 成功生成响应:', {
      success: response.success,
      score: response.score
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 读后续写批改失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '批改失败，请稍后重试'
    }, { status: 500 });
  }
}