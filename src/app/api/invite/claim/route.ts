import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 处理邀请奖励认领
export async function POST(request: Request) {
  try {
    const { inviteCode, userId, ipAddress, userAgent } = await request.json();

    if (!inviteCode || !userId) {
      return NextResponse.json({
        success: false,
        error: "缺少邀请码或用户ID"
      }, { status: 400 });
    }

    console.log('处理邀请奖励:', { inviteCode, userId, ipAddress });

    // 调用数据库函数处理邀请奖励
    const { data, error } = await supabase
      .rpc('process_invitation_reward', {
        p_invite_code: inviteCode,
        p_new_user_id: userId,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null
      });

    if (error) {
      console.error('处理邀请奖励失败:', error);
      return NextResponse.json({
        success: false,
        error: "处理邀请奖励失败: " + error.message
      }, { status: 500 });
    }

    // 解析返回的JSON结果
    const result = typeof data === 'string' ? JSON.parse(data) : data;

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "邀请奖励处理失败"
      }, { status: 400 });
    }

    // 获取邀请者信息用于前端显示
    const { data: inviterData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', result.data?.inviter_id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        invitationId: result.invitation_id,
        pointsAwarded: result.points_awarded,
        basePoints: result.base_points,
        bonusPoints: result.bonus_points,
        inviterName: inviterData?.name || 'Fred老师',
        payoutDescription: `获得 ${result.points_awarded} 点数奖励！`
      },
      message: "邀请奖励处理成功！"
    });

  } catch (error) {
    console.error("邀请奖励API错误:", error);
    return NextResponse.json({
      success: false,
      error: "服务器内部错误"
    }, { status: 500 });
  }
}