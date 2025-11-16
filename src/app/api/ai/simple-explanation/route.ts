import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 极客智坊API配置
const GEEKAI_API_URL = 'https://geekai.co/api/v1/chat/completions';
const GEEKAI_API_KEY = process.env.GEEKAI_API_KEY;

// 退还点数的辅助函数
async function refundPoints(supabase: any, user_id: string, amount: number, reason: string) {
  try {
    // 先获取当前supabase会话，确保有正确的token
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase.rpc('add_user_points', {
      p_user_id: user_id,
      p_amount: amount,
      p_type: 'REFUND',
      p_description: reason,
      p_related_id: null
    } as any);

    if (error) {
      console.error('退还点数失败:', error);
      return false;
    }
    console.log(`成功退还 ${amount} 点数给用户 ${user_id}，原因: ${reason}`);
    return true;
  } catch (error) {
    console.error('退还点数异常:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  let user: any = null;
  let text: string = '';
  let type: string = 'general';
  let parsedResult: any = null;

  try {
    // 使用Supabase标准认证方式
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    user = authUser;

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
    text = body.text || '';
    type = body.type || 'general';

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
        return `你是一位顶尖的科普作家和知识转述者，被誉为"最会搭梯子的人"。你的专长是将那些充斥着术语、数据和复杂模型的学术论文，转译（Reframe）成普通大众能轻松读懂、产生共鸣并深受启发的科普文章。

你的使命不是"翻译"论文，而是"重建"理解。你为读者搭建一座从"一无所知"到"原来如此"的桥梁，让他们在零负担的阅读中，领略到科学研究的真正魅力、核心发现及其对现实世界的意义。

---

工作流程：从论文到科普的"阶梯搭建"

当你收到一篇需要进行科普解读的学术论文时，你将严格遵循以下步骤：

* 第一步：挖掘"人"与"动机" (The "Who" and "Why")

  * 在深入论文细节前，先检索作者及其所属机构的背景。
  * 尝试建立一个有趣的联系：为什么是"他们"在研究"这个"问题？
    （例如：这个实验室是否一直在该领域深耕？他们是不是"跨界"解决了一个老问题？或者这个机构的使命是否与此相关？）
  * 【应用规则】：如果背景故事（如作者的"执念"或机构的"使命"）能让研究动机更生动，就在文章中巧妙融入。
    如果联系牵强，则不必在正文中提及，避免生硬介绍。

* 第二步：钻研与消化 (Digest and Understand)

  * 深入阅读论文，彻底拆解其核心三要素：

    1. 研究问题 (The Question)：他们到底想解决什么谜题？这个问题的背景和重要性是什么？
    2. 研究方法 (The How)：他们是怎么找到答案的？（重点理解其思路，而非复述技术细节）
    3. 核心发现 (The Finding)：他们最终发现了什么？这个发现有多"反直觉"或多"重要"？

* 第三步：定位"行业坐标"与"Aha!时刻" (Locate its Position and the "Aha! Moment")

  * （必要时使用工具检索）结合业界或学术界的现状来分析这篇论文。
  * 它在整个领域中扮演了什么角色？是解决了同行一个"老大难"的痛点？是推翻了一个旧认知？还是开辟了一个全新的赛道？
  * 提炼"故事线"：将论文的"论证逻辑"转化为"叙事逻辑"。
    找到论文中最激动人心的"Aha!"时刻，并明确这篇科普文章的核心"卖点"（Takeaway）——读者读完后，能带走的那个最清晰、最有价值的知识点。

* 第四步：撰写科普博文 (Compose the Pop-Science Blog)

  * 完全代入下方定义的"角色定位"与"写作风格"，撰写一篇独立、完整、引人入胜的科普解读。
  * 注意：篇幅长度不限，以"把普通人彻底讲明白"为唯一标准。
  * 确保在"所以呢？" (The "So What?") 部分，有力地传达出它对行业或普通人的真正影响（基于第三步的分析）。

---

读者与风格

* 目标读者：对世界充满好奇的普通大众。他们没有专业背景，渴望理解新知识，但对术语和公式天然"过敏"。他们阅读的目的是获取新知、满足好奇心和"哇塞"的瞬间。
* 写作风格：

  * 极致通俗 (Radical Accessibility)：比喻是你的第一语言。能用"厨房里的化学反应"解释的，绝不用"非对映选择性"。如果必须使用术语，必须立刻用一个生动的类比将其"翻译"掉。
  * 故事为王 (Storytelling)：把研究过程讲成一个"破案故事"或"探险之旅"。科学家是主角，他们面临一个难题，设计了一个聪明的"陷阱"（实验），最后抓住了"真相"（结论）。
  * 聚焦"所以呢？" (The "So What?")：时刻帮读者回答这个问题。这个研究跟我有什么关系？它为什么重要？它可能如何改变我们的生活或认知？
  * 简化而不歪曲 (Simplify, Don't Misrepresent)：这是科普的底线。在简化复杂概念时，保持核心事实的准确性。清晰地区分"已证实的"和"推测的"。

---

写作思路与技巧（供自由使用）

* 开篇点题，建立框架：

  * 可以用一个生动的问题、反直觉的观察或核心冲突来引入主题，快速帮读者定位。
  * 也可以先用简洁的语言勾勒出原文要解决的核心问题或讨论范围。

* 结构化梳理，逐层解析：

  * 善用小标题或清晰的段落划分，引导读者逐步理解。
  * 在转述原文观点时，无缝融入类比，让复杂的点变得具体可感。（例如："作者提到的'异步通信'，你就可以理解为发邮件，而不是打电话。"）

* 聚焦重点，详略得当：

  * 明确区分主干与枝叶。重点阐释核心观点与关键逻辑，简略带过次要信息。
  * 确保读者高效抓住重点。

* 巧妙融入背景：

  * 如果原文涉及人物或机构背景，自然融入解读，帮助读者理解"为什么"或"此刻的重要性"，避免生硬介绍。

* 结尾总结，提供价值：

  * 清晰提炼原文核心价值，或指出其当下意义。
  * 给读者一个明确的Takeaway，让他们确实学到东西，理解原文。

---

禁止出现的表达方式

* 避免生硬的引导语，如"本文研究了……"、"该论文的作者发现……"、"实验结果表明……"。
* 严禁直接复制论文摘要或引言中的学术黑话。
* 避免罗列枯燥数据或统计指标（如p值、置信区间），除非能转译为"有多大把握"或"效果有多明显"。

---

核心目标

你的文字是读者通往科学殿堂的"快速通道"和"专属翻译器"。
你必须用最大的真诚和智慧，将学术的"硬核"包裹在通俗、有趣、有故事性的"糖衣"里，让读者在愉快的阅读中，毫不费力地吸收最前沿的知识精髓。

请直接写一篇完整的科普文章，不需要JSON格式。文章应该有一个吸引人的标题和完整的结构。请开始解读：

${content}`;
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

请直接写一篇通俗易懂的解读文章，不需要JSON格式。`;
    };

    const prompt = getPrompt(type, text);
    console.log('构建大白话解读提示词完成');

    // 检查极客智坊API Key配置
    if (!GEEKAI_API_KEY) {
      return NextResponse.json(
        {
          error: '极客智坊API Key未配置，请检查环境变量 GEEKAI_API_KEY',
          result: null,
          type: 'simple_explanation'
        },
        { status: 500 }
      );
    }

    // 添加重试机制处理流量限制
    let result = '';
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`极客智坊API调用尝试 ${attempt}/${maxRetries}...`);

        const response = await fetch(GEEKAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEEKAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gemini-2.0-flash-exp',
            messages: [
              {
                role: 'system',
                content: '你是一位顶尖的科普作家和知识转述者，被誉为"最会搭梯子的人"。你的使命是将复杂的学术论文转译成普通大众能轻松读懂、产生共鸣并深受启发的科普文章。请严格遵循工作流程和写作风格指南。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`极客智坊API错误: ${response.status} ${response.statusText} - ${errorData}`);
        }

        const data = await response.json();
        result = data.choices?.[0]?.message?.content || '';

        console.log('极客智坊API大白话解读完成，响应长度:', result.length);

        if (!result || result.trim().length === 0) {
          throw new Error('极客智坊API返回空响应');
        }

        // 成功获取结果，跳出重试循环
        break;

      } catch (error: any) {
        lastError = error;
        console.error(`极客智坊API调用失败 (尝试 ${attempt}/${maxRetries}):`, error.message);

        // 如果是429错误且还有重试机会，等待后重试
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000; // 递增等待时间: 2s, 4s, 6s
            console.log(`遇到流量限制，等待 ${waitTime/1000} 秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        // 其他错误或重试次数用完，直接抛出
        throw error;
      }
    }

    if (!result || result.trim().length === 0) {
      throw new Error('极客智坊API返回空响应');
    }

    console.log('大白话解读结果处理成功（极客智坊API自然文本格式）');

    // 构造返回结果格式（兼容前端）
    // parsedResult 已在函数开头定义

    // 由于极客智坊返回的是自然文本，我们需要直接使用
    // 并尝试提取一些关键点
    if (type === 'academic_essay') {
      // 提取前150个字符作为implications
      const implications = result.length > 150 ? result.substring(0, 150) + "..." : result;

      // 从文章中提取可能的要点（以句号分割的长句）
      let keyPoints: string[] = [];
      const sentences = result.split(/[。！？]/).filter(s => s.trim().length > 15);

      // 提取3-5个最具代表性的句子作为要点
      if (sentences.length > 0) {
        const firstPoint = sentences[0].trim();
        const middlePoint = sentences[Math.floor(sentences.length / 2)].trim();
        const lastPoint = sentences[sentences.length - 1].trim();

        keyPoints = [firstPoint];
        if (sentences.length > 2 && middlePoint !== firstPoint) {
          keyPoints.push(middlePoint);
        }
        if (sentences.length > 1 && lastPoint !== firstPoint && lastPoint !== middlePoint) {
          keyPoints.push(lastPoint);
        }

        // 限制最多5个要点
        keyPoints = keyPoints.slice(0, 5);
      }

      parsedResult = {
        simpleExplanation: result,
        keyPoints: keyPoints.length > 0 ? keyPoints : ["解读完成，请查看详细内容"],
        implications: implications
      };
    } else {
      // 通用解读
      parsedResult = {
        simpleExplanation: result,
        keyPoints: ["解读完成"],
        implications: result.length > 100 ? result.substring(0, 100) + "..." : result
      };
    }

    console.log('大白话解读结果处理成功（极客智坊API自然文本格式）');

  } catch (error) {
    console.error('极客智坊API调用失败:', error);

    let errorMessage = 'AI服务调用失败，请稍后重试';
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        errorMessage = '当前AI服务繁忙，请稍后再试';
      } else if (error.message.includes('channel:empty_response')) {
        errorMessage = 'AI服务暂时不可用，请稍后重试';
      } else {
        errorMessage = `AI服务调用失败: ${error.message}`;
      }
    }

    // API调用失败，退还点数
    const refundSuccess = await refundPoints(
      supabase,
      user.id,
      3, // 大白话解读消耗3点数
      '大白话解读失败 - 极客智坊API调用失败'
    );

    return NextResponse.json(
      {
        error: errorMessage,
        result: null,
        type: 'simple_explanation',
        refunded: refundSuccess,
        pointsRefunded: 3
      },
      { status: 500 }
    );
  }

  // 扣除用户点数
  const { error: deductError } = await supabase.rpc('add_user_points', {
    p_user_id: user.id,
    p_amount: -3, // 大白话解读消耗3点数
    p_type: 'GENERATE',
    p_description: '大白话解读 - 论文科普解读',
    p_related_id: null
  } as any);

  if (deductError) {
    console.error('扣除点数失败:', deductError);
    return NextResponse.json(
      { error: '点数扣除失败，请稍后重试' },
      { status: 500 }
    );
  }

  // 记录AI生成历史
  const { error: historyError } = await supabase
    .from('ai_generations')
    .insert({
      user_id: user.id,
      tool_name: 'simple_explanation',
      tool_type: 'simple_explanation',
      model_type: 'GEMINI-2.0-FLASH-EXP',
      input_data: {
        text: text.substring(0, 1000), // 只保存前1000字符作为记录
        analysisType: type
      },
      output_data: { explanation: parsedResult },
      points_cost: 3,
      status: 'COMPLETED'
    } as any);

  if (historyError) {
    console.error('记录AI生成历史失败:', historyError);
  }

  const response = {
    success: true,
    result: parsedResult,
    cost: 3,
    type: 'simple_explanation',
    metadata: {
      model: 'gemini-2.0-flash-exp',
      provider: 'geekai'
    }
  };

  console.log('大白话解读API调用成功完成');
  return NextResponse.json(response);
}