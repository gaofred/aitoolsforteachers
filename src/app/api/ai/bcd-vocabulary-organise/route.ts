import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// 退还点数的辅助函数
async function refundPoints(supabase: any, userId: string, amount: number, reason: string) {
  try {
    const { error } = await (supabase as any).rpc('add_user_points', {
      p_user_id: userId,
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

    // 获取当前用户
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
      .eq("user_id", user.id)
      .single();

    if (pointsError || !userPoints) {
      return NextResponse.json({
        success: false,
        error: "获取用户点数失败"
      }, { status: 400 });
    }

    const pointsCost = 3; // BCD词汇整理消耗3个点数

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
        workflow_id: "7550295117321617450",
        parameters: {
          input: text
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Coze工作流API错误:', errorData);
      await refundPoints(supabase, user.id, pointsCost, 'BCD词汇整理失败退还');
      return NextResponse.json(
        { success: false, error: "词汇整理失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 处理流式响应
    let vocabularyResult = '';
    const reader = response.body?.getReader();

    if (!reader) {
      await refundPoints(supabase, user.id, pointsCost, 'BCD词汇整理响应读取失败退还');
      return NextResponse.json(
        { success: false, error: "无法读取响应数据" },
        { status: 500 }
      );
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.trim().slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.error_message) {
                console.error('Coze工作流错误:', data.error_message);
                await refundPoints(supabase, user.id, pointsCost, 'BCD词汇整理工作流错误退还');
                return NextResponse.json(
                  { success: false, error: 'Coze工作流错误: ' + data.error_message },
                  { status: 500 }
                );
              }
              else if (data.content && data.content.trim()) {
                vocabularyResult = data.content;
                break;
              }
              else if (data.data?.status === 'completed' && data.data?.output) {
                vocabularyResult = data.data.output;
                break;
              }
            } catch (parseError) {
              console.error('解析Coze响应数据失败:', parseError);
            }
          }
        }

        if (vocabularyResult) break;
      }
    } catch (error) {
      console.error('读取Coze响应流时出错:', error);
      await refundPoints(supabase, user.id, pointsCost, 'BCD词汇整理响应流读取失败退还');
      return NextResponse.json(
        { success: false, error: "词汇整理失败，请重试" },
        { status: 500 }
      );
    }

    if (!vocabularyResult) {
      await refundPoints(supabase, user.id, pointsCost, 'BCD词汇整理结果为空退还');
      return NextResponse.json({
        success: false,
        error: "词汇整理失败，请重试"
      }, { status: 500 });
    }

    // 扣除用户点数
    const { error: deductError } = await (supabase as any).rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: `BCD词汇整理`,
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
        tool_type: "bcd_vocabulary_organise",
        tool_name: "BCD篇阅读重点词汇整理",
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
    console.error('BCD词汇整理错误:', error);
    return NextResponse.json({
      success: false,
      error: "服务器错误，请稍后重试"
    }, { status: 500 });
  }
}