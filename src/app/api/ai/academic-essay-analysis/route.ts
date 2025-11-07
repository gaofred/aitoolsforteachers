import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 退还点数的辅助函数
async function refundPoints(supabase: any, user_id: string, amount: number, reason: string) {
  try {
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
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase标准认证方式
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    console.log('用户认证成功:', user.id);

    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '请提供要分析的论文内容' },
        { status: 400 }
      );
    }

    const pointsCost = 6; // 学术论文分析消耗6点数

    // 检查用户点数是否足够
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    if (pointsError || !userPoints) {
      return NextResponse.json(
        { error: '获取用户点数失败' },
        { status: 500 }
      );
    }

    if ((userPoints as any)?.points < pointsCost) {
      return NextResponse.json(
        { error: `点数不足，需要 ${pointsCost} 个点数` },
        { status: 400 }
      );
    }

    // 使用智谱清言API进行学术论文分析
    const apiKey = process.env.CLOUDMIST_API_KEY;
    const apiUrl = 'https://yunwu.ai/v1/chat/completions';
    const model = 'glm-4.6';

    if (!apiKey) {
      return NextResponse.json(
        { error: '智谱清言API Key未配置' },
        { status: 500 }
      );
    }

    // 构建学术论文分析的系统提示词
    const systemPrompt = `你是一位专业的学术分析专家，擅长深度解析学术论文并提炼其核心价值。你的任务是分析用户提供的论文，并按照以下严格格式输出分析结果。

## 目标
提炼一篇论文最根本的价值。你不是在复述内容，你是在重构其思想的最小完整结构。

## 核心指令
请深入分析论文，并锁定以下四个相互依存的核心要素。

### 根本问题
论文所针对的最关键的"矛盾点"或"知识空白"是什么？

### 切入视角
作者采用了什么区别于他人的"关键洞察"或"新假设"？

### 关键方法
作者用于验证其"视角"并解决"问题"的"核心机制"是什么？

### 核心发现
最终得出了什么"新知识"或"答案"？

## 提炼要求
完成核心指令的过程中，需完成以下两个层面的提炼：

### 1. 方法公式化
请将上述的"关键方法"抽象提炼成一个简洁的"文字公式"，用以揭示其内在的逻辑或演算过程。

例如：
- "新算法 = (特征 A + 特征 B) * 权重 C"
- "历史分析 = 路径依赖 + 关键节点 A 的扰动"
- "价值 = 效用 / 认知成本"

### 2. 最终双重总结
请额外产出两句话：

**一句话总结 (核心价值)**：将"问题"、"视角"、"方法"和"发现"四个要素熔合成一个单一、连贯、通顺且凝练的句子，清晰地展现论文的核心逻辑与价值。

**一句话总结 (大白话版)**：用一个 10 岁小孩都能听懂的比喻或说法，概括这篇论文最核心的观点。

## 输出格式要求
请严格按照以下JSON格式输出，不要包含任何其他文字：

{
  "fundamentalProblem": "根本问题内容",
  "perspective": "切入视角内容",
  "keyMethod": "关键方法内容",
  "coreFinding": "核心发现内容",
  "methodFormula": "方法公式化内容",
  "coreValueSummary": "一句话总结(核心价值)内容",
  "simpleSummary": "一句话总结(大白话版)内容"
}

## 约束条件
1. 每个字段的输出内容都要简洁精炼，避免冗长描述
2. 方法公式化要突出逻辑关系和演算过程
3. 核心价值总结要体现四个要素的有机融合
4. 大白话版总结要生动形象，便于理解
5. 所有输出必须为中文
6. 严格按照JSON格式输出，不要添加任何注释或说明文字`;

    const userPrompt = `请分析以下学术论文：\n\n${text}`;

    // 调用智谱清言API
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('智谱清言API调用失败:', errorData);

      // API调用失败，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '学术论文分析失败 - 智谱清言API调用失败'
      );

      return NextResponse.json(
        {
          error: 'AI服务调用失败，请稍后重试',
          refunded: refundSuccess,
          pointsRefunded: pointsCost
        },
        { status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    let analysisResult = aiData.choices?.[0]?.message?.content || '';

    console.log('AI响应长度:', analysisResult.length, '字符');
    console.log('AI响应前500字符:', analysisResult.substring(0, 500));

    // 尝试解析JSON响应
    let parsedResult;
    try {
      // 清理可能的markdown格式
      analysisResult = analysisResult.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsedResult = JSON.parse(analysisResult);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      console.log('原始响应:', analysisResult);

      // 解析失败，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '学术论文分析失败 - AI响应格式错误'
      );

      return NextResponse.json(
        {
          error: 'AI响应格式错误，请稍后重试',
          refunded: refundSuccess,
          pointsRefunded: pointsCost
        },
        { status: 500 }
      );
    }

    // 验证结果格式
    const requiredFields = ['fundamentalProblem', 'perspective', 'keyMethod', 'coreFinding', 'methodFormula', 'coreValueSummary', 'simpleSummary'];
    const missingFields = requiredFields.filter(field => !parsedResult[field]);

    if (missingFields.length > 0) {
      console.error('AI响应缺少必要字段:', missingFields);
      console.log('解析结果:', parsedResult);

      // 格式不完整，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '学术论文分析失败 - AI响应格式不完整'
      );

      return NextResponse.json(
        {
          error: 'AI响应格式不完整，请稍后重试',
          refunded: refundSuccess,
          pointsRefunded: pointsCost
        },
        { status: 500 }
      );
    }

    // 检查是否包含提示词相关内容，防止用户套出提示词
    const promptKeywords = [
      '系统提示词', 'System Prompt', 'system prompt',
      '请严格按照上述词表', '请严格使用上述词表',
      '请基于以上框架', '请基于上述要求',
      'OutputFormat:', 'Workflow:', 'Constrains:',
      'JSON格式要求', '输出格式要求'
    ];

    const containsPromptKeywords = promptKeywords.some(keyword =>
      JSON.stringify(parsedResult).includes(keyword)
    );

    if (containsPromptKeywords) {
      console.log('检测到用户尝试套取提示词，已阻止');

      // 检测到提示词泄露，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '学术论文分析失败 - 检测到异常请求'
      );

      return NextResponse.json(
        {
          error: '请求异常，请重试',
          refunded: refundSuccess,
          pointsRefunded: pointsCost
        },
        { status: 400 }
      );
    }

    if (!parsedResult) {
      // AI返回空结果，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '学术论文分析失败 - AI返回空结果'
      );

      return NextResponse.json(
        {
          error: 'AI服务返回空结果，请稍后重试',
          refunded: refundSuccess,
          pointsRefunded: pointsCost
        },
        { status: 500 }
      );
    }

    // 扣除用户点数
    const { error: deductError } = await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: '学术论文分析 - 一键看懂学术论文',
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
        tool_name: 'academic_essay_reading',
        tool_type: 'academic',
        model_type: 'glm-4.6',
        input_data: {
          text: text.substring(0, 1000), // 只保存前1000字符作为记录
          analysisType: 'academic_essay'
        },
        output_data: { analysis: parsedResult },
        points_cost: pointsCost,
        status: 'COMPLETED'
      } as any);

    if (historyError) {
      console.error('记录AI生成历史失败:', historyError);
    }

    // 获取更新后的用户点数
    const { data: updatedUserPoints } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    return NextResponse.json({
      success: true,
      result: parsedResult,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
      metadata: {
        analysisType: 'academic_essay',
        originalLength: text.length,
        model: 'glm-4.6',
        provider: 'yunwu-zhipu'
      }
    });

  } catch (error) {
    console.error('学术论文分析API错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}