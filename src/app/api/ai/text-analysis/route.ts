// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase的session获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('文本分析认证错误:', authError);
      return NextResponse.json(
        { error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('文本分析用户认证成功:', user.id);

    // 获取请求数据
    const { text, analysisType = 'basic' } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '请提供要分析的英文文本内容' },
        { status: 400 }
      );
    }

    // 检查文本长度（限制在5000字符以内）
    if (text.length > 5000) {
      return NextResponse.json(
        { error: '文本过长，请限制在5000字符以内' },
        { status: 400 }
      );
    }

    // 确定版本和消耗的点数
    const pointsCost = 6;

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

    const response = await fetch('https://api.coze.cn/v1/workflow/stream_run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cozeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workflow_id: "7564939251578781737",
        parameters: {
          text: text
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Coze工作流API错误:', errorData);

      // API调用失败，退还点数
      try {
        const { error: refundError } = await supabase.rpc('add_user_points', {
          p_user_id: user.id,
          p_amount: pointsCost,
          p_type: 'REFUND',
          p_description: `文本分析失败 - Coze API调用失败 (HTTP ${response.status})`,
          p_related_id: null,
          p_metadata: null
        } as any);

        if (refundError) {
          console.error('退还点数失败:', refundError);
          return NextResponse.json(
            {
              error: '文本分析失败，请稍后重试',
              refunded: false,
              pointsRefunded: 0,
              refundError: '点数退还失败，请联系客服'
            },
            { status: 500 }
          );
        }

        console.log('点数退还成功 (API调用失败):', pointsCost);
        return NextResponse.json(
          {
            error: '文本分析失败，请稍后重试',
            refunded: true,
            pointsRefunded: pointsCost
          },
          { status: 500 }
        );
      } catch (refundError) {
        console.error('退还点数异常:', refundError);
        return NextResponse.json(
          {
            error: '文本分析失败，请稍后重试',
            refunded: false,
            pointsRefunded: 0,
            refundError: '点数退还异常，请联系客服'
          },
          { status: 500 }
        );
      }
    }

    // 处理流式响应
    let analysisResult = '';
    const reader = response.body?.getReader();

    if (!reader) {
      // 无法读取响应数据，退还点数
      try {
        const { error: refundError } = await supabase.rpc('add_user_points', {
          p_user_id: user.id,
          p_amount: pointsCost,
          p_type: 'REFUND',
          p_description: '文本分析失败 - 无法读取响应数据',
          p_related_id: null
        } as any);

        return NextResponse.json(
          {
            error: '无法读取响应数据',
            refunded: !refundError,
            pointsRefunded: refundError ? 0 : pointsCost
          },
          { status: 500 }
        );
      } catch (refundError) {
        console.error('退还点数异常（读取响应）:', refundError);
        return NextResponse.json(
          {
            error: '无法读取响应数据',
            refunded: false,
            pointsRefunded: 0,
            refundError: '点数退还失败，请联系客服'
          },
          { status: 500 }
        );
      }
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

                // Coze工作流错误，退还点数
                try {
                  const { error: refundError } = await supabase.rpc('add_user_points', {
                    p_user_id: user.id,
                    p_amount: pointsCost,
                    p_type: 'REFUND',
                    p_description: `文本分析失败 - Coze工作流错误: ${data.error_message}`,
                    p_related_id: null
                  } as any);

                  return NextResponse.json(
                    {
                      error: 'Coze工作流错误: ' + data.error_message,
                      refunded: !refundError,
                      pointsRefunded: refundError ? 0 : pointsCost
                    },
                    { status: 500 }
                  );
                } catch (refundError) {
                  console.error('退还点数异常（Coze错误）:', refundError);
                  return NextResponse.json(
                    {
                      error: 'Coze工作流错误: ' + data.error_message,
                      refunded: false,
                      pointsRefunded: 0,
                      refundError: '点数退还失败，请联系客服'
                    },
                    { status: 500 }
                  );
                }
              }
              // 检查新的数据格式：直接在data中包含content字段
              else if (data.content && data.content.trim()) {
                analysisResult = data.content;
                console.log('获取到分析结果:', analysisResult);
                break;
              }
              // 保留旧的数据格式检查（以防万一）
              else if (data.data?.status === 'completed' && data.data?.output) {
                analysisResult = data.data.output;
                console.log('获取到分析结果:', analysisResult);
                break;
              } else if (data.data?.error) {
                console.error('Coze工作流错误:', data.data.error);
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

    if (!analysisResult) {
      // 分析结果为空，退还点数
      try {
        const { error: refundError } = await supabase.rpc('add_user_points', {
          p_user_id: user.id,
          p_amount: pointsCost,
          p_type: 'REFUND',
          p_description: '文本分析失败 - 分析结果为空',
          p_related_id: null
        } as any);

        return NextResponse.json(
          {
            error: '分析服务返回空结果，请稍后重试',
            refunded: !refundError,
            pointsRefunded: refundError ? 0 : pointsCost
          },
          { status: 500 }
        );
      } catch (refundError) {
        console.error('退还点数异常（空结果）:', refundError);
        return NextResponse.json(
          {
            error: '分析服务返回空结果，请稍后重试',
            refunded: false,
            pointsRefunded: 0,
            refundError: '点数退还失败，请联系客服'
          },
          { status: 500 }
        );
      }
    }

    // 扣除用户点数
    const { error: deductError } = await supabase.rpc('deduct_user_points', {
      p_user_id: user.id,
      p_amount: pointsCost,
      p_description: `英语文本深度分析 - Fred老师原创`,
      p_related_id: null,
      p_metadata: null
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
        tool_name: 'text_analysis',
        tool_type: 'reading',
        model_type: 'STANDARD',
        input_data: { text: text, analysis_type: "comprehensive" },
        output_data: { analysisResult: analysisResult },
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
      result: analysisResult,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
      metadata: {
        analysisType: analysisType,
        textLength: text.length,
        analysisLength: analysisResult.length
      }
    });

  } catch (error) {
    console.error('文本分析处理错误:', error);

    // 尝试退回积分
    try {
      const { error: refundError } = await supabase.rpc('add_user_points', {
        p_user_id: user.id,
        p_amount: 6, // 使用固定的6点数
        p_type: 'REFUND',
        p_description: '文本分析失败 - 系统异常退回',
        p_related_id: null
      } as any);

      console.log('异常处理点数退还结果:', refundError ? '失败' : '成功');

      return NextResponse.json(
        {
          error: '文本分析处理失败',
          refunded: !refundError,
          pointsRefunded: refundError ? 0 : 6
        },
        { status: 500 }
      );
    } catch (refundError) {
      console.error('异常处理中退还点数失败:', refundError);
      return NextResponse.json(
        {
          error: '文本分析处理失败',
          refunded: false,
          pointsRefunded: 0,
          refundError: '点数退还失败，请联系客服'
        },
        { status: 500 }
      );
    }
  }
}