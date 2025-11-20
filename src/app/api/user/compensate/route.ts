import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    console.log('💰 积分补偿API - 开始处理请求');

    const { userId, amount, reason, type } = await request.json();

    // 验证必需参数
    if (!userId || !amount || amount <= 0) {
      console.log('❌ 积分补偿API - 参数验证失败');
      return NextResponse.json({
        success: false,
        error: '参数无效：userId和amount为必需参数，amount必须大于0'
      }, { status: 400 });
    }

    console.log(`💰 积分补偿API - 用户: ${userId}, 金额: ${amount}, 原因: ${reason}`);

    // 创建Supabase客户端
    const supabase = createServerSupabaseClient();

    // 验证用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log('❌ 积分补偿API - 用户不存在');
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    console.log(`✅ 积分补偿API - 用户验证通过: ${user.email}`);

    // 获取当前用户积分
    const { data: currentPoints, error: pointsError } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    if (pointsError) {
      console.error('❌ 积分补偿API - 获取用户积分失败:', pointsError);
      return NextResponse.json({
        success: false,
        error: '获取用户积分失败'
      }, { status: 500 });
    }

    const currentPointsAmount = currentPoints?.points || 0;
    const newPoints = currentPointsAmount + amount;

    console.log(`💰 积分补偿API - 当前积分: ${currentPointsAmount}, 补偿后: ${newPoints}`);

    // 更新用户积分
    const { error: updateError } = await supabase
      .from('users')
      .update({ points: newPoints })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ 积分补偿API - 更新积分失败:', updateError);
      return NextResponse.json({
        success: false,
        error: '更新积分失败'
      }, { status: 500 });
    }

    // 记录积分变动交易
    const { error: transactionError } = await supabase
      .from('user_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        type: type || 'COMPENSATION',
        description: reason || '系统补偿',
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ 积分补偿API - 记录交易失败:', transactionError);
      // 交易记录失败不影响积分补偿，只记录日志
    }

    console.log(`✅ 积分补偿API - 补偿完成，用户: ${userId}, 金额: ${amount}`);

    return NextResponse.json({
      success: true,
      message: '积分补偿成功',
      data: {
        userId,
        amount,
        previousPoints: currentPointsAmount,
        newPoints,
        reason,
        type: type || 'COMPENSATION'
      }
    });

  } catch (error) {
    console.error('❌ 积分补偿API - 处理异常:', error);
    return NextResponse.json({
      success: false,
      error: '积分补偿处理失败'
    }, { status: 500 });
  }
}