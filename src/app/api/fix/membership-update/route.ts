import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    const testUserId = '830a6f1f-bcc1-45c4-9a00-6746eee4421a';

    console.log('🔧 开始修复用户会员状态...');

    // 1. 检查当前user_points状态
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (pointsError) {
      console.error('❌ 获取user_points失败:', pointsError);
      return NextResponse.json({
        success: false,
        error: `获取user_points失败: ${pointsError.message}`
      }, { status: 500 });
    }

    console.log('📊 当前user_points状态:', userPoints);

    // 2. 检查当前memberships状态
    const { data: membershipsList, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (membershipError) {
      console.error('❌ 获取memberships失败:', membershipError);
      return NextResponse.json({
        success: false,
        error: `获取memberships失败: ${membershipError.message}`
      }, { status: 500 });
    }

    const memberships = membershipsList && membershipsList.length > 0 ? membershipsList[0] : null;
    console.log('📊 当前memberships状态:', memberships);

    // 3. 如果user_points是会员但memberships不是，则更新memberships
    if (userPoints.is_member && (!memberships || memberships.membership_type === 'FREE')) {
      console.log('🔄 检测到不一致，更新memberships表...');

      const updateData = {
        membership_type: userPoints.is_member ? 'PREMIUM' : 'FREE',
        expires_at: userPoints.membership_expires_at,
        updated_at: new Date().toISOString()
      };

      let updatedMembership;
      let updateError;

      if (memberships) {
        // 更新现有记录
        ({ data: updatedMembership, error: updateError } = await supabase
          .from('memberships')
          .update(updateData)
          .eq('id', memberships.id)
          .select()
          .single());
      } else {
        // 创建新记录
        ({ data: updatedMembership, error: updateError } = await supabase
          .from('memberships')
          .insert({
            user_id: testUserId,
            ...updateData,
            is_active: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single());
      }

      if (updateError) {
        console.error('❌ 更新memberships失败:', updateError);
        return NextResponse.json({
          success: false,
          error: `更新memberships失败: ${updateError.message}`
        }, { status: 500 });
      }

      console.log('✅ memberships更新成功:', updatedMembership);

      return NextResponse.json({
        success: true,
        message: '会员状态修复完成',
        data: {
          user_points: userPoints,
          memberships_before: memberships,
          memberships_after: updatedMembership
        }
      });
    } else {
      console.log('✅ 会员状态一致，无需修复');

      return NextResponse.json({
        success: true,
        message: '会员状态一致，无需修复',
        data: {
          user_points: userPoints,
          memberships: memberships
        }
      });
    }

  } catch (error) {
    console.error('❌ 修复失败:', error);
    return NextResponse.json({
      success: false,
      error: `修复失败: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}