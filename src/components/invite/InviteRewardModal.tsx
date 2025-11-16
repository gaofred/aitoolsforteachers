"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Trophy,
  Star,
  CheckCircle,
  Sparkles,
  Heart
} from "lucide-react";

interface InviteRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewardData: {
    pointsAwarded: number;
    basePoints?: number;
    bonusPoints?: number;
    inviterName?: string;
  } | null;
}

const InviteRewardModal = ({ isOpen, onClose, rewardData }: InviteRewardModalProps) => {
  // 自动关闭弹窗
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!rewardData) return null;

  const { pointsAwarded, basePoints, bonusPoints, inviterName } = rewardData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            🎉 恭喜获得邀请奖励！
          </DialogTitle>
          <DialogDescription className="text-lg">
            感谢您通过朋友的邀请加入我们！
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 奖励详情 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-6 w-6 text-yellow-500" />
              <span className="text-3xl font-bold text-purple-600">
                +{pointsAwarded}
              </span>
              <span className="text-lg text-gray-600">点数</span>
            </div>

            {/* 分解显示基础奖励和额外奖励 */}
            <div className="space-y-2 text-sm">
              {basePoints && (
                <div className="flex items-center justify-center gap-2">
                  <Gift className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-600">基础奖励:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    +{basePoints}点
                  </Badge>
                </div>
              )}

              {bonusPoints && bonusPoints > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-gray-600">里程碑奖励:</span>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    +{bonusPoints}点
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* 邀请者信息 */}
          {inviterName && (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-600">
                  感谢 <span className="font-semibold">{inviterName}</span> 的邀请
                </span>
              </div>
              <p className="text-xs text-gray-500">
                现在您可以开始使用Fred老师AI工具了！
              </p>
            </div>
          )}

          {/* 奖励说明 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-semibold text-green-800 mb-1">
                  奖励已发放到您的账户
                </h4>
                <p className="text-green-700">
                  点数已自动添加到您的余额中，可以立即使用所有AI工具功能。
                </p>
              </div>
            </div>
          </div>

          {/* 邀请其他朋友 */}
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              邀请更多朋友，获得更多点数奖励！
            </p>
            <Button
              onClick={() => {
                onClose();
                // 跳转到邀请页面
                window.location.href = '/invite';
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
            >
              <Gift className="h-4 w-4 mr-2" />
              我也要邀请朋友
            </Button>
          </div>

          {/* 关闭按钮 */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              稍后查看
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteRewardModal;