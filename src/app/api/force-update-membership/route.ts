import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { userId, membershipType, membershipDays } = await request.json();

    if (!userId || !membershipType) {
      return NextResponse.json({
        success: false,
        error: "请提供用户ID和会员类型"
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    console.log('🔧 强制更新用户会员状态...');
    console.log('👤 用户ID:', userId);
    console.log('👑 会员类型:', membershipType);
    console.log('📅 会员天数:', membershipDays || 'N/A');

    // 计算到期时间
    const endDate = new Date();
    if (membershipDays) {
      endDate.setDate(endDate.getDate() + membershipDays);
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // 默认1个月
    }

    // 计算每日点数
    const dailyPoints = membershipType === 'PRO' ? 800 :
                       membershipType === 'PREMIUM' ? 500 : 25;

    // 1. 更新user_points表
    const { data: updatedPoints, error: pointsError } = await supabase
      .from('user_points')
      .update({
        is_member: true,
        membership_expires_at: endDate.toISOString(),
        daily_points: dailyPoints,
        points: dailyPoints,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (pointsError) {
      console.error('❌ 更新user_points失败:', pointsError);
      return NextResponse.json({
        success: false,
        error: `更新user_points失败: ${pointsError.message}`
      }, { status: 500 });
    }

    console.log('✅ user_points更新成功:', updatedPoints);

    // 2. 创建membership_purchases记录
    const { data: purchaseRecord, error: purchaseError } = await supabase
      .from('membership_purchases')
      .insert({
        user_id: userId,
        plan_type: membershipType,
        points_cost: 0,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        transaction_id: null
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('❌ 创建membership_purchases失败:', purchaseError);
      // 不阻止继续执行
    } else {
      console.log('✅ membership_purchases创建成功:', purchaseRecord);
    }

    // 3. 检查memberships表
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .single();

    let membershipUpdate;
    let membershipError;

    if (existingMembership) {
      // 更新现有记录
      ({ data: membershipUpdate, error: membershipError } = await supabase
        .from('memberships')
        .update({
          membership_type: membershipType,
          expires_at: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single());
    } else {
      // 创建新记录 - 跳过RLS
      console.log('跳过memberships表更新（RLS限制）');
      membershipError = null;
      membershipUpdate = null;
    }

    if (membershipError) {
      console.log('⚠️ memberships更新失败（可能是RLS限制）:', membershipError.message);
    } else if (membershipUpdate) {
      console.log('✅ memberships更新成功:', membershipUpdate);
    }

    return NextResponse.json({
      success: true,
      message: '会员状态强制更新成功',
      data: {
        user_points: updatedPoints,
        membership_purchases: purchaseRecord,
        memberships: membershipUpdate,
        end_date: endDate.toISOString(),
        daily_points: dailyPoints
      }
    });

  } catch (error) {
    console.error('❌ 强制更新失败:', error);
    return NextResponse.json({
      success: false,
      error: `强制更新失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}