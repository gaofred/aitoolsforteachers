"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import { useInviteTracking } from "@/hooks/useInviteTracking";
import QRCodeGenerator from "@/components/invite/QRCodeGenerator";
import InviteRewardModal from "@/components/invite/InviteRewardModal";
import {
  Gift,
  Users,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Crown,
  Sparkles,
  PartyPopper,
  Home
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthRedirect } from "@/lib/auth-redirect";

interface InvitationStats {
  totalInvitations: number;
  successfulInvitations: number;
  totalRewardsEarned: number;
  pendingRegistrations: number;
  completedInvitations: number;
}

interface Invitation {
  id: string;
  invited_email: string;
  status: 'pending' | 'registered' | 'completed';
  invited_user: {
    name: string;
    email: string;
    created_at: string;
  } | null;
  created_at: string;
}

const InvitePage = () => {
  const { currentUser } = useUser();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('invite_code');
  const router = useRouter();
  const { redirectToLogin } = useAuthRedirect();

  // 使用邀请追踪Hook
  const inviteTracking = useInviteTracking();

  const [invitationCode, setInvitationCode] = useState<string>("");
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [stats, setStats] = useState<InvitationStats>({
    totalInvitations: 0,
    successfulInvitations: 0,
    totalRewardsEarned: 0,
    pendingRegistrations: 0,
    completedInvitations: 0
  });
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // 获取或生成邀请码
  useEffect(() => {
    if (currentUser?.id) {
      fetchOrCreateInvitationCode();
    }
  }, [currentUser]);

  const fetchOrCreateInvitationCode = async () => {
    if (!currentUser?.id) return;

    setIsLoading(true);
    try {
      // 先尝试获取现有的邀请信息
      const response = await fetch(`/api/invite?userId=${currentUser.id}`);
      const data = await response.json();

      if (data.success) {
        // 如果有统计数据，说明已有邀请码
        if (data.data.stats) {
          setStats(data.data.stats);
          setInvitations(data.data.invitations || []);
        }

        // 如果API返回了已有邀请码，直接使用
        if (data.data.invitationCode && data.data.inviteUrl) {
          console.log('使用已有邀请码:', data.data.invitationCode);
          setInvitationCode(data.data.invitationCode);
          setInviteUrl(data.data.inviteUrl);
        } else {
          // 没有邀请码时才生成新的
          console.log('没有找到已有邀请码，生成新的');
          await generateInvitationCode();
        }
      }
    } catch (error) {
      console.error("获取邀请信息失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInvitationCode = async () => {
    if (!currentUser?.id) {
      console.error("用户未登录或用户ID无效");
      return;
    }

    console.log("开始生成邀请码，用户ID:", currentUser.id);
    setIsGeneratingCode(true);

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      const data = await response.json();

      if (data.success) {
        setInvitationCode(data.data.invitationCode);
        setInviteUrl(data.data.inviteUrl);
        console.log("邀请码生成成功:", data.data);
      } else {
        console.error("生成邀请码失败:", data.error);
        // 在前端显示错误信息
        alert("生成邀请码失败: " + data.error);
      }
    } catch (error) {
      console.error("生成邀请码失败:", error);
      alert("生成邀请码失败，请检查网络连接");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // 如果用户未登录，显示登录提示
  if (!currentUser) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Gift className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              加入邀请有礼活动
            </h2>
            <p className="text-gray-600 mb-6">
              请先登录后即可生成您的专属邀请码，开始邀请朋友获得点数奖励！
            </p>
            <Button
              onClick={() => redirectToLogin()}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              立即登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 max-w-6xl">
      {/* 返回主页按钮 */}
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/')}
          className="flex items-center gap-2 hover:bg-gray-50"
        >
          <Home className="w-4 h-4" />
          <span>返回主页</span>
        </Button>
      </div>

      {/* 头部 - 移动端优化 */}
      <div className="text-center mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">
          Fred老师AI辅助英语教学网站限时优惠活动！
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600">
          分享Fred老师AI工具，邀请朋友一起获得丰厚奖励！
        </p>
      </div>

      {/* 活动亮点 - 移动端优先展示 */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        {/* 桌面端一行三列，更紧凑的布局 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            <Card className="text-center bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-2 sm:p-3 lg:p-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-12 lg:h-12 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6 lg:h-6 lg:w-6 text-purple-700" />
                </div>
                <h3 className="font-bold text-sm sm:text-base lg:text-base mb-1 text-purple-800">10人里程碑</h3>
                <p className="text-sm sm:text-base lg:text-base font-bold text-purple-700 mb-1">300+50=350点数</p>
                <p className="text-xs sm:text-sm text-gray-700">成功邀请10位朋友</p>
              </CardContent>
            </Card>

            <Card className="text-center bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-2 sm:p-3 lg:p-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-12 lg:h-12 bg-amber-200 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 lg:h-6 lg:w-6 text-amber-700" />
                </div>
                <h3 className="font-bold text-sm sm:text-base lg:text-base mb-1 text-amber-800">20人里程碑</h3>
                <p className="text-sm sm:text-base lg:text-base font-bold text-amber-700 mb-1">600+100=700点数</p>
                <p className="text-xs sm:text-sm text-gray-700">成功邀请20位朋友</p>
              </CardContent>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-2 sm:p-3 lg:p-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-12 lg:h-12 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <Gift className="h-5 w-5 sm:h-6 sm:w-6 lg:h-6 lg:w-6 text-green-700" />
                </div>
                <h3 className="font-bold text-sm sm:text-base lg:text-base mb-1 text-green-800">基础奖励</h3>
                <p className="text-base sm:text-lg lg:text-lg font-bold text-green-600 mb-1">30点数/人</p>
                <p className="text-xs sm:text-sm text-gray-700">每邀请一位新用户</p>
              </CardContent>
            </Card>
          </div>
      </div>

      {/* 主要内容 */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在加载邀请信息...</p>
          </CardContent>
        </Card>
      ) : invitationCode ? (
        <QRCodeGenerator
          invitationCode={invitationCode}
          inviteUrl={inviteUrl}
          inviterName={currentUser.name || undefined}
          stats={stats}
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              开始邀请朋友
            </h2>
            <p className="text-gray-600 mb-6">
              点击下方按钮生成您的专属邀请码
            </p>
            <Button
              onClick={generateInvitationCode}
              disabled={isGeneratingCode}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {isGeneratingCode ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  生成我的邀请码
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 邀请记录 */}
      {invitations.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              最近邀请记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.slice(0, 10).map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {invitation.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Users className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {invitation.invited_user?.name || invitation.invited_email || '匿名用户'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      invitation.status === 'completed'
                        ? 'default'
                        : invitation.status === 'registered'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {invitation.status === 'completed'
                      ? '已完成'
                      : invitation.status === 'registered'
                      ? '已注册'
                      : '待注册'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 邀请奖励弹窗 */}
      <InviteRewardModal
        isOpen={inviteTracking.showRewardModal}
        onClose={inviteTracking.closeRewardModal}
        rewardData={inviteTracking.claimResult ? {
          pointsAwarded: inviteTracking.claimResult.pointsAwarded,
          basePoints: inviteTracking.claimResult.basePoints,
          bonusPoints: inviteTracking.claimResult.bonusPoints,
          inviterName: inviteTracking.claimResult.inviterName
        } : null}
      />
    </div>
  );
};

function InvitePageWrapper() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6 max-w-4xl"><div className="text-center p-12">加载中...</div></div>}>
      <InvitePage />
    </Suspense>
  );
}

export default InvitePageWrapper;