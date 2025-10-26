"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import Link from "next/link";

export default function ClozeVocabularyOrganisePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [text, setText] = useState("");
  const [isOrganising, setIsOrganising] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [isCopying, setIsCopying] = useState(false);

  // OCR states - 新增拍照和图片识别功能
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  
  // 拍照功能函数
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (e) {
      console.error('摄像头访问失败:', e);
      alert('无法访问摄像头，请检查权限设置');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(photoData);
      // Stop camera after taking photo
      stopCamera();
    }
  };

  const recognizeText = async (images: string[]) => {
    if (images.length === 0) return;
    setIsRecognizing(true);
    // Show recognition alert
    alert('识图中，请稍等...');
    try {
      const texts: string[] = [];
      for (const img of images) {
        const res = await fetch('/api/ai/image-recognition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: img })
        });
        const d = await res.json();
        if (d.success && d.result) texts.push(d.result);
      }
      if (texts.length) {
        setText(prev => prev + (prev ? '\n\n' : '') + texts.join('\n\n'));
        alert('识别成功！');
      } else alert('识别失败');
    } catch (e) {
      console.error('识别失败:', e);
      alert('识别失败');
    } finally {
      setIsRecognizing(false);
      setIsCameraOpen(false);
      setPhoto(null);
      stopCamera();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr: string[] = [];
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = o => {
        if (typeof o.target?.result === 'string') {
          arr.push(o.target.result as string);
          if (arr.length === files.length) {
            recognizeText(arr);
          }
        }
      };
      reader.readAsDataURL(f);
    });
  };

  // Auto start camera when overlay opens
  useEffect(() => {
    if (isCameraOpen && !photo) {
      startCamera();
    }
  }, [isCameraOpen]);

  // 使用共享的用户状态
  const { currentUser, userPoints, isLoadingUser, refreshUser } = useUser();
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");

  // 工具配置
const toolCost = 6; // 完形填空词汇整理消耗6个点数

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 检查用户登录状态
  const checkCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        console.log('用户登录成功:', userData);
      } else {
        console.log('用户未登录');
      }
    } catch (error) {
      console.error('检查用户状态失败:', error);
    }
  };

  useEffect(() => {
    if (isMounted) {
      checkCurrentUser();
    }
  }, [isMounted]);

  // 字符计数
  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  // 复制到剪贴板
  const copyToClipboard = async () => {
    if (!result) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(result);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      setIsCopying(false);
    }
  };

  // 导出为文本文件
  const exportToTextFile = () => {
    if (!result) return;

    // 创建文件内容
    const fileContent = `完形填空重点词汇整理
生成时间：${new Date().toLocaleString('zh-CN')}
====================================

${result.replace(/<[^>]*>/g, '')}`;

    // 创建Blob对象
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `完形填空词汇整理_${new Date().toISOString().split('T')[0]}.txt`;

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理URL对象
    URL.revokeObjectURL(url);
  };

  // 兑换码功能
  const handleRedeem = async () => {
    if (!redemptionCode.trim()) {
      setRedeemError("请输入兑换码");
      return;
    }

    setRedeeming(true);
    setRedeemError("");
    setRedeemSuccess("");

    try {
      const response = await fetch('/api/admin/redemption-codes/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: redemptionCode.trim(),
          userId: currentUser?.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setRedeemSuccess(data.message);
        setRedemptionCode("");
        await refreshUser();
        setTimeout(() => {
          setShowRedeemModal(false);
          setRedeemSuccess("");
        }, 2000);
      } else {
        setRedeemError(data.error || '兑换失败');
      }
    } catch (error) {
      console.error('兑换失败:', error);
      setRedeemError('网络错误，请重试');
    } finally {
      setRedeeming(false);
    }
  };

  // 开始整理词汇
  const handleOrganise = async () => {
    if (!text.trim()) {
      alert('请输入完形填空文章内容');
      return;
    }

    // 检查用户登录状态
    if (!currentUser) {
      alert('请先登录');
      router.push('/auth/signin');
      return;
    }

    // 检查点数
    if (userPoints < toolCost) {
      alert(`点数不足，需要${toolCost}个点数，当前剩余${userPoints}个点数`);
      setShowRedeemModal(true);
      return;
    }

    setIsOrganising(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/cloze-vocabulary-organise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          userId: currentUser.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('前端收到完整响应:', data);
        console.log('结果内容长度:', data.result?.length);
        console.log('结果内容预览:', data.result?.substring(0, 300) + '...');

        setResult(data.result);
        await refreshUser(); // 刷新用户点数
      } else {
        console.error('API返回错误:', data);

        // 检查是否有积分退还信息
        if (data.refunded && data.refundedPoints) {
          alert(`${data.error || '整理失败，请重试'}\n\n${data.message || `已退还${data.refundedPoints}个点数到您的账户`}`);
          await refreshUser(); // 刷新用户点数以显示退还的积分
        } else {
          alert(data.error || '整理失败，请重试');
        }
      }
    } catch (error) {
      console.error('整理失败:', error);

      // 网络异常等情况下也尝试退还积分（通过API端点）
      try {
        const refundResponse = await fetch('/api/ai/cloze-vocabulary-organise/refund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser?.id,
            amount: 6, // 完形填空词汇整理消耗6个点数
            reason: '网络异常导致的生成失败'
          })
        });

        if (refundResponse.ok) {
          await refreshUser(); // 刷新用户点数
          alert('网络错误，已退还6个点数到您的账户，请稍后重试');
        } else {
          alert('网络错误，请重试');
        }
      } catch (refundError) {
        console.error('退还积分失败:', refundError);
        alert('网络错误，请重试');
      }
    } finally {
      setIsOrganising(false);
    }
  };

  const maxChars = 5000;

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">正在加载完形填空词汇整理工具...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
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
                <h1 className="text-xl font-semibold text-gray-900">完形填空重点词汇整理</h1>
                <p className="text-sm text-gray-500">输入完形填空文章，AI将为您整理重点词汇并生成配套例句</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                    <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-orange-700 font-medium">{userPoints}</span>
                  </div>
                  <span className="text-sm text-gray-600">{currentUser.email}</span>
                </div>
              ) : (
                <Link href="/auth/signin">
                  <Button className="bg-orange-600 hover:bg-orange-700">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-6">
            {/* 工具信息卡片 */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center flex-shrink-0 border border-orange-200">
                    <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl font-semibold text-gray-900 mb-2">
                      完形填空重点词汇整理
                    </CardTitle>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      输入完形填空文章（包含选项的完整完形填空），AI将为您整理出完形填空中的重点词汇、固定搭配，并生成配套的英语例句（及对应句子翻译）。
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                        消耗 {toolCost} 点数
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        词汇整理
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* 输入区域 */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  完形填空内容输入
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 文本输入 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      完形填空文章内容（包含选项）
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                        建议包含完整的ABCD选项
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => setIsCameraOpen(true)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          拍照
                        </Button>
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          上传
                        </Button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="请粘贴完形填空文章内容，建议包含完整的文章正文和ABCD选项..."
                      className="min-h-[300px] text-sm border-gray-300 focus:border-orange-500 focus:ring-orange-500 resize-none"
                      maxLength={maxChars}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      {charCount}/{maxChars}
                    </div>
                  </div>
                </div>

  
                {/* 使用提示 */}
                <div className="bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-orange-900 mb-1">💡 使用提示</h4>
                      <ul className="text-xs text-orange-700 space-y-1">
                        <li>• 粘贴完整的完形填空文章内容，包含ABCD选项</li>
                        <li>• 点击"图片识图"按钮上传完形填空文章图片进行OCR识别</li>
                        <li>• 支持拍照上传或选择本地图片文件</li>
                        <li>• AI会自动分析完形填空的词汇考点</li>
                        <li>• 重点整理固定搭配和语法结构</li>
                        <li>• 提供词汇辨析和用法说明</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    {currentUser ? (
                      userPoints >= toolCost ? (
                        <span className="text-green-600">✓ 点数充足</span>
                      ) : (
                        <span className="text-red-600">点数不足，需要 {toolCost} 点数</span>
                      )
                    ) : (
                      <span className="text-gray-500">请先登录</span>
                    )}
                  </div>
                  <Button
                    onClick={handleOrganise}
                    disabled={!text.trim() || isOrganising || (!currentUser || (currentUser && userPoints < toolCost))}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white"
                  >
                    {isOrganising ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI正在深度分析完形填空，预计需要4分钟...
                      </span>
                    ) : "开始整理词汇!"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：结果展示区域 */}
          <div className="space-y-6">
            {isOrganising ? (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="py-16">
                  <div className="text-center">
                    {/* 动画加载图标 */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      {/* 外圈旋转动画 */}
                      <div className="absolute inset-0 w-24 h-24 border-4 border-orange-200 rounded-full"></div>
                      <div className="absolute inset-0 w-24 h-24 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>

                      {/* 内圈脉动动画 */}
                      <div className="absolute inset-4 w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center border border-orange-200 animate-pulse">
                        <svg className="w-8 h-8 text-orange-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-4 animate-pulse">
                      正在整理完形填空词汇...
                    </h3>

                    {/* 详细提示信息 */}
                    <div className="space-y-4 mb-6">
                      <div className="bg-gradient-to-r from-orange-50 to-blue-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-orange-800 font-medium text-sm mb-2">
                          ⚠️ 这个任务非常复杂，需要花费<span className="font-bold text-orange-600">4分钟</span>
                        </p>
                        <p className="text-orange-700 text-sm">
                          大家耐心等待，AI正在深度分析完形填空内容，提取重点词汇和语法结构
                        </p>
                      </div>

                      {/* 进度指示器 */}
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
                        <span>正在分析文本结构...</span>
                      </div>

                      <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <span>词汇提取</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>语法分析</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                          <span>智能整理</span>
                        </div>
                      </div>
                    </div>

                    {/* 等待提示 */}
                    <div className="text-sm text-gray-500 space-y-2">
                      <p>💡 请保持页面开启，不要关闭浏览器</p>
                      <p>⏰ 预计剩余时间：约4分钟</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      词汇整理结果
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={copyToClipboard}
                        disabled={isCopying}
                        variant="outline"
                        size="sm"
                      >
                        {isCopying ? "已复制" : "复制结果"}
                      </Button>
                      <Button
                        onClick={exportToTextFile}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        导出文本
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[600px] overflow-y-auto">
                    <div
                      className="prose prose-sm max-w-none text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: result
                          .replace(/\n/g, '<br>')
                          .replace(/# (.*)/g, '<div class="text-lg font-bold text-gray-900 mb-3 mt-4">$1</div>')
                          .replace(/## (.*)/g, '<div class="text-base font-semibold text-gray-800 mb-2 mt-3">$1</div>')
                          .replace(/### (.*)/g, '<div class="text-sm font-medium text-gray-700 mb-1 mt-2">$1</div>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                          .replace(/- (.*)/g, '<div class="ml-4 mb-1">• $1</div>')
                          .replace(/(\d+)\. (.*)/g, '<div class="ml-4 mb-1">$1. $2</div>')
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="py-16">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.5 4a.5.5 0 01.5.5v4a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5h9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      准备开始整理词汇
                    </h3>
                    <p className="text-gray-600 mb-4">
                      在左侧输入完形填空文章内容（包含选项），点击"开始整理词汇"按钮，
                      AI将为您生成详细的完形填空词汇整理报告。
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>重点词汇</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>固定搭配</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>英语例句</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* 兑换码弹窗 */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">兑换点数</h3>

            {redeemSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">{redeemSuccess}</p>
              </div>
            )}

            {redeemError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{redeemError}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  兑换码
                </label>
                <input
                  type="text"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value)}
                  placeholder="请输入兑换码"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {redeeming ? "兑换中..." : "确认兑换"}
                </Button>
                <Button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setRedeemError("");
                    setRedeemSuccess("");
                    setRedemptionCode("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OCR overlay - 拍照覆盖层 */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-4">
            {photo ? (
              <img src={photo} alt="photo" className="w-full" />
            ) : (
              <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
            )}
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-between">
              {!photo && <Button onClick={takePhoto} size="sm">拍照</Button>}
              {photo && <Button onClick={() => recognizeText([photo])} size="sm" disabled={isRecognizing}>{isRecognizing ? '识别中' : 'OCR识别'}</Button>}
              <Button variant="outline" size="sm" onClick={() => { setIsCameraOpen(false); stopCamera(); setPhoto(null); }}>关闭</Button>
            </div>
          </div>
        </div>
      )}

      {/* OCR recognizing overlay - 识别中覆盖层 */}
      {isRecognizing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white px-6 py-4 rounded-lg shadow-lg text-center space-y-3">
            <div className="flex justify-center">
              <svg className="animate-spin h-6 w-6 text-orange-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <p className="text-sm text-gray-700">识图中，请稍等...</p>
          </div>
        </div>
      )}
    </div>
  );
}