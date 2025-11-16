"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BookOpen, Target, Users, Download, Camera, Upload, FileText, Image as ImageIcon, Home, ArrowLeft } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// 智能渲染函数，处理不同的数据格式，支持自然分段
const renderContent = (content: any): JSX.Element => {
  if (typeof content === 'string') {
    // 如果是字符串，进行自然分段处理
    const paragraphs = content.split(/\n\s*\n|\n\s*(?=[A-Z\u4e00-\u9fff])/).filter(p => p.trim().length > 0);

    if (paragraphs.length > 1) {
      // 如果有多段，分段显示
      return (
        <div className="space-y-4 text-gray-700 leading-relaxed">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="indent-8 text-justify">
              {paragraph.trim()}
            </p>
          ))}
        </div>
      );
    } else {
      // 单段文本，按句号和换行智能断行
      const sentences = content.split(/(?<=[.!?。！？])\s+/).filter(s => s.trim().length > 0);
      return (
        <div className="text-gray-700 leading-relaxed">
          {sentences.map((sentence, index) => (
            <span key={index}>
              {sentence.trim()}
              {index < sentences.length - 1 && ' '}
            </span>
          ))}
        </div>
      );
    }
  } else if (typeof content === 'object' && content !== null) {
    // 如果是对象，智能格式化显示
    if (content.exercise1 || content.exercise2 || content.exercise3) {
      // 练习题格式
      return (
        <div className="space-y-4">
          {Object.entries(content).map(([key, value], index) => (
            <div key={key} className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-700 mb-2">
                {key === 'exercise1' ? '练习 1' :
                 key === 'exercise2' ? '练习 2' :
                 key === 'exercise3' ? '练习 3' : key}
              </h4>
              <div className="text-gray-600 leading-relaxed">
                {renderContent(value)}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (content.answer1 || content.answer2 || content.answer3) {
      // 答案格式
      return (
        <div className="space-y-3">
          {Object.entries(content).map(([key, value], index) => (
            <div key={key} className="flex items-start gap-3">
              <span className="font-semibold text-green-700 min-w-[60px]">
                {key === 'answer1' ? '答案 1:' :
                 key === 'answer2' ? '答案 2:' :
                 key === 'answer3' ? '答案 3:' : key}
              </span>
              <span className="text-gray-700 flex-1 leading-relaxed">
                {renderContent(value)}
              </span>
            </div>
          ))}
        </div>
      );
    } else {
      // 其他对象格式，美化JSON显示
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      );
    }
  }
  // 其他情况转为字符串显示
  return <>{String(content)}</>;
};

// 将内容转换为纯文本格式（用于Word下载）
const contentToText = (content: any, title: string = ''): string => {
  if (typeof content === 'string') {
    return content.trim();
  } else if (typeof content === 'object' && content !== null) {
    if (content.exercise1 || content.exercise2 || content.exercise3) {
      return Object.entries(content)
        .map(([key, value]) => `${key === 'exercise1' ? '练习 1' :
                                key === 'exercise2' ? '练习 2' :
                                key === 'exercise3' ? '练习 3' : key}:\n${contentToText(value)}`)
        .join('\n\n');
    } else if (content.answer1 || content.answer2 || content.answer3) {
      return Object.entries(content)
        .map(([key, value]) => `${key === 'answer1' ? '答案 1' :
                                key === 'answer2' ? '答案 2' :
                                key === 'answer3' ? '答案 3' : key}: ${contentToText(value)}`)
        .join('\n');
    } else {
      return JSON.stringify(content, null, 2);
    }
  }
  return String(content);
};

// 下载为Word文档
const downloadAsWord = (result: any, topic: string) => {
  // 创建文档内容
  let content = `应用文写作支架练习\n题目：${topic}\n生成时间：${new Date().toLocaleString('zh-CN')}\n`;
  content += `${'='.repeat(50)}\n\n`;

  if (result.scaffold1) {
    content += `【写作支架范例 1 - 结构引导式】\n`;
    content += `${'─'.repeat(30)}\n`;
    if (result.scaffold1.scaffold) {
      content += `支架内容：\n${contentToText(result.scaffold1.scaffold)}\n\n`;
    }
    if (result.scaffold1.fullAnswer) {
      content += `完整答案：\n${contentToText(result.scaffold1.fullAnswer)}\n\n`;
    }
  }

  if (result.scaffold2) {
    content += `【写作支架范例 2 - 句式引导式】\n`;
    content += `${'─'.repeat(30)}\n`;
    if (result.scaffold2.scaffold) {
      content += `支架内容：\n${contentToText(result.scaffold2.scaffold)}\n\n`;
    }
    if (result.scaffold2.fullAnswer) {
      content += `完整答案：\n${contentToText(result.scaffold2.fullAnswer)}\n\n`;
    }
  }

  if (result.exercises) {
    content += `【配套练习题】\n`;
    content += `${'─'.repeat(30)}\n`;
    content += `${contentToText(result.exercises)}\n\n`;
  }

  if (result.answerKey) {
    content += `【练习题答案】\n`;
    content += `${'─'.repeat(30)}\n`;
    content += `${contentToText(result.answerKey)}\n\n`;
  }

  content += `\n${'='.repeat(50)}\n`;
  content += `本内容由英语AI教学工具平台生成\n`;
  content += `AI模型：智谱清言 GLM-4\n`;

  // 创建Blob对象
  const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  // 创建下载链接
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // 生成文件名
  const fileName = `应用文写作支架练习_${topic.replace(/[^\w\u4e00-\u9fff]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;

  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function ApplicationWritingScaffold() {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const { currentUser: user, userPoints: points, isLoadingUser, refreshUser } = useUser();
  const router = useRouter();

  // 文件处理相关状态
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("请输入应用文题目");
      return;
    }

    if (!user) {
      router.push("/auth/signin");
      return;
    }

    if (points < 6) {
      setError("点数不足，需要6点数");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 调用API生成支架练习
      const response = await fetch("/api/ai/application-writing-scaffold", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      setResult(data);

      // 刷新用户点数
      await refreshUser();
    } catch (err) {
      console.error("生成支架练习失败:", err);
      setError(err instanceof Error ? err.message : "生成失败，请稍后重试");
      // 刷新用户点数以确保显示正确
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  // 处理图片OCR识别
  const handleImageOCR = async (file: File) => {
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    setIsProcessingFile(true);
    setUploadedFileName(file.name);

    try {
      // 转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // 移除data URL前缀，只保留base64数据
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 调用OCR API
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OCR识别失败');
      }

      if (data.success && data.result) {
        // 提取题目相关的文本
        const ocrText = data.result.trim();
        if (ocrText && ocrText !== '无文字内容') {
          setTopic(ocrText);
          toast.success('OCR识别成功，已自动填入题目');
        } else {
          toast.error('图片中未识别到有效文字');
        }
      } else {
        throw new Error('OCR识别返回空结果');
      }
    } catch (error) {
      console.error('OCR识别失败:', error);
      toast.error(error instanceof Error ? error.message : 'OCR识别失败');
    } finally {
      setIsProcessingFile(false);
      setUploadedFileName('');
    }
  };

  // 处理Word文件上传
  const handleWordUpload = async (file: File) => {
    if (!file) return;

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];

    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.docx') && !file.name.toLowerCase().endsWith('.doc')) {
      toast.error('请选择Word文件(.doc或.docx)');
      return;
    }

    setIsProcessingFile(true);
    setUploadedFileName(file.name);

    try {
      // 直接使用FormData发送文件
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/word/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Word文件处理失败');
      }

      const data = await response.json();

      if (data.success && data.text) {
        setTopic(data.text.trim());
        toast.success('Word文件内容已提取并填入题目');
      } else {
        throw new Error('Word文件内容提取失败');
      }
    } catch (error) {
      console.error('Word文件处理失败:', error);
      toast.error(error instanceof Error ? error.message : 'Word文件处理失败');
    } finally {
      setIsProcessingFile(false);
      setUploadedFileName('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* 回到首页按钮 - 移动端优化 */}
        <div className="flex justify-between items-center mb-4 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回首页</span>
            <span className="sm:hidden">返回</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm sm:text-base"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">首页</span>
          </Button>
        </div>

        {/* 头部信息 - 移动端优化 */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 text-center px-2">
              应用文写作支架练习
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4 leading-relaxed">
            基于您输入的英文作文题目，智能生成两个写作支架范例练习及配套练习题（词汇填空、句子翻译及思考题），语言难度保持欧标B1，句式难度B1-B2水平。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 px-4">
            <Badge variant="secondary" className="text-blue-700 bg-blue-50 text-xs sm:text-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              智谱清言 GLM-4
            </Badge>
            <Badge variant="secondary" className="text-purple-700 bg-purple-50 text-xs sm:text-sm">
              <Target className="w-3 h-3 mr-1" />
              消耗 6 积分
            </Badge>
          </div>
        </div>

        {/* 用户状态提示 - 移动端优化 */}
        {!isLoadingUser && user ? (
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 bg-white px-3 sm:px-4 py-2 rounded-full shadow-sm">
              <span>当前点数：<span className="font-semibold text-blue-600">{points}</span></span>
              <span className="hidden sm:inline">|</span>
              <span className="sm:hidden">·</span>
              <span>生成需要：<span className="font-semibold text-orange-600">6点数</span></span>
            </div>
          </div>
        ) : !isLoadingUser ? (
          <Alert className="mb-4 sm:mb-6 max-w-2xl mx-auto">
            <Users className="h-4 w-4" />
            <AlertDescription className="text-sm sm:text-base">
              请先
              <button
                onClick={() => router.push("/auth/signin")}
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                登录
              </button>
              后使用此功能
            </AlertDescription>
          </Alert>
        ) : (
          <div className="text-center mb-4 sm:mb-6">
            <span className="text-sm text-gray-500">正在加载用户状态...</span>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* 输入区域 - 移动端优化 */}
          <Card className="p-4 sm:p-6">
            <div className="space-y-4">
              <label className="block text-base sm:text-lg font-semibold text-gray-700">
                英文作文题目
              </label>

              {/* 文件上传按钮区域 - 移动端优化 */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                {/* 图片OCR上传 */}
                <Button
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="flex-1 min-w-[120px] sm:flex-none text-sm sm:text-base"
                  size="sm"
                >
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {isProcessingFile && uploadedFileName ? '识别中...' : '拍照/传图'}
                </Button>

                {/* Word文件上传 */}
                <Button
                  variant="outline"
                  onClick={() => wordInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="flex-1 min-w-[120px] sm:flex-none text-sm sm:text-base"
                  size="sm"
                >
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  {isProcessingFile && uploadedFileName ? '处理中...' : '传Word文件'}
                </Button>
              </div>

              {/* 隐藏的文件输入框 */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageOCR(file);
                }}
                style={{ display: 'none' }}
              />
              <input
                ref={wordInputRef}
                type="file"
                accept=".doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleWordUpload(file);
                }}
                style={{ display: 'none' }}
              />

              {/* 文件处理状态提示 - 移动端优化 */}
              {isProcessingFile && (
                <div className="flex items-center gap-2 p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-blue-600" />
                  <span className="text-xs sm:text-sm text-blue-700 truncate">
                    正在处理: {uploadedFileName}
                  </span>
                </div>
              )}

              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="请输入英文作文题目，例如：A Charity Book Fair、An Unforgettable Experience、My Favorite Hobby..."
                className="min-h-[100px] sm:min-h-[120px] resize-none border-2 focus:border-blue-500 text-sm sm:text-base"
                disabled={isLoading}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
                  {topic.trim().length} 字符
                </span>
                <Button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || isLoading || !user || points < 6}
                  className="w-full sm:w-auto px-4 sm:px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base order-1 sm:order-2"
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                      <span className="truncate">生成中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      生成练习 (6点数)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 结果展示 - 移动端优化 */}
          {result && (
            <div className="space-y-4 sm:space-y-6">
              {/* 支架练习结果 */}
              <Card className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6">
                  {/* 写作支架范例 1 - 结构引导式 */}
                  {result.scaffold1 && (
                    <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-blue-700">
                        写作支架范例 1 (结构引导式)
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                        这种支架通过填空来帮助你清晰地组织文章的各个要素。
                      </p>

                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
                        <h4 className="font-semibold mb-2 text-sm sm:text-base">支架 (Scaffold):</h4>
                        <div className="text-xs sm:text-sm bg-white p-3 sm:p-4 rounded border leading-relaxed">
                          {renderContent(result.scaffold1.scaffold)}
                        </div>
                      </div>

                      {result.scaffold1.fullAnswer && (
                        <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-green-700 text-sm sm:text-base">完整答案 (Full Answer):</h4>
                          <div className="text-xs sm:text-sm bg-white p-3 sm:p-4 rounded border leading-relaxed">
                            {renderContent(result.scaffold1.fullAnswer)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 写作支架范例 2 - 句式引导式 */}
                  {result.scaffold2 && (
                    <div className="border-l-4 border-purple-500 pl-3 sm:pl-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-purple-700">
                        写作支架范例 2 (句式引导式)
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                        这种支架提供关键句式和连接词，让你在有引导的情况下，更自由地组织语言。
                      </p>

                      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
                        <h4 className="font-semibold mb-2 text-sm sm:text-base">支架 (Scaffold):</h4>
                        <div className="text-xs sm:text-sm bg-white p-3 sm:p-4 rounded border leading-relaxed">
                          {renderContent(result.scaffold2.scaffold)}
                        </div>
                      </div>

                      {result.scaffold2.fullAnswer && (
                        <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                          <h4 className="font-semibold mb-2 text-green-700 text-sm sm:text-base">完整答案 (Full Answer):</h4>
                          <div className="text-xs sm:text-sm bg-white p-3 sm:p-4 rounded border leading-relaxed">
                            {renderContent(result.scaffold2.fullAnswer)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 配套练习题 */}
                  {result.exercises && (
                    <div className="border-l-4 border-orange-500 pl-3 sm:pl-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-orange-700">
                        配套练习题 (Exercises)
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                        根据以上支架内容，完成以下练习。
                      </p>

                      <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                        <div className="text-xs sm:text-sm bg-white p-3 sm:p-4 rounded border leading-relaxed">
                          {renderContent(result.exercises)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 练习题答案 */}
                  {result.answerKey && (
                    <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-green-700">
                        练习题答案 (Answer Key)
                      </h3>

                      <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                        <div className="text-xs sm:text-sm bg-white p-3 sm:p-4 rounded border leading-relaxed">
                          {renderContent(result.answerKey)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 使用说明 - 移动端优化 */}
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2 text-blue-700 text-sm sm:text-base">
                      💡 使用建议
                    </h4>
                    <ul className="text-xs sm:text-sm text-gray-700 space-y-1 sm:space-y-2 list-disc list-inside leading-relaxed">
                      <li>先尝试在结构引导式支架中填空，熟悉文章基本框架</li>
                      <li>然后使用句式引导式支架，练习更灵活的表达</li>
                      <li>完成配套练习题（词汇填空、句子翻译、思考题），巩固相关词汇和句型</li>
                      <li>语言难度保持在欧标B1水平，适合中级学习者</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* 操作按钮 - 移动端优化 */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 px-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setTopic("");
                  }}
                  className="w-full sm:w-auto text-sm sm:text-base"
                  size="sm"
                >
                  重新开始
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const content = document.querySelector('.bg-white.p-3.sm\\:p-4.rounded.border');
                    if (content) {
                      navigator.clipboard.writeText(content.textContent || '');
                      toast.success('已复制到剪贴板');
                    }
                  }}
                  className="w-full sm:w-auto text-sm sm:text-base"
                  size="sm"
                >
                  复制结果
                </Button>
                <Button
                  onClick={() => {
                    downloadAsWord(result, topic);
                  }}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base"
                  size="sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  下载Word文档
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}