/**
 * 客户端邀请追踪工具
 * 仅包含可以在浏览器中运行的函数
 */

export interface InviteRewardResult {
  success: boolean;
  pointsAwarded?: number;
  basePoints?: number;
  bonusPoints?: number;
  inviterName?: string;
  error?: string;
}

/**
 * 检查URL中的邀请码参数
 */
export function getInviteCodeFromURL(): string | null {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite_code');

  if (inviteCode) {
    // 存储邀请码到localStorage，防止页面刷新后丢失
    localStorage.setItem('pending_invite_code', inviteCode);
    return inviteCode;
  }

  // 检查localStorage中是否有待处理的邀请码
  return localStorage.getItem('pending_invite_code');
}

/**
 * 清除待处理的邀请码
 */
export function clearPendingInviteCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pending_invite_code');
}

/**
 * 验证邀请码是否有效
 */
export async function validateInviteCode(inviteCode: string): Promise<{
  valid: boolean;
  inviterName?: string;
  inviterEmail?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/invite?code=${inviteCode}`);
    const data = await response.json();

    if (data.success) {
      return {
        valid: true,
        inviterName: data.data.inviterName,
        inviterEmail: data.data.inviterEmail
      };
    } else {
      return {
        valid: false,
        error: data.error
      };
    }
  } catch (error) {
    console.error('验证邀请码失败:', error);
    return {
      valid: false,
      error: '验证邀请码时发生错误'
    };
  }
}

/**
 * 处理邀请奖励认领
 * 在新用户注册成功后调用
 */
export async function claimInviteReward(
  userId: string,
  inviteCode?: string
): Promise<InviteRewardResult> {
  try {
    // 如果没有提供邀请码，尝试从URL或localStorage获取
    const codeToUse = inviteCode || getInviteCodeFromURL();

    if (!codeToUse) {
      return { success: false, error: '没有找到邀请码' };
    }

    console.log('开始处理邀请奖励:', { userId, inviteCode: codeToUse });

    // 使用简化的API而不是数据库函数
    const response = await fetch('/api/invite/simple-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteCode: codeToUse,
        userId: userId
      })
    });

    const data = await response.json();

    if (data.success) {
      // 清除待处理的邀请码
      clearPendingInviteCode();

      return {
        success: true,
        pointsAwarded: data.data.pointsAwarded,
        basePoints: data.data.basePoints,
        bonusPoints: data.data.bonusPoints,
        inviterName: data.data.inviterName
      };
    } else {
      return {
        success: false,
        error: data.error
      };
    }
  } catch (error) {
    console.error('处理邀请奖励失败:', error);
    return {
      success: false,
      error: '处理邀请奖励时发生错误'
    };
  }
}

/**
 * 获取用户IP地址
 */
async function getUserIPAddress(): Promise<string> {
  try {
    // 尝试从多个IP获取服务获取IP地址
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://api.ip.sb/ip'
    ];

    for (const service of ipServices) {
      try {
        const response = await fetch(service, {
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          const data = await response.json();
          // 不同的API返回格式不同
          return data.ip || data.ip_address || data.toString();
        }
      } catch (error) {
        console.warn(`IP服务 ${service} 不可用:`, error);
        continue;
      }
    }

    // 如果所有服务都失败，返回默认值
    return 'unknown';
  } catch (error) {
    console.warn('获取IP地址失败:', error);
    return 'unknown';
  }
}

/**
 * 设置邀请码追踪Cookie
 */
export function setInviteTrackingCookie(inviteCode: string): void {
  if (typeof document === 'undefined') return;

  // 设置30天有效期的Cookie
  const expires = new Date();
  expires.setDate(expires.getDate() + 30);

  document.cookie = `invite_code=${inviteCode}; expires=${expires.toUTCString()}; path=/; sameSite=lax`;
}

/**
 * 从Cookie获取邀请码
 */
export function getInviteCodeFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'invite_code') {
      return value;
    }
  }

  return null;
}

/**
 * 检查用户是否通过邀请链接访问
 */
export function isUserFromInvite(): boolean {
  return getInviteCodeFromURL() !== null || getInviteCodeFromCookie() !== null;
}

/**
 * 自动设置邀请追踪
 * 在页面加载时调用
 */
export function autoSetupInviteTracking(): string | null {
  const inviteCode = getInviteCodeFromURL();

  if (inviteCode) {
    // 设置Cookie和localStorage
    setInviteTrackingCookie(inviteCode);
    localStorage.setItem('pending_invite_code', inviteCode);

    console.log('检测到邀请码:', inviteCode);
    return inviteCode;
  }

  // 检查Cookie中是否有邀请码
  const cookieCode = getInviteCodeFromCookie();
  if (cookieCode) {
    localStorage.setItem('pending_invite_code', cookieCode);
    return cookieCode;
  }

  return null;
}

/**
 * 获取邀请统计信息
 */
export async function getInviteStats(userId: string): Promise<{
  totalInvitations: number;
  successfulInvitations: number;
  totalRewardsEarned: number;
  pendingRegistrations: number;
}> {
  try {
    const response = await fetch(`/api/invite?userId=${userId}`);
    const data = await response.json();

    if (data.success && data.data.stats) {
      return data.data.stats;
    }

    return {
      totalInvitations: 0,
      successfulInvitations: 0,
      totalRewardsEarned: 0,
      pendingRegistrations: 0
    };
  } catch (error) {
    console.error('获取邀请统计失败:', error);
    return {
      totalInvitations: 0,
      successfulInvitations: 0,
      totalRewardsEarned: 0,
      pendingRegistrations: 0
    };
  }
}

/**
 * 为新注册用户检查并处理邀请奖励
 */
export async function processInviteForNewUser(userId: string): Promise<InviteRewardResult> {
  console.log('为新用户处理邀请奖励:', userId);

  // 首先检查URL参数
  let inviteCode = getInviteCodeFromURL();

  // 如果URL中没有，检查Cookie
  if (!inviteCode) {
    inviteCode = getInviteCodeFromCookie();
  }

  // 如果仍然没有，检查localStorage
  if (!inviteCode) {
    inviteCode = localStorage.getItem('pending_invite_code');
  }

  if (!inviteCode) {
    return { success: false, error: '没有找到邀请码' };
  }

  // 验证邀请码
  const validation = await validateInviteCode(inviteCode);
  if (!validation.valid) {
    clearPendingInviteCode();
    return { success: false, error: validation.error || '邀请码无效' };
  }

  // 认领奖励
  const result = await claimInviteReward(userId, inviteCode);

  if (result.success) {
    console.log('邀请奖励处理成功:', result);
  } else {
    console.error('邀请奖励处理失败:', result.error);
  }

  return result;
}