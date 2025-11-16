import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
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

    const { planType, pointsCost } = await request.json();

    if (!planType || !pointsCost) {
      return NextResponse.json({
        success: false,
        error: "缺少必要参数: planType 和 pointsCost"
      }, { status: 400 });
    }

    // 调用会员购买函数
    const { data, error } = await supabase
      .rpc('purchase_membership', {
        p_user_id: user.id,
        p_plan_type: planType,
        p_points_cost: pointsCost
      });

    if (error) {
      console.error('购买会员失败:', error);
      return NextResponse.json({
        success: false,
        error: `购买会员失败: ${error.message}`
      }, { status: 500 });
    }

    if (!data || !(data as any).success) {
      return NextResponse.json({
        success: false,
        error: (data as any)?.error || '购买会员失败'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        purchaseId: (data as any).purchase_id,
        planType: (data as any).plan_type,
        endDate: (data as any).end_date,
        dailyPoints: (data as any).daily_points
      }
    });

  } catch (error) {
    console.error('购买会员失败:', error);
    return NextResponse.json({
      success: false,
      error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}