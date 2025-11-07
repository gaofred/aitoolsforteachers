import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 延迟初始化OpenAI客户端，避免构建时检查API密钥
const getOpenAIClient = () => {
  const { OpenAI } = require('openai');
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 用户认证
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    console.log('大白话解读用户认证成功:', user.id);

    // 解析请求数据
    const body = await request.json();
    const { text, type = 'general' } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: '请提供有效的文本内容' },
        { status: 400 }
      );
    }

    console.log('开始大白话解读，文本长度:', text.length, '类型:', type);

    // 构建针对不同类型的大白话解读提示词
    const getPrompt = (textType: string, content: string) => {
      if (textType === 'academic_essay') {
        return `你是一位擅长将复杂学术内容通俗化的教育专家。请将以下学术论文内容用最简单、最通俗的语言进行解读，让没有专业背景的人也能理解。

要求：
1. 用大白话解释核心观点，避免专业术语
2. 用生动的比喻和日常生活中的例子来说明
3. 重点突出"这东西是干嘛的"、"为什么重要"、"对我们有什么用"
4. 语言要接地气，可以适当使用网络流行语，但要有度
5. 如果有复杂的概念，要用最简单的类比来解释
6. 整体风格要像是在给好朋友解释一个有趣的概念

学术论文内容：
${content}

请按以下格式返回JSON：
{
  "simpleExplanation": "用大白话解读的主要内容",
  "keyPoints": ["3-5个最核心的简单要点"],
  "methodology": "用通俗语言解释研究方法",
  "implications": "这个研究对我们普通人有什么意义",
  "strengths": "这个研究厉害在哪里（用简单语言）",
  "limitations": "这个研究的不足之处（用简单语言）",
  "contributions": "这个研究贡献了什么新东西",
  "practicalApplications": "这个研究在实际生活中能用在哪里",
  "futureResearch": "后续还能研究什么",
  "relatedWork": "还有哪些类似的研究"
}`;
      }

      // 通用大白话解读
      return `你是一位擅长将复杂内容通俗化的专家。请将以下内容用最简单、最通俗的语言进行解读，让普通人也能理解。

要求：
1. 用大白话解释核心内容
2. 避免专业术语和复杂表达
3. 用生动的比喻和日常例子
4. 重点突出"是什么"、"为什么"、"有什么用"

内容：
${content}

请按以下格式返回JSON：
{
  "simpleExplanation": "用大白话解读的主要内容",
  "keyPoints": ["3-5个最核心的简单要点"],
  "implications": "这内容对我们有什么意义"
}`;
    };

    const prompt = getPrompt(type, text);
    console.log('构建大白话解读提示词完成');

    // 获取OpenAI客户端
    const openai = getOpenAIClient();

    // 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "你是一个专业的学术内容通俗化专家，擅长将复杂的概念用简单易懂的语言解释清楚。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;
    console.log('OpenAI大白话解读完成，响应长度:', result?.length);

    if (!result) {
      throw new Error('OpenAI API返回空响应');
    }

    // 解析JSON结果
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
      console.log('大白话解读结果JSON解析成功');
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      // 如果JSON解析失败，尝试提取纯文本
      parsedResult = {
        simpleExplanation: result,
        keyPoints: ["解读完成，但结果格式化时出现问题"],
        error: "JSON解析失败，已返回原始文本"
      };
    }

    // 计算消耗点数（大白话解读消耗60%点数）
    const baseCost = 100; // 基础点数
    const finalCost = Math.floor(baseCost * 0.6);

    console.log('大白话解读消耗点数:', finalCost);

    const response = {
      success: true,
      result: parsedResult,
      cost: finalCost,
      type: 'simple_explanation'
    };

    console.log('大白话解读API调用成功完成');
    return NextResponse.json(response);

  } catch (error) {
    console.error('大白话解读API错误:', error);

    let errorMessage = '大白话解读失败';
    if (error instanceof Error) {
      if (error.message.includes('OpenAI')) {
        errorMessage = 'AI服务暂时不可用，请稍后重试';
      } else if (error.message.includes('insufficient_quota')) {
        errorMessage = 'AI服务配额不足，请联系管理员';
      } else {
        errorMessage = `大白话解读失败: ${error.message}`;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        result: null,
        type: 'simple_explanation'
      },
      { status: 500 }
    );
  }
}