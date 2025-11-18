// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * 格式化完形填空结果为用户友好的HTML格式
 * @param result - Coze工作流返回的原始结果
 * @returns 格式化后的HTML字符串
 */
function formatClozeResultAsHTML(result: any): string {
  if (!result || typeof result !== 'object') {
    return `<div class="error">结果格式错误</div>`;
  }

  try {
    const { title, passage, questions, answers, analysis } = result;
    let html = `<div class="cloze-test">
      <div class="header">
        <h2>${title || '完形填空试题'}</h2>
      </div>`;

    // 原文内容（带空格）
    if (passage) {
      html += `<div class="passage">${passage}</div>`;
    }

    // 完形填空题
    if (questions && Array.isArray(questions)) {
      html += `<div class="questions">`;
      questions.forEach((q: any, index: number) => {
        const options = q.options || [];
        html += `<div class="question" data-question="${index + 1}">`;
        html += `<div class="question-text">${q.question || `第 ${index + 1}题`}</div>`;

        // 选项
        if (options.length > 0) {
          html += `<div class="options">`;
          ['A', 'B', 'C', 'D'].forEach((letter: string, optionIndex: number) => {
            const option = options[optionIndex] || '';
            const isActive = optionIndex === q.correctAnswer;
            html += `<div class="option ${isActive ? 'correct' : 'normal'}" data-option="${letter}">${letter}. ${option}</div>`;
          });
          html += `</div>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }

    // 答案和解析
    if (answers && Array.isArray(answers)) {
      html += `<div class="answers">`;
      answers.forEach((answer: any, index: number) => {
        html += `<div class="answer" data-answer="${index + 1}">${answer}</div>`;
      });
      html += `</div>`;
    }

    // 教师建议和解析
    if (analysis) {
      html += `<div class="analysis">`;
      html += `<h3>教师建议</h3>`;
      html += `<p>${analysis}</p>`;
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  } catch (error) {
    console.error('格式化结果失败:', error);
    return `<div class="error">格式化失败，请检查工作流输出格式</div>`;
  }
}

/**
 * 格式化完形填空结果为纯文本格式（备用方案）
 * @param result - Coze工作流返回的原始结果
 * @returns 格式化后的文本字符串
 */
function formatClozeResultAsText(result: string): string {
  if (!result || typeof result !== 'string') {
    return '结果格式错误';
  }

  try {
    const parsedResult = JSON.parse(result);
    if (typeof parsedResult === 'object') {
      let text = '';

      // 题干内容
      if (parsedResult.passage) {
        text += `完形填空题\n\n${parsedResult.passage}\n\n`;
      }

      // 试题
      if (parsedResult.questions && Array.isArray(parsedResult.questions)) {
        text += '试题：\n\n';
        parsedResult.questions.forEach((q: any, index: number) => {
          text += `${index + 1}. ${q.question}\n`;
          if (q.options && Array.isArray(q.options)) {
            q.options.forEach((option: string, optIndex: number) => {
              const correctAnswer = q.correctAnswer === optIndex + 1; // 选项索引从0开始，正确答案从1开始
              text += `  ${String.fromCharCode(65 + optIndex)}. ${option}\n`;
            });
          }
          text += `\n`;
        });
      }

      // 答案
      if (parsedResult.answers && Array.isArray(parsedResult.answers)) {
        text += '\n参考答案：\n';
        parsedResult.answers.forEach((answer: string, index: number) => {
          text += `${answer}\n`;
        });
        text += '\n';
      }

      // 教师建议和解析
      if (parsedResult.analysis) {
        text += '\n教师建议：\n';
        text += `${parsedResult.analysis}\n`;
      }

      text += '\n---完形填空生成完成---';
      return text;
    }
  } catch (error) {
    console.error('解析结果失败:', error);
    return result; // 返回原始文本
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase的session获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('完形填空命题认证错误:', authError);
      return NextResponse.json(
        { error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('完形填空命题用户认证成功:', user.id);

    // 获取请求数据
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '请提供要生成完形填空的篇章内容' },
        { status: 400 }
      );
    }

    // 检查文本长度（限制在8000字符以内）
    if (text.length > 8000) {
      return NextResponse.json(
        { error: '文本过长，请限制在8000字符以内' },
        { status: 400 }
      );
    }

    // 检查文本长度是否符合要求（至少需要300字符才能生成完形填空）
    if (text.length < 300) {
      return NextResponse.json(
        { error: '文本过短，请提供至少300字符的篇章内容以便生成完形填空' },
        { status: 400 }
      );
    }

    // 确定消耗的点数
    const pointsCost = 5;

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

    // 调用Coze工作流API
    const cozeToken = process.env.COZE_TOKEN;
    if (!cozeToken) {
      return NextResponse.json(
        { error: 'Coze Token未配置' },
        { status: 500 }
      );
    }

    console.log('🎯 开始调用Coze工作流进行完形填空命题');
    console.log('📝 输入文本长度:', text.length);

    const response = await fetch('https://api.coze.cn/v1/workflow/stream_run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cozeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow_id: "7549582126108016681",
        parameters: {
          input: text
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
        p_description: '完形填空命题失败退回',
        p_related_id: null
      } as any);

      return NextResponse.json(
        { error: '完形填空命题失败，请稍后重试' },
        { status: 500 }
      );
    }

    console.log('✅ Coze工作流API响应成功');

    // 处理流式响应
    let clozeResult = '';
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
                  p_description: '完形填空命题失败退回',
                  p_related_id: null
                } as any);

                return NextResponse.json(
                  { error: 'Coze工作流错误: ' + data.error_message },
                  { status: 500 }
                );
              }
              // 检查新的数据格式：直接在data中包含content字段
              else if (data.content && data.content.trim()) {
                clozeResult = data.content;
                console.log('获取到完形填空结果:', clozeResult);
                break;
              }
              // 保留旧的数据格式检查（以防万一）
              else if (data.data?.status === 'completed' && data.data?.output) {
                clozeResult = data.data.output;
                console.log('获取到完形填空结果:', clozeResult);
                break;
              } else if (data.data?.error) {
                console.error('Coze工作流错误:', data.data.error);

                // 退回积分
                await supabase.rpc('add_user_points', {
                  p_user_id: user.id,
                  p_amount: pointsCost,
                  p_type: 'BONUS',
                  p_description: '完形填空命题失败退回',
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

    if (!clozeResult) {
      // 退回积分
      await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: pointsCost,
        p_type: 'BONUS',
        p_description: '完形填空命题无结果退回',
        p_related_id: null
      } as any);

      return NextResponse.json(
        { error: '完形填空生成服务返回空结果，请稍后重试' },
        { status: 500 }
      );
    }

    // 扣除用户点数
    const { error: deductError } = await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: `完形填空命题 - Coze工作流`,
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
        tool_name: 'cloze_creator',
        tool_type: 'reading',
        model_type: 'COZE_WORKFLOW',
        input_data: { text: text },
        output_data: { clozeResult: clozeResult },
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

    console.log('🎉 完形填空命题完成，结果长度:', clozeResult.length);

    // 解析Coze工作流返回的结果，结构化处理
    let structuredResult = '';
    try {
      // 尝试解析JSON格式
      const parsedResult = JSON.parse(clozeResult);
      if (typeof parsedResult === 'object' && parsedResult) {
        // 如果是结构化数据，格式化为更好的HTML格式
        structuredResult = formatClozeResultAsHTML(parsedResult);
      } else {
        // 如果是纯文本，按段落格式化
        structuredResult = formatClozeResultAsText(clozeResult);
      }
    } catch (e) {
      console.log('解析结果失败，使用原始文本格式:', e);
      structuredResult = formatClozeResultAsText(clozeResult);
    }

    // 记录AI生成历史
    const { error: historyError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        tool_name: 'cloze_creator',
        tool_type: 'reading',
        model_type: 'COZE_WORKFLOW',
        input_data: { text: text },
        output_data: {
          structuredResult: structuredResult,
          originalResult: clozeResult
        },
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
      .single();

    return NextResponse.json({
      success: true,
      result: structuredResult,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
      metadata: {
        textLength: text.length,
        resultLength: clozeResult.length,
        format: 'structured'
      }
    });

  } catch (error) {
    console.error('❌ 完形填空命题处理错误:', error);

    // 尝试退回积分
    try {
      const { text } = await request.json();
      if (text) {
        const supabase = createServerSupabaseClient();
        await supabase.rpc('add_user_points', {
          p_user_id: 'unknown',
          p_amount: 5,
          p_type: 'BONUS',
          p_description: '完形填空命题异常退回',
          p_related_id: null
        } as any);
      }
    } catch (refundError) {
      console.error('退回积分失败:', refundError);
    }

    return NextResponse.json(
      { error: '完形填空命题处理失败' },
      { status: 500 }
    );
  }
}