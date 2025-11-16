"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Brain, BookOpen, Home, ArrowLeft, Image as ImageIcon, Upload, FileText, GraduationCap, Target, CheckCircle, Download } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MathRenderer } from "@/components/MathRenderer";
import WordExportService from "@/lib/word-export-service";

// 简化的数学内容渲染，直接返回文本
// 数学公式的渲染现在通过MathJaxRenderer组件处理
const renderMathContent = async (text: string): Promise<string> => {
  // 调试：输出AI原始响应
  console.log('🔍 AI原始响应内容类型:', typeof text);
  console.log('🔍 AI原始响应内容长度:', text?.length);
  if (typeof text === 'string') {
    console.log('🔍 前500字符:', text.substring(0, 500));
    console.log('🔍 是否包含$符号:', text.includes('$'));
    const dollarMatches = text.match(/\$/g);
    console.log('🔍 $符号数量:', dollarMatches ? dollarMatches.length : 0);

    // 分析$符号的使用模式
    const inlineMathMatches = text.match(/\$[^$]+\$/g);
    const blockMathMatches = text.match(/\$\$[^$]+\$\$/g);
    console.log('🔍 行内公式数量:', inlineMathMatches ? inlineMathMatches.length : 0);
    console.log('🔍 块级公式数量:', blockMathMatches ? blockMathMatches.length : 0);

    if (inlineMathMatches && inlineMathMatches.length > 0) {
      console.log('🔍 前5个行内公式样本:', inlineMathMatches.slice(0, 5));
    }
  }
  return text;
};

// 高级去重函数，移除重复的段落和句子
const deduplicateContent = (content: string): string => {
  // 首先检测是否有大段重复内容
  const contentSections = content.split(/\n##\s+/).filter(section => section.trim());

  // 如果发现多个相同的"## 📚 学科识别"模式，只保留第一个完整的section
  if (contentSections.length > 1) {
    console.log(`检测到大段重复内容 (${contentSections.length} 个section)，进行智能去重`);

    // 寻找第一个完整的回答section
    const firstSection = contentSections[0];
    const mainTitleMatch = firstSection.match(/^📚\s+学科识别/);

    if (mainTitleMatch) {
      // 只保留第一个完整的回答（从学科识别到知识拓展）
      const endPattern = /##\s+📖\s+知识拓展[\s\S]*?(?=##\s+|$)/;
      const completeAnswer = firstSection.match(/##\s+📚\s+学科识别[\s\S]*?(?=##\s+📖\s+知识拓展)/);

      if (completeAnswer) {
        // 找到知识拓展部分
        const knowledgeExtensionMatch = firstSection.match(/##\s+📖\s+知识拓展[\s\S]*/);
        let finalContent = completeAnswer[0];

        if (knowledgeExtensionMatch) {
          finalContent += '\n\n## 📖 知识拓展' + knowledgeExtensionMatch[0].replace(/##\s+📖\s+知识拓展/, '');
        }

        console.log('成功提取第一个完整回答，去除重复内容');
        return finalContent.trim();
      }
    }
  }

  // 常规去重逻辑
  const lines = content.split('\n').filter(line => line.trim());
  const seenLines = new Set<string>();
  const deduplicatedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 标准化：去除多余空格，转换为小写进行比较
    const normalizedLine = trimmedLine
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u4e00-\u9fff]/g, ''); // 保留中英文和数字，去除标点

    // 检查是否为重复行
    if (!seenLines.has(normalizedLine)) {
      seenLines.add(normalizedLine);
      deduplicatedLines.push(line);
    } else {
      console.log('发现重复行，已过滤:', trimmedLine.substring(0, 50));
    }
  }

  // 检查标题重复
  const seenTitles = new Set<string>();
  const finalLines = deduplicatedLines.filter((line) => {
    const trimmedLine = line.trim();

    // 检查各种标题模式
    const titlePatterns = [
      /^##\s+(.+)/,
      /^【(.+?)】/,
      /^\*\*(.+?)\*\*:/
    ];

    for (const pattern of titlePatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        const titleKey = match[1].toLowerCase().replace(/\s+/g, ' ');
        if (seenTitles.has(titleKey)) {
          console.log('发现重复标题，已过滤:', trimmedLine);
          return false;
        }
        seenTitles.add(titleKey);
        break;
      }
    }

    return true;
  });

  return finalLines.join('\n');
};

// 智能内容处理组件
const ProcessedContent: React.FC<{ content: any }> = ({ content }) => {
  const [processedContent, setProcessedContent] = useState<string>('');

  useEffect(() => {
    const processContent = async () => {
      try {
        // 只处理数学公式，不做复杂去重
        const result = await renderMathContent(content);
        setProcessedContent(result);
      } catch (error) {
        console.error('数学内容处理失败:', error);
        setProcessedContent(content);
      }
    };

    processContent();
  }, [content]);

  if (typeof content !== 'string') {
    // 非字符串内容直接显示
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    );
  }

  // 使用新的MathRenderer组件，支持混合文本和数学公式
  return (
    <MathRenderer className="text-gray-700 leading-relaxed space-y-3">
      {processedContent}
    </MathRenderer>
  );
};

// 智能渲染函数，处理不同的数据格式并支持数学符号
const renderContent = (content: any): JSX.Element => {
  return <ProcessedContent content={content} />;
};

export default function K12ProblemSolving() {
  const [problem, setProblem] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const { currentUser: user, userPoints: points, isLoadingUser, refreshUser } = useUser();
  const router = useRouter();

  // 文件处理相关状态
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isWordFile, setIsWordFile] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  // Word导出处理函数
  const handleExportWord = async () => {
    if (!result?.solution && !result) {
      toast.error('没有可导出的内容');
      return;
    }

    setIsExportingWord(true);

    try {
      const content = result.solution || result;

      // 导出选项
      const exportOptions = {
        title: 'K12学科解题解析',
        author: '英语AI教学工具',
        subject: '学科解析报告'
      };

      await WordExportService.exportK12Solution(content, exportOptions);

      toast.success('Word文档已生成并开始下载');
    } catch (error) {
      console.error('Word导出失败:', error);
      toast.error('Word导出失败，请稍后重试');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleSolve = async (isWordFile: boolean = false, wordFileData?: string, originalFileName?: string) => {
    // 防止重复提交
    if (isLoading) {
      console.log('请求已在进行中，忽略重复点击');
      return;
    }

    // 验证输入：文本、图片或Word文件
    if (!problem.trim() && !uploadedImage && !isWordFile) {
      setError("请输入题目内容、上传图片或上传Word文件");
      return;
    }

    if (!user) {
      router.push("/auth/signin");
      return;
    }

    if (points < 4) {
      setError("点数不足，需要4点数");
      return;
    }

    setIsLoading(true);
    setError("");

    // 如果是重试，增加计数
    if (error) {
      setRetryCount(prev => prev + 1);
    }

    try {
      let requestData: any = {};

      // 根据输入类型构建请求数据
      if (isWordFile && wordFileData) {
        // Word文件处理
        requestData = {
          problem: wordFileData,
          isImage: false,
          isWordFile: true,
          originalFileName: originalFileName
        };
      } else if (uploadedImage) {
        // 图片处理
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(uploadedImage);
        });
        requestData = {
          problem: base64,
          isImage: true,
          isWordFile: false
        };
      } else {
        // 文本处理
        requestData = {
          problem: problem.trim(),
          isImage: false,
          isWordFile: false
        };
      }

      // 调用API进行解题
      const response = await fetch("/api/ai/k12-problem-solving", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      let data;
      const responseText = await response.text();

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON解析失败，原始响应:', responseText);
        throw new Error('API返回格式错误，请稍后重试');
      }

      if (!response.ok) {
        // 检查是否有点数退款信息
        let errorMessage = data.error || "解题失败";
        if (data.details?.pointsRefunded) {
          errorMessage += ` (已退还${data.details.refundAmount}点数)`;
        }
        throw new Error(errorMessage);
      }

      setResult(data);
      setRetryCount(0); // 成功时重置重试计数

      // 刷新用户点数
      await refreshUser();
    } catch (err) {
      console.error("K12解题失败:", err);
      const errorMessage = err instanceof Error ? err.message : "解题失败，请稍后重试";

      // 优化错误消息显示
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('AI服务返回了空结果')) {
        userFriendlyMessage = "AI服务暂时繁忙，请稍后重试";
      } else if (errorMessage.includes('点数不足')) {
        userFriendlyMessage = "点数不足，请充值后使用";
      } else if (errorMessage.includes('用户认证失败')) {
        userFriendlyMessage = "请重新登录后使用此功能";
      } else if (errorMessage.includes('网络')) {
        userFriendlyMessage = "网络连接异常，请检查网络后重试";
      } else if (errorMessage.includes('已退还') && errorMessage.includes('点数')) {
        // 包含退款信息，直接使用
        userFriendlyMessage = errorMessage;
      }

      setError(userFriendlyMessage);
      // 如果重试次数超过3次，重置计数
      if (retryCount >= 3) {
        setRetryCount(0);
      }
      // 刷新用户点数以确保显示正确
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  // 处理图片直接分析（简化流程）
  const handleImageAnalysis = async (file: File) => {
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // 验证文件大小（限制为5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('图片文件过大，请控制在5MB以内');
      return;
    }

    setIsProcessingFile(true);
    setUploadedFileName(file.name);

    try {
      // 存储原始文件，API调用时再处理转换
      setUploadedImage(file);
      setProblem(""); // 清空文本输入
      toast.success('图片上传成功！点击"开始解析"即可进行多模态分析');
    } catch (error) {
      console.error('图片处理失败:', error);
      toast.error('图片处理失败，请重试');
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
    setUploadedFileName(`准备解析Word文档: ${file.name}`);

    // 显示开始提示
    const loadingToastId = toast.loading('📄 正在读取Word文档...', {
      duration: 2000
    });

    try {
      // 验证文件大小（限制为10MB）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('Word文件过大，请控制在10MB以内');
        setIsProcessingFile(false);
        setUploadedFileName('');
        toast.dismiss(loadingToastId);
        return;
      }

      // 更新状态为开始提取
      setUploadedFileName(`📖 正在提取文档文字...`);
      toast.success('📄 Word文档读取成功，正在提取文字内容...', {
        duration: 2000,
        id: loadingToastId
      });

      console.log('🔍 开始提取Word文件文字...');

      // 创建FormData来上传文件
      const formData = new FormData();
      formData.append('file', file);

      // 调用Word文件提取API
      const response = await fetch('/api/word/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Word文件提取失败');
      }

      const data = await response.json();

      if (data.success && (data.content || data.text)) {
        // Word文件提取成功，将提取的文字添加到输入框
        const extractedText = (data.content || data.text).trim();

        if (extractedText) {
          // 清空输入框并直接填入提取的文字
          const finalText = extractedText.length <= 6000 ? extractedText : extractedText.substring(0, 5990) + '...';

          setProblem(finalText);
          toast.success(`📖 Word文档解析成功！成功提取 ${finalText.length} 个字符到输入框（已清空原有内容）`, {
            duration: 4000,
            icon: '✅'
          });

          console.log('✅ Word文件提取完成，提取文字长度:', extractedText.length);
        } else {
          toast.warn('📄 Word文档解析完成，但未检测到有效文字内容', {
            duration: 3000
          });
        }
      } else {
        throw new Error(data.error || 'Word文件提取未返回结果');
      }

    } catch (error: any) {
      console.error('Word文件提取失败:', error);
      let errorMessage = 'Word文件提取失败，请重试';

      if (error.message.includes('格式') || error.message.includes('format')) {
        errorMessage = 'Word文件格式错误，请确保文件是有效的.doc或.docx格式';
      } else if (error.message.includes('500') || error.message.includes('服务器')) {
        errorMessage = '服务器繁忙，请稍后重试';
      } else if (error.message) {
        errorMessage = `Word文件提取失败: ${error.message}`;
      }

      toast.error(errorMessage, {
        duration: 5000
      });
    } finally {
      setIsProcessingFile(false);
      setUploadedFileName('');
      // 确保所有loading toast都被清除
      toast.dismiss();
    }
  };

  // 处理拍照识图（阿里云OCR）
  const handleOCRImageUpload = async (file: File) => {
    if (!file) return;

    // 验证文件类型
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('请选择图片文件（JPG, PNG, WEBP, GIF）');
      return;
    }

    setIsOCRProcessing(true);
    setUploadedFileName(`准备上传图片: ${file.name}`);

    // 显示开始提示
    const loadingToastId = toast.loading('📸 正在准备图片...', {
      duration: 2000
    });

    try {
      // 将图片转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 验证文件大小（限制为10MB）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (base64.length > maxSize * 1.33) { // base64比原始文件大约大33%
        toast.error('图片文件过大，请控制在10MB以内');
        setIsOCRProcessing(false);
        setUploadedFileName('');
        toast.dismiss(loadingToastId);
        return;
      }

      // 更新状态为开始识别
      setUploadedFileName(`🤖 阿里云OCR识别中...`);
      toast.success('📸 图片上传成功，开始OCR识别...', {
        duration: 2000,
        id: loadingToastId
      });

      console.log('🔍 开始阿里云OCR识别...');

      // 显示识别进度提示（3秒后显示）
      const progressTimeout = setTimeout(() => {
        if (isOCRProcessing) {
          toast.loading('🔍 阿里云正在识别图片文字，请耐心等待...', {
            duration: 2000
          });
        }
      }, 2000);

      // 调用阿里云OCR API
      const response = await fetch('/api/ai/ocr-aliyun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [{
            data: base64,
            mimeType: file.type
          }],
          prompt: '识别图中文字，依次原文输出，不要增加其他多余的解释和说明'
        }),
      });

      clearTimeout(progressTimeout);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR识别失败');
      }

      const data = await response.json();

      if (data.success && data.result) {
        // OCR识别成功，将识别的文字提取到输入框
        const extractedText = data.result.trim();

        if (extractedText) {
          // 清空输入框并直接填入识别的文字
          const finalText = extractedText.length <= 6000 ? extractedText : extractedText.substring(0, 5990) + '...';

          setProblem(finalText);
          toast.success(`🎉 OCR识别成功！成功提取 ${finalText.length} 个字符到输入框（已清空原有内容）`, {
            duration: 4000,
            icon: '✅'
          });

          console.log('✅ 阿里云OCR识别完成，提取文字长度:', extractedText.length);
        } else {
          toast.warn('📷 OCR识别完成，但未检测到有效文字内容，请确保图片清晰度足够', {
            duration: 3000
          });
        }
      } else {
        throw new Error(data.error || 'OCR识别未返回结果');
      }

    } catch (error: any) {
      console.error('阿里云OCR识别失败:', error);
      let errorMessage = 'OCR识别失败，请重试';

      if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorMessage = 'OCR识别超时，请尝试压缩图片或使用更简单的图片';
      } else if (error.message.includes('500') || error.message.includes('服务器')) {
        errorMessage = '服务器繁忙，请稍后重试';
      } else if (error.message) {
        errorMessage = `OCR识别失败: ${error.message}`;
      }

      toast.error(errorMessage, {
        duration: 5000
      });
    } finally {
      setIsOCRProcessing(false);
      setUploadedFileName('');
      // 确保所有loading toast都被清除
      toast.dismiss();
    }
  };

  const getSelectedSubjectInfo = () => {
    return subjects.find(s => s.value === selectedSubject);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
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
            <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 text-center px-2">
              K12全能答疑
            </h1>
          </div>
          <div className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4 space-y-2 leading-relaxed">
            <p>专做K12阶段，涵盖小初高全能答疑</p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <span className="flex items-center gap-1 text-indigo-600">
                <Target className="w-3 h-3" />
                语数英理化生6大学科
              </span>
              <span className="flex items-center gap-1 text-purple-600">
                <CheckCircle className="w-3 h-3" />
                输出解析格式标准化
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <Brain className="w-3 h-3" />
                懂学科解题技巧
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 px-4">
            <Badge variant="secondary" className="text-blue-700 bg-blue-50 text-xs sm:text-sm">
              <Brain className="w-3 h-3 mr-1" />
              阿里云教育 AI
            </Badge>
            <Badge variant="secondary" className="text-purple-700 bg-purple-50 text-xs sm:text-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              语数英理化生6大学科（4点数）
            </Badge>
          </div>
        </div>

        {/* 用户状态提示 - 移动端优化 */}
        {!isLoadingUser && user ? (
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 bg-white px-3 sm:px-4 py-2 rounded-full shadow-sm">
              <span>当前点数：<span className="font-semibold text-indigo-600">{points}</span></span>
              <span className="hidden sm:inline">|</span>
              <span className="sm:hidden">·</span>
              <span>解题需要：<span className="font-semibold text-purple-600">4点数</span></span>
            </div>
          </div>
        ) : !isLoadingUser ? (
          <Alert className="mb-4 sm:mb-6 max-w-2xl mx-auto">
            <BookOpen className="h-4 w-4" />
            <AlertDescription className="text-sm sm:text-base">
              请先
              <button
                onClick={() => router.push("/auth/signin")}
                className="text-indigo-600 hover:text-indigo-800 underline ml-1"
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
                题目内容
              </label>

              {/* 文件上传按钮区域 - 移动端优化 */}
              <div className="space-y-2">
                {/* 智能识图和文件上传 */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {/* 智能识图 */}
                  <Button
                    variant="default"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleImageAnalysis(file);
                      };
                      input.click();
                    }}
                    disabled={isProcessingFile || isOCRProcessing}
                    className="flex-1 min-w-[140px] sm:flex-none text-sm sm:text-base bg-indigo-600 hover:bg-indigo-700 text-white"
                    size="sm"
                  >
                    <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {isProcessingFile && uploadedFileName ? '处理中...' : '📷 多模态识图'}
                  </Button>

                  {/* Word文件上传 */}
                  <Button
                    variant="outline"
                    onClick={() => wordInputRef.current?.click()}
                    disabled={isProcessingFile || isOCRProcessing}
                    className="flex-1 min-w-[120px] sm:flex-none text-sm sm:text-base"
                    size="sm"
                  >
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {isProcessingFile && uploadedFileName ? '处理中...' : '上传Word文件'}
                  </Button>

                  {/* 拍照识图（阿里云OCR入口） */}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleOCRImageUpload(file);
                      };
                      input.click();
                    }}
                    disabled={isProcessingFile || isOCRProcessing}
                    className="flex-1 min-w-[140px] sm:flex-none text-sm sm:text-base bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                    title="使用阿里云OCR识别图片中的文字（约需3-5秒）"
                  >
                    <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {isOCRProcessing ? '识别中...' : '📸 拍照识图'}
                  </Button>
                </div>

                {/* 提示信息 */}
                <div className="text-xs text-gray-500 text-center">
                  📷 多模态识图：阿里云通义千问VL模型，完整保留数学公式、图表、特殊符号格式
                  <br />📄 Word文件：支持.doc/.docx文档内容提取
                  <br />📸 拍照识图：阿里云OCR识别，提取文字到输入框编辑（约需3-5秒）
                  <br />💡 输入文本：阿里云+智谱清言解题，智能选择最优模型
                  <br />🚀 多模态架构：阿里云+智谱清言，稳定高效（4点数）
                </div>
              </div>

              {/* Word文件上传的隐藏输入框 */}
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
                <div className="flex items-center gap-2 p-2 sm:p-3 bg-indigo-50 rounded-lg">
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-indigo-600" />
                  <span className="text-xs sm:text-sm text-indigo-700 truncate">
                    正在处理: {uploadedFileName}
                  </span>
                </div>
              )}

              {/* 图片预览区域 */}
              {uploadedImage && (
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm text-indigo-700 font-medium">
                        📷 {uploadedImage.name}
                      </span>
                      <span className="text-xs text-indigo-600">
                        ({(uploadedImage.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUploadedImage(null);
                        setProblem("");
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              )}

              <Textarea
                value={problem}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 6000) {
                    setProblem(value);
                    setUploadedImage(null); // 输入文本时清除图片
                  }
                }}
                placeholder="请输入K12阶段各学科题目，或上传图片（支持公式、图表等特殊格式），系统将自动识别学科并提供标准格式的答案解析。

支持学科示例：
• 语文：分析古诗《静夜思》的表达技巧和思想情感
• 数学：求解方程 2x² + 5x - 3 = 0
• 英语：翻译句子并分析语法：The quick brown fox jumps over the lazy dog
• 物理：一个物体从10米高处自由落下，求落地时的速度（g=9.8m/s²）
• 化学：写出NaCl的化学式并计算其摩尔质量
• 生物：简述细胞呼吸的过程和意义

🔥 新功能：多模态识别，可准确分析数学公式、图表、特殊符号等格式，图片文件请控制在5MB以内"
                className="min-h-[200px] sm:min-h-[240px] resize-none border-2 focus:border-indigo-500 text-sm sm:text-base"
                disabled={isLoading || !!uploadedImage || isOCRProcessing || isProcessingFile}
                maxLength={6000}
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <span className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
                  {uploadedImage
                    ? '📷 图片已准备就绪'
                    : isOCRProcessing
                    ? '🔍 OCR识别中...'
                    : isProcessingFile && uploadedFileName.includes('正在提取')
                    ? uploadedFileName
                    : `${problem.length} / 6000 字符`
                  }
                </span>
                <Button
                  onClick={handleSolve}
                  disabled={(!problem.trim() && !uploadedImage) || isLoading || !user || points < 4}
                  className="w-full sm:w-auto px-4 sm:px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base order-1 sm:order-2"
                  size="sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                      <span className="truncate">解析中...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      开始解析 (4点数)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* 示例展示 - K12解题效果展示 */}
        {!result && !isLoading && (
          <Card className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">
                  📚 K12解题示例
                </h3>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-3 font-medium">物理题示例 - 欧姆定律</p>
                <p className="text-xs sm:text-sm text-gray-700 mb-3 leading-relaxed">
                  关于欧姆定律变形公式 <span className="font-mono bg-white px-2 py-1 rounded">R=U/I</span>，以下说法中正确的是：
                </p>
                <div className="text-xs sm:text-sm text-gray-700 mb-4 space-y-1">
                  <p>A. 导体的电阻与这段导体两端的电压成正比</p>
                  <p>B. 导体的电阻与这段导体的电流成反比</p>
                  <p>C. 电压一定时，导体中的电流越大，导体的电阻越大</p>
                  <p>D. 利用这个公式可以计算电阻，但是电阻和电压、电流无关</p>
                </div>

                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-medium text-green-700 mb-2">✅ AI解析结果：</p>
                  <div className="text-xs sm:text-sm text-gray-700 space-y-2 leading-relaxed">
                    <p><span className="font-semibold">【分析】</span>解题需明确电阻的本质属性，以及R=U/I作为计算电阻公式的物理意义。</p>
                    <p><span className="font-semibold">【详解】</span>导体的电阻是由材料、长度、横截面积和温度决定的，与电压、电流无关。因此选项D正确。</p>
                    <p><span className="font-semibold">【答案】</span> D</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProblem("关于欧姆定律变形公式 R=U/I，以下说法中正确的是：\nA. 导体的电阻与这段导体两端的电压成正比\nB. 导体的电阻与这段导体的电流成反比\nC. 电压一定时，导体中的电流越大，导体的电阻越大\nD. 利用这个公式可以计算电阻，但是电阻和电压、电流无关");
                  }}
                  className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  体验这个示例
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 错误提示 - 带重试功能 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-2">
                <span>{error}</span>
                {(error.includes('暂时繁忙') || error.includes('网络') || error.includes('请稍后重试')) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError("");
                      handleSolve();
                    }}
                    disabled={isLoading || retryCount >= 3}
                    className="w-fit"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        重试中...
                      </>
                    ) : (
                      <>
                        重试 ({retryCount}/3)
                      </>
                    )}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 结果展示 - 移动端优化 */}
          {result && (
            <div className="space-y-4 sm:space-y-6">
              {/* 解析结果 */}
              <Card className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6">
                  <div className="border-l-4 border-indigo-500 pl-3 sm:pl-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-indigo-700">
                        📋 标准解析结果
                      </h3>

                      {/* 下载Word按钮 */}
                      <Button
                        onClick={handleExportWord}
                        disabled={isExportingWord}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-xs sm:text-sm border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400"
                      >
                        <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        {isExportingWord ? (
                          <>
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            <span className="hidden sm:inline">导出中...</span>
                            <span className="sm:hidden">导出中</span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">下载Word</span>
                            <span className="sm:hidden">Word</span>
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="bg-indigo-50 p-3 sm:p-4 rounded-lg">
                      <div className="text-xs sm:text-sm bg-white p-3 sm:p-4 rounded border leading-relaxed max-h-[400px] sm:max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500">
                        {renderContent(result.solution || result)}
                      </div>
                    </div>
                  </div>

                  {/* 学习建议 - 移动端优化 */}
                  <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold mb-2 text-blue-700 text-sm sm:text-base">
                      🎯 学习技巧
                    </h4>
                    <ul className="text-xs sm:text-sm text-gray-700 space-y-1 sm:space-y-2 list-disc list-inside leading-relaxed">
                      <li>理解答案解析中的解题思路，掌握标准化解题方法</li>
                      <li>关注答案置信度，了解解题可靠性</li>
                      <li>练习同类题目，巩固解题技巧和知识点</li>
                      <li>结合教材内容，加深对学科概念的理解</li>
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
                    setProblem("");
                    setUploadedImage(null);
                  }}
                  className="w-full sm:w-auto text-sm sm:text-base"
                  size="sm"
                >
                  重新开始
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (result) {
                      const textToCopy = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
                      navigator.clipboard.writeText(textToCopy);
                      toast.success('已复制到剪贴板');
                    }
                  }}
                  className="w-full sm:w-auto text-sm sm:text-base"
                  size="sm"
                >
                  复制结果
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}