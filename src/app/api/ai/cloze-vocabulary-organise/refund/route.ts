// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase标准认证方式
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('完形填空词汇整理积分退还认证错误:', authError);
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    // 获取请求数据
    const { userId, amount = 2, reason = '生成失败积分退还' } = await request.json();

    // 验证用户ID
    if (userId !== user.id) {
      console.error('用户ID不匹配:', userId, user.id);
      return NextResponse.json(
        { error: '用户验证失败' },
        { status: 403 }
      );
    }

    // 退还积分
    const { error: refundError } = await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: amount,
      p_type: 'REFUND',
      p_description: `完形填空词汇整理 - ${reason}`,
      p_related_id: null
    } as any);

    if (refundError) {
      console.error('退还积分失败:', refundError);
      return NextResponse.json(
        { error: '退还积分失败，请联系客服' },
        { status: 500 }
      );
    }

    console.log(`用户${user.id}成功退还${amount}个积分，原因:`, reason);

    // 记录退还历史
    const { error: historyError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        tool_name: 'cloze_vocabulary_organise',
        tool_type: 'vocabulary',
        model_type: 'STANDARD',
        input_data: { refund_reason: reason },
        output_data: { refunded: true, amount: amount },
        points_cost: -amount, // 负数表示退还
        status: 'REFUNDED'
      } as any);

    if (historyError) {
      console.error('记录退还历史失败:', historyError);
    }

    return NextResponse.json({
      success: true,
      refundedPoints: amount,
      message: `已成功退还${amount}个点数到您的账户`
    });

  } catch (error) {
    console.error('完形填空词汇整理积分退还处理错误:', error);
    return NextResponse.json(
      { error: '积分退还处理失败' },
      { status: 500 }
    );
  }
}