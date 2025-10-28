"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import { Crown, Star, Gift, Clock, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface MembershipPlan {
  id: string;
  plan_type: string;
  name: string;
  daily_points: number;
  points_cost: number;
  duration_days: number;
  description: string;
  features: {
    daily_points: number;
    priority_support: boolean;
    advanced_tools: boolean;
    beta_access?: boolean;
  };
  is_active: boolean;
}

interface MembershipStatus {
  is_member: boolean;
  plan_type: string;
  daily_points: number;
  expires_at: string;
  days_remaining: number;
}

export default function MembershipPage() {
  const router = useRouter();
  const { currentUser, userPoints, refreshUser } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/signin');
      return;
    }

    fetchPlans();
    fetchMembershipStatus();
  }, [currentUser]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/membership/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('获取会员套餐失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembershipStatus = async () => {
    try {
      const response = await fetch('/api/membership/status');
      if (response.ok) {
        const data = await response.json();
        setMembershipStatus(data.data?.membership);
      }
    } catch (error) {
      console.error('获取会员状态失败:', error);
    }
  };

  const handlePurchase = async (plan: MembershipPlan) => {
    if (!currentUser) {
      toast.error('请先登录');
      router.push('/auth/signin');
      return;
    }

    if (userPoints < plan.points_cost) {
      toast.error(`点数不足，需要 ${plan.points_cost} 点数，当前剩余 ${userPoints} 点数`);
      return;
    }

    setIsPurchasing(plan.plan_type);

    try {
      const response = await fetch('/api/membership/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: plan.plan_type,
          pointsCost: plan.points_cost,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`成功购买 ${plan.name}！`);
        await refreshUser();
        await fetchMembershipStatus();
      } else {
        toast.error(data.error || '购买失败');
      }
    } catch (error) {
      console.error('购买会员失败:', error);
      toast.error('购买失败，请重试');
    } finally {
      setIsPurchasing(null);
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'PRO':
        return 'purple';
      case 'PREMIUM':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-purple-600 animate-pulse" />
          </div>
          <p className="text-gray-600">正在加载会员中心...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">会员中心</h1>
                <p className="text-sm text-gray-500">升级会员，享受更多特权</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
                    <Star className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-700 font-medium">{userPoints}</span>
                  </div>
                  <span className="text-sm text-gray-600">{currentUser.email}</span>
                </div>
              ) : (
                <Link href="/auth/signin">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    登录
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 当前会员状态 */}
        {membershipStatus?.is_member && (
          <Card className="mb-8 bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {membershipStatus.plan_type} 会员
                    </h3>
                    <p className="text-sm text-gray-600">
                      每日点数：{membershipStatus.daily_points} |
                      到期时间：{formatDate(membershipStatus.expires_at)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={`bg-${
                    membershipStatus.plan_type === 'PRO' ? 'purple' : 'blue'
                  }-100 text-${
                    membershipStatus.plan_type === 'PRO' ? 'purple' : 'blue'
                  }-700`}
                >
                  {membershipStatus.days_remaining > 0
                    ? `剩余 ${membershipStatus.days_remaining} 天`
                    : '已过期'
                  }
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 会员套餐展示 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">选择您的会员套餐</h2>
          <p className="text-lg text-gray-600">升级会员，享受每日点数重置和更多特权</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const color = getPlanColor(plan.plan_type);
            const isCurrentPlan = membershipStatus?.plan_type === plan.plan_type;
            const canAfford = userPoints >= plan.points_cost;

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isCurrentPlan ? 'ring-2 ring-' + color + '-500' : ''
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className={`bg-${color}-500 text-white`}>
                      当前套餐
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-${color}-100 to-${color}-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className={`w-8 h-8 text-${color}-600`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.daily_points}
                    </span>
                    <span className="text-gray-600 ml-2">点数/天</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    有效期：{plan.duration_days} 天
                  </p>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="text-center mb-6">
                    <div className="text-sm text-gray-500 mb-2">购买价格</div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {plan.points_cost}
                      </span>
                      <span className="text-gray-600">点数</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">
                        每日点数重置 {plan.daily_points} 点
                      </span>
                    </div>
                    {plan.features.priority_support && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">优先客服支持</span>
                      </div>
                    )}
                    {plan.features.advanced_tools && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">高级工具特权</span>
                      </div>
                    )}
                    {plan.features.beta_access && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">Beta功能抢先体验</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-6 text-center">
                    {plan.description}
                  </p>

                  <Button
                    onClick={() => handlePurchase(plan)}
                    disabled={isPurchasing === plan.plan_type || !canAfford || isCurrentPlan}
                    className={`w-full ${
                      isCurrentPlan
                        ? 'bg-gray-300 cursor-not-allowed'
                        : canAfford
                        ? `bg-${color}-600 hover:bg-${color}-700`
                        : 'bg-gray-300 cursor-not-allowed'
                    } text-white`}
                  >
                    {isPurchasing === plan.plan_type ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        购买中...
                      </span>
                    ) : isCurrentPlan ? (
                      '当前套餐'
                    ) : canAfford ? (
                      <span className="flex items-center gap-2">
                        立即购买
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    ) : (
                      `点数不足 (需要 ${plan.points_cost} 点)`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 会员特权对比 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              会员特权对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">特权</th>
                    <th className="text-center py-3 px-4">FREE</th>
                    <th className="text-center py-3 px-4">PREMIUM</th>
                    <th className="text-center py-3 px-4">PRO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">每日点数</td>
                    <td className="text-center py-3 px-4">25 点</td>
                    <td className="text-center py-3 px-4">500 点</td>
                    <td className="text-center py-3 px-4">800 点</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">优先客服支持</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">高级工具特权</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Beta功能抢先体验</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 兑换码入口 */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">拥有兑换码？</h3>
                  <p className="text-sm text-gray-600">使用兑换码获得会员或点数</p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/redeem')}
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                兑换码兑换
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}