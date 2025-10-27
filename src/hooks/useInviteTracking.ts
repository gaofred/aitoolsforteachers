"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import {
  autoSetupInviteTracking,
  isUserFromInvite,
  validateInviteCode,
  claimInviteReward,
  getInviteStats,
  type InviteRewardResult
} from "@/lib/invite-tracking-client";

export function useInviteTracking() {
  const { currentUser } = useUser();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isFromInvite, setIsFromInvite] = useState(false);
  const [inviteValidation, setInviteValidation] = useState<{
    valid: boolean;
    inviterName?: string;
    inviterEmail?: string;
    error?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<InviteRewardResult | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);

  // 初始化邀请追踪
  useEffect(() => {
    const code = autoSetupInviteTracking();
    setInviteCode(code);
    setIsFromInvite(isUserFromInvite());

    if (code) {
      validateCurrentInviteCode(code);
    }
  }, []);

  // 用户登录后自动处理邀请奖励
  useEffect(() => {
    if (currentUser && inviteCode && !claimResult) {
      handleAutoClaimReward();
    }
  }, [currentUser, inviteCode]);

  // 验证邀请码
  const validateCurrentInviteCode = useCallback(async (code: string) => {
    setIsValidating(true);
    try {
      const validation = await validateInviteCode(code);
      setInviteValidation(validation);
    } catch (error) {
      console.error('验证邀请码失败:', error);
      setInviteValidation({
        valid: false,
        error: '验证邀请码时发生错误'
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  // 认领邀请奖励
  const handleClaimReward = useCallback(async (): Promise<InviteRewardResult> => {
    if (!currentUser || !inviteCode) {
      return { success: false, error: '用户未登录或没有邀请码' };
    }

    setIsClaiming(true);
    try {
      const result = await claimInviteReward(currentUser.id, inviteCode);
      setClaimResult(result);

      if (result.success) {
        setShowRewardModal(true);
        // 刷新用户点数
        window.location.reload();
      }

      return result;
    } catch (error) {
      console.error('认领邀请奖励失败:', error);
      const errorResult = {
        success: false,
        error: '认领邀请奖励时发生错误'
      };
      setClaimResult(errorResult);
      return errorResult;
    } finally {
      setIsClaiming(false);
    }
  }, [currentUser, inviteCode]);

  // 自动认领奖励（新用户注册后）
  const handleAutoClaimReward = useCallback(async () => {
    if (!currentUser || !inviteCode) return;

    // 检查是否已经处理过邀请奖励
    const hasClaimedBefore = localStorage.getItem(`invite_claimed_${currentUser.id}`);
    if (hasClaimedBefore) {
      return;
    }

    setIsClaiming(true);
    try {
      const result = await claimInviteReward(currentUser.id, inviteCode);
      setClaimResult(result);

      if (result.success) {
        setShowRewardModal(true);
        // 标记已处理
        localStorage.setItem(`invite_claimed_${currentUser.id}`, 'true');

        // 显示成功通知
        setTimeout(() => {
          setShowRewardModal(false);
        }, 5000);
      }
    } catch (error) {
      console.error('自动认领邀请奖励失败:', error);
    } finally {
      setIsClaiming(false);
    }
  }, [currentUser, inviteCode]);

  // 关闭奖励弹窗
  const closeRewardModal = useCallback(() => {
    setShowRewardModal(false);
  }, []);

  // 获取邀请统计
  const getStats = useCallback(async () => {
    if (!currentUser) return null;

    try {
      const stats = await getInviteStats(currentUser.id);
      return stats;
    } catch (error) {
      console.error('获取邀请统计失败:', error);
      return null;
    }
  }, [currentUser]);

  // 重置状态
  const reset = useCallback(() => {
    setInviteCode(null);
    setIsFromInvite(false);
    setInviteValidation(null);
    setClaimResult(null);
    setShowRewardModal(false);
  }, []);

  return {
    // 状态
    inviteCode,
    isFromInvite,
    inviteValidation,
    isValidating,
    isClaiming,
    claimResult,
    showRewardModal,

    // 方法
    validateInviteCode: validateCurrentInviteCode,
    claimReward: handleClaimReward,
    getStats,
    closeRewardModal,
    reset,

    // 计算属性
    isValidInvite: inviteValidation?.valid === true,
    inviterName: inviteValidation?.inviterName,
    hasClaimedReward: claimResult?.success === true,
    rewardPoints: claimResult?.pointsAwarded || 0,
    canClaimReward: currentUser && inviteCode && inviteValidation?.valid === true && !(claimResult?.success === true),
  };
}

export type UseInviteTrackingReturn = ReturnType<typeof useInviteTracking>;