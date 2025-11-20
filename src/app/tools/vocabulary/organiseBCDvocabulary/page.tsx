"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import { ImageRecognition } from "@/components/ImageRecognition";
import { BatchImageRecognition } from "@/components/BatchImageRecognition";
import Link from "next/link";

export default function BCDVocabularyOrganisePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [textB, setTextB] = useState("");
  const [textC, setTextC] = useState("");
  const [textD, setTextD] = useState("");
  const [isOrganising, setIsOrganising] = useState(false);
  const [resultB, setResultB] = useState<string | null>(null);
  const [resultC, setResultC] = useState<string | null>(null);
  const [resultD, setResultD] = useState<string | null>(null);
  const [charCountB, setCharCountB] = useState(0);
  const [charCountC, setCharCountC] = useState(0);
  const [charCountD, setCharCountD] = useState(0);
  const [isCopying, setIsCopying] = useState(false);
  const [showOCR, setShowOCR] = useState({ B: false, C: false, D: false });
  const [useBatchOCR, setUseBatchOCR] = useState({ B: false, C: false, D: false });
  const [isRecognizing, setIsRecognizing] = useState({ B: false, C: false, D: false });

  // 处理OCR识别结果
  const handleOCRResult = (ocrResult: string, type: 'B' | 'C' | 'D') => {
    const setTextFunc = type === 'B' ? setTextB : type === 'C' ? setTextC : setTextD;
    const currentText = type === 'B' ? textB : type === 'C' ? textC : textD;
    setTextFunc(currentText + (currentText ? '\n\n' : '') + ocrResult);
  };

  // 处理两张图片的并行OCR识别
  const handleBatchOCRResult = async (images: string[]) => {
    if (images.length === 0) return;

    setIsRecognizing(true);
    try {
      const batchSize = 2; // 最多同时处理2张图片
      const results: string[] = [];

      // 并行处理图片
      const batchPromises = images.slice(0, batchSize).map(async (img) => {
        const res = await fetch('/api/ai/ocr-deepseek', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: img,
            prompt: '识别图中文字，原文输出。不要做任何改动。如果图片中没有文字，请回复"无文字内容"'
          })
        });

        const data = await res.json();
        if (data.success && data.result) {
          return data.result;
        }
        return '';
      });

      const batchResults = await Promise.all(batchPromises);

      // 过滤掉空结果
      const validResults = batchResults.filter(result => result.trim());

      if (validResults.length > 0) {
        const combinedText = validResults.join('\n\n');
        setText(prevText => prevText + (prevText ? '\n\n' : '') + combinedText);
        alert(`成功识别${validResults.length}张图片！`);
      } else {
        alert('未检测到有效文字内容');
      }
    } catch (error) {
      console.error('批量OCR识别失败:', error);
      alert('批量识别失败，请重试');
    } finally {
      setIsRecognizing(false);
    }
  };

  // 使用共享的用户状态
  const { currentUser, userPoints, isLoadingUser, refreshUser } = useUser();
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");

  // 工具配置
const toolCostPerArticle = 2; // 每篇文章词汇整理消耗2个点数

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
    setCharCountB(textB.length);
  }, [textB]);

  useEffect(() => {
    setCharCountC(textC.length);
  }, [textC]);

  useEffect(() => {
    setCharCountD(textD.length);
  }, [textD]);

  // 复制到剪贴板
  const copyToClipboard = async (type: 'B' | 'C' | 'D') => {
    const result = type === 'B' ? resultB : type === 'C' ? resultC : resultD;
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
  const exportToTextFile = (type: 'B' | 'C' | 'D') => {
    const result = type === 'B' ? resultB : type === 'C' ? resultC : resultD;
    if (!result) return;

    const typeText = type === 'B' ? 'B篇' : type === 'C' ? 'C篇' : 'D篇';

    // 创建文件内容
    const fileContent = `${typeText}阅读重点词汇整理
生成时间：${new Date().toLocaleString('zh-CN')}
====================================

${result.replace(/<[^>]*>/g, '')}`;

    // 创建Blob对象
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${typeText}词汇整理_${new Date().toISOString().split('T')[0]}.txt`;

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 清理URL对象
    URL.revokeObjectURL(url);
  };

  // 导出全部为文本文件
  const exportAllToTextFile = () => {
    if (!resultB && !resultC && !resultD) return;

    const fileContent = `BCD篇阅读重点词汇整理
生成时间：${new Date().toLocaleString('zh-CN')}
====================================

${resultB ? `\n\n=== B篇阅读词汇 ===\n${resultB.replace(/<[^>]*>/g, '')}` : ''}
${resultC ? `\n\n=== C篇阅读词汇 ===\n${resultC.replace(/<[^>]*>/g, '')}` : ''}
${resultD ? `\n\n=== D篇阅读词汇 ===\n${resultD.replace(/<[^>]*>/g, '')}` : ''}
`;

    // 创建Blob对象
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BCD词汇整理_全部_${new Date().toISOString().split('T')[0]}.txt`;

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

  // 积分补偿函数
  const compensatePoints = async (failedArticles: ('B' | 'C' | 'D')[]) => {
    if (!currentUser || failedArticles.length === 0) return;

    try {
      const compensation = failedArticles.length * toolCostPerArticle;
      const response = await fetch('/api/user/compensate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: compensation,
          reason: `BCD词汇整理失败补偿 - ${failedArticles.join('、')}篇`,
          type: 'COMPENSATION'
        }),
      });

      if (response.ok) {
        console.log(`已补偿${compensation}点数给用户${currentUser.id}`);
      } else {
        console.error('积分补偿失败:', await response.text());
      }
    } catch (error) {
      console.error('积分补偿请求失败:', error);
    }
  };

  // 开始整理词汇
  const handleOrganise = async () => {
    // 检查哪些文章有内容（容错机制：空内容不调用工作流）
    const articles = [
      { type: 'B' as const, text: textB.trim(), hasContent: textB.trim().length > 0 },
      { type: 'C' as const, text: textC.trim(), hasContent: textC.trim().length > 0 },
      { type: 'D' as const, text: textD.trim(), hasContent: textD.trim().length > 0 }
    ].filter(article => article.hasContent);

    if (articles.length === 0) {
      alert('请至少输入一篇B、C或D篇阅读文章内容');
      return;
    }

    // 检查用户登录状态
    if (!currentUser) {
      alert('请先登录');
      router.push('/auth/signin');
      return;
    }

    // 检查点数
    const totalCost = articles.length * toolCostPerArticle;
    if (userPoints < totalCost) {
      alert(`点数不足，需要${totalCost}个点数（每篇${toolCostPerArticle}点数），当前剩余${userPoints}个点数`);
      setShowRedeemModal(true);
      return;
    }

    setIsOrganising(true);
    setResultB(null);
    setResultC(null);
    setResultD(null);

    try {
      // 并行处理所有文章
      const organizePromises = articles.map(async (article) => {
        console.log(`🔄 开始处理${article.type}篇文章...`);

        const response = await fetch('/api/ai/bcd-vocabulary-organise', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: article.text,
            userId: currentUser.id,
            articleType: article.type
          }),
        });

        const data = await response.json();
        console.log(`📊 ${article.type}篇API响应:`, { status: response.status, success: response.ok && data.result });

        if (response.ok && data.result) {
          console.log(`✅ ${article.type}篇整理成功`);
          return { type: article.type, result: data.result };
        } else {
          console.error(`❌ ${article.type}篇整理失败:`, data.error);
          throw new Error(data.error || `${article.type}篇整理失败`);
        }
      });

      const results = await Promise.allSettled(organizePromises);

      // 处理结果和积分补偿
      let successCount = 0;
      let errorCount = 0;
      const failedArticles: ('B' | 'C' | 'D')[] = [];

      results.forEach((result, index) => {
        const article = articles[index];
        if (result.status === 'fulfilled') {
          const { type, result: textResult } = result.value;
          if (type === 'B') setResultB(textResult);
          else if (type === 'C') setResultC(textResult);
          else if (type === 'D') setResultD(textResult);
          successCount++;
          console.log(`✅ ${type}篇结果已设置`);
        } else {
          console.error(`❌ ${article.type}篇处理失败:`, result.reason);
          errorCount++;
          failedArticles.push(article.type);
        }
      });

      // 积分补偿机制：失败的文章退回对应积分
      if (failedArticles.length > 0) {
        console.log(`💰 准备补偿${failedArticles.length}篇失败文章的积分...`);
        await compensatePoints(failedArticles);
        await refreshUser(); // 刷新用户点数以显示补偿后的余额
      }

      // 显示详细处理结果
      const successTypes = articles.filter(a => !failedArticles.includes(a.type)).map(a => a.type);
      const failedTypes = failedArticles;

      let message = `📊 处理完成！\n`;
      message += `✅ 成功整理：${successTypes.length}篇 (${successTypes.join('、')})\n`;

      if (failedTypes.length > 0) {
        message += `❌ 失败：${failedTypes.length}篇 (${failedTypes.join('、')})\n`;
        message += `💰 已补偿：${failedTypes.length * toolCostPerArticle}点数`;
      }

      if (successCount > 0) {
        alert(message);
      } else {
        alert(`❌ 所有文章整理失败，已全额补偿${totalCost}点数，请重试`);
      }

    } catch (error) {
      console.error('整理过程中发生错误:', error);

      // 如果是整体错误，补偿所有点数
      const totalCost = articles.length * toolCostPerArticle;
      const allTypes = articles.map(a => a.type);
      await compensatePoints(allTypes);
      await refreshUser();

      alert(`❌ 系统错误，已补偿${totalCost}点数，请重试`);
    } finally {
      setIsOrganising(false);
    }
  };

  const maxChars = 5000;

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">正在加载BCD词汇整理工具...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
                <h1 className="text-xl font-semibold text-gray-900">BCD篇阅读重点词汇整理</h1>
                <p className="text-sm text-gray-500">输入B、C、D篇阅读文章，AI将为您并行整理出重点词汇和核心短语</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-purple-700 font-medium">{userPoints}</span>
                  </div>
                  <span className="text-sm text-gray-600">{currentUser.email}</span>
                </div>
              ) : (
                <Link href="/auth/signin">
                  <Button className="bg-blue-600 hover:bg-blue-700">
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
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center flex-shrink-0 border border-green-200">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl font-semibold text-gray-900 mb-2">
                      BCD篇阅读重点词汇整理
                    </CardTitle>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      输入B、C、D篇阅读文章（可单篇或多篇），AI将为您并行整理出重点词汇、核心短语和固定搭配，并配上英文例句和对应句子翻译，帮助学生高效掌握阅读材料中的核心词汇。
                    </p>
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <span className="text-red-600 text-lg">⚠️</span>
                        <div className="text-sm text-red-700">
                          <p className="font-semibold">
                            <span className="text-red-600">重要注意：</span>每篇文章都要带上对应的题目和选项，否则AI可能会报错。
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                        每篇 {toolCostPerArticle} 点数
                      </Badge>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        并行处理
                      </Badge>
                      <Badge variant="outline" className="text-purple-600 border-purple-200">
                        支持多篇
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* 输入区域 */}
            <div className="space-y-4">
              {/* B篇输入 */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">B</span>
                    B篇阅读文章内容
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Textarea
                      value={textB}
                      onChange={(e) => setTextB(e.target.value)}
                      placeholder="请粘贴B篇阅读文章内容，建议包含完整的文章正文、题目和选项..."
                      className="min-h-[200px] text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                      maxLength={maxChars}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      {charCountB}/{maxChars}
                    </div>
                  </div>

                  {/* B篇OCR功能 */}
                  {showOCR.B && (
                    <div>
                      {useBatchOCR.B ? (
                        <BatchImageRecognition
                          onResultChange={(result) => handleOCRResult(result, 'B')}
                          maxImages={2}
                        />
                      ) : (
                        <ImageRecognition
                          onResultChange={(result) => handleOCRResult(result, 'B')}
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                      必须包含题目和选项
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => {
                          setShowOCR(prev => ({ ...prev, B: !prev.B }));
                          if (!showOCR.B) setUseBatchOCR(prev => ({ ...prev, B: false }));
                        }}
                        variant={showOCR.B && !useBatchOCR.B ? "default" : "outline"}
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        单张识图
                      </Button>
                      <Button
                        onClick={() => {
                          setShowOCR(prev => ({ ...prev, B: !prev.B }));
                          if (!showOCR.B) setUseBatchOCR(prev => ({ ...prev, B: true }));
                        }}
                        variant={useBatchOCR.B ? "default" : "outline"}
                        size="sm"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        批量识图
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* C篇输入 */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">C</span>
                    C篇阅读文章内容
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Textarea
                      value={textC}
                      onChange={(e) => setTextC(e.target.value)}
                      placeholder="请粘贴C篇阅读文章内容，建议包含完整的文章正文、题目和选项..."
                      className="min-h-[200px] text-sm border-gray-300 focus:border-green-500 focus:ring-green-500 resize-none"
                      maxLength={maxChars}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      {charCountC}/{maxChars}
                    </div>
                  </div>

                  {/* C篇OCR功能 */}
                  {showOCR.C && (
                    <div>
                      {useBatchOCR.C ? (
                        <BatchImageRecognition
                          onResultChange={(result) => handleOCRResult(result, 'C')}
                          maxImages={2}
                        />
                      ) : (
                        <ImageRecognition
                          onResultChange={(result) => handleOCRResult(result, 'C')}
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                      必须包含题目和选项
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => {
                          setShowOCR(prev => ({ ...prev, C: !prev.C }));
                          if (!showOCR.C) setUseBatchOCR(prev => ({ ...prev, C: false }));
                        }}
                        variant={showOCR.C && !useBatchOCR.C ? "default" : "outline"}
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        单张识图
                      </Button>
                      <Button
                        onClick={() => {
                          setShowOCR(prev => ({ ...prev, C: !prev.C }));
                          if (!showOCR.C) setUseBatchOCR(prev => ({ ...prev, C: true }));
                        }}
                        variant={useBatchOCR.C ? "default" : "outline"}
                        size="sm"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        批量识图
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* D篇输入 */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">D</span>
                    D篇阅读文章内容
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Textarea
                      value={textD}
                      onChange={(e) => setTextD(e.target.value)}
                      placeholder="请粘贴D篇阅读文章内容，建议包含完整的文章正文、题目和选项..."
                      className="min-h-[200px] text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
                      maxLength={maxChars}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      {charCountD}/{maxChars}
                    </div>
                  </div>

                  {/* D篇OCR功能 */}
                  {showOCR.D && (
                    <div>
                      {useBatchOCR.D ? (
                        <BatchImageRecognition
                          onResultChange={(result) => handleOCRResult(result, 'D')}
                          maxImages={2}
                        />
                      ) : (
                        <ImageRecognition
                          onResultChange={(result) => handleOCRResult(result, 'D')}
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-200">
                      必须包含题目和选项
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => {
                          setShowOCR(prev => ({ ...prev, D: !prev.D }));
                          if (!showOCR.D) setUseBatchOCR(prev => ({ ...prev, D: false }));
                        }}
                        variant={showOCR.D && !useBatchOCR.D ? "default" : "outline"}
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        单张识图
                      </Button>
                      <Button
                        onClick={() => {
                          setShowOCR(prev => ({ ...prev, D: !prev.D }));
                          if (!showOCR.D) setUseBatchOCR(prev => ({ ...prev, D: true }));
                        }}
                        variant={useBatchOCR.D ? "default" : "outline"}
                        size="sm"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        批量识图
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

              {/* 使用提示 */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-900 mb-1">💡 使用提示</h4>
                      <ul className="text-xs text-green-700 space-y-1">
                        <li>• 可同时处理B、C、D三篇文章（至少需要一篇）</li>
                        <li>• 每篇文章都要包含完整的题目和选项</li>
                        <li>• 支持单张图片识别或批量识别(最多2张图片)</li>
                        <li>• 批量识别支持并行处理，提高效率</li>
                        <li>• 支持拍照上传或选择本地图片文件</li>
                        <li>• AI会并行处理多篇文章，自动分类重点词汇</li>
                        <li>• 包含词汇释义、搭配和例句</li>
                        <li>• 按照词汇等级进行分类整理</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {currentUser ? (
                        (() => {
                          const filledArticles = [textB, textC, textD].filter(text => text.trim()).length;
                          const totalCost = filledArticles * toolCostPerArticle;
                          return userPoints >= totalCost ? (
                            <span className="text-green-600">✓ 点数充足 (需要{totalCost}点数)</span>
                          ) : (
                            <span className="text-red-600">点数不足，需要{totalCost}点数，当前剩余{userPoints}点数</span>
                          );
                        })()
                      ) : (
                        <span className="text-gray-500">请先登录</span>
                      )}
                    </div>
                    <Button
                      onClick={handleOrganise}
                      disabled={(!textB.trim() && !textC.trim() && !textD.trim()) || isOrganising || (!currentUser || (currentUser && userPoints < ([textB, textC, textD].filter(text => text.trim()).length * toolCostPerArticle)))}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white"
                    >
                      {isOrganising ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          正在并行整理词汇中，请耐心等待...
                        </span>
                      ) : "开始并行整理词汇!"}
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
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="animate-spin w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      正在并行整理词汇中，请耐心等待...
                    </h3>
                    <p className="text-gray-600 mb-4">
                      AI正在为您并行分析B、C、D篇文章内容，整理重点词汇和核心短语<br/>
                      这个过程大约需要3-5分钟，请稍作等待
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>并行分析文章</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-75"></div>
                      <span>整理重点词汇</span>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-150"></div>
                      <span>生成例句翻译</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* 结果展示区域 */
              <>
                {/* B篇结果 */}
                {(resultB || textB.trim()) && (
                  <Card className="bg-white border-blue-200 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">B</span>
                          B篇词汇整理结果
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => copyToClipboard('B')}
                            disabled={isCopying}
                            variant="outline"
                            size="sm"
                          >
                            {isCopying ? "已复制" : "复制结果"}
                          </Button>
                          <Button
                            onClick={() => exportToTextFile('B')}
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
                      {resultB ? (
                        <div className="max-h-[400px] overflow-y-auto">
                          <div
                            className="prose prose-sm max-w-none text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: resultB
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
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          等待整理B篇词汇...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* C篇结果 */}
                {(resultC || textC.trim()) && (
                  <Card className="bg-white border-green-200 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">C</span>
                          C篇词汇整理结果
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => copyToClipboard('C')}
                            disabled={isCopying}
                            variant="outline"
                            size="sm"
                          >
                            {isCopying ? "已复制" : "复制结果"}
                          </Button>
                          <Button
                            onClick={() => exportToTextFile('C')}
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
                      {resultC ? (
                        <div className="max-h-[400px] overflow-y-auto">
                          <div
                            className="prose prose-sm max-w-none text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: resultC
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
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          等待整理C篇词汇...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* D篇结果 */}
                {(resultD || textD.trim()) && (
                  <Card className="bg-white border-purple-200 shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">D</span>
                          D篇词汇整理结果
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => copyToClipboard('D')}
                            disabled={isCopying}
                            variant="outline"
                            size="sm"
                          >
                            {isCopying ? "已复制" : "复制结果"}
                          </Button>
                          <Button
                            onClick={() => exportToTextFile('D')}
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
                      {resultD ? (
                        <div className="max-h-[400px] overflow-y-auto">
                          <div
                            className="prose prose-sm max-w-none text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: resultD
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
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          等待整理D篇词汇...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 全部导出按钮 */}
                {(resultB || resultC || resultD) && (
                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">已完成整理：</span>
                          <span className="text-blue-600 font-semibold">
                            {[resultB && 'B篇', resultC && 'C篇', resultD && 'D篇'].filter(Boolean).join('、')}
                          </span>
                        </div>
                        <Button
                          onClick={exportAllToTextFile}
                          variant="outline"
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          导出全部结果
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 初始状态提示 */}
                {!resultB && !resultC && !resultD && !textB.trim() && !textC.trim() && !textD.trim() && (
                  <Card className="bg-white border-gray-200 shadow-sm">
                    <CardContent className="py-16">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.5 4a.5.5 0 01.5.5v4a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5h9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          准备开始整理BCD篇词汇
                        </h3>
                        <p className="text-gray-600 mb-4">
                          在左侧输入B、C、D篇阅读文章内容（至少一篇），点击"开始并行整理词汇"按钮，
                          AI将为您并行生成详细的词汇整理报告。
                        </p>
                        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>B篇词汇</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>C篇词汇</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>D篇词汇</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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
    </div>
  );
}