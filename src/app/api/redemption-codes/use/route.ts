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

    const { code } = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json({
        success: false,
        error: "请输入兑换码"
      }, { status: 400 });
    }

    // 调用统一兑换函数
    const { data, error } = await supabase.rpc('redeem_membership_code', {
      p_user_id: user.id,
      p_code: code.trim()
    });

    if (error) {
      console.error('兑换失败:', error);
      return NextResponse.json({
        success: false,
        error: `兑换失败: ${error.message}`
      }, { status: 500 });
    }

    if (!data || !(data as any).success) {
      return NextResponse.json({
        success: false,
        error: (data as any)?.error || '兑换失败'
      }, { status: 400 });
    }

    const result = data as any;

    // 根据兑换类型返回不同的成功消息
    let successMessage = '';
    let additionalData = {};

    if (result.type === 'POINTS') {
      successMessage = `成功兑换 ${result.value} 点数！`;
      additionalData = { pointsAwarded: result.value };
    } else if (result.type === 'MEMBERSHIP_DAYS' || result.type === 'MEMBERSHIP') {
      successMessage = `成功兑换 ${result.membership_type} 会员！`;
      additionalData = {
        membershipType: result.membership_type,
        membershipDays: result.membership_days,
        redemptionId: result.redemption_id
      };

      // 获取用户最新会员状态
      const { data: membershipStatus } = await supabase.rpc('check_membership_status', {
        p_user_id: user.id
      });

      if (membershipStatus && Array.isArray(membershipStatus) && membershipStatus.length > 0) {
        additionalData.membershipStatus = membershipStatus[0];
      }
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        type: result.type,
        value: result.value,
        membershipType: result.membership_type,
        membershipDays: result.membership_days,
        redemptionId: result.redemption_id,
        ...additionalData
      }
    });

  } catch (error) {
    console.error('兑换码使用失败:', error);
    return NextResponse.json({
      success: false,
      error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}