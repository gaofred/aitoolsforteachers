"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Brain, Target, Lightbulb, Search, Copy, Check, Upload, FileText, Loader2, FileText as FileWord, FileDown, FilePlus, CloudUpload, FileImage, FileCheck, Eye, Globe, Star, Sparkles } from "lucide-react";
import { useUser } from "@/lib/user-context";
import toast from "react-hot-toast";

interface AnalysisResult {
  fundamentalProblem: string;
  perspective: string;
  keyMethod: string;
  coreFinding: string;
  methodFormula: string;
  coreValueSummary: string;
  simpleSummary: string;
}

export default function AcademicEssayReading() {
  const router = useRouter();
  const { currentUser, userPoints, refreshUser } = useUser();
  const [essayText, setEssayText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [simpleExplanationResult, setSimpleExplanationResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSimpleExplaining, setIsSimpleExplaining] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // 文件处理相关状态
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [fileReady, setFileReady] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  const toolCost = 4;

  // 简化的文件处理功能初始化 - 仅设置状态标志
  useEffect(() => {
    console.log('文件处理功能初始化开始...');

    // 确保只在客户端运行
    if (typeof window === 'undefined') {
      console.log('服务器端，跳过文件处理初始化');
      return;
    }

    // 直接设置为ready，实际导入在处理时进行
    setFileReady(true);
    console.log('文件处理功能标记为就绪');

    // 延迟显示成功消息
    setTimeout(() => {
      toast.success('文件上传功能已准备就绪');
      console.log('文件处理功能初始化完成');
    }, 1000);
  }, []);

  const handleAnalyze = async () => {
    if (!essayText.trim()) {
      toast.error("请输入要分析的论文内容");
      return;
    }

    if (!currentUser) {
      toast.error("请先登录");
      router.push("/auth/signin");
      return;
    }

    if (userPoints < toolCost) {
      toast.error(`点数不足，需要 ${toolCost} 个点数`);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/ai/academic-essay-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: essayText
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("请先登录");
          router.push("/auth/signin");
          return;
        }
        if (response.status === 400 && data.error?.includes("点数不足")) {
          toast.error(data.error);
          await refreshUser();
          return;
        }
        throw new Error(data.error || "分析失败");
      }

      setAnalysisResult(data.result);
      await refreshUser();
      toast.success(`分析完成！消耗 ${toolCost} 个点数`);

    } catch (error) {
      console.error("论文分析错误:", error);
      toast.error(error instanceof Error ? error.message : "分析失败，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimpleExplanation = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!essayText.trim()) {
      toast.error("请输入要解读的论文内容");
      return;
    }

    if (!currentUser) {
      toast.error("请先登录");
      router.push("/auth/signin");
      return;
    }

    const simpleCost = 3; // 大白话解读消耗3点数

    if (userPoints < simpleCost) {
      toast.error(`点数不足，需要 ${simpleCost} 个点数`);
      return;
    }

    setIsSimpleExplaining(true);
    setSimpleExplanationResult(null);

    try {
      const response = await fetch("/api/ai/simple-explanation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: essayText,
          type: "academic_essay" // 指定这是学术论文的大白话解读
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("请先登录");
          router.push("/auth/signin");
          return;
        }
        if (response.status === 400 && data.error?.includes("点数不足")) {
          toast.error(data.error);
          await refreshUser();
          return;
        }
        throw new Error(data.error || "解读失败");
      }

      // 直接保存大白话解读的结果
      setSimpleExplanationResult(data.result);
      await refreshUser();
      toast.success(`大白话解读完成！消耗 ${simpleCost} 个点数`);

    } catch (error) {
      console.error("大白话解读错误:", error);
      toast.error(error instanceof Error ? error.message : "解读失败，请稍后重试");
    } finally {
      setIsSimpleExplaining(false);
    }
  };

  const handleCopy = async (content: string, section: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(section);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast.error("复制失败");
    }
  };

  // 将JSON格式的大白话解读转换为自然文本格式
  const formatSimpleExplanation = (data: any) => {
    if (!data) return '暂无内容';

    // 如果是完整的科普文章（simpleExplanation很长），优先显示文章内容
    if (data.simpleExplanation && data.simpleExplanation.length > 200) {
      let content = `📖 **科普解读**\n\n${data.simpleExplanation}\n\n`;

      // 如果有要点且不是默认提示，作为补充显示
      if (data.keyPoints && data.keyPoints.length > 0 && data.keyPoints[0] !== "解读完成，请查看详细内容") {
        content += `\n🎯 **核心要点**\n\n`;
        data.keyPoints.forEach((point: string, index: number) => {
          content += `${index + 1}. ${point}\n`;
        });
      }

      return content.trim();
    }

    // 如果是JSON格式的详细分析，按结构化显示
    let content = '';

    // 核心解读
    if (data.simpleExplanation) {
      content += `📖 **核心解读**\n\n${data.simpleExplanation}\n\n`;
    }

    // 核心要点
    if (data.keyPoints && data.keyPoints.length > 0) {
      content += `🎯 **核心要点**\n\n`;
      data.keyPoints.forEach((point: string, index: number) => {
        content += `${index + 1}. ${point}\n`;
      });
      content += '\n';
    }

    // 方法论/研究方法
    if (data.methodology) {
      content += `🔬 **研究方法**\n\n${data.methodology}\n\n`;
    }

    // 现实意义
    if (data.implications) {
      content += `💡 **现实意义**\n\n${data.implications}\n\n`;
    }

    // 研究优势
    if (data.strengths) {
      content += `⭐ **研究亮点**\n\n${data.strengths}\n\n`;
    }

    // 研究局限
    if (data.limitations) {
      content += `⚠️ **研究局限**\n\n${data.limitations}\n\n`;
    }

    // 研究贡献
    if (data.contributions) {
      content += `🎁 **研究贡献**\n\n${data.contributions}\n\n`;
    }

    // 实际应用
    if (data.practicalApplications) {
      content += `🚀 **实际应用**\n\n${data.practicalApplications}\n\n`;
    }

    // 未来研究
    if (data.futureResearch) {
      content += `🔮 **未来研究**\n\n${data.futureResearch}\n\n`;
    }

    // 相关研究
    if (data.relatedWork) {
      content += `📚 **相关研究**\n\n${data.relatedWork}`;
    }

    return content.trim();
  };

  // PDF文本提取功能 - 调用后端API
  const extractTextFromPDF = async (file: File) => {
    console.log('extractTextFromPDF被调用了！fileReady状态:', fileReady);

    // 确保只在客户端运行
    if (typeof window === 'undefined') {
      console.log('服务器端，跳过PDF处理');
      return;
    }

    if (!fileReady) {
      console.log('fileReady为false，等待初始化完成...');
      toast.error("文件处理库正在加载中，请稍后再试");
      return;
    }

    console.log('开始调用后端PDF解析API:', file.name);
    setIsProcessingFile(true);
    setUploadedFileName(file.name);

    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);

      console.log('发送请求到后端API...');

      // 调用后端API
      const response = await fetch('/api/pdf/extract', {
        method: 'POST',
        body: formData,
      });

      console.log('后端API响应状态:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDF解析失败');
      }

      const result = await response.json();
      console.log('PDF解析结果:', result);

      if (result.success && result.text) {
        setEssayText(result.text);

        let successMessage = `PDF解析成功！提取了 ${result.text.length} 个字符`;
        if (result.truncated) {
          successMessage += '（文本已截断）';
        }
        successMessage += `，共 ${result.pages} 页`;

        toast.success(successMessage);
      } else {
        // 显示错误信息，但仍然提供一些有用的提示
        const errorText = `PDF解析失败：
${result.error}

PDF文件信息：
文件名：${file.name}
文件大小：${Math.round(file.size / 1024)}KB
文件类型：PDF文档

请尝试以下方法：
1. 手动复制PDF中的文本内容粘贴到下方文本框
2. 确认PDF不是扫描版图片
3. 检查PDF是否受密码保护
4. 尝试使用其他PDF工具提取文本`;

        setEssayText(errorText);
        toast.error('PDF解析失败，请查看详细信息');
      }

    } catch (error) {
      console.error("PDF处理错误:", error);

      let errorMessage = "PDF文件处理失败";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Word文件处理功能 - 暂时显示提示信息
  const processWordFile = async (file: File) => {
    console.log('processWordFile被调用了！', file.name);

    // 确保只在客户端运行
    if (typeof window === 'undefined') {
      console.log('服务器端，跳过Word处理');
      return;
    }

    setIsProcessingFile(true);
    setUploadedFileName(file.name);

    try {
      // 暂时显示Word文件处理提示
      const infoText = `Word文件处理功能开发中...

文件信息：
文件名：${file.name}
文件大小：${Math.round(file.size / 1024)}KB
文件类型：Word文档

目前功能：
✅ 已支持PDF文件自动文本提取
🚧 Word文件解析功能正在开发中

临时解决方案：
1. 在Word中手动复制文本内容
2. 将Word另存为PDF格式
3. 然后使用PDF上传功能
4. 或直接将文本粘贴到下方文本框

敬请期待Word文件自动解析功能！`;

      setEssayText(infoText);
      toast.info('Word文件处理功能开发中，请查看详细信息');

    } catch (error) {
      console.error("Word处理错误:", error);
      toast.error("Word文件处理失败");
    } finally {
      setIsProcessingFile(false);
    }
  };

  // 处理PDF文件上传
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('PDF上传触发', event.target.files);
    const file = event.target.files?.[0];

    if (!file) {
      console.log('没有选择文件');
      return;
    }

    console.log('选择的文件:', file.name, file.type, file.size);

    // 检查文件类型
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("请选择PDF文件");
      return;
    }

    // 检查文件大小 (限制10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

    if (file.size > maxSize) {
      const errorText = `PDF文件过大，无法处理！

文件信息：
• 文件名：${file.name}
• 当前大小：${fileSizeMB} MB
• 最大限制：10 MB

建议解决方案：
1️⃣ 压缩PDF文件（使用在线压缩工具）
2️⃣ 删除不必要的图片或页面
3️⃣ 重新导出为优化版PDF
4️⃣ 或者手动复制文本内容粘贴到下方文本框

💡 小提示：大部分论文文本内容通常只占几百KB，主要是图片和图表使文件变大`;

      toast.error(errorText, {
        duration: 8000, // 显示8秒
        style: {
          maxWidth: '500px',
          textAlign: 'left'
        }
      });
      return;
    }

    // 先显示文件名，表示上传成功
    setUploadedFileName(file.name);

    // 显示文件信息（复用之前计算的fileSizeMB）
    const fileSizeText = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${fileSizeMB} MB`;

    toast.success(`PDF文件已选择：${file.name} (${fileSizeText})`, {
      duration: 3000
    });

    console.log('准备调用extractTextFromPDF函数...');
    await extractTextFromPDF(file);
    console.log('extractTextFromPDF函数调用完成');
  };

  // 处理Word文件上传
  const handleWordUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Word上传触发', event.target.files);
    const file = event.target.files?.[0];

    if (!file) {
      console.log('没有选择文件');
      return;
    }

    console.log('选择的文件:', file.name, file.type, file.size);

    // 检查文件类型
    const wordTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.ms-word', // .doc
    ];

    const isWordFile = wordTypes.some(type => file.type === type) ||
                      file.name.toLowerCase().endsWith('.docx') ||
                      file.name.toLowerCase().endsWith('.doc');

    if (!isWordFile) {
      toast.error("请选择Word文件(.doc或.docx)");
      return;
    }

    // 检查文件大小 (限制10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const fileSizeMB_W = (file.size / 1024 / 1024).toFixed(2);

    if (file.size > maxSize) {
      const errorText = `Word文件过大，无法处理！

文件信息：
• 文件名：${file.name}
• 当前大小：${fileSizeMB_W} MB
• 最大限制：10 MB

建议解决方案：
1️⃣ 压缩图片内容（删除不必要的图片）
2️⃣ 另存为较小的文件格式
3️⃣ 复制文本内容到PDF或直接粘贴
4️⃣ 或者手动复制文本内容粘贴到下方文本框

💡 小提示：您也可以将Word文件另存为PDF格式，然后使用PDF上传功能`;

      toast.error(errorText, {
        duration: 8000,
        style: {
          maxWidth: '500px',
          textAlign: 'left'
        }
      });
      return;
    }

    // 先显示文件名，表示上传成功
    setUploadedFileName(file.name);

    // 显示文件信息（复用之前计算的fileSizeMB）
    const fileSizeText = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${fileSizeMB_W} MB`;

    toast.success(`Word文件已选择：${file.name} (${fileSizeText})`, {
      duration: 3000
    });

    console.log('准备调用processWordFile函数...');
    await processWordFile(file);
    console.log('processWordFile函数调用完成');
  };

  // 清除上传的文件
  const clearUploadedFile = () => {
    setUploadedFileName("");
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
    if (wordInputRef.current) {
      wordInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回主页</span>
            <span className="sm:hidden">返回</span>
          </Button>
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">一键看懂学术论文</h1>
            </div>
            <div className="flex items-center gap-1 ml-7 sm:ml-8">
              <div className="h-px bg-gradient-to-r from-blue-200 to-purple-200 w-4 sm:w-6"></div>
              <p className="text-xs text-gray-600 italic font-medium hidden xs:block">
                提示词来源：
                <span className="text-blue-600 font-bold">宝玉</span>
                <span className="text-gray-400 mx-1">&</span>
                <span className="text-purple-600 font-bold">李继刚</span>
                <span className="text-gray-400 ml-1">联合设计</span>
              </p>
              <p className="text-xs text-gray-600 italic font-medium block xs:hidden">
                宝玉 & 李继刚 联合设计
              </p>
              <div className="h-px bg-gradient-to-r from-purple-200 to-blue-200 flex-1"></div>
            </div>
          </div>
          <Badge variant="secondary" className="ml-0 sm:ml-auto text-xs">
            {toolCost}点数
          </Badge>
        </div>

        {/* 主要内容区域 - 垂直布局 */}
        <div className="space-y-8">
          {/* 上方：论文输入区域 */}
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  论文内容
                  {uploadedFileName && (
                    <Badge variant="secondary" className="ml-2">
                      {uploadedFileName.toLowerCase().endsWith('.pdf') ? '来自PDF' : '来自Word'}: {uploadedFileName}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 文本输入区域 */}
                <div className="relative">
                  <div className="absolute top-2 left-2 z-10">
                    <p className="text-xs text-gray-500 font-medium hidden xs:block">
                      请粘贴论文内容或点击右侧按钮上传文件
                    </p>
                    <p className="text-xs text-gray-500 font-medium block xs:hidden">
                      粘贴论文内容
                    </p>
                  </div>
                  <Textarea
                    placeholder=""
                    value={essayText}
                    onChange={(e) => {
                      setEssayText(e.target.value);
                      if (uploadedFileName && !e.target.value.trim()) {
                        clearUploadedFile();
                      }
                    }}
                    className="min-h-[300px] sm:min-h-[400px] resize-none leading-relaxed text-sm sm:text-base pt-8 sm:pt-12"
                    style={{
                      minHeight: '300px',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6'
                    }}
                    disabled={isProcessingFile}
                  />

                  {/* 右上角上传按钮组 */}
                  <div className="absolute top-2 right-2 flex gap-1 sm:gap-2">
                    {/* PDF上传按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 border-red-200 shadow-sm transition-all duration-200 hover:shadow-md"
                      onClick={() => pdfInputRef.current?.click()}
                      disabled={isProcessingFile || isAnalyzing}
                      title="上传PDF文件"
                    >
                      {isProcessingFile ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="hidden xs:inline">PDF</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline text-xs">PDF</span>
                        </div>
                      )}
                    </Button>

                    {/* Word上传按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 sm:h-8 px-2 sm:px-3 text-xs font-medium bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border-blue-200 shadow-sm transition-all duration-200 hover:shadow-md"
                      onClick={() => wordInputRef.current?.click()}
                      disabled={isProcessingFile || isAnalyzing}
                      title="上传Word文件"
                    >
                      {isProcessingFile ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="hidden xs:inline">Word</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <FilePlus className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline text-xs">Word</span>
                        </div>
                      )}
                    </Button>

                    {uploadedFileName && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md"
                        onClick={clearUploadedFile}
                        disabled={isAnalyzing}
                        title="清除文件内容"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    )}
                  </div>

                  {/* 隐藏的文件输入 */}
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    disabled={isProcessingFile || isAnalyzing}
                  />
                  <input
                    ref={wordInputRef}
                    type="file"
                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-word"
                    onChange={handleWordUpload}
                    className="hidden"
                    disabled={isProcessingFile || isAnalyzing}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  {/* 用户点数信息 */}
                  <div className="flex justify-start">
                    <div className="text-sm text-gray-600">
                      {currentUser ? (
                        <span>当前点数: <span className="font-semibold text-blue-600">{userPoints}</span></span>
                      ) : (
                        <span className="text-red-600">请先登录使用此功能</span>
                      )}
                    </div>
                  </div>

                  {/* 按钮组 */}
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
                    {/* 大白话解读按钮 */}
                    <Button
                      variant="outline"
                      onClick={(e) => handleSimpleExplanation(e)}
                      disabled={!essayText.trim() || isAnalyzing || isProcessingFile || !currentUser || userPoints < Math.floor(toolCost * 0.6)}
                      className="w-full sm:w-fit px-4 sm:px-6 py-2.5 sm:py-2 border-2 border-orange-300 text-orange-700 bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 hover:border-orange-400 hover:text-orange-800 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base"
                    >
                      {isSimpleExplaining ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>解读中...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          <span className="truncate">大白话解读</span>
                          <span className="hidden xs:inline">（3点数）</span>
                        </div>
                      )}
                    </Button>

                    <Button
                      onClick={handleAnalyze}
                      disabled={!essayText.trim() || isAnalyzing || isProcessingFile || !currentUser || userPoints < toolCost}
                      className="w-full sm:w-fit px-4 sm:px-8 py-2.5 sm:py-2 text-sm sm:text-base"
                    >
                      {isAnalyzing ? (
                        <span>分析中...</span>
                      ) : (
                        <span className="truncate">整体理解论文</span>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* 中间：整体理解论文结果区域 */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  论文核心价值分析
                  <Badge variant="secondary" className="ml-auto">整体理解论文</Badge>
                </CardTitle>
                <p className="text-gray-600 text-sm">深度提炼论文的思想结构与核心贡献</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 四个核心要素 */}
                <div className="grid grid-cols-1 gap-4">
                  {/* 根本问题 */}
                  <Card className="relative group">
                    <CardHeader className="pb-2 sm:pb-3">
                      <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base">
                        <div className="flex items-center gap-2">
                          <Target className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                          <span className="font-medium">根本问题</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(analysisResult.fundamentalProblem, "problem")}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 sm:h-6 sm:w-6"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-700 leading-relaxed text-xs sm:text-sm">{analysisResult.fundamentalProblem}</p>
                    </CardContent>
                  </Card>

                  {/* 研究视角 */}
                  <Card className="relative group">
                    <CardHeader className="pb-2 sm:pb-3">
                      <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base">
                        <div className="flex items-center gap-2">
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                          <span className="font-medium">研究视角</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(analysisResult.perspective, "perspective")}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-700 leading-relaxed text-xs sm:text-sm">{analysisResult.perspective}</p>
                    </CardContent>
                  </Card>

                  {/* 核心方法 */}
                  <Card className="relative group">
                    <CardHeader className="pb-2 sm:pb-3">
                      <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          <span className="font-medium">核心方法</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(analysisResult.keyMethod, "method")}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-700 leading-relaxed text-xs sm:text-sm">{analysisResult.keyMethod}</p>
                    </CardContent>
                  </Card>

                  {/* 核心发现 */}
                  <Card className="relative group">
                    <CardHeader className="pb-2 sm:pb-3">
                      <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                          <span className="font-medium">核心发现</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(analysisResult.coreFinding, "finding")}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-gray-700 leading-relaxed text-xs sm:text-sm">{analysisResult.coreFinding}</p>
                    </CardContent>
                  </Card>

                  {/* 方法公式 */}
                  {analysisResult.methodFormula && (
                    <Card className="relative group">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between gap-2 text-base">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-600" />
                            方法公式
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(analysisResult.methodFormula, "formula")}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="bg-gray-50 p-3 rounded-md border text-sm">
                          {analysisResult.methodFormula}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 核心价值总结 */}
                  <Card className="relative group bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-purple-600" />
                          核心价值总结
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(analysisResult.coreValueSummary, "core")}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm font-medium leading-relaxed">
                        {analysisResult.coreValueSummary}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 一句话总结 */}
                  <Card className="relative group bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-green-600" />
                          一句话总结
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(analysisResult.simpleSummary, "simple")}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm italic leading-relaxed">
                        {analysisResult.simpleSummary}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-center gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const content = `论文核心价值分析

根本问题：
${analysisResult.fundamentalProblem}

研究视角：
${analysisResult.perspective}

核心方法：
${analysisResult.keyMethod}

核心发现：
${analysisResult.coreFinding}

${analysisResult.methodFormula ? `方法公式：
${analysisResult.methodFormula}

` : ''}核心价值总结：
${analysisResult.coreValueSummary}

一句话总结：
${analysisResult.simpleSummary}`;
                      const element = document.createElement('a');
                      const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
                      element.href = URL.createObjectURL(file);
                      element.download = `论文分析_${Date.now().toLocaleDateString().replace(/\//g, '-')}.txt`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="w-3 h-3" />
                    保存分析
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 下方：大白话解读结果区域 */}
          {simpleExplanationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    <span className="text-lg sm:text-xl font-bold">大白话解读</span>
                  </div>
                  <Badge variant="secondary" className="sm:ml-auto text-xs">大白话解读</Badge>
                </CardTitle>
                <p className="text-gray-600 text-xs sm:text-sm">用最通俗易懂的语言解读学术论文</p>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* 解读内容 - 自然文本格式 */}
                <div className="relative group">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                      <span className="text-sm sm:text-base font-medium">解读内容</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(formatSimpleExplanation(simpleExplanationResult), "full")}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 sm:h-6 sm:w-6"
                    >
                      {copiedSection === "full" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                  <div className="prose prose-xs sm:prose-sm max-w-none">
                    <div className="text-gray-800 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap font-serif bg-gray-50 p-3 sm:p-4 rounded-md border">
                      {formatSimpleExplanation(simpleExplanationResult)}
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(formatSimpleExplanation(simpleExplanationResult), "full")}
                    className="flex items-center justify-center gap-2 w-full sm:w-fit text-xs sm:text-sm px-3 sm:px-4"
                  >
                    <Copy className="w-3 h-3" />
                    <span>复制内容</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const content = formatSimpleExplanation(simpleExplanationResult);
                      const element = document.createElement('a');
                      const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
                      element.href = URL.createObjectURL(file);
                      element.download = `论文解读_${Date.now().toLocaleDateString().replace(/\//g, '-')}.txt`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex items-center justify-center gap-2 w-full sm:w-fit text-xs sm:text-sm px-3 sm:px-4"
                  >
                    <FileDown className="w-3 h-3" />
                    <span>保存文本</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>
  );
}