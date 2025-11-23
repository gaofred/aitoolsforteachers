// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * 优化干扰项的提示词
 */
const OPTIMIZE_DISTRACTORS_PROMPT = `# 角色定位
你是一位拥有15年教学经验的高中英语教师，专门负责高考英语备考和命题工作。你精通完形填空的命题技巧，了解中国高考英语试题的特点和难度要求。

# 专业背景
- 深谙英语语言学原理和考试命题规律
- 熟悉中国高考英语考试大纲和评分标准
- 擅长运用多维度命题方法设计试题

# 任务目标
基于给定的完形填空题目，专门针对干扰项进行深度优化与重新设计，提升试题的科学性和区分度。

# 干扰项优化核心策略

## 1. 违背情节发展时序与因果逻辑
- 利用时间与因果的微妙关系误导考生
- 设置看似合理但违背故事发展逻辑的选项
- 制造时间顺序上的混淆点

## 2. 与文章主旨和价值取向相悖
- 在句子层面上完全合理，但与文章整体主旨矛盾
- 设置与作者态度或价值取向不符的选项
- 利用表面合理性掩盖深层的不一致性

## 3. 符合普遍常识但与具体语境无关
- 基于一般生活经验设置干扰项
- 选项在常识层面正确，但与具体语境无关
- 利用考生的背景知识进行误导

## 4. 语法正确但语义割裂
- 在语法形式上完全正确，但置于上下文导致语义不连贯
- 与叙事发展相悖的语法正确选项
- 制造语法层面的合理性与语义层面的冲突

## 5. 表面关联诱导
- 与个别词语形成表面关联
- 利用高频词组或固定搭配的熟悉度进行诱导
- 设置词汇层面的陷阱

# 具体优化要求

1. 保持原文和答案不变，只优化干扰项（B、C、D选项）
2. 每个空格的4个选项必须词性相同，但含义要有明显区分度
3. 干扰项要有足够的"迷惑性"，但又不能让优秀学生产生歧义
4. 体现对学生高阶思维与综合语用能力的考查
5. 避免A、B、C、D成为同义词辨析题
6. 动词短语不能拆开，保持短语的完整性

# 输出格式要求
请按照以下格式输出优化后的完形填空：

## 优化后的完形填空试题

【完形填空原文】
（在此处提供带空格序号的原文）

【优化后选项】
1. A. [原答案]  B. [优化干扰项1]  C. [优化干扰项2]  D. [优化干扰项3]
2. A. [原答案]  B. [优化干扰项1]  C. [优化干扰项2]  D. [优化干扰项3]
...

【干扰项设计说明】
简要说明每个空格干扰项的设计思路和优化要点

请基于用户提供的完形填空题目进行深度优化。`;

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase的session获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('优化干扰项认证错误:', authError);
      return NextResponse.json(
        { error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('优化干扰项用户认证成功:', user.id);

    // 获取请求数据
    const { clozeText } = await request.json();

    if (!clozeText || !clozeText.trim()) {
      return NextResponse.json(
        { error: '请提供要优化的完形填空内容' },
        { status: 400 }
      );
    }

    // 检查文本长度（限制在12000字符以内）
    if (clozeText.length > 12000) {
      return NextResponse.json(
        { error: '文本过长，请限制在12000字符以内' },
        { status: 400 }
      );
    }

    // 确定消耗的点数
    const pointsCost = 2;

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

    // 调用Coze工作流API进行干扰项优化
    const cozeToken = process.env.COZE_TOKEN;
    if (!cozeToken) {
      return NextResponse.json(
        { error: 'Coze Token未配置' },
        { status: 500 }
      );
    }

    console.log('🎯 开始调用Coze工作流进行完形填空干扰项优化');
    console.log('📝 输入完形填空长度:', clozeText.length);

    const response = await fetch('https://api.coze.cn/v1/workflow/stream_run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cozeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow_id: "7549582126108016681", // 使用同一个Coze工作流
        parameters: {
          input: OPTIMIZE_DISTRACTORS_PROMPT + "\n\n用户提供的完形填空题目：\n\n" + clozeText
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Coze工作流API错误:', errorData);

      // 退回积分
      await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: pointsCost,
        p_type: 'BONUS',
        p_description: '完形填空干扰项优化失败退回',
        p_related_id: null
      } as any);

      return NextResponse.json(
        { error: '干扰项优化失败，请稍后重试' },
        { status: 500 }
      );
    }

    console.log('✅ Coze工作流API响应成功');

    // 处理流式响应
    let optimizationResult = '';
    const reader = response.body?.getReader();

    if (!reader) {
      return NextResponse.json(
        { error: '无法读取响应数据' },
        { status: 500 }
      );
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      console.log('开始读取Coze工作流响应...');
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('流响应读取完成');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          console.log('收到数据行:', line.trim());

          // 处理 data: 格式的数据
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.trim().slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              console.log('解析的数据:', data);

              // 检查是否是错误数据
              if (data.error_message) {
                console.error('Coze工作流错误:', data.error_message);

                // 退回积分
                await supabase.rpc('add_user_points', {
                  p_user_id: user.id,
                  p_amount: pointsCost,
                  p_type: 'BONUS',
                  p_description: '完形填空干扰项优化失败退回',
                  p_related_id: null
                } as any);

                return NextResponse.json(
                  { error: 'Coze工作流错误: ' + data.error_message },
                  { status: 500 }
                );
              }
              // 检查新的数据格式：直接在data中包含content字段
              else if (data.content && data.content.trim()) {
                optimizationResult = data.content;
                console.log('获取到优化结果:', optimizationResult);
                break;
              }
              // 保留旧的数据格式检查（以防万一）
              else if (data.data?.status === 'completed' && data.data?.output) {
                optimizationResult = data.data.output;
                console.log('获取到优化结果:', optimizationResult);
                break;
              } else if (data.data?.error) {
                console.error('Coze工作流错误:', data.data.error);

                // 退回积分
                await supabase.rpc('add_user_points', {
                  p_user_id: user.id,
                  p_amount: pointsCost,
                  p_type: 'BONUS',
                  p_description: '完形填空干扰项优化失败退回',
                  p_related_id: null
                } as any);

                return NextResponse.json(
                  { error: 'Coze工作流错误: ' + (data.data.error.message || '未知错误') },
                  { status: 500 }
                );
              }
            } catch (e) {
              console.log('解析流数据失败:', e, '数据:', dataStr);
            }
          }
          // 处理 event: 格式的事件
          else if (line.trim().startsWith('event: ')) {
            const eventType = line.trim().slice(7);
            console.log('收到事件类型:', eventType);

            // 如果是错误事件，标记错误状态
            if (eventType === 'Error') {
              console.error('Coze工作流返回错误事件');
              // 继续处理，错误信息在下一个data行中
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!optimizationResult) {
      // 退回积分
      await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: pointsCost,
        p_type: 'BONUS',
        p_description: '完形填空干扰项优化无结果退回',
        p_related_id: null
      } as any);

      return NextResponse.json(
        { error: '干扰项优化服务返回空结果，请稍后重试' },
        { status: 500 }
      );
    }

    // 扣除用户点数
    const { error: deductError } = await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: `完形填空干扰项优化 - Coze工作流`,
      p_related_id: null
    } as any);

    if (deductError) {
      console.error('扣除点数失败:', deductError);
      return NextResponse.json(
        { error: '点数扣除失败，请稍后重试' },
        { status: 500 }
      );
    }

    console.log('🎉 完形填空干扰项优化完成，结果长度:', optimizationResult.length);

    // 处理Coze工作流返回的结果
    console.log('📝 解析Coze返回的JSON结果');
    let actualContent = optimizationResult;

    try {
      const parsedResult = JSON.parse(optimizationResult);
      if (parsedResult && parsedResult.output) {
        actualContent = parsedResult.output;
        console.log('✅ 提取output字段成功，内容长度:', actualContent.length);
      }
    } catch (e) {
      console.log('📝 无法解析JSON，直接使用原始内容');
    }

    // 清理和格式化结果
    let cleanResult = actualContent.trim();

    // 移除多余的星号和markdown格式
    cleanResult = cleanResult.replace(/\*{3,}/g, '');
    cleanResult = cleanResult.replace(/^#{1,6}\s+/gm, '');
    cleanResult = cleanResult.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleanResult = cleanResult.replace(/\*([^*]+)\*/g, '$1');

    // 清理多余的空行
    cleanResult = cleanResult.replace(/\n{3,}/g, '\n\n');
    cleanResult = cleanResult.replace(/^\s+|\s+$/g, '');

    // 添加完成标记
    if (!cleanResult.includes('---干扰项优化完成---')) {
      cleanResult += '\n\n---干扰项优化完成---';
    }

    console.log('📝 结果格式化完成，最终长度:', cleanResult.length);

    // 记录AI生成历史
    const { error: historyError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        tool_name: 'cloze_distractor_optimization',
        tool_type: 'reading',
        model_type: 'STANDARD',
        input_data: { clozeText: clozeText },
        output_data: {
          optimizedResult: cleanResult,
          originalResult: optimizationResult
        },
        points_cost: pointsCost,
        status: 'COMPLETED'
      } as any);

    if (historyError) {
      console.error('❌ 记录AI生成历史失败:', historyError);
    } else {
      console.log('✅ AI生成历史记录成功');
    }

    // 获取更新后的用户点数
    const { data: updatedUserPoints } = await supabase
      .from('user_points')
      .select('points')
      .single();

    return NextResponse.json({
      success: true,
      result: cleanResult,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
      metadata: {
        originalLength: clozeText.length,
        resultLength: optimizationResult.length,
        format: 'optimized_distractors'
      }
    });

  } catch (error) {
    console.error('❌ 完形填空干扰项优化处理错误:', error);

    // 尝试退回积分
    try {
      const supabase = createServerSupabaseClient();
      await supabase.rpc('add_user_points', {
        p_user_id: 'unknown',
        p_amount: 2,
        p_type: 'BONUS',
        p_description: '完形填空干扰项优化异常退回',
        p_related_id: null
      } as any);
    } catch (refundError) {
      console.error('退回积分失败:', refundError);
    }

    return NextResponse.json(
      { error: '干扰项优化处理失败' },
      { status: 500 }
    );
  }
}