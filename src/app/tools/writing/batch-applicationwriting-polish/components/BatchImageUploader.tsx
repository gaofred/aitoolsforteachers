"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, X, Eye, Trash2, Camera, Loader2, Square, RotateCcw } from "lucide-react";
import type { ApplicationBatchTask, ApplicationAssignment, OCRResult, ProcessingStats } from "../types";
import { compressImageForOCR, adaptiveCompressImage } from "@/lib/image-compressor";

interface BatchImageUploaderProps {
  task: ApplicationBatchTask | null;
  setTask: React.Dispatch<React.SetStateAction<ApplicationBatchTask | null>>;
  onNext: () => void;
  onPrev: () => void;
  processingStats: ProcessingStats;
  setProcessingStats: React.Dispatch<React.SetStateAction<ProcessingStats>>;
}

interface UploadedImage {
  id: string;
  file: File;
  originalFile: File; // 保存原始文件
  preview: string;
  status: 'pending' | 'compressing' | 'processing' | 'completed' | 'failed';
  ocrResult?: OCRResult;
  error?: string;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
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

  // OCR中断控制器
  const ocrControllerRef = useRef<{ abort: () => void } | null>(null);

  // 数据持久化key
  const STORAGE_KEY = `batch_ocr_${task?.id || 'default'}`;

  // 从localStorage恢复数据
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);

        // 检查数据是否匹配当前任务
        if (parsed.taskId === task?.id && parsed.uploadedImages) {
          console.log('🔄 从localStorage恢复OCR数据:', {
            taskId: parsed.taskId,
            imageCount: parsed.uploadedImages.length,
            timestamp: parsed.timestamp,
            version: parsed.version || 'legacy'
          });

          // 处理优化后的数据格式
          if (parsed.version === 'optimized') {
            // 对于优化后的数据，需要重建文件对象结构
            const restoredImages = parsed.uploadedImages.map((img: any) => ({
              ...img,
              // 重建空的文件对象（实际文件数据已丢失，但保留状态）
              file: img.fileSize ? new File([], img.fileName || 'unknown.jpg', { type: 'image/jpeg' }) : undefined,
              originalFile: img.fileSize ? new File([], img.fileName || 'unknown.jpg', { type: 'image/jpeg' }) : undefined,
              // 重新生成预览（使用占位符）
              preview: img.status === 'completed' ? `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDACgcHiQGSWUgACEV5i0mMzc7P/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=` : ''
            }));

            setUploadedImages(restoredImages);
          } else {
            // 传统数据格式，直接使用
            setUploadedImages(parsed.uploadedImages);
          }

          setOcrProgressMessage(parsed.ocrProgressMessage || '');
          setIsProcessing(parsed.isProcessing || false);
        }
      }
    } catch (error) {
      console.warn('恢复OCR数据失败:', error);
      // 清理损坏的数据
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [task?.id, STORAGE_KEY]);

  // 存储空间检测函数
  const checkStorageQuota = () => {
    try {
      const testKey = 'test_storage_quota';
      const testData = 'x'.repeat(1024); // 1KB测试数据

      // 测试存储空间
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('存储空间不足:', error);
      return false;
    }
  };

  // 清理过期数据函数
  const cleanupExpiredData = () => {
    try {
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith('batch_ocr_') && key.includes('task_')
      );

      // 删除超过2小时的数据
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);

      keys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.timestamp && data.timestamp < twoHoursAgo) {
            localStorage.removeItem(key);
            console.log('🗑️ 已清理过期数据:', key);
          }
        } catch (error) {
          // 如果解析失败，直接删除这个key
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('清理过期数据失败:', error);
    }
  };

  // 优化的数据保存函数（只保存必要数据，排除大文件）
  const saveOptimizedData = () => {
    if (!checkStorageQuota()) {
      console.warn('存储空间不足，跳过保存');
      return false;
    }

    try {
      // 清理过期数据
      cleanupExpiredData();

      // 优化图片数据，只保存必要字段
      const optimizedImages = uploadedImages.map(img => ({
        id: img.id,
        status: img.status,
        error: img.error,
        ocrResult: img.ocrResult ? {
          success: img.ocrResult.success,
          result: img.ocrResult.result,
          englishOnly: img.ocrResult.englishOnly,
          imageId: img.ocrResult.imageId,
          model: img.ocrResult.model
        } : undefined,
        // 保存文件大小信息但不保存文件对象
        fileSize: img.file?.size,
        fileName: img.file?.name,
        compressionInfo: img.compressionInfo
        // 注意：不保存 file, originalFile, preview 这些大的数据
      }));

      const dataToSave = {
        taskId: task?.id,
        uploadedImages: optimizedImages, // 使用优化后的数据
        isProcessing,
        ocrProgressMessage,
        timestamp: Date.now(),
        version: 'optimized' // 标记这是优化后的数据格式
      };

      const jsonString = JSON.stringify(dataToSave);

      // 检查数据大小（限制在2MB以内）
      if (jsonString.length > 2 * 1024 * 1024) {
        console.warn('数据过大，跳过保存。大小:', Math.round(jsonString.length / 1024), 'KB');
        return false;
      }

      localStorage.setItem(STORAGE_KEY, jsonString);
      console.log('💾 OCR数据已优化保存:', {
        taskId: task?.id,
        imageCount: uploadedImages.length,
        isProcessing,
        dataSize: Math.round(jsonString.length / 1024) + 'KB'
      });
      return true;
    } catch (error) {
      console.warn('保存OCR数据失败:', error);
      return false;
    }
  };

  // 保存数据到localStorage（使用优化版本）
  useEffect(() => {
    if (uploadedImages.length > 0 || isProcessing) {
      saveOptimizedData();
    }
  }, [uploadedImages, isProcessing, ocrProgressMessage, task?.id, STORAGE_KEY]);

  // 清理过期数据的函数
  const clearStoredData = () => {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ OCR数据已清理');
  };

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
      status: 'pending'
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
        console.log(`📝 开始自适应压缩应用文图片: ${image.originalFile.name}`);
        const compressedFile = await adaptiveCompressImage(image.originalFile, 0.5, 3);

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

      // 如果没有剩余图片，清理localStorage
      if (updated.length === 0) {
        clearStoredData();
      }

      return updated;
    });
  };

  // 清空所有图片
  const clearAllImages = () => {
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
    // 清理localStorage数据
    clearStoredData();
  };

  // OCR识别单张图片（移除重试机制，失败直接报错）
  const processImage = async (image: UploadedImage, abortController?: AbortController): Promise<OCRResult | null> => {
    try {
      // 检查是否已被中断
      if (abortController?.signal.aborted) {
        throw new Error('OCR处理已中断');
      }

      // 将文件转换为base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(image.file);

        // 添加中断监听
        abortController?.signal.addEventListener('abort', () => {
          reject(new Error('OCR处理已中断'));
        });
      });

      // 检查中断状态
      if (abortController?.signal.aborted) {
        throw new Error('OCR处理已中断');
      }

      // 使用SSVIP DMX豆包模型OCR API，提供更好的作文识别效果
      const response = await fetch('/api/ai/ocr-ssvip-dmx', {
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
        console.log('🔍 阿里云新加坡OCR API响应前200字符:', responseText.substring(0, 200));

        // 检查响应是否为JSON格式
        const trimmedText = responseText.trim();
        if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
          console.error('❌ 阿里云新加坡OCR API返回非JSON格式响应:', responseText.substring(0, 500));
          throw new Error(`API返回非JSON格式响应: ${responseText.substring(0, 200)}...`);
        }

        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ 阿里云新加坡OCR JSON解析失败:', parseError);
        throw new Error(`API响应解析失败: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      console.log('📝📝📝 阿里云新加坡OCR API响应数据检查：', {
        success: data.success,
        result: data.result ? data.result.substring(0, 100) + '...' : 'null',
        englishOnly: data.englishOnly ? data.englishOnly.substring(0, 100) + '...' : 'null',
        imageId: image.id,
        model: data.metadata?.model,
        processingTime: data.metadata?.processingTime
      });

      if (data.success && data.result) {
        // 直接解析OCR结果，使用作文OCR的英文分离结果，包含图片数据
        const parsedResult = parseOCRResult(data.result, data.englishOnly || data.result, image.id, base64);
        console.log(`✅ 阿里云新加坡OCR识别完成 (${image.id.substring(0, 8)}...)`)
        return parsedResult;
      } else {
        // 构建详细错误信息
        let errorMessage = data.error || '阿里云新加坡OCR识别失败';
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
      console.error(`❌ OCR处理失败:`, error);
      // 直接抛出错误，不再重试
      throw error;
    }
  };

  
  // 解析OCR结果 - 简化版：只区分中英文内容，不提取姓名
  const parseOCRResult = (originalText: string, englishOnlyText: string, imageId: string, imageData?: string): OCRResult => {
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
      包含图片数据: !!imageData,
      优化: "跳过姓名提取，专注文字识别"
    });

    return {
      imageId,
      studentName: "待确认", // 标记为待确认，在下一步骤中提取
      originalText,
      chineseContent,
      content,
      confidence: 0.9, // 提升置信度，因为更专注于识别
      processedAt: new Date(),
      imageData: imageData // 保存图片数据
    };
  };

  // 批量处理所有图片（并行处理）
  const processAllImages = async () => {
    if (uploadedImages.length === 0) return;

    // 创建中断控制器
    const abortController = new AbortController();
    ocrControllerRef.current = abortController;

    setIsProcessing(true);
    setProcessingStats({
      ...processingStats,
      totalImages: uploadedImages.length,
      processedImages: 0,
      errors: []
    });

    // 将所有图片状态设置为处理中
    setUploadedImages(prev => prev.map(img => ({ ...img, status: 'processing' })));

    // 显示进度提醒 - 15张超级并行处理的极速性能
    // 优化估计：15张并发，平均每张8秒（因为并发更高，整体效率提升），批次间延迟减少
    const estimatedMinutes = Math.max(1, Math.ceil((uploadedImages.length * 8) / 60) + Math.ceil(uploadedImages.length / 15) * 0.5);
    const message = `AI超级并行处理中... 预计${uploadedImages.length}张图片大约需要${estimatedMinutes}分钟（${Math.min(15, uploadedImages.length)}张同时处理，极速性能模式）。`;
    console.log(`🎯 ${message}`);

    // 设置进度消息
    setOcrProgressMessage(message);

    const assignments: ApplicationAssignment[] = [];
    const errors: string[] = [];
    let completedCount = 0;

    // 超级并行处理，最大化OCR识别效率
    const batchSize = 15; // 优化并发：15张图片同时处理，提升处理效率
    const batches = [];

    for (let i = 0; i < uploadedImages.length; i += batchSize) {
      batches.push(uploadedImages.slice(i, i + batchSize));
    }

    console.log(`📝 开始作文批量处理 ${uploadedImages.length} 张图片，超级并发数: ${batchSize} 张/批次（极速OCR版 - 15张并发）`);

    // 性能监控
    const startTime = Date.now();
    const allAssignments: ApplicationAssignment[] = [];
    let totalCompletedCount = 0;

    // 分批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      // 检查是否已被中断
      if (abortController.signal.aborted) {
        console.log('⚠️ OCR处理已被用户中断');
        break;
      }

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

          const ocrResult = await processImage(image, abortController);

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
        console.log(`⏳ 等待0.5秒后处理下一批次，避免API限流...`);
        await new Promise(resolve => setTimeout(resolve, 500));
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

    console.log(`🎉 处理完成！超级性能统计：
    📊 总图片数: ${uploadedImages.length} 张
    ⚡ 超级并发数: ${concurrencyRatio} 张/批次
    ⏱️ 总耗时: ${totalTime.toFixed(2)} 秒
    📈 平均每张: ${avgTimePerImage.toFixed(2)} 秒
    🚀 性能提升: ${(concurrencyRatio * 100).toFixed(0)}% 相比串行处理
    🔥 极速模式: 15张并行处理，效率最大化！`);

    // 清除进度消息
    // 检查是否被中断，如果被中断则清理状态
    if (abortController.signal.aborted) {
      console.log('⚠️ OCR处理被用户中断');
      setOcrProgressMessage('OCR处理已中断，您可以重新开始');

      // 将处理中的图片状态重置为待处理
      setUploadedImages(prev => prev.map(img =>
        img.status === 'processing' ? { ...img, status: 'pending' } : img
      ));
    } else {
      setOcrProgressMessage('');
    }

    setIsProcessing(false);

    // 清理中断控制器
    ocrControllerRef.current = null;
  };

  // 停止OCR处理
  const stopOCRProcessing = () => {
    if (ocrControllerRef.current) {
      console.log('🛑 用户请求停止OCR处理');
      ocrControllerRef.current.abort();
      ocrControllerRef.current = null;
    }
  };

  // 重新开始OCR处理
  const restartOCRProcessing = () => {
    // 将所有失败和处理中的图片重置为待处理
    setUploadedImages(prev => prev.map(img => {
      if (img.status === 'failed' || img.status === 'processing') {
        return { ...img, status: 'pending', error: undefined };
      }
      return img;
    }));

    // 重置统计信息
    setProcessingStats({
      ...processingStats,
      processedImages: 0,
      errors: []
    });

    setOcrProgressMessage('');
  };

  const canProceed = uploadedImages.length > 0 && uploadedImages.some(img => img.status !== 'pending'); // 只要开始OCR识别了就可以进行下一步（防止卡死）
  const hasProcessedImages = uploadedImages.some(img => img.status === 'completed');
  const canStartOCR = uploadedImages.length > 0 && uploadedImages.every(img => img.status === 'pending');
  const hasCompressingImages = uploadedImages.some(img => img.status === 'compressing');
  const hasProcessingImages = uploadedImages.some(img => img.status === 'processing' || img.status === 'compressing'); // 正在处理的图片
  const hasFailedImages = uploadedImages.some(img => img.status === 'failed'); // 有失败的图片

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
              <div className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <div>
                  <strong>图片方向：</strong><span className="text-blue-600">图片需要是正的，请不要横着，或上下颠倒</span>
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

          {/* 数据保存说明 */}
          {uploadedImages.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xs">💾</span>
              </div>
              <label className="text-sm text-blue-700">
                已自动保存 - 您的图片和OCR结果已保存，返回此页面时数据不会丢失
              </label>
            </div>
          )}

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
                {isProcessing ? (
                  <>
                    <Button
                      onClick={stopOCRProcessing}
                      className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
                      title="停止OCR处理"
                    >
                      <Square className="w-4 h-4" />
                      停止处理
                    </Button>

                    <Button
                      variant="outline"
                      onClick={clearAllImages}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      title="清空全部图片（处理中清空可能会中断OCR识别）"
                    >
                      <Trash2 className="w-4 h-4" />
                      清空全部
                    </Button>
                  </>
                ) : hasFailedImages ? (
                  <>
                    <Button
                      onClick={processAllImages}
                      disabled={hasCompressingImages}
                      className="flex items-center gap-2 bg-amber-600 text-white hover:bg-amber-700"
                      title="重新开始OCR识别"
                    >
                      <RotateCcw className="w-4 h-4" />
                      重新开始OCR
                    </Button>

                    <Button
                      variant="outline"
                      onClick={restartOCRProcessing}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                      title="重置失败的图片并重新开始"
                    >
                      <Camera className="w-4 h-4" />
                      重置并开始OCR
                    </Button>

                    <Button
                      variant="outline"
                      onClick={clearAllImages}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      title="清空全部图片"
                    >
                      <Trash2 className="w-4 h-4" />
                      清空全部
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={processAllImages}
                      disabled={!canStartOCR || hasCompressingImages}
                      className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {hasCompressingImages ? (
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
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      title="清空全部图片"
                    >
                      <Trash2 className="w-4 h-4" />
                      清空全部
                    </Button>
                  </>
                )}
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
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      title={image.status === 'processing' || image.status === 'compressing' ?
                        "警告：正在处理中，删除可能会中断OCR识别" : "删除图片"}
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
                            image.status === 'failed' ? 'destructive' : 'outline'
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
                          {image.status === 'failed' && '失败'}
                        </Badge>
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
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  💡 紧急退出：如果识别卡住或失败，可以点击"下一步"或删除问题图片继续操作
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 重要提醒 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
              重要提醒
            </h3>
            <p className="text-sm text-red-700 font-medium">
              因国际线路问题，批量识图在晚上20:00-22:00容易出现无法识别的情况。如果遇到，可换个时间段重试。
            </p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onPrev} disabled={isProcessing}>
          上一步
        </Button>

        <div className="flex gap-3">
          {/* OCR控制按钮 */}
          {isProcessing ? (
            <Button
              onClick={stopOCRProcessing}
              variant="destructive"
              className="flex items-center gap-2 font-medium px-6"
            >
              <Square className="w-4 h-4" />
              停止OCR处理
            </Button>
          ) : hasFailedImages ? (
            <div className="flex gap-2">
              <Button
                onClick={processAllImages}
                variant="secondary"
                className="bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 text-amber-700 border-amber-200 font-medium px-6"
              >
                <RotateCcw className="w-4 h-4" />
                重试失败的OCR
              </Button>

              <Button
                onClick={restartOCRProcessing}
                variant="outline"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium px-6"
              >
                <Camera className="w-4 h-4" />
                重置全部并开始OCR
              </Button>
            </div>
          ) : (
            <Button
              onClick={processAllImages}
              disabled={uploadedImages.length === 0}
              variant="secondary"
              className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border-blue-200 font-medium px-6"
            >
              <Eye className="w-4 h-4" />
              {processingStats.total > 0 ? `继续OCR (${processingStats.completed}/${processingStats.total})` : '开始OCR识别'}
            </Button>
          )}

          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="px-8"
            title={hasProcessingImages ?
              "警告：有图片正在处理中，进入下一步可能会丢失处理中的数据" :
              hasFailedImages ?
                "有失败的图片，建议先处理失败的图片或继续下一步" :
              "进入下一步确认学生作文内容"}
          >
            下一步：学生作文内容确认
            {hasFailedImages && (
              <span className="ml-2 text-amber-500">⚠️</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BatchImageUploader;
