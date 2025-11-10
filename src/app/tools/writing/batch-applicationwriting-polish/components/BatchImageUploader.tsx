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

    // 异步压缩新上传的图片
    console.log(`🔧 开始压缩 ${newImages.length} 张新上传的图片...`);
    compressNewImages(newImages);
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

        // 强制压缩所有图片，防止火山引擎API "Request Entity Too Large" 错误
        const originalSize = image.originalFile.size;
        const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);

        // 使用超强压缩设置，确保所有图片压缩到500KB以下
        const compressedFile = await compressImageForOCR(image.originalFile, {
          maxSizeMB: 0.5, // 限制为500KB，确保强制压缩
          maxWidthOrHeight: 1200, // 大幅降低分辨率，但仍保持文字可识别
          quality: 0.5, // 显著降低质量，优先保证文件大小
          useWebWorker: false, // 禁用Web Worker，避免兼容性问题
        });

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

        const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
        console.log(`📝 作文图片压缩完成: ${image.originalFile.name}`, {
          原始大小: `${originalSizeMB}MB`,
          压缩后大小: `${compressedSizeMB}MB`,
          压缩率: `${compressionInfo.compressionRatio}%`,
          状态: compressionInfo.compressionRatio > 0 ? '✅ 成功压缩' : 'ℹ️ 已符合要求'
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

        // 使用专门的作文OCR API，提供更好的作文识别效果
        const response = await fetch('/api/ai/essay-ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: base64
          })
        });

        // 安全解析JSON响应，防止非JSON响应导致的解析错误
        let data;
        try {
          const responseText = await response.text();
          console.log('🔍 作文OCR API响应前200字符:', responseText.substring(0, 200));

          // 检查响应是否为JSON格式
          const trimmedText = responseText.trim();
          if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
            console.error('❌ 作文OCR API返回非JSON格式响应:', responseText.substring(0, 500));
            throw new Error(`API返回非JSON格式响应: ${responseText.substring(0, 200)}...`);
          }

          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ 作文OCR JSON解析失败:', parseError);
          throw new Error(`API响应解析失败: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }

        console.log('📝📝📝 作文OCR API响应数据检查：', {
          success: data.success,
          result: data.result ? data.result.substring(0, 100) + '...' : 'null',
          englishOnly: data.englishOnly ? data.englishOnly.substring(0, 100) + '...' : 'null',
          imageId: image.id,
          model: data.metadata?.model,
          processingTime: data.metadata?.processingTime
        });

        if (data.success && data.result) {
          // 直接解析OCR结果，使用作文OCR的英文分离结果
          const parsedResult = parseOCRResult(data.result, data.englishOnly || data.result, image.id);
          console.log(`✅ 作文OCR识别完成 (${image.id.substring(0, 8)}...)`)
          return parsedResult;
        } else {
          // 构建详细错误信息
          let errorMessage = data.error || '作文OCR识别失败';
          if (data.details) {
            if (typeof data.details === 'string') {
              errorMessage += ` (${data.details})`;
            } else if (data.details.networkError) {
              errorMessage += ` (网络错误: ${data.details.networkError})`;
            }
          }
          throw new Error(errorMessage);
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

  // 解析OCR结果 - 简化版：只区分中英文内容，不提取姓名
  const parseOCRResult = (originalText: string, englishOnlyText: string, imageId: string): OCRResult => {
    const lines = originalText.split('\n').filter(line => line.trim());

    // 提取中文内容（所有包含中文字符的行）
    const chineseContent = lines
      .filter(line => /[\u4e00-\u9fff]/.test(line.trim()))
      .join('\n')
      .trim();

    // 英文作文内容直接使用API返回的纯英文版本
    const content = englishOnlyText.trim();

    console.log(`📝 OCR解析完成 (${imageId}):`, {
      原文长度: originalText.length,
      中文内容长度: chineseContent.length,
      英文内容长度: content.length,
      优化: "跳过姓名提取，专注文字识别"
    });

    return {
      imageId,
      studentName: "待确认", // 标记为待确认，在下一步骤中提取
      originalText,
      chineseContent,
      content,
      confidence: 0.9, // 提升置信度，因为更专注于识别
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

    // 显示进度提醒 - 基于26张超级并行处理的性能更新时间估算
    // 保守估计：26张并发，平均每张10秒，批次间延迟30秒
    const estimatedMinutes = Math.max(1, Math.ceil((uploadedImages.length * 10) / 60) + Math.ceil(uploadedImages.length / 26));
    const message = `AI超级并行处理中... 预计${uploadedImages.length}张图片大约需要${estimatedMinutes}分钟（${Math.min(26, uploadedImages.length)}张同时处理，性能大幅优化）。`;
    console.log(`🎯 ${message}`);

    // 设置进度消息
    setOcrProgressMessage(message);

    const assignments: ApplicationAssignment[] = [];
    const errors: string[] = [];
    let completedCount = 0;

    // 适度并发处理，配合作文OCR的优化性能
    const batchSize = 5; // 适度并发：5张图片同时处理，配合作文OCR的高质量识别
    const batches = [];

    for (let i = 0; i < uploadedImages.length; i += batchSize) {
      batches.push(uploadedImages.slice(i, i + batchSize));
    }

    console.log(`📝 开始作文批量处理 ${uploadedImages.length} 张图片，并发数: ${batchSize} 张/批次（作文OCR版）`);

    // 性能监控
    const startTime = Date.now();
    const allAssignments: ApplicationAssignment[] = [];
    let totalCompletedCount = 0;

    // 分批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      if (batch.length === uploadedImages.length) {
        console.log(`📦 处理批次 1/1，包含 ${batch.length} 张图片`);
      } else {
        console.log(`📦 处理批次 ${batchIndex + 1}/${batches.length}，包含 ${batch.length} 张图片`);
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

  const canProceed = uploadedImages.length > 0 && uploadedImages.some(img => img.status !== 'pending'); // 只要开始OCR识别了就可以进行下一步
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
          {/* 格式要求说明 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <span className="text-lg">📝</span>
              作业图片格式要求
            </h3>
            <div className="space-y-2 text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <div>
                  <strong>纸张大小：</strong>尽量使用A4纸大小的图片进行拍照或扫描，无固定模板要求
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <div>
                  <strong>图片内容：</strong>请确保图片中尽量只包含应用文文字内容，避免与应用文无关的信息
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <div>
                  <strong>学生姓名格式：</strong>请让学生在作文上方或旁边明确标注
                  <span className="bg-white px-2 py-1 rounded border border-amber-300 font-mono text-amber-800 ml-1">
                    姓名：XX
                  </span>
                  （例如：姓名：李白）
                </div>
              </div>
              <div className="mt-3 p-2 bg-amber-100 rounded border border-amber-300">
                <p className="text-xs font-medium text-amber-800">
                  💡 提示：清晰的格式有助于提高OCR识别准确率，确保学生姓名能够被正确提取。不太规范的图片，有可能识别很慢，甚至报错。
                </p>
              </div>
            </div>
          </div>

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

          {/* 压缩说明 */}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded border border-green-200">
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <label className="text-sm text-green-700">
              智能压缩已启用 - 所有图片将自动压缩至2MB以内，确保OCR识别成功率和速度
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
                        {image.ocrResult.studentName && image.ocrResult.studentName !== "待确认" && (
                          <div className="font-medium text-blue-600">
                            学生: {image.ocrResult.studentName}
                          </div>
                        )}
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
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onPrev} disabled={isProcessing}>
          上一步
        </Button>

        <div className="flex gap-3">
          {/* OCR识别按钮 */}
          <Button
            onClick={processAllImages}
            disabled={uploadedImages.length === 0 || isProcessing || processingStats.total > 0}
            variant="secondary"
            className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border-blue-200 font-medium px-6"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                OCR识别中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {processingStats.total > 0 ? `继续OCR (${processingStats.completed}/${processingStats.total})` : '开始OCR识别'}
              </div>
            )}
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
    </div>
  );
};

export default BatchImageUploader;
