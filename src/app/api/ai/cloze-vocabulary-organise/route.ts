// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

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
      console.error('完形填空词汇整理认证错误:', authError);
      return NextResponse.json(
        { error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('完形填空词汇整理用户认证成功:', user.id);

    // 获取请求数据
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '请提供要整理的完形填空内容' },
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
        workflow_id: "7565352122264698895", // 完形填空重点词汇整理工作流ID
        parameters: {
          input: text  // 修正参数名称为 input
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Coze工作流API错误:', errorData);

      // API调用失败，退还积分
      try {
        const { error: refundError } = await supabase.rpc('add_user_points', {
          p_user_id: user.id,
          p_amount: pointsCost,
          p_type: 'REFUND',
          p_description: `完形填空词汇整理失败 - 积分退还`,
          p_related_id: null
        } as any);

        if (refundError) {
          console.error('退还积分失败:', refundError);
        } else {
          console.log('已成功退还积分:', pointsCost);
        }
      } catch (refundErr) {
        console.error('退还积分异常:', refundErr);
      }

      return NextResponse.json(
        {
          error: '完形填空词汇整理失败，请稍后重试',
          refunded: true,
          refundedPoints: pointsCost,
          message: `生成失败，已退还${pointsCost}个点数到您的账户`
        },
        { status: 500 }
      );
    }

    // 处理流式响应
    let analysisResult = '';
    const reader = response.body?.getReader();

    if (!reader) {
      // 无法读取响应数据，退还积分
      try {
        const { error: refundError } = await supabase.rpc('add_user_points', {
          p_user_id: user.id,
          p_amount: pointsCost,
          p_type: 'REFUND',
          p_description: `完形填空词汇整理 - 响应读取失败积分退还`,
          p_related_id: null
        } as any);

        console.log('响应读取失败，已退还积分:', pointsCost);
      } catch (refundErr) {
        console.error('响应读取失败时退还积分异常:', refundErr);
      }

      return NextResponse.json(
        {
          error: '无法读取响应数据',
          refunded: true,
          refundedPoints: pointsCost,
          message: `响应读取失败，已退还${pointsCost}个点数到您的账户`
        },
        { status: 500 }
      );
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      console.log('开始读取完形填空词汇整理Coze工作流响应...');
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('完形填空词汇整理流响应读取完成');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          console.log('完形填空词汇整理收到数据行:', line.trim());

          // 处理 data: 格式的数据
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.trim().slice(6);
            if (dataStr === '[DONE]') {
              console.log('完形填空词汇整理收到完成信号');
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              console.log('完形填空词汇整理解析的数据:', data);

              // 检查是否是错误数据
              if (data.error_message) {
                console.error('完形填空词汇整理Coze工作流错误:', data.error_message);

                // 工作流错误，退还积分
                try {
                  const { error: refundError } = await supabase.rpc('add_user_points', {
                    p_user_id: user.id,
                    p_amount: pointsCost,
                    p_type: 'REFUND',
                    p_description: `完形填空词汇整理 - 工作流错误积分退还: ${data.error_message}`,
                    p_related_id: null
                  } as any);

                  console.log('工作流错误，已退还积分:', pointsCost);
                } catch (refundErr) {
                  console.error('工作流错误时退还积分异常:', refundErr);
                }

                return NextResponse.json(
                  {
                    error: 'Coze工作流错误: ' + data.error_message,
                    refunded: true,
                    refundedPoints: pointsCost,
                    message: `工作流处理失败，已退还${pointsCost}个点数到您的账户`
                  },
                  { status: 500 }
                );
              }
              // 检查新的数据格式：直接在data中包含content字段
              else if (data.content && data.content.trim()) {
                // 检查是否是更完整的内容（优先选择更长的内容）
                if (data.content.length > analysisResult.length) {
                  console.log('🔄 更新分析结果，旧长度:', analysisResult.length, '新长度:', data.content.length);
                  analysisResult = data.content;
                } else {
                  console.log('📄 收到内容但长度不更新，当前长度:', analysisResult.length, '收到长度:', data.content.length);
                }
                // 不要立即break，继续读取直到完成
              }
              // 保留旧的数据格式检查（以防万一）
              else if (data.data?.status === 'completed' && data.data?.output) {
                analysisResult = data.data.output;
                console.log('完形填空词汇整理获取到分析结果(旧格式)，长度:', analysisResult.length);
              } else if (data.data?.error) {
                console.error('完形填空词汇整理Coze工作流错误:', data.data.error);
                return NextResponse.json(
                  { error: 'Coze工作流错误: ' + (data.data.error.message || '未知错误') },
                  { status: 500 }
                );
              }
            } catch (e) {
              console.log('完形填空词汇整理解析流数据失败:', e, '数据:', dataStr);
            }
          }
          // 处理 event: 格式的事件
          else if (line.trim().startsWith('event: ')) {
            const eventType = line.trim().slice(7);
            console.log('完形填空词汇整理收到事件类型:', eventType);

            // 如果是错误事件，标记错误状态
            if (eventType === 'Error') {
              console.error('完形填空词汇整理Coze工作流返回错误事件');
              // 继续处理，错误信息在下一个data行中
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // 检查结果数据完整性
    if (!analysisResult || analysisResult.trim().length === 0) {
      console.error('❌ 完形填空词汇整理结果为空:', analysisResult);

      // 结果为空，退还积分
      try {
        const { error: refundError } = await supabase.rpc('add_user_points', {
          p_user_id: user.id,
          p_amount: pointsCost,
          p_type: 'REFUND',
          p_description: `完形填空词汇整理 - 结果为空积分退还`,
          p_related_id: null
        } as any);

        console.log('结果为空，已退还积分:', pointsCost);
      } catch (refundErr) {
        console.error('结果为空时退还积分异常:', refundErr);
      }

      return NextResponse.json(
        {
          error: '完形填空词汇整理服务返回空结果，请稍后重试',
          refunded: true,
          refundedPoints: pointsCost,
          message: `生成结果为空，已退还${pointsCost}个点数到您的账户`
        },
        { status: 500 }
      );
    }

    // 检查结果长度是否合理（太短可能表示数据不完整）
    if (analysisResult.trim().length < 100) {
      console.warn('⚠️ 完形填空词汇整理结果可能不完整！');
      console.warn('📏 结果长度:', analysisResult.length);
      console.warn('📝 完整结果内容:', JSON.stringify(analysisResult, null, 2));
      console.warn('🔍 结果内容预览:', analysisResult.substring(0, 500));
    } else {
      console.log('✅ 完形填空词汇整理获取到完整结果');
      console.log('📏 结果长度:', analysisResult.length);
      console.log('📝 结果内容预览:', analysisResult.substring(0, 300) + '...');
    }

    // 扣除用户点数
    const { error: deductError } = await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: `完形填空重点词汇整理 - AI智能分析`,
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
        tool_name: 'cloze_vocabulary_organise',
        tool_type: 'vocabulary',
        model_type: 'STANDARD',
        input_data: { text: text },
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
        textLength: text.length,
        analysisLength: analysisResult.length
      }
    });

  } catch (error) {
    console.error('完形填空词汇整理处理错误:', error);
    return NextResponse.json(
      { error: '完形填空词汇整理处理失败' },
      { status: 500 }
    );
  }
}