import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 创建Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 生成邀请码
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "缺少用户ID"
      }, { status: 400 });
    }

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({
        success: false,
        error: "用户ID格式无效"
      }, { status: 400 });
    }

    // 调用数据库函数创建邀请码
    const { data, error } = await supabase
      .rpc('create_invitation_code', { p_inviter_id: userId });

    if (error) {
      console.error('创建邀请码失败:', error);
      return NextResponse.json({
        success: false,
        error: "创建邀请码失败: " + error.message
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        error: "邀请码创建失败"
      }, { status: 500 });
    }

    // 构建邀请链接，指向重定向页面
    // 使用生产环境域名
    const inviteUrl = `https://aitoolsforteachers.net/invite/redirect?invite_code=${data}`;

    return NextResponse.json({
      success: true,
      data: {
        invitationCode: data,
        inviteUrl: inviteUrl
      },
      message: "邀请码创建成功"
    });

  } catch (error) {
    console.error("邀请码API错误:", error);
    return NextResponse.json({
      success: false,
      error: "服务器内部错误"
    }, { status: 500 });
  }
}

// 获取用户的邀请信息
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const invitationCode = searchParams.get('code');

    if (userId) {
      // 获取用户的邀请统计信息
      const { data: stats, error: statsError } = await supabase
        .from('invitation_stats')
        .select('*')
        .eq('inviter_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('获取邀请统计失败:', statsError);
        return NextResponse.json({
          success: false,
          error: "获取邀请统计失败: " + statsError.message
        }, { status: 500 });
      }

      // 获取用户的邀请记录
      const { data: invitations, error: invitationsError } = await supabase
        .from('invitations')
        .select(`
          *,
          invited_user:users(name, email, created_at)
        `)
        .eq('inviter_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (invitationsError) {
        console.error('获取邀请记录失败:', invitationsError);
        return NextResponse.json({
          success: false,
          error: "获取邀请记录失败: " + invitationsError.message
        }, { status: 500 });
      }

      // 获取用户的奖励记录
      const { data: payouts, error: payoutsError } = await supabase
        .from('invitation_reward_payouts')
        .select('*')
        .eq('inviter_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (payoutsError) {
        console.error('获取奖励记录失败:', payoutsError);
        return NextResponse.json({
          success: false,
          error: "获取奖励记录失败: " + payoutsError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: {
          stats: stats || {
            total_invitations: 0,
            successful_invitations: 0,
            total_rewards_earned: 0,
            pending_registrations: 0,
            completed_invitations: 0
          },
          invitations: invitations || [],
          payouts: payouts || []
        }
      });

    } else if (invitationCode) {
      // 验证邀请码
      const { data: invitation, error } = await supabase
        .from('invitation_codes')
        .select(`
          *,
          inviter:users(name, email)
        `)
        .eq('code', invitationCode)
        .eq('is_active', true)
        .single();

      if (error || !invitation) {
        return NextResponse.json({
          success: false,
          error: "邀请码无效或已过期"
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          invitationCode: invitation.code,
          inviterName: invitation.inviter?.name,
          inviterEmail: invitation.inviter?.email,
          inviteUrl: invitation.invite_url
        }
      });

    } else {
      return NextResponse.json({
        success: false,
        error: "缺少userId或code参数"
      }, { status: 400 });
    }

  } catch (error) {
    console.error("邀请信息API错误:", error);
    return NextResponse.json({
      success: false,
      error: "服务器内部错误"
    }, { status: 500 });
  }
}