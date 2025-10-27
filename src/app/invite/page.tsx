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
  PartyPopper
} from "lucide-react";
import { useRouter } from "next/navigation";

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

        // 生成或获取邀请码
        if (!invitationCode) {
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
              onClick={() => router.push('/auth/signin')}
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
    <div className="container mx-auto p-6 max-w-6xl">
      {/* 头部 */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          邀请有礼
        </h1>
        <p className="text-xl text-gray-600">
          分享Fred老师AI工具，邀请朋友一起获得丰厚奖励！
        </p>
      </div>

      {/* 活动亮点 */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">30点数/人</h3>
            <p className="text-sm text-gray-600">每成功邀请一位新用户注册</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">额外300点数</h3>
            <p className="text-sm text-gray-600">成功邀请10位朋友</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">无上限邀请</h3>
            <p className="text-sm text-gray-600">邀请越多，奖励越丰厚</p>
          </CardContent>
        </Card>
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