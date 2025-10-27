"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Download,
  Share2,
  QrCode,
  Users,
  Gift,
  CheckCircle,
  Link as LinkIcon
} from "lucide-react";

interface QRCodeGeneratorProps {
  invitationCode: string;
  inviteUrl: string;
  inviterName?: string;
  stats?: {
    totalInvitations: number;
    successfulInvitations: number;
    totalRewardsEarned: number;
  };
}

const QRCodeGenerator = ({
  invitationCode,
  inviteUrl,
  inviterName = "Fred老师",
  stats = {
    totalInvitations: 0,
    successfulInvitations: 0,
    totalRewardsEarned: 0
  }
}: QRCodeGeneratorProps) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // 生成二维码
  useEffect(() => {
    const generateQRCode = async () => {
      setIsGenerating(true);
      try {
        const options = {
          width: 256,
          margin: 2,
          color: {
            dark: "#1e40af", // 深蓝色
            light: "#ffffff",
          },
          errorCorrectionLevel: 'M' as const,
        };

        const dataUrl = await QRCode.toDataURL(inviteUrl, options);
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error("生成二维码失败:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    if (inviteUrl) {
      generateQRCode();
    }
  }, [inviteUrl]);

  // 复制邀请链接
  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  // 下载二维码
  const downloadQRCode = () => {
    const link = document.createElement("a");
    link.download = `邀请二维码_${inviterName}.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 分享功能
  const shareInvite = async () => {
    const shareText = `🎉 Fred老师AI网站优惠活动！\n每邀请一位新朋友，可获得30点数！\n邀请10位获得100点数，20位获得300点数！\n\n我的邀请链接：${inviteUrl}`;

    try {
      // 检查是否支持Web Share API（移动设备）
      if (typeof navigator !== 'undefined' && navigator.share && /mobile/i.test(navigator.userAgent)) {
        await navigator.share({
          title: "Fred老师AI网站邀请",
          text: "Fred老师AI网站优惠活动！快来体验专业的英语教学AI工具！",
          url: inviteUrl,
        });
      } else {
        // 降级方案：复制到剪贴板
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } else {
          // 兼容IE和其他旧浏览器的降级方案
          const textArea = document.createElement("textarea");
          textArea.value = shareText;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          } catch (err) {
            console.error("复制失败:", err);
            alert("链接复制失败，请手动复制：\n" + inviteUrl);
          }

          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error("分享失败:", error);
      alert("分享失败，请手动复制链接：\n" + inviteUrl);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 头部说明 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Fred老师AI网站优惠活动！
            </h2>
            <p className="text-lg text-gray-700">
              每邀请一位新朋友，可获得<span className="font-bold text-purple-600">30点数</span>！
            </p>
            <p className="text-md text-gray-600">
              邀请<span className="font-bold text-blue-600">10位</span>：300点数+100点数=<span className="font-bold text-purple-600">400点数</span>！
            </p>
            <p className="text-sm text-gray-500 mt-1">
              邀请<span className="font-bold text-amber-600">20位</span>：600点数+300点数=<span className="font-bold text-purple-600">900点数</span>！
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* 左侧：二维码 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              我的邀请二维码
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 二维码展示 */}
            <div className="flex justify-center">
              {isGenerating ? (
                <div className="w-56 h-56 sm:w-64 sm:h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : qrCodeDataUrl ? (
                <div className="relative group">
                  <img
                    src={qrCodeDataUrl}
                    alt="邀请二维码"
                    className="w-56 h-56 sm:w-64 sm:h-64 rounded-lg shadow-lg group-hover:shadow-xl transition-shadow"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                    <Button
                      onClick={downloadQRCode}
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                  二维码生成失败
                </div>
              )}
            </div>

            {/* 邀请码显示 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">邀请码：</div>
              <div className="font-mono text-xs sm:text-sm font-bold text-blue-600 text-center break-all">
                {invitationCode}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-2 sm:space-y-3">
              <Button
                onClick={copyInviteLink}
                className="w-full"
                variant="outline"
                size="sm"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    已复制到剪贴板
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    复制邀请链接
                  </>
                )}
              </Button>

              <Button
                onClick={shareInvite}
                className="w-full"
                variant="outline"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    分享内容已复制
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 mr-2" />
                    复制分享内容
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 右侧：邀请统计和说明 */}
        <div className="space-y-6">
          {/* 邀请统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                我的邀请统计
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {stats.successfulInvitations}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">成功邀请</div>
                </div>
                <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600">
                    {stats.totalRewardsEarned}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">获得点数</div>
                </div>
              </div>

              {/* 进度条 */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>邀请进度</span>
                  <span>{stats.successfulInvitations}/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((stats.successfulInvitations / 10) * 100, 100)}%`
                    }}
                  />
                </div>
                {stats.successfulInvitations < 10 && (
                  <div className="text-xs text-gray-600">
                    再邀请 {10 - stats.successfulInvitations} 位朋友，即可获得100点数奖励！
                  </div>
                )}
                {stats.successfulInvitations >= 10 && stats.successfulInvitations < 20 && (
                  <div className="text-xs text-amber-600">
                    再邀请 {20 - stats.successfulInvitations} 位朋友，即可获得300点数奖励！
                  </div>
                )}
                {stats.successfulInvitations >= 20 && (
                  <div className="text-xs text-green-600 font-semibold">
                    🎉 恭喜！您已达成所有里程碑奖励！
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 奖励规则 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                奖励规则
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="bg-green-100 text-green-800 mt-1">基础奖励</Badge>
                <div className="text-sm text-gray-700">
                  每成功邀请1位新用户注册，获得30点数
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-purple-100 text-purple-800 mt-1">里程碑奖励</Badge>
                <div className="text-sm text-gray-700">
                  邀请满10位朋友：基础300点数+额外100点数=总计400点数
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-amber-100 text-amber-800 mt-1">高级里程碑</Badge>
                <div className="text-sm text-gray-700">
                  邀请满20位朋友：基础600点数+额外300点数=总计900点数
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-100 text-blue-800 mt-1">活动规则</Badge>
                <div className="text-sm text-gray-700">
                  新用户需完成注册流程，邀请者即可获得奖励
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 邀请链接 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                邀请链接
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-3 rounded-lg break-all">
                <code className="text-xs text-blue-600">{inviteUrl}</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;