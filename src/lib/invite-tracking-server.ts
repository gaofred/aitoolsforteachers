/**
 * 服务端邀请追踪工具
 * 仅包含可以在服务器环境中运行的函数
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface InviteRewardResult {
  success: boolean;
  pointsAwarded?: number;
  basePoints?: number;
  bonusPoints?: number;
  inviterName?: string;
  inviterEmail?: string;
  error?: string;
}

/**
 * 为新注册用户检查并处理邀请奖励（服务端版本）
 */
export async function processInviteForNewUserServer(
  userId: string,
  request: Request
): Promise<InviteRewardResult> {
  console.log('为新用户处理邀请奖励（服务端）:', userId);

  try {
    // 从URL参数中获取邀请码
    const requestUrl = new URL(request.url);
    const inviteCode = requestUrl.searchParams.get('invite_code');

    if (!inviteCode) {
      return { success: false, error: '没有找到邀请码' };
    }

    console.log('从URL获取到邀请码:', inviteCode);

    // 验证邀请码
    const supabase = createServerSupabaseClient();
    const { data: inviteData, error: inviteError } = await supabase
      .from('invitation_codes')
      .select(`
        *,
        inviter:users!invitation_codes_inviter_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('code', inviteCode)
      .eq('is_active', true)
      .single();

    if (inviteError || !inviteData) {
      console.error('邀请码验证失败:', inviteError);
      return { success: false, error: '邀请码无效或已过期' };
    }

    const invite = inviteData as any;

    // 检查是否自己邀请自己
    if (invite.inviter_id === userId) {
      return { success: false, error: '不能邀请自己' };
    }

    // 检查是否已经处理过这个邀请
    const { data: existingInvitation, error: checkError } = await supabase
      .from('invitations')
      .select('*')
      .eq('invitation_code_id', invite.id)
      .eq('invited_user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('检查邀请记录失败:', checkError);
      return { success: false, error: '检查邀请记录失败' };
    }

    if (existingInvitation) {
      console.log('用户已经使用过此邀请码');
      return { success: false, error: '您已经使用过此邀请码' };
    }

    // 直接调用简化的邀请奖励处理API
    const claimResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/invite/simple-claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode: inviteCode,
        userId: userId
      })
    });

    if (!claimResponse.ok) {
      const errorData = await claimResponse.json();
      console.error('调用邀请奖励API失败:', errorData);
      return { success: false, error: errorData.error || '处理邀请奖励失败' };
    }

    const result = await claimResponse.json();

    if (result.success) {
      console.log('邀请奖励处理成功:', result.data);
      return {
        success: true,
        pointsAwarded: result.data.pointsAwarded,
        basePoints: result.data.basePoints,
        bonusPoints: result.data.bonusPoints,
        inviterName: result.data.inviterName,
        inviterEmail: result.data.inviterEmail
      };
    } else {
      console.error('邀请奖励处理失败:', result.error);
      return {
        success: false,
        error: result.error || '处理邀请奖励失败'
      };
    }

  } catch (error) {
    console.error('服务端处理邀请奖励时出错:', error);
    return {
      success: false,
      error: '处理邀请奖励时发生错误'
    };
  }
}

/**
 * 获取用户的邀请统计信息（服务端版本）
 */
export async function getInviteStatsServer(userId: string): Promise<{
  totalInvitations: number;
  successfulInvitations: number;
  totalRewardsEarned: number;
  pendingRegistrations: number;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // 获取邀请记录
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select(`
        status,
        invitation_reward_payouts (
          points_awarded
        )
      `)
      .eq('inviter_id', userId);

    if (invitationsError || !invitations) {
      console.error('获取邀请记录失败:', invitationsError);
      return {
        totalInvitations: 0,
        successfulInvitations: 0,
        totalRewardsEarned: 0,
        pendingRegistrations: 0
      };
    }

    // 统计数据
    const totalInvitations = invitations.length;
    let successfulInvitations = 0;
    let totalRewardsEarned = 0;
    let pendingRegistrations = 0;

    for (const invitation of invitations as any[]) {
      if (invitation.status === 'completed') {
        successfulInvitations++;
        // 累计奖励积分
        if (invitation.invitation_reward_payouts && invitation.invitation_reward_payouts.length > 0) {
          const payout = invitation.invitation_reward_payouts[0] as any;
          totalRewardsEarned += payout.points_awarded || 0;
        }
      } else if (invitation.status === 'registered') {
        pendingRegistrations++;
      }
    }

    return {
      totalInvitations,
      successfulInvitations,
      totalRewardsEarned,
      pendingRegistrations
    };

  } catch (error) {
    console.error('服务端获取邀请统计失败:', error);
    return {
      totalInvitations: 0,
      successfulInvitations: 0,
      totalRewardsEarned: 0,
      pendingRegistrations: 0
    };
  }
}