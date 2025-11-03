import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// 获取北京日期字符串（统一格式）
function getBeijingDate(): string {
  const today = new Date().toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
  console.log('每日奖励API - 获取的北京时间:', today);
  return today;
}

export async function POST(request: NextRequest) {
  try {
    console.log('每日奖励API POST - 收到请求')

    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('每日奖励API POST - 认证错误:', authError);
      return NextResponse.json({ error: '未认证' }, { status: 401 })
    }

    console.log('每日奖励API POST - 用户ID:', user?.id);

    // 获取今天的日期（北京时间）
    const today = getBeijingDate();

    // 检查今天是否已经领取过
    const description = `每日登录奖励 - ${today}`;
    console.log('每日奖励API POST - 查询条件:', {
      user_id: user.id,
      type: 'BONUS',
      description: description
    });

    const { data: existingTransactions, error: checkError } = await supabase
      .from('point_transactions')
      .select('id, description, created_at')
      .eq('user_id', user.id as any)
      .eq('type', 'BONUS' as any)
      .eq('description', description as any);

    if (checkError) {
      console.error('检查奖励状态失败:', checkError);
      return NextResponse.json({ error: '检查奖励状态失败' }, { status: 500 });
    }

    const hasExistingRecords = existingTransactions && existingTransactions.length > 0;
    if (hasExistingRecords) {
      console.log('每日奖励API POST - 今日奖励已领取，找到记录数:', existingTransactions.length);
      return NextResponse.json({
        success: false,
        message: '今天已经领取过奖励了',
        alreadyClaimed: true
      });
    }

    // 获取当前积分
    const { data: currentPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    if (pointsError) {
      console.error('获取当前积分失败:', pointsError);
      return NextResponse.json({ error: '获取积分信息失败' }, { status: 500 });
    }

    const currentPointsValue = (currentPoints as any)?.points || 0;
    const rewardPoints = 10;
    const newPoints = currentPointsValue + rewardPoints;

    // 更新积分
    const { error: updateError } = await (supabase
      .from('user_points') as any)
      .update({
        points: newPoints,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('更新积分失败:', {
        error: updateError,
        user_id: user.id,
        newPoints,
        currentPointsValue,
        rewardPoints
      });
      return NextResponse.json({ 
        error: '更新积分失败', 
        details: updateError.message 
      }, { status: 500 });
    }

    // 记录交易
    const { error: insertError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: user.id,
        type: 'BONUS',
        amount: rewardPoints,
        description: `每日登录奖励 - ${today}`,
        created_at: new Date().toISOString()
      } as any);

    if (insertError) {
      console.error('记录交易失败:', insertError);
      return NextResponse.json({ error: '记录交易失败' }, { status: 500 });
    }

    console.log('每日奖励API POST - 发放成功:', {
      user_id: user.id,
      currentPoints: currentPointsValue,
      rewardPoints,
      newPoints
    });

    return NextResponse.json({
      success: true,
      message: `恭喜！获得每日登录奖励 ${rewardPoints} 点数`,
      pointsAdded: rewardPoints,
      newPoints: newPoints,
      alreadyClaimed: false
    });

  } catch (error) {
    console.error('每日奖励API POST - 操作异常:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('每日奖励API GET - 收到请求');

    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('每日奖励API GET - 认证错误:', authError);
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 })
    }

    console.log('每日奖励API GET - 用户ID:', user?.id);

    // 获取今天的日期（北京时间）
    const today = getBeijingDate();

  // 检查今天是否已经领取过
    const description = `每日登录奖励 - ${today}`;
    console.log('每日奖励API GET - 查询条件:', {
      user_id: user.id,
      type: 'BONUS',
      description: description
    });

    const { data: existingTransactions, error: checkError } = await supabase
      .from('point_transactions')
      .select('id, description, created_at')
      .eq('user_id', user.id as any)
      .eq('type', 'BONUS' as any)
      .eq('description', description as any);

    if (checkError) {
      console.error('检查奖励状态失败:', checkError);
      return NextResponse.json({ error: '检查奖励状态失败' }, { status: 500 });
    }

    const hasClaimedToday = existingTransactions && existingTransactions.length > 0;
    console.log('每日奖励API GET - 今日奖励状态:', {
      user_id: user.id,
      today,
      hasClaimedToday,
      existingTransactions: existingTransactions,
      recordCount: existingTransactions ? existingTransactions.length : 0,
      checkError: checkError,
      foundData: existingTransactions
    });

    return NextResponse.json({
      success: true,
      hasClaimedToday,
      message: hasClaimedToday ? '今天已经领取过奖励了' : '可以领取今日奖励'
    });

  } catch (error) {
    console.error('每日奖励API GET - 检查奖励状态异常:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}





