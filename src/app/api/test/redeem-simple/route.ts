import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({
        success: false,
        error: "请提供兑换码"
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 直接调用兑换函数，使用一个固定的测试用户ID
    const testUserId = '830a6f1f-bcc1-45c4-9a00-6746eee4421a'; // 从之前的日志中看到的真实用户ID

    console.log(`🧪 测试兑换码: ${code}`);
    console.log(`👤 测试用户ID: ${testUserId}`);

    // 首先检查兑换码是否存在
    const { data: codeInfo, error: codeError } = await supabase
      .from('redemption_codes')
      .select('*')
      .eq('code', code.trim())
      .single();

    if (codeError) {
      console.log('❌ 兑换码不存在:', codeError.message);
      return NextResponse.json({
        success: false,
        error: `兑换码不存在: ${codeError.message}`
      }, { status: 404 });
    }

    console.log('✅ 兑换码信息:', {
      code: codeInfo.code,
      type: codeInfo.type,
      membership_type: codeInfo.membership_type,
      membership_days: codeInfo.membership_days,
      value: codeInfo.value,
      is_used: codeInfo.is_used
    });

    if (codeInfo.is_used) {
      return NextResponse.json({
        success: false,
        error: "兑换码已被使用"
      }, { status: 400 });
    }

    // 调用兑换函数
    const { data, error } = await supabase.rpc('redeem_membership_code', {
      p_user_id: testUserId,
      p_code: code.trim()
    });

    if (error) {
      console.error('❌ 兑换失败:', error);
      return NextResponse.json({
        success: false,
        error: `兑换失败: ${error.message}`,
        details: error
      }, { status: 500 });
    }

    console.log('🎉 兑换结果:', data);

    if (!data || !(data as any).success) {
      return NextResponse.json({
        success: false,
        error: (data as any)?.error || '兑换失败',
        details: data
      }, { status: 400 });
    }

    const result = data as any;

    // 获取用户最新的点数信息
    const { data: userInfo, error: userError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    return NextResponse.json({
      success: true,
      message: result.message || '兑换成功',
      data: {
        redemption_result: result,
        user_points: userInfo,
        code_info: codeInfo
      }
    });

  } catch (error) {
    console.error('❌ 测试兑换失败:', error);
    return NextResponse.json({
      success: false,
      error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}`
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "兑换码测试API",
    usage: {
      method: "POST",
      body: {
        code: "兑换码"
      },
      available_codes: [
        { code: "YJ44BB3I", type: "POINTS", description: "100点数" },
        { code: "L0FYH7UY", type: "MEMBERSHIP_DAYS", description: "Premium会员7天" },
        { code: "RBWTQDA1", type: "MEMBERSHIP", description: "Pro会员30天" }
      ]
    }
  });
}