"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import { ImageRecognition } from "@/components/ImageRecognition";
import Link from "next/link";

export default function ClozeTestAnalysisPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [isCopying, setIsCopying] = useState(false);
  const [showOCR, setShowOCR] = useState(false);

  // 处理OCR识别结果
  const handleOCRResult = (ocrResult: string) => {
    setText(text + (text ? '\n\n' : '') + ocrResult);
  };

  // 使用共享的用户状态
  const { currentUser, userPoints, isLoadingUser, refreshUser } = useUser();
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");

  // 工具配置
  const toolCost = 3; // 完形填空解析消耗3个点数

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
    const fileContent = `完形填空解析
生成时间：${new Date().toLocaleString('zh-CN')}
====================================

${result.replace(/<[^>]*>/g, '')}`;

    // 创建Blob对象
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `完形填空解析_${new Date().toISOString().split('T')[0]}.txt`;

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

  // 开始解析
  const handleAnalyze = async () => {
    if (!text.trim()) {
      alert('请输入完形填空文章内容、题目和选项');
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

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/cloze-test-analysis', {
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
        setResult(data.result);
        await refreshUser(); // 刷新用户点数
      } else {
        alert(data.error || '解析失败，请重试');
      }
    } catch (error) {
      console.error('解析失败:', error);
      alert('网络错误，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const maxChars = 8000;

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="animate-spin w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">正在加载完形填空解析工具...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">完形填空解析</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">输入完形填空文章和题目，AI将为您详细解析每个选项</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {currentUser ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 bg-purple-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border border-purple-200">
                    <span className="text-xs sm:text-sm text-purple-700 font-medium">{userPoints}</span>
                    <span className="text-xs sm:text-sm text-purple-600">点数</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">{currentUser.email}</span>
                </div>
              ) : (
                <Link href="/auth/signin">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1.5 sm:px-4 sm:py-2">
                    登录
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-4 sm:space-y-6">
            {/* 工具信息卡片 */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center flex-shrink-0 border border-green-200">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      完形填空解析
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                      输入完形填空文章内容、题目和选项，AI将为您详细解析每个答案的选择依据。
                      支持联系上下文分析，提供准确的解题思路和原文引用。
                    </p>
                    <div className="flex items-center gap-1 sm:gap-2 mt-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 text-xs">
                        消耗 {toolCost} 点数
                      </Badge>
                      <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                        智能解析
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
                  输入完形填空内容
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 文本输入 */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      完形填空文章内容
                    </label>
                    <Button
                      onClick={() => setShowOCR(!showOCR)}
                      variant="outline"
                      className="flex items-center justify-center gap-2 h-10 px-4 text-green-600 border-green-200 hover:bg-green-50 text-sm sm:text-base"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">{showOCR ? '关闭识图' : '图片识图'}</span>
                      <span className="sm:hidden">{showOCR ? '📷 关闭' : '📷 识图'}</span>
                    </Button>
                  </div>
                  <div className="relative">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="请粘贴完形填空文章内容，包括：
1. 文章正文（含空格）
2. 题目和选项
3. 答案（如果有）

示例格式：
Sargassum is the smelly seaweed piling up on beaches across the Caribbean. It isn't something most people   41   kindly. But for Omar de Vazquez, a gardener, it was something like a(an)   42   .
...
###Questions###
41. A. look upon        B. bring in        C. give up            D. come across
...
##Answers:
41-45 CADBA"
                      className="h-64 sm:h-80 lg:h-[400px] text-sm sm:text-base border-gray-300 focus:border-green-500 focus:ring-green-500 resize-none"
                      maxLength={maxChars}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      {charCount}/{maxChars}
                    </div>
                  </div>
                </div>

                {/* OCR识图功能 */}
                {showOCR && (
                  <div className="mt-4">
                    <ImageRecognition onResultChange={handleOCRResult} />
                  </div>
                )}

                {/* 使用提示 */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-900 mb-1">💡 使用提示</h4>
                      <ul className="text-xs text-green-700 space-y-1">
                        <li>• 粘贴完整的完形填空文章和题目</li>
                        <li>• 确保包含所有题目选项</li>
                        <li>• 如果有答案，也请一并提供</li>
                        <li>• 点击"图片识图"按钮上传完形填空图片进行OCR识别</li>
                        <li>• AI会联系上下文进行详细解析</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="space-y-3 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">
                      {currentUser ? (
                        userPoints >= toolCost ? (
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">✅ 点数充足</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">消耗 {toolCost} 点数</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-red-600">⚠️ 点数不足</span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">需要 {toolCost} 点数</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">🔒 请先登录</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={!text.trim() || isAnalyzing || (!currentUser || (currentUser && userPoints < toolCost))}
                    className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-300 text-white text-base sm:text-lg font-medium shadow-lg"
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">正在解析中，请耐心等待...</span>
                        <span className="sm:hidden">解析中...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        🚀 开始解析
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：结果展示区域 */}
          <div className="space-y-6">
            {isAnalyzing ? (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="py-16">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="animate-spin w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      正在解析完形填空，请耐心等待...
                    </h3>
                    <p className="text-gray-600 mb-4">
                      AI正在为您分析文章内容和题目选项<br/>
                      这个过程需要一定时间，请稍作等待
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>分析文章内容</span>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                      <span>解析题目选项</span>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-150"></div>
                      <span>生成解题思路</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : result ? (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">
                      解析结果
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={copyToClipboard}
                        disabled={isCopying}
                        variant="outline"
                        className="flex items-center gap-2 h-10 px-3 sm:px-4 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2v4a2 2 0 012 2h4a2 2 0 012-2v-4a2 2 0 01-2z" />
                        </svg>
                        <span className="hidden sm:inline">{isCopying ? "已复制" : "复制结果"}</span>
                        <span className="sm:hidden">{isCopying ? "已复制" : "复制"}</span>
                      </Button>
                      <Button
                        onClick={exportToTextFile}
                        variant="outline"
                        className="flex items-center gap-2 h-10 px-3 sm:px-4 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="hidden sm:inline">导出文本</span>
                        <span className="sm:hidden">导出</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="h-64 sm:h-80 lg:h-[600px] overflow-y-auto">
                    <div
                      className="prose prose-sm max-w-none text-sm sm:text-base leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: result
                          .replace(/\n/g, '<br>')
                          .replace(/# (.*)/g, '<div class="text-base font-bold text-gray-900 mb-3 mt-4">$1</div>')
                          .replace(/## (.*)/g, '<div class="text-sm font-semibold text-gray-800 mb-2 mt-3">$1</div>')
                          .replace(/### (.*)/g, '<div class="text-sm font-medium text-gray-700 mb-1 mt-2">$1</div>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                          .replace(/- (.*)/g, '<div class="ml-4 mb-1 text-sm">• $1</div>')
                          .replace(/(\d+)\. (.*)/g, '<div class="ml-4 mb-1 text-sm">$1. $2</div>')
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
                      准备开始解析
                    </h3>
                    <p className="text-gray-600 mb-4">
                      在左侧输入完形填空文章内容、题目和选项，点击"开始解析"按钮，
                      AI将为您生成详细的解析报告。
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>智能解析</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>上下文分析</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>详细解题思路</span>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                <span className="hidden sm:inline">兑换点数</span>
                <span className="sm:hidden">💎 兑换</span>
              </h3>
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setRedeemError("");
                  setRedeemSuccess("");
                  setRedemptionCode("");
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {redeemSuccess && (
              <div className="mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {redeemSuccess}
                </p>
              </div>
            )}

            {redeemError && (
              <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {redeemError}
                </p>
              </div>
            )}

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  兑换码
                </label>
                <input
                  type="text"
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value)}
                  placeholder="请输入兑换码"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base"
                  disabled={redeeming}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base sm:text-lg font-medium"
                >
                  {redeeming ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>兑换中...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                      </svg>
                      <span>确认兑换</span>
                    </span>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowRedeemModal(false);
                    setRedeemError("");
                    setRedeemSuccess("");
                    setRedemptionCode("");
                  }}
                  variant="outline"
                  className="flex-1 h-12 text-base sm:text-lg"
                >
                  取消
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  兑换成功后点数将自动添加到您的账户
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}