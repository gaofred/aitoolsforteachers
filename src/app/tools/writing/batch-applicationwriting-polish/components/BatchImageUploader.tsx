"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, X, Eye, Trash2, Camera, Loader2, RefreshCw } from "lucide-react";
import type { ApplicationBatchTask, ApplicationAssignment, OCRResult, ProcessingStats } from "../types";
import { compressImageForOCR } from "@/lib/image-compressor";

interface BatchImageUploaderProps {
  task: ApplicationBatchTask | null;
  setTask: (task: ApplicationBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
  processingStats: ProcessingStats;
  setProcessingStats: (stats: ProcessingStats) => void;
}

interface UploadedImage {
  id: string;
  file: File;
  originalFile: File; // 保存原始文件
  preview: string;
  status: 'pending' | 'compressing' | 'processing' | 'completed' | 'failed' | 'retrying';
  ocrResult?: OCRResult;
  error?: string;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
  retryCount?: number; // 重试次数
  maxRetries: number; // 最大重试次数
}

const BatchImageUploader: React.FC<BatchImageUploaderProps> = ({
  task,
  setTask,
  onNext,
  onPrev,
  processingStats,
  setProcessingStats
}) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [ocrProgressMessage, setOcrProgressMessage] = useState<string>('');
  const [skipCompression, setSkipCompression] = useState(false); // 新增：跳过压缩选项
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // 学生作文无图片数量限制
    const newImages: UploadedImage[] = Array.from(files).map(file => ({
      id: `img_${Date.now()}_${Math.random()}`,
      originalFile: file,
      file, // 临时设置为原文件，压缩后会更新
      preview: URL.createObjectURL(file),
      status: 'pending',
      retryCount: 0,
      maxRetries: 1 // 最多重试1次
    }));

    setUploadedImages(prev => [...prev, ...newImages]);

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 根据设置压缩或跳过压缩新上传的图片
    if (skipCompression) {
      console.log('⚠️ 跳过图片压缩，使用原始文件进行OCR识别');
      // 标记为已压缩（实际未压缩）
      setUploadedImages(prev => prev.map(img => ({
        ...img,
        status: 'pending' as const,
        compressionInfo: {
          originalSize: img.originalFile.size,
          compressedSize: img.originalFile.size,
          compressionRatio: 0
        }
      })));
    } else {
      await compressNewImages(newImages);
    }
  };

  // 压缩新上传的图片
  const compressNewImages = async (images: UploadedImage[]) => {
    for (const image of images) {
      try {
        // 更新状态为压缩中
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'compressing' }
              : img
          )
        );

        const compressedFile = await compressImageForOCR(image.originalFile);

        // 计算压缩信息
        const compressionInfo = {
          originalSize: image.originalFile.size,
          compressedSize: compressedFile.size,
          compressionRatio: Math.round((1 - compressedFile.size / image.originalFile.size) * 100)
        };

        // 更新图片信息
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? {
                  ...img,
                  file: compressedFile,
                  status: 'pending',
                  compressionInfo
                }
              : img
          )
        );

        console.log(`图片压缩完成: ${image.originalFile.name}`, {
          原始大小: `${(image.originalFile.size / 1024 / 1024).toFixed(2)}MB`,
          压缩后大小: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
          压缩率: `${compressionInfo.compressionRatio}%`
        });

      } catch (error) {
        console.error(`压缩图片失败: ${image.originalFile.name}`, error);

        // 压缩失败，使用原文件
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? {
                  ...img,
                  status: 'pending',
                  error: '压缩失败，使用原文件'
                }
              : img
          )
        );
      }
    }
  };

  // 删除图片
  const removeImage = (imageId: string) => {
    setUploadedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // 清理URL对象
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return updated;
    });
  };

  // 清空所有图片
  const clearAllImages = () => {
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
  };

  // OCR识别单张图片
  const processImage = async (image: UploadedImage): Promise<OCRResult | null> => {
    const attemptOCR = async (): Promise<OCRResult | null> => {
      try {
        // 将文件转换为base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(image.file);
        });

        const response = await fetch('/api/ai/image-recognition', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: base64
          })
        });

        const data = await response.json();

        if (data.success && data.result) {
          // 解析OCR结果，同时使用完整原文和纯英文内容
          return parseOCRResult(data.result, data.englishOnly, image.id);
        } else {
          throw new Error(data.error || 'OCR识别失败');
        }
      } catch (error) {
        console.error(`OCR处理失败 (尝试 ${image.retryCount ? image.retryCount + 1 : 1}):`, error);
        throw error;
      }
    };

    try {
      return await attemptOCR();
    } catch (error) {
      // 如果还有重试次数，则重试
      if (image.retryCount! < image.maxRetries) {
        console.log(`🔄 图片 ${image.id} 开始重试 (${image.retryCount! + 1}/${image.maxRetries})`);

        // 更新重试状态
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'retrying', retryCount: img.retryCount! + 1 }
              : img
          )
        );

        // 延迟1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const result = await attemptOCR();
          console.log(`✅ 图片 ${image.id} 重试成功`);
          return result;
        } catch (retryError) {
          console.error(`❌ 图片 ${image.id} 重试失败:`, retryError);
          throw retryError;
        }
      } else {
        // 重试次数用尽，直接抛出错误
        throw error;
      }
    }
  };

  // 手动重试单个图片
  const retrySingleImage = async (imageId: string) => {
    const image = uploadedImages.find(img => img.id === imageId);
    if (!image) {
      console.error('找不到要重试的图片:', imageId);
      return;
    }

    // 重置重试计数和状态
    const updatedImage = { ...image, status: 'processing' as const, retryCount: 0, error: undefined };
    setUploadedImages(prev => prev.map(img => img.id === imageId ? updatedImage : img));

    try {
      console.log(`🔄 手动重试图片: ${imageId}`);

      // 重新处理图片
      const ocrResult = await processImage(updatedImage);

      if (ocrResult) {
        // 创建作业记录
        const assignment = {
          id: `assignment_${Date.now()}_${Math.random()}`,
          student: {
            id: `temp_${ocrResult.studentName}_${imageId}`,
            name: ocrResult.studentName,
            createdAt: new Date()
          },
          ocrResult,
          status: 'pending' as const,
          createdAt: new Date()
        };

        // 更新图片状态为完成
        setUploadedImages(prev => prev.map(img =>
          img.id === imageId ? { ...img, status: 'completed', ocrResult, error: undefined } : img
        ));

        // 更新任务中的作业
        if (task) {
          setTask({
            ...task,
            assignments: [...(task.assignments || []), assignment]
          });
        }

        console.log(`✅ 手动重试成功: ${ocrResult.studentName}`);
      }
    } catch (error) {
      console.error(`❌ 手动重试失败: ${imageId}`, error);

      // 更新图片状态为失败
      setUploadedImages(prev => prev.map(img =>
        img.id === imageId
          ? {
              ...img,
              status: 'failed',
              error: error instanceof Error ? error.message : '手动重试失败',
              retryCount: img.retryCount || 0
            }
          : img
      ));
    }
  };

  // 智能修复文本分段问题
  const fixTextParagraphs = (text: string): string => {
    console.log('🔧 开始智能修复文本分段:', text.substring(0, 100));

    let fixedText = text;

    // 1. 修复常见的段落合并问题
    fixedText = fixedText
      // 在句号后换行（如果是段落结束）
      .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2')
      // 在标题后换行
      .replace(/(Notice|IMPORTANT|PLEASE NOTE)\s*/gi, '$1\n\n')
      // 在数字编号后换行（如 "1. 2. 3."）
      .replace(/(\d+\.)\s*/g, '$1\n')
      // 在冒号后换行（如果是应用文格式）
      .replace(/(:)\s*(?=[A-Z])/g, '$1\n');

    // 2. 修复错误的换行符
    fixedText = fixedText
      // 移除单词中间的错误换行
      .replace(/([a-zA-Z])-\n([a-zA-Z])/g, '$1$2')
      // 修复逗号后的错误换行（除非是句子结束）
      .replace(/,\n(?![A-Z])/g, ', ');

    // 3. 标准化换行符
    fixedText = fixedText
      .replace(/\n{3,}/g, '\n\n')  // 多个空行变成两个
      .replace(/\n\s*\n/g, '\n\n')  // 标准化段落间距
      .trim();

    // 4. 特殊处理应用文格式
    fixedText = fixedText
      // 确保标题独立成行
      .replace(/\s*(Notice|Dear|Sincerely|Regards|Best wishes)\s*/gi, '\n\n$1\n\n')
      // 确保时间地点等信息格式正确
      .replace(/(\d+:\d+\s*(AM|PM|am|pm))\s*/g, '$1\n')
      // 确保日期格式正确
      .replace(/(this\s+(Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday))\s*/gi, '$1\n');

    console.log('✅ 文本分段修复完成');
    return fixedText;
  };

  // 解析OCR结果
  const parseOCRResult = (originalText: string, englishOnlyText: string, imageId: string): OCRResult => {
    console.log('OCR识别的原始文本:', originalText);
    console.log('纯英文文本:', englishOnlyText);

    const lines = originalText.split('\n').filter(line => line.trim());
    console.log('按行分割后的文本:', lines);

    let studentName = "";
    let content = "";

    // 优化中文姓名识别逻辑
    let nameIndex = -1;

    // 1. 优先查找 "姓名：XXX" 或 "姓名: XXX" 格式
    const nameWithColonPattern = /^姓名[：:]\s*([\u4e00-\u9fa5]{2,4})/;
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      const nameMatch = line.match(nameWithColonPattern);
      if (nameMatch) {
        studentName = nameMatch[1];
        nameIndex = i;
        console.log(`✅ 识别到"姓名：XXX"格式: ${studentName}`);
        content = lines.slice(i + 1).join('\n');
        break;
      }
    }

    if (nameIndex === -1) {
      // 2. 查找 "中文姓名." 格式（如 "张三."）
      const nameWithDotPattern = /^[\u4e00-\u9fa5]{2,4}\.$/;
      nameIndex = lines.findIndex(line => nameWithDotPattern.test(line.trim()));

      if (nameIndex !== -1) {
        studentName = lines[nameIndex].trim().replace(/\.$/, '');
        console.log(`✅ 识别到姓名格式 "XX.": ${studentName}`);
        content = lines.slice(nameIndex + 1).join('\n');
      } else {
        // 3. 查找纯中文姓名（2-4个中文字符）
        const pureChineseNamePattern = /^[\u4e00-\u9fa5]{2,4}$/;
        nameIndex = lines.findIndex(line => pureChineseNamePattern.test(line.trim()));

        if (nameIndex !== -1) {
          studentName = lines[nameIndex].trim();
          console.log(`✅ 识别到纯中文姓名: ${studentName}`);
          content = lines.slice(nameIndex + 1).join('\n');
        } else {
          // 4. 从包含中文的行中提取姓名
          for (let i = 0; i < Math.min(3, lines.length); i++) {
            const line = lines[i].trim();
            const chineseNameMatch = line.match(/[\u4e00-\u9fa5]{2,4}/);
            if (chineseNameMatch) {
              studentName = chineseNameMatch[0];
              console.log(`✅ 从混合文本中提取中文姓名: ${studentName}`);
              content = lines.slice(i + 1).join('\n');
              break;
            }
          }
        }
      }
    }

    if (!studentName) {
      console.log('⚠️ 未找到中文姓名，使用默认值');
      studentName = "未识别";
      content = originalText;
    } else {
      // 智能修复文本分段问题
      content = fixTextParagraphs(content);
    }

    console.log('最终解析结果:', { studentName, contentLength: content.length });

    return {
      imageId,
      studentName,
      originalText: originalText, // 完整OCR原文（包含中文姓名）
      content: englishOnlyText.trim(), // 纯英文作文内容
      confidence: 0.8,
      processedAt: new Date()
    };
  };

  // 批量处理所有图片（并行处理）
  const processAllImages = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    setProcessingStats({
      ...processingStats,
      totalImages: uploadedImages.length,
      processedImages: 0,
      errors: []
    });

    // 将所有图片状态设置为处理中
    setUploadedImages(prev => prev.map(img => ({ ...img, status: 'processing' })));

    // 显示进度提醒 - 基于优化后的并发配置更新时间估算
    const estimatedMinutes = Math.ceil(uploadedImages.length / 8) + 1; // 8张图片约1分钟，加上批次间延迟
    const message = `AI识图中，请耐心等待... 预计${uploadedImages.length}张图片大约需要${estimatedMinutes}分钟（性能已优化）。`;
    console.log(`🎯 ${message}`);

    // 设置进度消息
    setOcrProgressMessage(message);

    const assignments: ApplicationAssignment[] = [];
    const errors: string[] = [];
    let completedCount = 0;

    // 分批并行处理图片，优化并发数平衡性能和稳定性
    const batchSize = 18; // 优化并发数：18张图片可以一次性并行处理，最大化性能
    const batches = [];

    for (let i = 0; i < uploadedImages.length; i += batchSize) {
      batches.push(uploadedImages.slice(i, i + batchSize));
    }

    console.log(`🚀 开始高性能并行处理 ${uploadedImages.length} 张图片，并发数: ${batchSize} 张/批次`);

    // 性能监控
    const startTime = Date.now();
    const allAssignments: ApplicationAssignment[] = [];
    let totalCompletedCount = 0;

    // 分批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      if (batch.length === uploadedImages.length) {
        console.log(`⚡ 超级并行模式：一次性处理全部 ${batch.length} 张图片！`);
      } else {
        console.log(`处理批次 ${batchIndex + 1}/${batches.length}，包含 ${batch.length} 张图片`);
      }

      const batchPromises = batch.map(async (image, batchLocalIndex) => {
        const globalIndex = batchIndex * batchSize + batchLocalIndex;
        let assignment: ApplicationAssignment | null = null;

        try {
          console.log(`开始并行处理图片 ${globalIndex + 1}/${uploadedImages.length}`);

          const ocrResult = await processImage(image);

          if (ocrResult) {
            // 创建作业记录
            assignment = {
              id: `assignment_${Date.now()}_${Math.random()}_${globalIndex}`,
              student: {
                id: `temp_${ocrResult.studentName}_${globalIndex}`,
                name: ocrResult.studentName,
                createdAt: new Date()
              },
              ocrResult,
              status: 'pending',
              createdAt: new Date()
            };

            // 更新图片状态为完成
            setUploadedImages(prev => prev.map(img =>
              img.id === image.id ? { ...img, status: 'completed', ocrResult } : img
            ));

            console.log(`✅ 图片 ${globalIndex + 1} 处理完成: ${ocrResult.studentName}`);
          }

          return { success: true, globalIndex, assignment };

        } catch (error) {
          console.error(`❌ 处理图片 ${globalIndex + 1} 失败:`, error);
          const errorMsg = `图片 ${globalIndex + 1}: ${error instanceof Error ? error.message : '处理失败'}`;
          errors.push(errorMsg);

          // 更新图片状态为失败
          setUploadedImages(prev => prev.map(img =>
            img.id === image.id ? {
              ...img,
              status: 'failed',
              error: error instanceof Error ? error.message : '处理失败'
            } : img
          ));

          return { success: false, globalIndex, error: errorMsg };
        }
      });

      // 等待当前批次完成
      console.log(`⏳ 等待批次 ${batchIndex + 1} 完成...`);
      const batchResults = await Promise.allSettled(batchPromises);

      // 处理批次结果
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { assignment } = result.value;
          if (assignment) {
            allAssignments.push(assignment);
          }
        }
        totalCompletedCount++;
      });

      // 更新总体进度
      setProcessingStats(prev => ({
        ...prev,
        processedImages: totalCompletedCount
      }));

      console.log(`✅ 批次 ${batchIndex + 1} 完成，累计完成 ${totalCompletedCount}/${uploadedImages.length}`);

      // 批次间延迟，避免API限流（除了最后一批）
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ 等待1秒后处理下一批次，避免API限流...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📊 所有批次处理完成: ${allAssignments.length}/${uploadedImages.length} 成功`);

    // 更新任务
    if (task) {
      setTask({
        ...task,
        assignments: allAssignments
      });
    }

    setProcessingStats(prev => ({
      ...prev,
      errors
    }));

    // 性能统计
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // 转换为秒
    const avgTimePerImage = totalTime / uploadedImages.length;
    const concurrencyRatio = Math.min(batchSize, uploadedImages.length);

    console.log(`🎉 处理完成！性能统计：
    📊 总图片数: ${uploadedImages.length} 张
    ⚡ 并发数: ${concurrencyRatio} 张/批次
    ⏱️ 总耗时: ${totalTime.toFixed(2)} 秒
    📈 平均每张: ${avgTimePerImage.toFixed(2)} 秒
    🚀 性能提升: ${(concurrencyRatio * 100).toFixed(0)}% 相比串行处理`);

    // 清除进度消息
    setOcrProgressMessage('');

    setIsProcessing(false);
  };

  const canProceed = uploadedImages.length > 0 && uploadedImages.every(img => img.status === 'completed');
  const hasProcessedImages = uploadedImages.some(img => img.status === 'completed');
  const canStartOCR = uploadedImages.length > 0 && uploadedImages.every(img => img.status === 'pending');
  const hasCompressingImages = uploadedImages.some(img => img.status === 'compressing');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">批量OCR识别</h2>
        <p className="text-gray-600 text-sm">
          上传学生应用文作业图片，系统将自动识别文字内容和学生姓名
        </p>
      </div>

      {/* 图片预览弹窗 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
          <div className="max-w-4xl max-h-4xl p-4">
            <img src={previewImage} alt="预览" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}

      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            上传作业图片
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 拖拽上传区域 */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">点击上传或拖拽图片到此处</p>
            <p className="text-sm text-gray-500">
              支持 JPG、PNG、GIF 格式，单张图片不超过 10MB。系统会自动压缩大图片以优化OCR识别质量。
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* 压缩选项设置 */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
            <input
              type="checkbox"
              id="skipCompression"
              checked={skipCompression}
              onChange={(e) => setSkipCompression(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="skipCompression" className="text-sm text-blue-700">
              跳过压缩（测试用）- 使用原图进行OCR识别，可能影响速度但提升识别准确度
            </label>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Image className="w-4 h-4" />
              选择图片
            </Button>

            {uploadedImages.length > 0 && (
              <>
                <Button
                  onClick={processAllImages}
                  disabled={isProcessing || hasProcessedImages || !canStartOCR || hasCompressingImages}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      处理中...
                    </>
                  ) : hasCompressingImages ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      压缩中...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      开始OCR识别
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={clearAllImages}
                  disabled={isProcessing}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  清空全部
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 图片列表 */}
      {uploadedImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>已上传图片 ({uploadedImages.length}张)</span>
              {isProcessing && (
                <div className="text-sm text-blue-600">
                  处理进度: {processingStats.processedImages}/{processingStats.totalImages}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedImages.map((image) => (
                <div key={image.id} className="border rounded-lg p-3 space-y-2">
                  <div className="relative">
                    <img
                      src={image.preview}
                      alt="上传的图片"
                      className="w-full h-32 object-cover rounded cursor-pointer"
                      onClick={() => setPreviewImage(image.preview)}
                    />
                    <button
                      onClick={() => removeImage(image.id)}
                      disabled={isProcessing}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setPreviewImage(image.preview)}
                      className="absolute bottom-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 truncate">
                        {image.file.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            image.status === 'completed' ? 'default' :
                            image.status === 'processing' || image.status === 'compressing' ? 'secondary' :
                            image.status === 'failed' || image.status === 'retrying' ? 'destructive' : 'outline'
                          }
                          className="text-xs"
                        >
                          {image.status === 'compressing' && (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              压缩中
                            </>
                          )}
                          {image.status === 'pending' && '待处理'}
                          {image.status === 'processing' && '处理中'}
                          {image.status === 'completed' && '已完成'}
                          {image.status === 'retrying' && (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              重试中 ({image.retryCount}/{image.maxRetries})
                            </>
                          )}
                          {image.status === 'failed' && '失败'}
                        </Badge>

                        {/* 失败图片的手动重试按钮 */}
                        {image.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retrySingleImage(image.id)}
                            className="h-6 px-2 text-xs"
                            title="手动重试识图"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            重试
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 压缩信息显示 */}
                    {image.compressionInfo && (
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        压缩率: {image.compressionInfo.compressionRatio}%
                        ({(image.compressionInfo.originalSize / 1024 / 1024).toFixed(2)}MB → {(image.compressionInfo.compressedSize / 1024 / 1024).toFixed(2)}MB)
                      </div>
                    )}

                    {/* 文件大小信息 */}
                    <div className="text-xs text-gray-500">
                      {(image.file.size / 1024 / 1024).toFixed(2)}MB
                      {image.compressionInfo && (
                        <span className="text-green-600 ml-1">
                          (已优化)
                        </span>
                      )}
                    </div>

                    {image.ocrResult && (
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-blue-600">
                          学生: {image.ocrResult.studentName}
                        </div>
                        <div className="text-gray-600 line-clamp-2">
                          {image.ocrResult.content.substring(0, 50)}...
                        </div>
                      </div>
                    )}

                    {image.error && (
                      <div className="text-xs text-red-600">
                        错误: {image.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 处理错误显示 */}
      {processingStats.errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">处理错误</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {processingStats.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OCR进度提醒 */}
      {ocrProgressMessage && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  {ocrProgressMessage}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  为了确保识别准确性，系统正在使用AI技术对每张图片进行深度分析，请耐心等待处理完成。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isProcessing}>
          上一步
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed || isProcessing}
          className="px-8"
        >
          下一步：学生作文内容确认
        </Button>
      </div>
    </div>
  );
};

export default BatchImageUploader;
