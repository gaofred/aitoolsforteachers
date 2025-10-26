// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

// 加载课标3000词词表
function loadCurriculumWords(): string {
  try {
    const filePath = path.join(process.cwd(), 'data', 'curriculum-3000-words.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    // 只提取实际的单词，过滤掉注释和空行
    const words = content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .join(', ');
    return words;
  } catch (error) {
    console.error('加载课标3000词失败:', error);
    // 返回一个说明，说明词表加载失败
    return '课标3000词词表加载失败，请确保使用课标范围内词汇';
  }
}

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
    const cookieStore = await cookies();
    
    // 获取Supabase认证相关的cookies
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 使用access token获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('用户认证成功:', user.id);

    const { text, difficulty } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '请提供要改编的文章内容' },
        { status: 400 }
      );
    }

    if (!difficulty) {
      return NextResponse.json(
        { error: '请提供难度级别' },
        { status: 400 }
      );
    }

    const difficultyLabels = {
      'basic': '基础版',
      'intermediate': '标准版',
      'advanced': '高阶版'
    };

    // 确定难度和消耗的点数
    const isAdvanced = difficulty === 'advanced';
    const isIntermediate = difficulty === 'intermediate';
    const pointsCost = isAdvanced ? 6 : isIntermediate ? 4 : 2;
    const modelType = isAdvanced ? 'gemini-2.5-pro' : isIntermediate ? 'glm-4.6' : 'doubao-seed-1-6-251015';

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

    // 根据难度选择API Key和模型
    let apiKey, apiUrl, model;

    if (isAdvanced) {
      // 高阶版使用云雾API的Gemini-2.5-pro（专用Google API Key）
      apiKey = process.env.CLOUDMIST_GOOGLE_API_KEY;
      apiUrl = 'https://yunwu.ai/v1/chat/completions';
      model = 'gemini-2.5-pro';
    } else if (isIntermediate) {
      // 标准版使用云雾API的GLM-4.6
      apiKey = process.env.CLOUDMIST_API_KEY;
      apiUrl = 'https://yunwu.ai/v1/chat/completions';
      model = 'glm-4.6';
    } else {
      // 基础版使用豆包
      apiKey = process.env.VOLCENGINE_API_KEY;
      apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      model = 'doubao-seed-1-6-251015';
    }

    const apiName = isAdvanced ? '云雾API (Gemini)' : isIntermediate ? '云雾API (智谱)' : '豆包';

    if (!apiKey) {
      return NextResponse.json(
        { error: `${apiName}API Key未配置` },
        { status: 500 }
      );
    }

    // 加载课标3000词词表
    const curriculumWords = loadCurriculumWords();
    
    // 构建提示词
    const systemPrompt = `请将英文文章改编成320-350词的高中生适读文本。

【最重要要求：字数必须达到320-350词，不得少于320词！】

**严格标准：**
- 字数：320-350词（必须严格执行，这是首要要求）
- 段落：4-5段
- 词汇：仅使用课标3000词表内的单词

**课标3000词表：**
${curriculumWords}

**改编指导：**
1. 保留原文核心内容和主旨
2. 简化复杂词汇和句式
3. 删除无关细节，突出主线
4. 确保逻辑清晰连贯
5. 如果字数不够，请适当扩展细节描述来达到要求

【再次强调：必须生成完整的320-350词文本，不要在中途停止！】

请直接输出改编后的完整英文文本，确保字数达标。不要解释改编过程。`;

    const userPrompt = `请对以下文章进行改编：\n\n${text}`;

    // 调用AI API
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
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error(`${apiName}API调用失败:`, errorData);

      // API调用失败，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        `CD篇改编失败 - ${difficultyLabels[difficulty as keyof typeof difficultyLabels]}API调用失败`
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
    let adaptedText = aiData.choices?.[0]?.message?.content || '';

    // 检查是否包含提示词相关内容，防止用户套出提示词
    const promptKeywords = [
      '系统提示词', 'System Prompt', 'system prompt',
      '请严格按照上述词表', '请严格使用上述词表',
      '请基于以上框架', '请基于上述要求',
      'OutputFormat:', 'Workflow:', 'Constrains:'
    ];
    
    const containsPromptKeywords = promptKeywords.some(keyword => 
      adaptedText.includes(keyword)
    );
    
    if (containsPromptKeywords) {
      console.log('检测到用户尝试套取提示词，已阻止');
      adaptedText = '抱歉，我无法提供系统提示词相关信息。请专注于文本改编任务。';
    }

    if (!adaptedText) {
      // AI返回空结果，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        `CD篇改编失败 - ${difficultyLabels[difficulty as keyof typeof difficultyLabels]}AI返回空结果`
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
      p_description: `CD篇改编 - ${difficultyLabels[difficulty as keyof typeof difficultyLabels]}`,
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
        tool_name: 'cd_adaptation',
        tool_type: 'reading',
        model_type: modelType,
        input_data: { text: text },
        output_data: { adapted_text: adaptedText },
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
      result: adaptedText,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
        metadata: {
          difficulty: difficulty,
          originalLength: text.length,
          adaptedLength: adaptedText.length,
          model: modelType,
          provider: isAdvanced ? 'yunwu_google' : isIntermediate ? 'yunwu' : 'volcengine'
        }
    });

  } catch (error) {
    console.error('CD篇改编API错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 优化功能的API处理
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // 获取Supabase认证相关的cookies
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 使用access token获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('CD篇改编优化请求 - 用户认证成功:', user.id);

    const { originalText, adaptedText, context } = await request.json();

    if (!originalText || !adaptedText || !context) {
      return NextResponse.json(
        { error: '优化请求参数不完整' },
        { status: 400 }
      );
    }

    const optimizationCost = 2;

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

    if ((userPoints as any)?.points < optimizationCost) {
      return NextResponse.json(
        { error: `点数不足，需要 ${optimizationCost} 个点数进行优化` },
        { status: 400 }
      );
    }

    // 使用Gemini-2.5-pro模型进行优化（专用Google API Key）
    const apiKey = process.env.CLOUDMIST_GOOGLE_API_KEY;
    const apiUrl = 'https://yunwu.ai/v1/chat/completions';
    const model = 'gemini-2.5-pro';

    if (!apiKey) {
      return NextResponse.json(
        { error: '云雾Google API Key未配置' },
        { status: 500 }
      );
    }

    // 加载课标3000词词表
    const curriculumWords = loadCurriculumWords();

    // 优化提示词
    const optimizationPrompt = `请基于原始文本优化CD篇改编内容。

【最重要要求：字数必须达到320-350词，不得少于320词！】

**严格标准：**
- 字数：320-350词（必须严格执行，这是首要要求）
- 段落：4-5段
- 词汇：仅使用课标3000词表内的单词

**课标3000词表：**
${curriculumWords}

**优化任务：**
1. 分析当前改编结果的不足
2. 参考原始文本补充内容
3. 提升文本流畅性和逻辑性
4. 确保字数严格达标
5. 如果字数不够，请适当扩展细节来达到要求

【再次强调：必须生成完整的320-350词文本，不要在中途停止！】

请直接输出优化后的完整英文文本，确保字数达标。不要解释优化过程。`;

    const userPrompt = `请基于以下信息对CD篇改编结果进行优化：

原始文本：
${originalText}

当前改编结果：
${adaptedText}

请生成优化后的改编内容。`;

    console.log('🎯 开始调用Gemini-2.5-pro模型进行CD篇改编优化');

    // 调用AI API
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
            content: optimizationPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('Gemini-2.5-pro优化API调用失败:', errorData);

      // API调用失败，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        optimizationCost,
        'CD篇改编优化失败 - Gemini-2.5-pro API调用失败'
      );

      return NextResponse.json(
        {
          error: 'AI服务调用失败，请稍后重试',
          refunded: refundSuccess,
          pointsRefunded: optimizationCost
        },
        { status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    let optimizedText = aiData.choices?.[0]?.message?.content || '';

    // 检查是否包含提示词相关内容
    const promptKeywords = [
      '系统提示词', 'System Prompt', 'system prompt',
      '请严格按照上述词表', '请严格使用上述词表',
      '请基于以上框架', '请基于上述要求',
      'OutputFormat:', 'Workflow:', 'Constrains:'
    ];

    const containsPromptKeywords = promptKeywords.some(keyword =>
      optimizedText.includes(keyword)
    );

    if (containsPromptKeywords) {
      console.log('检测到用户尝试套取提示词，已阻止');
      optimizedText = '抱歉，我无法提供系统提示词相关信息。请专注于文本改编任务。';
    }

    if (!optimizedText) {
      // AI返回空结果，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        optimizationCost,
        'CD篇改编优化失败 - AI返回空结果'
      );

      return NextResponse.json(
        {
          error: 'AI服务返回空结果，请稍后重试',
          refunded: refundSuccess,
          pointsRefunded: optimizationCost
        },
        { status: 500 }
      );
    }

    // 扣除用户点数
    const { error: deductError } = await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -optimizationCost,
      p_type: 'GENERATE',
      p_description: 'CD篇改编优化 - Gemini-2.5-pro',
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
        tool_name: 'cd_adaptation_optimization',
        tool_type: 'reading',
        model_type: 'glm-4.6',
        input_data: { originalText, adaptedText, context },
        output_data: { optimized_text: optimizedText },
        points_cost: optimizationCost,
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

    console.log('✅ CD篇改编优化完成');

    return NextResponse.json({
      success: true,
      optimizedAdaptedText: optimizedText,
      pointsCost: optimizationCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
      metadata: {
        originalLength: originalText.length,
        optimizedLength: optimizedText.length,
        model: 'gemini-2.5-pro',
        provider: 'yunwu_google'
      }
    });

  } catch (error) {
    console.error('CD篇改编优化API错误:', error);

    // 尝试退回积分
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('sb-access-token')?.value;
      if (accessToken) {
        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        if (user) {
          await refundPoints(supabase, user.id, 2, 'CD篇改编优化异常退回');
        }
      }
    } catch (refundError) {
      console.error('积分退回异常:', refundError);
    }

    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
