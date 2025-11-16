import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "用户未登录"
      }, { status: 401 });
    }

    // 调用会员状态检查函数
    const { data, error } = await supabase
      .rpc('check_membership_status', {
        p_user_id: user.id
      });

    if (error) {
      console.error('获取会员状态失败:', error);
      return NextResponse.json({
        success: false,
        error: `获取会员状态失败: ${error.message}`
      }, { status: 500 });
    }

    // 获取用户当前点数
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('points, daily_points, last_reset_date, is_member, membership_expires_at')
      .eq('user_id', user.id)
      .single();

    if (pointsError) {
      console.error('获取用户点数失败:', pointsError);
      return NextResponse.json({
        success: false,
        error: `获取用户点数失败: ${pointsError.message}`
      }, { status: 500 });
    }

    // 获取最近的购买记录
    const { data: purchases, error: purchasesError } = await supabase
      .from('membership_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (purchasesError) {
      console.error('获取购买记录失败:', purchasesError);
    }

    return NextResponse.json({
      success: true,
      data: {
        membership: Array.isArray(data) && data.length > 0 ? data[0] : data,
        currentPoints: userPoints.points,
        dailyPoints: userPoints.daily_points,
        lastResetDate: userPoints.last_reset_date,
        isMember: userPoints.is_member,
        membershipExpiresAt: userPoints.membership_expires_at,
        recentPurchase: purchases && purchases.length > 0 ? purchases[0] : null
      }
    });

  } catch (error) {
    console.error('获取会员状态失败:', error);
    return NextResponse.json({
      success: false,
      error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}