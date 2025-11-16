import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 智谱清言官方API配置
const GEEKAI_API_KEY = process.env.ZhipuOfficial;
const GEEKAI_AGENT_API_URL = 'https://open.bigmodel.cn/api/v1/agents';
const GEEKAI_CHAT_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 学科映射到Agent的custom_variables配置
const subjectConfigs = {
  english: {
    subject: "英语",
    strategy: "language_learning",
    strategy_config: {
      language_learning: {
        suggestion: "详细分析语法结构、词汇用法，提供准确的翻译和语言点讲解"
      }
    }
  },
  math: {
    subject: "数学",
    strategy: "stem_solving",
    strategy_config: {
      stem_solving: {
        suggestion: "提供详细的解题步骤、公式推导和数学原理讲解"
      }
    }
  },
  physics: {
    subject: "物理",
    strategy: "stem_solving",
    strategy_config: {
      stem_solving: {
        suggestion: "详细分析物理过程，应用相关定律和公式，提供完整的推导过程"
      }
    }
  },
  chemistry: {
    subject: "化学",
    strategy: "stem_solving",
    strategy_config: {
      stem_solving: {
        suggestion: "分析化学反应机理，提供化学方程式和相关计算过程"
      }
    }
  },
  biology: {
    subject: "生物",
    strategy: "stem_solving",
    strategy_config: {
      stem_solving: {
        suggestion: "详细解释生物过程和原理，联系相关知识点和实验方法"
      }
    }
  }
};

interface ProblemSolvingRequest {
  subject: string;
  problem: string;
}

interface ProblemSolvingResponse {
  success: boolean;
  solution?: string;
  error?: string;
  pointsCost?: number;
  remainingPoints?: number;
}

// 调用智谱清言Agent API的函数
const callZhipuAgent = async (subject: string, problem: string): Promise<string> => {
  console.log('🤖 开始调用智谱清言Agent API...');

  if (!GEEKAI_API_KEY) {
    console.error('❌ 智谱清言API密钥未配置');
    throw new Error('智谱清言API密钥未配置，请联系管理员配置环境变量');
  }

  console.log('✅ 智谱API密钥验证通过，密钥长度:', GEEKAI_API_KEY.length);

  // 获取学科配置
  const config = subjectConfigs[subject as keyof typeof subjectConfigs];
  if (!config) {
    throw new Error(`不支持的学科: ${subject}`);
  }

  // 使用标准的Chat Completions API作为备用方案
  let requestBody: any = {
    model: "glm-4",
    messages: [
      {
        role: "system",
        content: `你是一位专业的${config.subject}教师，擅长解答${config.subject}题目。请提供详细的解题步骤、原理分析和知识点讲解。${config.strategy_config[config.strategy as keyof typeof config.strategy_config]?.suggestion || ''}`
      },
      {
        role: "user",
        content: `请帮我解答以下${config.subject}题目：${problem}`
      }
    ],
    temperature: 0.3,
    max_tokens: 4000,
    stream: false
  };

  let apiUrl = GEEKAI_CHAT_API_URL;

  // 先尝试Agent API，如果失败则使用Chat Completions API
  try {
    console.log('🎯 尝试使用Agent API...');

    const agentRequestBody = {
      agent_id: "intelligent_education_solve_agent",
      stream: false,
      messages: [
        {
          role: "user",
          content: `请帮我解答以下${config.subject}题目：${problem}`
        }
      ],
      custom_variables: config
    };

    console.log('📝 Agent请求参数:', {
      agent_id: agentRequestBody.agent_id,
      subject: config.subject,
      problem_length: problem.length
    });

    const response = await fetch(GEEKAI_AGENT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEEKAI_API_KEY}`
      },
      body: JSON.stringify(agentRequestBody)
    });

    if (response.ok) {
      // 安全地解析JSON响应
      let data;
      const responseText = await response.text();

      try {
        data = JSON.parse(responseText);
        console.log('✅ Agent API调用成功，响应结构:', Object.keys(data));
      } catch (parseError) {
        console.error('❌ Agent API JSON解析失败，原始响应前500字符:', responseText.substring(0, 500));
        throw new Error('Agent API返回格式错误，请稍后重试');
      }

      // 尝试多种可能的响应格式
      let result = data.choices?.[0]?.message?.content ||
                  data.result?.output ||
                  data.output ||
                  data.content ||
                  data.result;

      if (result && typeof result === 'string' && result.trim().length > 0) {
        console.log('✅ 获取到Agent解题结果，内容长度:', result.length);
        return result.trim();
      }

      console.warn('⚠️ Agent API响应格式异常，尝试使用Chat Completions API');
    } else {
      console.warn('⚠️ Agent API调用失败，尝试使用Chat Completions API');
    }
  } catch (error) {
    console.warn('⚠️ Agent API异常，切换到Chat Completions API:', error);
  }

  // 使用Chat Completions API作为备用方案
  console.log('🔄 使用Chat Completions API备用方案...');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEEKAI_API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    console.error('❌ Chat Completions API HTTP错误:', {
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

    throw new Error(`API请求失败 (${response.status}): ${response.statusText} ${errorDetails ? `- ${errorDetails.substring(0, 200)}` : ''}`);
  }

  // 安全地解析JSON响应
  let data;
  const responseText = await response.text();

  try {
    data = JSON.parse(responseText);
    console.log('✅ Chat Completions API调用成功');
  } catch (parseError) {
    console.error('❌ Chat Completions API JSON解析失败，原始响应前500字符:', responseText.substring(0, 500));
    throw new Error('Chat Completions API返回格式错误，请稍后重试');
  }

  // 提取回复内容
  const result = data.choices?.[0]?.message?.content;

  if (!result) {
    console.error('❌ API返回空结果，完整响应:', JSON.stringify(data, null, 2));
    throw new Error('AI服务返回了空结果，请稍后重试');
  }

  console.log('✅ 获取到解题结果，内容长度:', result.length);
  return result.trim();
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 各学科解题API被调用！');

    // 获取请求数据
    const requestData: ProblemSolvingRequest = await request.json();
    const { subject, problem } = requestData;

    console.log('📝 解题请求接收到:', {
      subject,
      problemLength: problem?.length,
      problemPreview: problem?.substring(0, 100) + (problem?.length > 100 ? '...' : '')
    });

    // 验证必要参数
    if (!subject || !problem) {
      console.error('❌ 缺少必要参数:', { subject: !!subject, problem: !!problem });
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证学科是否支持
    if (!subjectConfigs[subject as keyof typeof subjectConfigs]) {
      console.error('❌ 不支持的学科:', subject);
      return NextResponse.json({ error: `不支持的学科: ${subject}` }, { status: 400 });
    }

    // 使用Supabase进行用户认证和点数管理
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      console.error('学科解题API - 用户认证失败', {
        error: error?.message,
        hasUser: !!user
      });
      return NextResponse.json(
        { success: false, error: '用户认证失败，请重新登录' },
        { status: 401 }
      );
    }

    console.log('学科解题API - 用户验证成功', {
      userId: user.id,
      email: user.email
    });

    // 点数管理 - 每次解题消耗8点数
    const pointsCost = 8;
    const currentUserId = user.id;

    try {
      const pointsDeducted = await SupabasePointsService.deductPoints(currentUserId, pointsCost, 'subject_problem_solving');

      if (!pointsDeducted) {
        console.log('学科解题API - 点数不足，拒绝请求', { userId: currentUserId });
        return NextResponse.json(
          { success: false, error: `点数不足，需要${pointsCost}点数` },
          { status: 402 }
        );
      }

      console.log('学科解题API - 点数扣除成功', { userId: currentUserId, pointsCost });
    } catch (pointsError) {
      console.error('学科解题API - 点数扣除失败:', pointsError);
      return NextResponse.json(
        { success: false, error: '点数验证失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 调用AI进行解题
    let solution;
    try {
      console.log('🤖 开始调用智谱清言Agent进行解题...');

      solution = await callZhipuAgent(subject, problem);

      console.log('✅ 智谱清言Agent解题完成');

    } catch (error) {
      console.error('❌ 智谱清言Agent解题调用失败:', error);

      // API失败时退还点数
      try {
        const refundReason = `学科解题失败-${subject}`;
        await SupabasePointsService.addPoints(currentUserId, pointsCost, refundReason);
        console.log('💰 已退还点数:', { userId: currentUserId, refundAmount: pointsCost, reason: refundReason });
      } catch (refundError) {
        console.error('退费失败:', refundError);
      }

      return NextResponse.json({
        success: false,
        error: `AI解题服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: {
          subject,
          errorType: 'api_call_failed',
          pointsRefunded: true,
          refundAmount: pointsCost
        }
      }, { status: 500 });
    }

    const response: ProblemSolvingResponse = {
      success: true,
      solution: solution,
      pointsCost: 8,
      remainingPoints: 798 // 这里应该从数据库获取真实剩余点数
    };

    console.log('✅ 成功生成响应:', {
      success: response.success,
      solutionLength: solution?.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 各学科解题失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '解题失败，请稍后重试'
    }, { status: 500 });
  }
}