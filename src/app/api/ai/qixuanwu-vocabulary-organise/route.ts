// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 退还点数的辅助函数
async function refundPoints(supabase: any, user_id: string, amount: number, reason: string) {
  try {
    const { error } = await (supabase as any).rpc('add_user_points', {
      p_user_id: user_id,
      p_amount: amount,
      p_type: 'REFUND',
      p_description: reason,
      p_related_id: null
    } as any);

    if (error) {
      console.error('退还点数失败:', error);
    }
  } catch (error) {
    console.error('退还点数异常:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase的session获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "用户未认证"
      }, { status: 401 });
    }

    const body = await request.json();
    const { text, userId } = body;

    if (!text || !userId) {
      return NextResponse.json({
        success: false,
        error: "缺少必要参数"
      }, { status: 400 });
    }

    if (userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: "用户ID不匹配"
      }, { status: 403 });
    }

    // 检查用户点数
    const { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", user.id as any)
      .single();

    if (pointsError || !userPoints) {
      return NextResponse.json({
        success: false,
        error: "获取用户点数失败"
      }, { status: 400 });
    }

  const pointsCost = 2; // 七选五词汇整理消耗2个点数

    if ((userPoints as any).points < pointsCost) {
      return NextResponse.json({
        success: false,
        error: `点数不足，需要${pointsCost}个点数，当前剩余${(userPoints as any).points}个点数`
      }, { status: 400 });
    }

    // 调用Coze工作流API
    const cozeToken = process.env.COZE_TOKEN;
    if (!cozeToken) {
      return NextResponse.json(
        { error: 'Coze Token未配置' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.coze.cn/v1/workflow/stream_run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cozeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow_id: "7566140686920384539",
        parameters: {
          input: text
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Coze工作流API错误:', errorData);
      await refundPoints(supabase, user.id, pointsCost, '七选五词汇整理失败退还');
      return NextResponse.json(
        { success: false, error: "词汇整理失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 处理流式响应
    let vocabularyResult = '';
    const reader = response.body?.getReader();

    if (!reader) {
      await refundPoints(supabase, user.id, pointsCost, '七选五词汇整理响应读取失败退还');
      return NextResponse.json(
        { success: false, error: "无法读取响应数据" },
        { status: 500 }
      );
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    const maxChunks = 10000; // 防止无限循环

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunkCount++;
        if (chunkCount > maxChunks) {
          console.warn('达到最大数据块数量限制，停止读取');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.trim().slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              console.log(`Coze响应数据 #${chunkCount}:`, JSON.stringify(data, null, 2));
              console.log('数据结构分析:', {
                hasContent: 'content' in data,
                contentType: typeof data.content,
                contentLength: data.content ? data.content.length : 0,
                hasOutput: 'output' in data,
                outputType: typeof data.output,
                outputLength: data.output ? data.output.length : 0,
                hasResult: 'result' in data,
                resultType: typeof data.result,
                resultLength: data.result ? data.result.length : 0,
                hasMessage: 'message' in data,
                messageType: typeof data.message,
                messageLength: data.message ? data.message.length : 0,
                hasData: 'data' in data,
                dataValue: data.data
              });

              if (data.error_message) {
                console.error('Coze工作流错误:', data.error_message);
                await refundPoints(supabase, user.id, pointsCost, '七选五词汇整理工作流错误退还');
                return NextResponse.json(
                  { success: false, error: 'Coze工作流错误: ' + data.error_message },
                  { status: 500 }
                );
              }
              // 优先处理直接返回的文本内容（新工作流格式）
              else if (data.content && typeof data.content === 'string' && data.content.trim() && data.content.trim() !== '{}') {
                // 如果content是JSON字符串，尝试解析
                try {
                  const parsedContent = JSON.parse(data.content);
                  if (parsedContent.output && typeof parsedContent.output === 'string' && parsedContent.output.trim()) {
                    vocabularyResult = parsedContent.output;
                    console.log('从解析的content.output获取结果:', vocabularyResult.substring(0, 100));
                    break;
                  } else if (parsedContent.result && typeof parsedContent.result === 'string' && parsedContent.result.trim()) {
                    vocabularyResult = parsedContent.result;
                    console.log('从解析的content.result获取结果:', vocabularyResult.substring(0, 100));
                    break;
                  }
                } catch (e) {
                  // 不是JSON格式，直接使用content作为结果
                  vocabularyResult = data.content;
                  console.log('从content直接获取文本结果:', vocabularyResult.substring(0, 100));
                  break;
                }
              }
              else if (data.data?.status === 'completed' && data.data?.output) {
                vocabularyResult = data.data.output;
                console.log('从data.data.output获取结果:', vocabularyResult.substring(0, 100));
                break;
              }
              else if (data.output && data.output.trim() && data.output.trim() !== '{}') {
                vocabularyResult = data.output;
                console.log('从data.output获取结果:', vocabularyResult.substring(0, 100));
                break;
              }
              else if (data.result && data.result.trim() && data.result.trim() !== '{}') {
                vocabularyResult = data.result;
                console.log('从data.result获取结果:', vocabularyResult.substring(0, 100));
                break;
              }
              // 新增：检查message字段
              else if (data.message && typeof data.message === 'string' && data.message.trim()) {
                vocabularyResult = data.message;
                console.log('从data.message获取结果:', vocabularyResult.substring(0, 100));
                break;
              }
              // 新增：检查是否直接是文本内容（非JSON格式）
              else if (typeof data === 'string' && data.trim() && data.trim() !== '{}') {
                vocabularyResult = data;
                console.log('从data直接获取结果:', vocabularyResult.substring(0, 100));
                break;
              }
              // 新增：检查所有字符串字段，选择最长的作为结果
              else {
                let longestText = '';
                let longestField = '';
                for (const [key, value] of Object.entries(data)) {
                  if (typeof value === 'string' && value.trim() && value.trim() !== '{}' && value.trim() !== 'null') {
                    if (value.length > longestText.length && value.length > 50) { // 至少50个字符
                      longestText = value;
                      longestField = key;
                    }
                  }
                }
                if (longestText) {
                  vocabularyResult = longestText;
                  console.log(`从字段"${longestField}"获取最长结果:`, vocabularyResult.substring(0, 100));
                  break;
                }
              }
            } catch (parseError) {
              console.error('解析Coze响应数据失败:', parseError, '原始数据:', dataStr);
              // 如果JSON解析失败，尝试直接使用原始数据
              if (dataStr && dataStr.trim() && dataStr.trim() !== '{}' && dataStr.trim() !== '[DONE]') {
                vocabularyResult = dataStr;
                console.log('从原始数据获取结果:', vocabularyResult.substring(0, 100));
                break;
              }
              // 尝试从可能的错误信息中提取内容
              if (dataStr && dataStr.includes('"content"')) {
                const contentMatch = dataStr.match(/"content":\s*"([^"]+)"/);
                if (contentMatch && contentMatch[1] && contentMatch[1].trim() !== '{}') {
                  vocabularyResult = contentMatch[1];
                  console.log('从错误数据中提取content:', vocabularyResult.substring(0, 100));
                  break;
                }
              }
            }
          }
        }

        if (vocabularyResult) break;
      }
    } catch (error) {
      console.error('读取Coze响应流时出错:', error);
      await refundPoints(supabase, user.id, pointsCost, '七选五词汇整理响应流读取失败退还');
      return NextResponse.json(
        { success: false, error: "词汇整理失败，请重试" },
        { status: 500 }
      );
    }

    // 如果结果仍然是空的，但API调用成功，说明工作流返回格式有问题
    if (!vocabularyResult || vocabularyResult.trim() === '{}') {
      console.log('警告：Coze工作流返回空结果，但API调用成功');
      await refundPoints(supabase, user.id, pointsCost, '七选五词汇整理结果为空退还');
      return NextResponse.json({
        success: false,
        error: "词汇整理失败：工作流返回空结果，请检查工作流配置"
      }, { status: 500 });
    }

    // 直接返回AI的原始输出，不做任何截断处理
    console.log('七选五词汇整理完成，输出长度:', vocabularyResult.length);

    // 扣除用户点数
    const { error: deductError } = await (supabase as any).rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: `七选五词汇整理`,
      p_related_id: null
    } as any);

    if (deductError) {
      console.error("扣除点数失败:", deductError);
      // 即使扣除点数失败，也返回结果
    }

    // 记录生成历史
    const { error: historyError } = await supabase
      .from("ai_generations")
      .insert({
        user_id: user.id,
        tool_type: "qixuanwu_vocabulary_organise",
        tool_name: "七选五重点词汇整理",
        input_data: { text: text },
        output_data: { vocabulary_result: vocabularyResult },
        points_cost: pointsCost,
        status: 'COMPLETED'
      } as any);

    if (historyError) {
      console.error("记录生成历史失败:", historyError);
    }

    return NextResponse.json({
      success: true,
      result: vocabularyResult,
      pointsCost: pointsCost
    });

  } catch (error) {
    console.error('七选五词汇整理错误:', error);
    return NextResponse.json({
      success: false,
      error: "服务器错误，请稍后重试"
    }, { status: 500 });
  }
}