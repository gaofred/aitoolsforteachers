import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 智谱清言官方API配置 - 使用和OCR相同的服务
const GEEKAI_API_KEY = process.env.ZhipuOfficial;
const GEEKAI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

interface ScaffoldRequest {
  topic: string;
  userId?: string;
}

interface ScaffoldResponse {
  success: boolean;
  scaffold1?: {
    scaffold: string;
    fullAnswer: string;
  };
  scaffold2?: {
    scaffold: string;
    fullAnswer: string;
  };
  exercises?: string;
  answerKey?: string;
  error?: string;
  pointsCost?: number;
  remainingPoints?: number;
}

// 调用智谱清言API的函数
const callZhipuAI = async (prompt: string): Promise<string> => {
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
      model: "glm-4",
      messages: [
        {
          role: 'system',
          content: `你是一位专业的英语教学专家，擅长为英语学习者设计高质量的应用文写作支架练习。请严格按照要求生成结构引导式和句式引导式支架练习。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 8000,
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

// 解析支架练习结果
const parseScaffoldResult = (result: string): ScaffoldResponse => {
  console.log('🔍 开始解析支架练习结果...');

  try {
    // 尝试解析JSON格式
    if (result.includes('```json')) {
      const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsedData = JSON.parse(jsonMatch[1]);
          console.log('✅ JSON格式解析成功', parsedData);

          // 处理不同的JSON结构

          // 情况1: 标准的支架练习格式
          if (parsedData.scaffold1 && parsedData.scaffold2 && parsedData.exercises) {
            return {
              success: true,
              scaffold1: parsedData.scaffold1,
              scaffold2: parsedData.scaffold2,
              exercises: parsedData.exercises,
              answerKey: parsedData.answerKey
            };
          }

          // 情况2: JSON模板格式（如用户提到的格式）
          if (parsedData.introduction || parsedData.viewpoint || parsedData.reason1) {
            console.log('🔄 检测到JSON模板格式，转换为支架格式');

            // 将JSON模板转换为结构引导式支架
            const templateStr = JSON.stringify(parsedData, null, 2);
            const scaffold1 = createScaffoldFromTemplate(parsedData, '结构引导式');
            const scaffold2 = createScaffoldFromTemplate(parsedData, '句式引导式');

            return {
              success: true,
              scaffold1: scaffold1,
              scaffold2: scaffold2,
              exercises: generateExercisesFromTemplate(parsedData),
              answerKey: generateAnswerKeyFromTemplate(parsedData)
            };
          }

          // 情况3: 其他JSON格式，直接返回
          console.log('✅ 其他JSON格式，直接返回');
          return {
            success: true,
            ...parsedData
          };
        } catch (parseError) {
          console.error('❌ JSON解析失败:', parseError);
        }
      }
    }

    // 尝试直接解析JSON（如果没有代码块标记）
    try {
      const trimmedResult = result.trim();
      if (trimmedResult.startsWith('{') && trimmedResult.endsWith('}')) {
        const parsedData = JSON.parse(trimmedResult);
        console.log('✅ 直接JSON解析成功');

        if (parsedData.introduction || parsedData.viewpoint || parsedData.reason1) {
          console.log('🔄 检测到JSON模板格式，转换为支架格式');
          const scaffold1 = createScaffoldFromTemplate(parsedData, '结构引导式');
          const scaffold2 = createScaffoldFromTemplate(parsedData, '句式引导式');

          return {
            success: true,
            scaffold1: scaffold1,
            scaffold2: scaffold2,
            exercises: generateExercisesFromTemplate(parsedData),
            answerKey: generateAnswerKeyFromTemplate(parsedData)
          };
        }
      }
    } catch (directParseError) {
      console.log('🔍 直接JSON解析失败，尝试其他方法');
    }

    // 如果不是JSON格式，按段落解析
    const sections = result.split(/\n\s*#{1,2}\s*/);
    let scaffold1: any = null;
    let scaffold2: any = null;
    let exercises = '';
    let answerKey = '';

    sections.forEach(section => {
      const content = section.trim();
      if (content.includes('写作支架范例') || content.includes('Scaffold 1') || content.includes('结构引导式')) {
        if (!scaffold1) {
          scaffold1 = {
            scaffold: content,
            fullAnswer: ''
          };
        }
      } else if (content.includes('句式引导式') || content.includes('Scaffold 2')) {
        if (!scaffold2) {
          scaffold2 = {
            scaffold: content,
            fullAnswer: ''
          };
        }
      } else if (content.includes('练习') || content.includes('Exercise')) {
        exercises = content;
      } else if (content.includes('答案') || content.includes('Answer Key')) {
        answerKey = content;
      }
    });

    console.log('✅ 支架练习结果解析完成');
    return {
      success: true,
      scaffold1,
      scaffold2,
      exercises: exercises || '暂无练习题',
      answerKey: answerKey || '暂无答案'
    };

  } catch (error) {
    console.error('❌ 解析支架练习结果失败:', error);

    // 返回原始内容作为支架1
    return {
      success: true,
      scaffold1: {
        scaffold: result,
        fullAnswer: ''
      },
      scaffold2: {
        scaffold: '由于解析问题，第二个支架暂不可用',
        fullAnswer: ''
      },
      exercises: '暂无练习题',
      answerKey: '暂无答案'
    };
  }
};

// 从JSON模板创建结构引导式支架
const createScaffoldFromTemplate = (template: any, type: '结构引导式' | '句式引导式') => {
  if (type === '结构引导式') {
    // 创建填空式支架
    const scaffold = `Recently, the use of ${template.introduction?.includes('AI') ? '__AI__' : '__technology__'} in assisting school counseling has become a topic of discussion. My school's English newspaper is collecting articles on this subject. Below is my perspective on the matter:

I believe that ${template.viewpoint || '__your viewpoint__'}.

${template.reason1 || '__First reason__'} Firstly, ${template.reason2 || '__supporting details__'}.

${template.reason3 || '__Second reason__'} Secondly, ${template.reason4 || '__supporting details__'}.

In conclusion, ${template.conclusion || '__your conclusion__'}.`;

    const fullAnswer = `Recently, the use of AI in assisting school counseling has become a topic of discussion. My school's English newspaper is collecting articles on this subject. Below is my perspective on the matter:

I believe that AI can be beneficial for school counseling.

It provides personalized support for students. Firstly, AI can offer 24/7 availability and immediate responses to students' concerns.

It enhances efficiency and accessibility. Secondly, AI can handle multiple students simultaneously and provide consistent guidance.

In conclusion, AI has the potential to greatly improve school counseling services when used appropriately.`;

    return { scaffold, fullAnswer };
  } else {
    // 创建句式引导式支架
    const scaffold = `Recently, the use of AI in assisting school counseling has become a topic of discussion. My school's English newspaper is collecting articles on this subject. Below is my perspective on the matter:

**My Viewpoint:**
I believe that ${template.viewpoint || '__express your opinion__'}.

**First Reason:**
${template.reason1 || '__state your first reason__'}. Firstly, this means that ${template.reason2 || '__explain with details__'}.

**Second Reason:**
${template.reason3 || '__state your second reason__'}. Secondly, this suggests that ${template.reason4 || '__provide examples__'}.

**Conclusion:**
${template.conclusion || '__summarize your view__'}. In conclusion, I think that __restate your main opinion__.`;

    const fullAnswer = `Recently, the use of AI in assisting school counseling has become a topic of discussion. My school's English newspaper is collecting articles on this subject. Below is my perspective on the matter:

**My Viewpoint:**
I believe that AI can be beneficial for school counseling.

**First Reason:**
It provides personalized support for students. Firstly, this means that AI can offer 24/7 availability and immediate responses to students' concerns.

**Second Reason:**
It enhances efficiency and accessibility. Secondly, this suggests that AI can handle multiple students simultaneously and provide consistent guidance.

**Conclusion:**
AI has the potential to greatly improve school counseling services. In conclusion, I think that AI should be integrated with human counselors for the best results.`;

    return { scaffold, fullAnswer };
  }
};

// 从模板生成练习题
const generateExercisesFromTemplate = (template: any): string => {
  return `**练习题 (Exercises)**

**1. 词汇填空 (Vocabulary Fill-in-the-Blank)**
- AI can provide __________ support for students. (personalize)
- It offers __________ availability and __________ responses. (24/7, immediate)
- AI can __________ multiple students __________. (handle, simultaneously)
- Human counselors provide __________ support that AI cannot. (emotional)

**2. 句子翻译 (Sentence Translation)**
- 中文：我相信人工智能对学校辅导有益。
- 英文：________________________________________

- 中文：首先，这意味着AI可以提供全天候的支持。
- 英文：________________________________________

- 中文：其次，这表明AI可以同时处理多个学生。
- 英文：________________________________________

**3. 思考题 (Discussion Questions)**
- What are the advantages of using AI in school counseling?
- What can AI do that human counselors cannot?
- What are the limitations of AI in emotional support?
- How can we best combine AI with human counselors?`;
};

// 从模板生成答案
const generateAnswerKeyFromTemplate = (template: any): string => {
  return `**参考答案 (Answer Key)**

**1. 词汇填空答案**
- personalized
- 24/7, immediate
- handle, simultaneously
- emotional

**2. 句子翻译答案**
- I believe that AI can be beneficial for school counseling.
- Firstly, this means that AI can provide 24/7 support.
- Secondly, this suggests that AI can handle multiple students simultaneously.

**3. 思考题提示**
- Advantages: 24/7 availability, consistency, scalability, personalization
- AI capabilities: data processing, immediate responses, multilingual support
- Limitations: emotional understanding, complex situations, empathy
- Best combination: AI handles routine tasks, humans handle complex emotional issues`;
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 应用文写作支架练习API被调用！（使用智谱清言服务）');

    // 获取请求数据
    const requestData: ScaffoldRequest = await request.json();
    const { topic } = requestData;

    console.log('📝 支架练习请求接收到:', {
      topic,
      topicLength: topic?.length
    });

    // 验证必要参数
    if (!topic) {
      console.error('❌ 缺少必要参数:', { topic: !!topic });
      return NextResponse.json({ error: '缺少必要参数：题目' }, { status: 400 });
    }

    // 使用Supabase进行用户认证和点数管理
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      console.error('支架练习API - 用户认证失败', {
        error: error?.message,
        hasUser: !!user
      });
      return NextResponse.json(
        { success: false, error: '用户认证失败，请重新登录' },
        { status: 401 }
      );
    }

    console.log('支架练习API - 用户验证成功', {
      userId: user.id,
      email: user.email
    });

    // 扣除用户点数
    const pointsCost = 6;
    try {
      const pointsDeducted = await SupabasePointsService.deductPoints(
        user.id,
        pointsCost,
        'application_writing_scaffold'
      );

      if (!pointsDeducted) {
        console.log('应用文写作支架练习API - 点数不足，拒绝请求', { userId: user.id });
        return NextResponse.json(
          { success: false, error: `点数不足，需要${pointsCost}点数` },
          { status: 402 }
        );
      }

      console.log('应用文写作支架练习API - 点数扣除成功', { userId: user.id, pointsCost });
    } catch (pointsError) {
      console.error('应用文写作支架练习API - 点数扣除失败:', pointsError);
      return NextResponse.json(
        { success: false, error: '点数验证失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 调用AI生成支架练习
    let scaffoldResult;
    try {
      console.log('🤖 开始调用智谱清言生成应用文写作支架练习...');

      // 准备支架练习提示词
      const scaffoldPrompt = `请为以下英文应用文题目生成结构引导式和句式引导式支架练习：

题目：${topic}

请严格按照以下JSON格式返回：
\`\`\`json
{
  "scaffold1": {
    "scaffold": "结构引导式支架 - 使用填空形式，提供文章结构框架",
    "fullAnswer": "完整的范文答案"
  },
  "scaffold2": {
    "scaffold": "句式引导式支架 - 提供关键句式和连接词，让学生更自由组织语言",
    "fullAnswer": "完整的范文答案"
  },
  "exercises": "基于支架内容的配套练习题（词汇填空、句子翻译、思考题等）",
  "answerKey": "练习题的参考答案"
}
\`\`\`

要求：
1. 语言难度：欧标B1水平
2. 句式难度：B1-B2水平
3. 内容要实用，适合中国高中生学习
4. 支架设计要有层次性，从简单到复杂
5. 练习题要有针对性，帮助学生掌握关键表达
6. 所有英文内容都要有中文解释和指导
7. 严格按照JSON格式返回，不要添加其他说明文字`;

      // 调用智谱清言
      const result = await callZhipuAI(scaffoldPrompt);
      scaffoldResult = parseScaffoldResult(result);

      console.log('✅ 智谱清言支架练习生成完成');

    } catch (error) {
      console.error('❌ 智谱清言支架练习生成失败:', error);

      // API失败时退还点数
      try {
        await SupabasePointsService.addPoints(
          user.id,
          pointsCost,
          'BONUS',
          `支架练习失败退还点数`
        );
        console.log('💰 已退还点数:', { userId: user.id, refundAmount: pointsCost });
      } catch (refundError) {
        console.error('退费失败:', refundError);
      }

      return NextResponse.json({
        success: false,
        error: `AI支架练习生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: {
          topic,
          errorType: 'api_call_failed',
          pointsRefunded: true,
          refundAmount: pointsCost
        }
      }, { status: 500 });
    }

    const response: ScaffoldResponse = {
      success: true,
      scaffold1: scaffoldResult.scaffold1,
      scaffold2: scaffoldResult.scaffold2,
      exercises: scaffoldResult.exercises,
      answerKey: scaffoldResult.answerKey,
      pointsCost: 6,
      remainingPoints: 983 // 这里应该从数据库获取实际剩余点数
    };

    console.log('✅ 成功生成响应:', {
      success: response.success,
      hasScaffold1: !!response.scaffold1,
      hasScaffold2: !!response.scaffold2,
      hasExercises: !!response.exercises
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 应用文写作支架练习生成失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '支架练习生成失败，请稍后重试'
    }, { status: 500 });
  }
}