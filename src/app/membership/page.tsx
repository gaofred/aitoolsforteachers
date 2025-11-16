"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import { SupabasePointsService } from "@/lib/supabase-points-service";
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
  const [showRedeemModal, setShowRedeemModal] = useState(false); // 兑换码弹窗状态
  const [redemptionCode, setRedemptionCode] = useState(""); // 兑换码
  const [isRedeeming, setIsRedeeming] = useState(false); // 兑换状态
  const [showPurchaseModal, setShowPurchaseModal] = useState(false); // 购买确认弹窗状态
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null); // 选中的套餐

  useEffect(() => {
    fetchPlans();
    if (currentUser) {
      fetchMembershipStatus();
    }
  }, [currentUser]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/membership/plans');
      if (response.ok) {
        const data = await response.json();
        const rawPlans = data.plans || [];

        // 前端套餐处理：确保显示所有需要的套餐
        const seenTypes = new Set();
        const processedPlans = rawPlans.filter((plan: any) => {
          if (seenTypes.has(plan.plan_type)) {
            return false;
          }
          seenTypes.add(plan.plan_type);
          return true;
        });

        // 添加虚拟的Premium II套餐（55元90天期）
        const virtualPlans = [...processedPlans];
        if (virtualPlans.some(p => p.plan_type === 'PREMIUM')) {
          virtualPlans.push({
            id: 'virtual-premium-ii',
            plan_type: 'PREMIUM_II',
            name: 'Premium 会员II',
            daily_points: 500,
            points_cost: 5500,
            duration_days: 90,
            description: '享受500点数每日重置和更多特权，有效期90天',
            features: {
              daily_points: 500,
              priority_support: true,
              advanced_tools: true,
              plan_tier: 'premium_ii'
            },
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

        // 按照完美顺序排列：Premium I → Premium II → Pro
        const sortedPlans = virtualPlans.sort((a, b) => {
          const order = ['PREMIUM_I', 'PREMIUM', 'PREMIUM_II', 'PRO'];
          const aIndex = order.indexOf(a.plan_type);
          const bIndex = order.indexOf(b.plan_type);

          // 如果都不在order中，保持原顺序
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;

          return aIndex - bIndex;
        });

        setPlans(sortedPlans);
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

    // Premium会员通过外部链接购买，支持重复购买
    if (plan.plan_type === 'PREMIUM_I' || plan.plan_type === 'PREMIUM' || plan.plan_type === 'PRO') {
      handlePurchaseConfirmation(plan);
      return;
    }

    // Premium 会员 II 通过外部链接购买，跳转到不同的链接
    if (plan.plan_type === 'PREMIUM_II') {
      handlePurchaseConfirmation(plan);
      return;
    }

    // 其他会员通过数据库函数处理
    // 所有会员现在都免费激活，不需要检查点数
    // 积分检查逻辑已移除，因为购买不再消耗积分

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
        const result = data.data;
        if (result.isRenewal) {
          toast.success(`${getDisplayName(plan)}续费成功！积分增加${result.bonusPoints}，有效期延长${result.daysAdded}天`);
        } else {
          toast.success(`${getDisplayName(plan)}购买成功！积分增加${result.bonusPoints}，获得${result.totalDays}天会员资格`);
        }
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

  const handleRedeemCode = async () => {
    if (!redemptionCode.trim()) {
      toast.error('请输入兑换码');
      return;
    }
    if (!currentUser) {
      toast.error('请先登录后再使用兑换码');
      router.push('/auth/signin');
      return;
    }
    setIsRedeeming(true);

    try {
      // 使用API进行兑换，和首页保持一致
      const response = await fetch('/api/redemption-codes/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: redemptionCode.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 兑换成功，刷新用户信息
        await refreshUser();
        await fetchMembershipStatus();
        setRedemptionCode("");
        setShowRedeemModal(false);
        toast.success(data.message || '兑换成功！');
      } else {
        toast.error(data.error || data.message || '兑换失败，请检查兑换码是否正确');
      }
    } catch (error) {
      console.error('兑换失败:', error);
      toast.error('兑换失败，请检查兑换码是否正确');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handlePurchaseConfirmation = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = () => {
    if (!selectedPlan) return;

    // 获取购买链接
    let purchaseUrl = '';
    if (selectedPlan.plan_type === 'PRO') {
      purchaseUrl = 'https://appsryewio94072.h5.xiaoeknow.com/p/course/ecourse/course_34xD5WzLU4DEVmW6ZR9vuYAC5M9';
    } else if (selectedPlan.plan_type === 'PREMIUM_I' || selectedPlan.plan_type === 'PREMIUM') {
      purchaseUrl = 'https://appsryewio94072.h5.xiaoeknow.com/p/course/ecourse/course_34xCPkOtB3gGfSJRAf1xGRP8puy';
    } else if (selectedPlan.plan_type === 'PREMIUM_II') {
      purchaseUrl = 'https://appsryewio94072.h5.xiaoeknow.com/p/course/ecourse/course_34xCqjfakZ402KhSqBgkJj3hjNF';
    }

    if (purchaseUrl) {
      // 在新标签页打开购买链接
      window.open(purchaseUrl, '_blank', 'noopener,noreferrer');
      toast.success('已打开购买页面，请在新页面完成购买');
    }

    setShowPurchaseModal(false);
    setSelectedPlan(null);
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'PRO':
        return 'purple';
      case 'PREMIUM':
      case 'PREMIUM_I':
      case 'PREMIUM_II':
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
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">会员中心</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">升级会员，享受更多特权</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {currentUser ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-purple-50 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-purple-200">
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                    <span className="text-xs sm:text-sm text-purple-700 font-medium">{userPoints}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 hidden sm:block max-w-24 truncate">{currentUser.email}</span>
                  <span className="text-xs sm:text-sm text-gray-600 sm:hidden">用户</span>
                </div>
              ) : (
                <Link href="/auth/signin">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-sm px-3 py-1.5 sm:px-4 sm:py-2">
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

        {/* 兑换码入口 - 移动到套餐上方 */}
        <Card className="mb-8">
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
                onClick={() => setShowRedeemModal(true)}
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                兑换码兑换
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 体验包购买入口 */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-green-900">200点数体验包</h3>
                <p className="text-sm sm:text-base text-green-700">适合初次体验，点数充足</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-green-900">¥10</div>
                <div className="text-xs sm:text-sm text-green-600">一次性购买</div>
              </div>
              <Button
                onClick={() => {
                  window.open('https://appsryewio94072.h5.xiaoeknow.com/p/course/ecourse/course_35BqDrqaDJLvxwujCh7BP0p5QJz', '_blank');
                  toast.success('已打开体验包购买页面，请在新页面完成购买');
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 min-w-[100px] sm:min-w-[120px]"
              >
                立即购买
              </Button>
            </div>
          </div>
        </div>

      {/* 兑换码提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 sm:mb-8">
          <div className="flex items-center justify-center">
            <span className="text-blue-800 text-center">
              <p className="text-base sm:text-lg font-medium">
                🎁 购买后，记得找网站作者：<span className="font-bold">Fred老师</span>（微信号 <span className="font-mono bg-blue-100 px-2 py-1 rounded">fredgaouom</span>）领取会员兑换码
              </p>
            </span>
          </div>
        </div>

        {/* 会员套餐展示 */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">选择您的会员套餐</h2>
          <p className="text-base sm:text-lg text-gray-600 px-4 sm:px-0">升级会员，享受每日可使用点数和更多特权</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          {plans.map((plan, index) => {
            const color = getPlanColor(plan.plan_type);
            const isCurrentPlan = membershipStatus?.plan_type === plan.plan_type;

            // 根据套餐类型确定显示名称
            const getDisplayName = (plan: any) => {
              if (plan.plan_type === 'PRO') return 'Pro会员';
              if (plan.plan_type === 'PREMIUM_I') return 'Premium 会员I';
              if (plan.plan_type === 'PREMIUM_II') return 'Premium 会员 II';
              if (plan.plan_type === 'PREMIUM') return 'Premium 会员'; // 原始的PREMIUM套餐
              return plan.name;
            };

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  isCurrentPlan ? 'ring-2 ring-' + color + '-500' : ''
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-2.5 sm:-top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className={`bg-${color}-500 text-white text-xs sm:text-sm px-2 py-1`}>
                      当前套餐
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2 sm:pb-4 px-3 sm:px-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-${color}-100 to-${color}-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Crown className={`w-6 h-6 sm:w-8 sm:h-8 text-${color}-600`} />
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">
                    {getDisplayName(plan)}
                  </CardTitle>
                  <div className="mt-1 sm:mt-2">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {plan.daily_points}
                    </span>
                    <span className="text-sm sm:text-base text-gray-600 ml-1 sm:ml-2">点数/天</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 px-3 sm:px-6">
                          <div className="text-center mb-4 sm:mb-6">
                    <div className="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2">购买价格</div>
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      {/* Premium会员I 显示折扣价格 */}
                      {(plan.plan_type === 'PREMIUM_I' || plan.plan_type === 'PREMIUM') ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <div className="flex items-baseline justify-center">
                            <span className="text-2xl sm:text-3xl font-bold text-red-600">¥20</span>
                            <span className="text-base sm:text-lg text-gray-400 line-through ml-1.5 sm:ml-2">¥25</span>
                          </div>
                          <div className="relative sm:mt-0 mt-1 inline-block">
                            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs sm:text-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-bold flex items-center gap-0.5 sm:gap-1 animate-pulse">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                              <span className="whitespace-nowrap">直降16%</span>
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                            </div>
                            <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-red-500 hidden sm:block"></div>
                          </div>
                        </div>
                      ) : plan.plan_type === 'PREMIUM_II' ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <span className="text-xl sm:text-2xl font-bold text-blue-600">¥52</span>
                          <div className="relative sm:mt-0 mt-1 inline-block">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs sm:text-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-bold flex items-center gap-0.5 sm:gap-1 animate-pulse">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="whitespace-nowrap">超值之选</span>
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-blue-500 hidden sm:block"></div>
                          </div>
                        </div>
                      ) : plan.plan_type === 'PRO' ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <span className="text-xl sm:text-2xl font-bold text-purple-600">¥169</span>
                          <div className="relative sm:mt-0 mt-1 inline-block">
                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs sm:text-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-bold flex items-center gap-0.5 sm:gap-1 animate-pulse">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 3v4M3 5h4M6 17v4m-2 2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21" />
                              </svg>
                              <span className="whitespace-nowrap">尊享体验</span>
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 3v4M3 5h4M6 17v4m-2 2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21" />
                              </svg>
                            </div>
                            <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-purple-500 hidden sm:block"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xl sm:text-2xl font-bold text-gray-900">
                            {plan.points_cost / 100}
                          </span>
                          <span className="text-sm sm:text-base text-gray-600">元</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full inline-block mt-2">
                      {(() => {
                        if (plan.plan_type === 'PREMIUM_I' || plan.plan_type === 'PREMIUM') return '30天期';
                        if (plan.plan_type === 'PREMIUM_II') return '90天期';
                        if (plan.plan_type === 'PRO') return '365天期';
                        return '';
                      })()}
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-700">
                        每日可使用 {plan.daily_points} 点
                      </span>
                    </div>
                    {plan.features.priority_support && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-gray-700">专属微信群</span>
                      </div>
                    )}
                    {plan.features.advanced_tools && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-gray-700">支持更高阶AI大模型</span>
                      </div>
                    )}
                    {plan.features.beta_access && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-gray-700">Beta功能抢先体验</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 text-center leading-relaxed">
                    {plan.description}
                  </p>

                  <Button
                    onClick={() => handlePurchase(plan)}
                    disabled={isPurchasing === plan.plan_type}
                    className={`w-full text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 bg-${color}-600 hover:bg-${color}-700 text-white`}
                  >
                    {isPurchasing === plan.plan_type ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        购买中...
                      </span>
                    ) : isCurrentPlan ? (
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        再次购买
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        立即购买
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 会员特权对比 */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg">
          <CardHeader className="px-6 sm:px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
            <CardTitle className="text-xl sm:text-2xl font-bold text-white text-center flex items-center justify-center gap-2">
              <span className="text-2xl sm:text-3xl">💎</span>
              会员特权对比
              <span className="text-2xl sm:text-3xl">📊</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* 桌面端表格 */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">特权</th>
                    <th className="text-center py-3 px-4">FREE</th>
                    <th className="text-center py-3 px-4">Premium I</th>
                    <th className="text-center py-3 px-4">Premium II</th>
                    <th className="text-center py-3 px-4">PRO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4">每日点数</td>
                    <td className="text-center py-3 px-4">25 点</td>
                    <td className="text-center py-3 px-4">500 点</td>
                    <td className="text-center py-3 px-4">500 点</td>
                    <td className="text-center py-3 px-4">800 点</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">有效期</td>
                    <td className="text-center py-3 px-4">永久</td>
                    <td className="text-center py-3 px-4">30 天</td>
                    <td className="text-center py-3 px-4">90 天</td>
                    <td className="text-center py-3 px-4">365 天</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">购买价格</td>
                    <td className="text-center py-3 px-4">免费</td>
                    <td className="text-center py-3 px-4">20元</td>
                    <td className="text-center py-3 px-4">52元</td>
                    <td className="text-center py-3 px-4">169元</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">专属微信群</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">支持更高阶AI大模型</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Beta功能抢先体验</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">❌</td>
                    <td className="text-center py-3 px-4">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 移动端卡片式对比 */}
            <div className="lg:hidden space-y-4">
              {/* FREE 套餐 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">FREE</h3>
                  <div className="text-sm text-gray-500">免费用户</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">每日点数</span>
                    <span className="font-medium">25 点</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">有效期</span>
                    <span className="font-medium">永久</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">购买价格</span>
                    <span className="font-medium text-green-600">免费</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">专属微信群</span>
                    <span className="text-red-500">❌</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">支持更高阶AI大模型</span>
                    <span className="text-red-500">❌</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Beta功能抢先体验</span>
                    <span className="text-red-500">❌</span>
                  </div>
                </div>
              </div>

              {/* Premium I 套餐 */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900 text-lg">Premium I</h3>
                  <div className="text-sm text-blue-600 font-medium">30天期</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">每日点数</span>
                    <span className="font-medium text-blue-600">500 点</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">有效期</span>
                    <span className="font-medium">30 天</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">购买价格</span>
                    <span className="font-medium text-blue-600">20元</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">专属微信群</span>
                    <span className="text-green-500">✅</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">支持更高阶AI大模型</span>
                    <span className="text-green-500">✅</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Beta功能抢先体验</span>
                    <span className="text-red-500">❌</span>
                  </div>
                </div>
              </div>

              {/* Premium II 套餐 */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900 text-lg">Premium II</h3>
                  <div className="text-sm text-blue-600 font-medium">90天期</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">每日点数</span>
                    <span className="font-medium text-blue-600">500 点</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">有效期</span>
                    <span className="font-medium">90 天</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">购买价格</span>
                    <span className="font-medium text-blue-600">52元</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">专属微信群</span>
                    <span className="text-green-500">✅</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100">
                    <span className="text-sm text-gray-600">支持更高阶AI大模型</span>
                    <span className="text-green-500">✅</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Beta功能抢先体验</span>
                    <span className="text-red-500">❌</span>
                  </div>
                </div>
              </div>

              {/* PRO 套餐 */}
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-purple-900 text-lg">PRO</h3>
                  <div className="text-sm text-purple-600 font-medium">365天期</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-purple-100">
                    <span className="text-sm text-gray-600">每日点数</span>
                    <span className="font-medium text-purple-600">800 点</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-purple-100">
                    <span className="text-sm text-gray-600">有效期</span>
                    <span className="font-medium">365 天</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-purple-100">
                    <span className="text-sm text-gray-600">购买价格</span>
                    <span className="font-medium text-purple-600">169元</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-purple-100">
                    <span className="text-sm text-gray-600">专属微信群</span>
                    <span className="text-green-500">✅</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-purple-100">
                    <span className="text-sm text-gray-600">支持更高阶AI大模型</span>
                    <span className="text-green-500">✅</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Beta功能抢先体验</span>
                    <span className="text-green-500">✅</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 兑换码弹窗 */}
        {showRedeemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 sm:p-6 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">兑换码兑换</h3>
                <button
                  onClick={() => setShowRedeemModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    兑换码
                  </label>
                  <input
                    type="text"
                    value={redemptionCode}
                    onChange={(e) => setRedemptionCode(e.target.value)}
                    placeholder="请输入兑换码"
                    className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    disabled={isRedeeming}
                  />
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowRedeemModal(false)}
                    disabled={isRedeeming}
                    className="flex-1 text-sm sm:text-base px-3 py-2"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleRedeemCode}
                    disabled={isRedeeming || !redemptionCode.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-base px-3 py-2"
                  >
                    {isRedeeming ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        兑换中
                      </>
                    ) : (
                      '兑换'
                    )}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
                兑换成功后点数或会员权益将自动添加到您的账户
              </div>
            </div>
          </div>
        )}

        {/* 购买确认弹窗 */}
        {showPurchaseModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6 lg:p-8 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto transform transition-all">
              <div className="text-center mb-4 sm:mb-6">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-${getPlanColor(selectedPlan.plan_type)}-100 to-${getPlanColor(selectedPlan.plan_type)}-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4`}>
                  <Crown className={`w-8 h-8 sm:w-10 sm:h-10 text-${getPlanColor(selectedPlan.plan_type)}-600`} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  确认购买
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {selectedPlan.plan_type === 'PRO' ? 'Pro会员' :
                   selectedPlan.plan_type === 'PREMIUM_I' ? 'Premium会员I' :
                   selectedPlan.plan_type === 'PREMIUM_II' ? 'Premium 会员 II' :
                   selectedPlan.plan_type === 'PREMIUM' ? 'Premium会员' : selectedPlan.name}
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs sm:text-sm text-gray-600">套餐价格</span>
                  {/* Premium会员I 显示折扣价格 */}
                  {selectedPlan.plan_type === 'PREMIUM_I' || selectedPlan.plan_type === 'PREMIUM' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-baseline justify-center sm:justify-start">
                        <span className="text-xl sm:text-2xl font-bold text-red-600">¥20</span>
                        <span className="text-sm sm:text-base text-gray-400 line-through ml-1.5 sm:ml-2">¥25</span>
                      </div>
                      <div className="relative sm:mt-0 mt-1 inline-block">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-bold flex items-center gap-0.5 sm:gap-1 animate-pulse">
                          <svg className="w-3 h-3 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          <span className="whitespace-nowrap">直降16%</span>
                          <svg className="w-3 h-3 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500 hidden sm:block"></div>
                      </div>
                    </div>
                  ) : selectedPlan.plan_type === 'PREMIUM_II' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="text-lg sm:text-xl font-bold text-blue-600">¥52</span>
                      <div className="relative sm:mt-0 mt-1 inline-block">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-bold flex items-center gap-0.5 sm:gap-1 animate-pulse">
                          <svg className="w-3 h-3 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="whitespace-nowrap">超值之选</span>
                          <svg className="w-3 h-3 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-blue-500 hidden sm:block"></div>
                      </div>
                    </div>
                  ) : selectedPlan.plan_type === 'PRO' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <span className="text-lg sm:text-xl font-bold text-purple-600">¥169</span>
                      <div className="relative sm:mt-0 mt-1 inline-block">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-bold flex items-center gap-0.5 sm:gap-1 animate-pulse">
                          <svg className="w-3 h-3 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 3v4M3 5h4M6 17v4m-2 2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21" />
                          </svg>
                          <span className="whitespace-nowrap">尊享体验</span>
                          <svg className="w-3 h-3 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 3v4M3 5h4M6 17v4m-2 2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21" />
                          </svg>
                        </div>
                        <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-500 hidden sm:block"></div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-lg sm:text-xl font-bold text-gray-900">
                      0元
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs sm:text-sm text-gray-600">有效期</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {selectedPlan.plan_type === 'PRO' ? '365天' :
                     selectedPlan.plan_type === 'PREMIUM_I' || selectedPlan.plan_type === 'PREMIUM' ? '30天' :
                     selectedPlan.plan_type === 'PREMIUM_II' ? '90天' : '永久'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">每日点数</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{selectedPlan.daily_points}点</span>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700">每日点数自动重置</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700">专属微信群支持</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-700">支持更高阶AI大模型</span>
                </div>
                {selectedPlan.plan_type === 'PRO' && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-700">Beta功能抢先体验</span>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 sm:mb-6">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                    即将跳转到官方购买页面完成支付
                  </span>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setSelectedPlan(null);
                  }}
                  className="flex-1 text-sm sm:text-base px-3 py-2"
                >
                  取消
                </Button>
                <Button
                  onClick={confirmPurchase}
                  className={`flex-1 bg-${getPlanColor(selectedPlan.plan_type)}-600 hover:bg-${getPlanColor(selectedPlan.plan_type)}-700 text-white text-sm sm:text-base px-3 py-2`}
                >
                  确认购买
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}