"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/user-context";
import Link from "next/link";

export default function TextbookVocabularyOrganisePage() {
  const router = useRouter();
  const { currentUser, userPoints, isLoadingUser, refreshUser } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [topic, setTopic] = useState("");
  const [vocabularyList, setVocabularyList] = useState("");
  const [isOrganising, setIsOrganising] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isCopying, setIsCopying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 词汇成篇功能状态
  const [isGeneratingParagraph, setIsGeneratingParagraph] = useState(false);
  const [paragraphResult, setParagraphResult] = useState<string | null>(null);
  const [isCopyingParagraph, setIsCopyingParagraph] = useState(false);
  const [isExportingParagraph, setIsExportingParagraph] = useState(false);

  // 针对性练习功能状态
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  const [exerciseResult, setExerciseResult] = useState<string | null>(null);
  const [isCopyingExercise, setIsCopyingExercise] = useState(false);
  const [isExportingExercise, setIsExportingExercise] = useState(false);

  // OCR states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // 更新词汇计数，支持逗号、分号和空格分隔
    const words = vocabularyList.trim() ? vocabularyList.trim().split(/[\s,;]+/).filter(word => word.length > 0) : [];
    setWordCount(words.length);
  }, [vocabularyList]);

  // 检查用户登录状态和点数
  const checkAuthAndPoints = async () => {
    try {
      const response = await fetch('/api/auth/user');
      const data = await response.json();

      if (!response.ok) {
        alert('请先登录后再使用此功能');
        return false;
      }

      if (data.user_points.points < 4) {
        alert(`点数不足，需要4点，当前${data.user_points.points}点`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('检查用户状态失败:', error);
      alert('检查用户状态失败，请稍后重试');
      return false;
    }
  };

  const handleOrganise = async () => {
    if (!topic.trim()) {
      alert('请输入单元大主题');
      return;
    }

    if (!vocabularyList.trim()) {
      alert('请输入词汇列表');
      return;
    }

    const canProceed = await checkAuthAndPoints();
    if (!canProceed) return;

    setIsOrganising(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/textbook-vocabulary-organise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          vocabularyList: vocabularyList.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.result);
        // 成功时更新用户点数
        refreshUser();
      } else {
        // 检查是否退还了点数
        if (data.refunded && data.pointsRefunded) {
          alert(`❌ 词汇整理失败\n\n💰 已退还 ${data.pointsRefunded} 点数到您的账户\n失败原因：${data.error || '系统错误，请稍后重试'}\n\n请检查网络连接后重试`);
          refreshUser();
        } else {
          alert(data.error || '词汇整理失败，请稍后重试');
        }
      }
    } catch (error) {
      console.error('词汇整理请求失败:', error);
      alert('⚠️ 网络连接出现问题\n\n请检查网络连接后重试\n如果问题持续存在，请联系客服');
    } finally {
      setIsOrganising(false);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(result);
      alert('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请手动复制');
    } finally {
      setIsCopying(false);
    }
  };

  const handleExportTxt = async () => {
    if (!result) return;

    setIsExporting(true);
    try {
      // 清理HTML标签，保留纯文本格式
      const cleanText = result
        .replace(/<[^>]*>/g, '') // 移除所有HTML标签
        .replace(/&nbsp;/g, ' ') // 替换空格实体
        .replace(/&lt;/g, '<') // 替换小于号实体
        .replace(/&gt;/g, '>') // 替换大于号实体
        .replace(/&amp;/g, '&') // 替换和号实体
        .replace(/&quot;/g, '"') // 替换引号实体
        .replace(/&#39;/g, "'") // 替换单引号实体
        .replace(/\n{3,}/g, '\n\n') // 清理多余空行
        .trim();

      // 创建文件内容
      const fileContent = `${topic ? `单元主题：${topic}\n` : ''}${vocabularyList ? `词汇列表：${vocabularyList}\n` : ''}\n${'='.repeat(50)}\n\n${cleanText}`;

      // 创建Blob对象
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名（使用主题名称）
      const fileName = topic ? `${topic}_词汇梳理.txt` : '单元词汇梳理.txt';
      link.download = fileName;

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL对象
      URL.revokeObjectURL(url);

      alert('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setTopic("");
    setVocabularyList("");
    setResult(null);
    setParagraphResult(null);
    setExerciseResult(null);
    setWordCount(0);
  };

  // 词汇成篇功能
  const handleGenerateParagraph = async () => {
    if (!result) {
      alert('请先完成词汇梳理再生成示范段落');
      return;
    }

    // 检查用户点数是否足够
    try {
      const response = await fetch('/api/auth/user');
      const data = await response.json();

      if (!response.ok) {
        alert('请先登录后再使用此功能');
        return;
      }

      if (data.user_points.points < 3) {
        alert(`点数不足，需要3点，当前${data.user_points.points}点`);
        return;
      }
    } catch (error) {
      console.error('检查用户状态失败:', error);
      alert('检查用户状态失败，请稍后重试');
      return;
    }

    setIsGeneratingParagraph(true);
    setParagraphResult(null);

    try {
      const response = await fetch('/api/ai/vocabulary-paragraph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          vocabularyOrganiseResult: result
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setParagraphResult(data.result);
        alert('🎉 词汇成篇完成！');
        // 成功时更新用户点数
        refreshUser();
      } else {
        // 检查是否退还了点数
        if (data.refunded && data.pointsRefunded) {
          alert(`❌ 词汇成篇失败\n\n💰 已退还 ${data.pointsRefunded} 点数到您的账户\n失败原因：${data.error || '系统错误，请稍后重试'}\n\n请检查网络连接后重试`);
          refreshUser();
        } else {
          alert(data.error || '词汇成篇失败，请稍后重试');
        }
      }
    } catch (error) {
      console.error('词汇成篇请求失败:', error);
      alert('⚠️ 网络连接出现问题\n\n请检查网络连接后重试\n如果问题持续存在，请联系客服');
    } finally {
      setIsGeneratingParagraph(false);
    }
  };

  // 针对性练习功能
  const handleGenerateTargetedExercise = async () => {
    if (!result) {
      alert('请先完成词汇梳理再生成针对性练习');
      return;
    }

    // 检查用户点数是否足够
    try {
      const response = await fetch('/api/auth/user');
      const data = await response.json();

      if (data.points < 4) {
        alert('点数不足，生成针对性练习需要消耗4点数');
        return;
      }
    } catch (error) {
      console.error('获取用户点数失败:', error);
      alert('获取用户点数失败，请稍后重试');
      return;
    }

    setIsGeneratingExercise(true);

    try {
      const response = await fetch('/api/ai/targeted-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          vocabularyOrganiseResult: result
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setExerciseResult(data.result);
        alert('🎉 针对性练习生成成功！');
        // 成功时更新用户点数
        refreshUser();
      } else {
        // 检查是否退还了点数
        if (data.refunded && data.pointsRefunded) {
          alert(`❌ 针对性练习生成失败\n\n💰 已退还 ${data.pointsRefunded} 点数到您的账户\n失败原因：${data.error || '系统错误，请稍后重试'}\n\n请检查网络连接后重试`);
          refreshUser();
        } else {
          alert(data.error || '针对性练习生成失败，请稍后重试');
        }
      }
    } catch (error) {
      console.error('针对性练习请求失败:', error);
      alert('网络错误，请稍后重试');
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  const handleCopyParagraph = async () => {
    if (!paragraphResult) return;

    setIsCopyingParagraph(true);
    try {
      await navigator.clipboard.writeText(paragraphResult);
      alert('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请手动复制');
    } finally {
      setIsCopyingParagraph(false);
    }
  };

  const handleExportParagraph = async () => {
    if (!paragraphResult) return;

    setIsExportingParagraph(true);
    try {
      // 清理HTML标签，保留纯文本格式
      const cleanText = paragraphResult
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // 创建文件内容
      const fileContent = `${topic ? `大单元主题：${topic}\n` : ''}词汇成篇示范段落\n${'='.repeat(50)}\n\n${cleanText}`;

      // 创建Blob对象
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名
      const fileName = topic ? `${topic}_词汇成篇.txt` : '词汇成篇示范段落.txt';
      link.download = fileName;

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL对象
      URL.revokeObjectURL(url);

      alert('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExportingParagraph(false);
    }
  };

  const handleCopyExercise = async () => {
    if (!exerciseResult) return;

    setIsCopyingExercise(true);
    try {
      await navigator.clipboard.writeText(exerciseResult);
      alert('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请手动复制');
    } finally {
      setIsCopyingExercise(false);
    }
  };

  const handleExportExercise = async () => {
    if (!exerciseResult) return;

    setIsExportingExercise(true);
    try {
      // 清理HTML标签，保留纯文本格式
      const cleanText = exerciseResult
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // 创建文件内容
      const fileContent = `${topic ? `大单元主题：${topic}\n` : ''}针对性练习\n${'='.repeat(50)}\n\n${cleanText}`;

      // 创建Blob对象
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名
      const fileName = topic ? `${topic}_针对性练习.txt` : '针对性练习.txt';
      link.download = fileName;

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL对象
      URL.revokeObjectURL(url);

      alert('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    } finally {
      setIsExportingExercise(false);
    }
  };

  // OCR functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (e) {
      console.error('摄像头访问失败:', e)
      alert('无法访问摄像头，请检查权限设置')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const photoData = canvas.toDataURL('image/jpeg', 0.8)
      setPhoto(photoData)
      stopCamera()
    }
  }

  const recognizeText = async (images: string[]) => {
    if (images.length === 0) return
    setIsRecognizing(true)
    alert('识图中，请稍等...')
    try {
      const texts: string[] = []
      for (const img of images) {
        const res = await fetch('/api/ai/image-recognition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: img })
        })
        const d = await res.json()
        if (d.success && d.result) texts.push(d.result)
      }
      if (texts.length) {
        // 过滤出英文单词
        const words = texts.join(' ').match(/\b[a-zA-Z]+\b/g) || []
        const uniqueWords = [...new Set(words.map(word => word.toLowerCase()))]

        // 更新词汇列表
        setVocabularyList(prev => {
          const existingWords = prev.split(/[\s,]+/).filter(w => w.trim()).map(w => w.toLowerCase())
          const allWords = [...new Set([...existingWords, ...uniqueWords])]
          return allWords.join(', ')
        })

        alert(`识别成功！发现 ${uniqueWords.length} 个词汇`)
      } else {
        alert('识别失败，未检测到文本')
      }
    } catch (e) {
      console.error(e)
      alert('识别错误，请重试')
    }
    setIsRecognizing(false)
    setIsCameraOpen(false)
    setPhoto(null)
    setUploadedImages([])
    stopCamera()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const arr: string[] = []
    Array.from(files).forEach(f => {
      const reader = new FileReader()
      reader.onload = o => {
        if (typeof o.target?.result === 'string') {
          arr.push(o.target.result as string)
          if (arr.length === files.length) {
            recognizeText(arr)
          }
        }
      }
      reader.readAsDataURL(f)
    })
  }

  // Auto start camera when overlay opens
  useEffect(() => {
    if (isCameraOpen && !photo) {
      startCamera()
    }
    return () => {
      if (!isCameraOpen) {
        stopCamera()
      }
    }
  }, [isCameraOpen])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleOrganise();
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* 导航面包屑 */}
        <div className="mb-4 sm:mb-8">
          <nav className="text-xs sm:text-sm text-gray-600 flex flex-wrap items-center">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              首页
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-600">
              词汇学习工具
            </span>
            <span className="mx-2">/</span>
            <span className="text-indigo-600 font-medium break-words">
              单元词汇梳理及配套练习生成
            </span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 左侧输入区域 */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-indigo-100">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="text-lg sm:text-xl font-bold text-indigo-800 flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">单元词汇梳理</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div>
                  <label htmlFor="vocabulary" className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center justify-between">
                      <span>词汇列表</span>
                      <Badge variant="outline" className="text-xs">
                        {wordCount} 个词汇
                      </Badge>
                    </div>
                  </label>

                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">📚 说明：</span>请录入一整个单元的词汇
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      支持用空格、逗号或分号分隔词汇
                    </p>
                  </div>

                  {/* OCR功能按钮 */}
                  <div className="mb-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm border-blue-200 hover:bg-blue-50"
                    >
                      📁 上传图片识别
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCameraOpen(true)}
                      className="flex items-center gap-2 text-sm border-blue-200 hover:bg-blue-50"
                    >
                      📷 拍照识别词汇
                    </Button>
                  </div>

                  <Textarea
                    id="vocabulary"
                    placeholder="请输入词汇列表，每行一个词汇或用逗号、分号分隔&#10;&#10;例如：&#10;student, teacher, classroom, library&#10;homework; exam; grade; subject&#10;&#10;💡 提示：也可以使用上方按钮拍照或上传图片自动识别词汇"
                    value={vocabularyList}
                    onChange={(e) => setVocabularyList(e.target.value)}
                    className="min-h-32 sm:min-h-40 w-full resize-none text-sm"
                    onKeyPress={handleKeyPress}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                    大单元主题
                  </label>
                  <Input
                    id="topic"
                    placeholder="例如：校园生活、环境保护、科技发展等"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>

                <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg border border-indigo-100">
                  <h4 className="font-semibold text-indigo-800 mb-2 text-sm">功能说明：</h4>
                  <ul className="text-xs sm:text-sm text-indigo-700 space-y-1">
                    <li>• 输入大单元主题和词汇列表</li>
                    <li>• AI按子主题分类整理词汇</li>
                    <li>• 为每类词汇生成功能例句</li>
                    <li>• 提供配套译文展示用法</li>
                    <li>• 生成词汇成篇示范段落 (3点数)</li>
                    <li>• 创作针对性填空练习 (4点数)</li>
                    <li>• 支持拍照/图片识别词汇</li>
                    <li>• 一键导出TXT文件</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={handleOrganise}
                    disabled={isOrganising || !topic.trim() || !vocabularyList.trim()}
                    className="w-full sm:flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-sm sm:text-base"
                  >
                    {isOrganising ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V8C8 5.79 9.79 4 12 4s8 1.79 8 4v12c0 2.21-1.79 4-4 4s-8-1.79-8-4V8z"></path>
                        </svg>
                        正在梳理词汇...
                      </>
                    ) : (
                      '开始词汇梳理'
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full sm:flex-1 text-sm sm:text-base"
                  >
                    重置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧结果区域 */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-indigo-100">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex flex-col gap-3">
                  {/* 标题和操作按钮 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-lg sm:text-xl font-bold text-purple-800">
                      词汇梳理结果
                    </CardTitle>
                    {result && (
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCopyResult}
                          disabled={isCopying}
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm"
                        >
                          {isCopying ? '复制中...' : '复制结果'}
                        </Button>
                        <Button
                          onClick={handleExportTxt}
                          disabled={isExporting}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-xs sm:text-sm"
                        >
                          {isExporting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V8C8 5.79 9.79 4 12 4s8 1.79 8 4v12c0 2.21-1.79 4-4 4s-8-1.79-8-4V8z"></path>
                              </svg>
                              导出中...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="hidden sm:inline">导出TXT</span>
                              <span className="sm:hidden">导出</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 用户点数显示 */}
                  <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-purple-600 font-medium">当前点数</span>
                        <span className="text-lg font-bold text-purple-800">
                          {isLoadingUser ? (
                            <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                          ) : (
                            userPoints
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-purple-600">
                      词汇梳理消耗 <span className="font-semibold">4</span> 点数
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isOrganising ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">AI正在梳理词汇，请稍候...</p>
                  </div>
                ) : result ? (
                  <>
                    <div className="prose max-w-none">
                      <div className="bg-white p-6 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                        <div
                          className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: result
                              // 处理换行
                              .replace(/\n/g, '<br>')
                          }}
                        />
                      </div>
                    </div>

                    {/* 词汇成篇和针对性练习按钮 */}
                    <div className="mt-4 pt-4 border-t border-indigo-200">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={handleGenerateParagraph}
                          disabled={isGeneratingParagraph || !result}
                          className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm sm:text-base"
                        >
                          {isGeneratingParagraph ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              正在生成...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span className="truncate">词汇成篇 (3点数)</span>
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleGenerateTargetedExercise}
                          disabled={isGeneratingExercise || !result}
                          className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm sm:text-base"
                        >
                          {isGeneratingExercise ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              正在生成...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="truncate">生成练习 (4点数)</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1a1 1 0 00-1 1v-3z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-500 max-w-md">
                      输入大单元主题和词汇列表后，AI将为您系统梳理词汇并生成配套练习
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 词汇成篇结果区域 */}
          {paragraphResult && (
            <div className="lg:col-span-2 mt-6">
              <Card className="shadow-lg border-green-100">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex flex-col gap-3">
                    {/* 标题和操作按钮 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <CardTitle className="text-lg sm:text-xl font-bold text-green-800">
                        词汇成篇结果
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCopyParagraph}
                          disabled={isCopyingParagraph}
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm"
                        >
                          {isCopyingParagraph ? '复制中...' : '复制结果'}
                        </Button>
                        <Button
                          onClick={handleExportParagraph}
                          disabled={isExportingParagraph}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-xs sm:text-sm"
                        >
                          {isExportingParagraph ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V8C8 5.79 9.79 4 12 4s8 1.79 8 4v12c0 2.21-1.79 4-4 4s-8-1.79-8-4V8z"></path>
                              </svg>
                              导出中...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="hidden sm:inline">导出TXT</span>
                              <span className="sm:hidden">导出</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 用户点数显示 */}
                    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-green-600 font-medium">当前点数</span>
                          <span className="text-lg font-bold text-green-800">
                            {isLoadingUser ? (
                              <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                            ) : (
                              userPoints
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-green-600">
                        词汇成篇消耗 <span className="font-semibold">3</span> 点数
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="bg-white p-6 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                      <div
                        className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: paragraphResult
                            // 处理换行
                            .replace(/\n/g, '<br>')
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 针对性练习结果区域 */}
          {exerciseResult && (
            <div className="lg:col-span-2 mt-6">
              <Card className="shadow-lg border-blue-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex flex-col gap-3">
                    {/* 标题和操作按钮 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <CardTitle className="text-lg sm:text-xl font-bold text-blue-800">
                        针对性练习结果
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCopyExercise}
                          disabled={isCopyingExercise}
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm"
                        >
                          {isCopyingExercise ? '复制中...' : '复制结果'}
                        </Button>
                        <Button
                          onClick={handleExportExercise}
                          disabled={isExportingExercise}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-xs sm:text-sm"
                        >
                          {isExportingExercise ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V8C8 5.79 9.79 4 12 4s8 1.79 8 4v12c0 2.21-1.79 4-4 4s-8-1.79-8-4V8z"></path>
                              </svg>
                              导出中...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="hidden sm:inline">导出TXT</span>
                              <span className="sm:hidden">导出</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* 用户点数显示 */}
                    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-blue-600 font-medium">当前点数</span>
                          <span className="text-lg font-bold text-blue-800">
                            {isLoadingUser ? (
                              <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
                            ) : (
                              userPoints
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600">
                        针对性练习消耗 <span className="font-semibold">4</span> 点数
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="bg-white p-6 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                      <div
                        className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: exerciseResult
                            // 处理换行
                            .replace(/\n/g, '<br>')
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* OCR Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-4">
            <h3 className="text-lg font-semibold text-center">拍照识别词汇</h3>
            {photo ? (
              <img src={photo} alt="拍摄的照片" className="w-full rounded-lg" />
            ) : (
              <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover rounded-lg bg-black" />
            )}
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-between gap-3">
              {!photo && (
                <Button onClick={takePhoto} className="flex-1">
                  📷 拍照
                </Button>
              )}
              {photo && (
                <Button
                  onClick={() => recognizeText([photo])}
                  className="flex-1"
                  disabled={isRecognizing}
                >
                  {isRecognizing ? '🔍 识别中...' : '🔍 OCR识别'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setIsCameraOpen(false);
                  stopCamera();
                  setPhoto(null);
                }}
                className="flex-1"
              >
                ❌ 关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Recognizing Overlay */}
      {isRecognizing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white px-8 py-6 rounded-lg shadow-lg text-center space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
            <p className="text-sm text-gray-700 font-medium">正在进行OCR识别...</p>
            <p className="text-xs text-gray-500">请稍等，正在从图片中提取词汇</p>
          </div>
        </div>
      )}
    </div>
  );
}