"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, X, Eye, Trash2, Camera, Loader2, RefreshCw, CheckCircle, AlertCircle, FileText } from "lucide-react";
import type { ContinuationWritingBatchTask, ContinuationWritingAssignment, OCRResult, ProcessingStats } from "../types";
import { compressImageForOCR, adaptiveCompressImage } from "@/lib/image-compressor";
import { updateOCRResultWordCount } from "../utils/wordCount";

interface BatchImageUploaderProps {
  task: ContinuationWritingBatchTask | null;
  setTask: React.Dispatch<React.SetStateAction<ContinuationWritingBatchTask | null>>;
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
  const wordInputRef = useRef<HTMLInputElement>(null);

  // 计算状态
  const hasProcessedImages = uploadedImages.some(img => img.status === 'completed');
  const canStartOCR = uploadedImages.length > 0 && uploadedImages.every(img => img.status === 'pending');
  const hasCompressingImages = uploadedImages.some(img => img.status === 'compressing');
  const hasProcessingImages = uploadedImages.some(img => img.status === 'processing' || img.status === 'compressing');

  // 数据持久化key
  const STORAGE_KEY = `batch_ocr_continuation_${task?.id || 'default'}`;

  // 从任务数据和localStorage恢复数据
  useEffect(() => {
    const restoreData = () => {
      let hasRestoredData = false;

      // 优先从任务数据中恢复
      if (task?.assignments && task.assignments.length > 0) {
        console.log('🔄 从任务数据恢复读后续写OCR数据:', {
          taskId: task.id,
          assignmentCount: task.assignments.length
        });

        const restoredImages: UploadedImage[] = task.assignments.map((assignment, index) => {
          // 创建一个虚拟的预览图（如果原图数据不存在）
          let preview = assignment.ocrResult.imageData || '';
          if (!preview && assignment.ocrResult.content) {
            // 如果没有图片数据，创建一个文本预览的占位符
            preview = `data:image/svg+xml,${encodeURIComponent(`
              <svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f3f4f6"/>
                <text x="50%" y="50%" font-family="Arial" font-size="14" text-anchor="middle" fill="#6b7280">
                  ${assignment.student.name}
                </text>
                <text x="50%" y="70%" font-family="Arial" font-size="12" text-anchor="middle" fill="#9ca3af">
                  已识别 (${assignment.ocrResult.content.length}字符)
                </text>
              </svg>
            `)}`;
          }

          return {
            id: assignment.id,
            file: new File([], assignment.student.name + '.jpg'), // 创建虚拟文件对象
            originalFile: new File([], assignment.student.name + '.jpg'),
            preview,
            status: 'completed' as const,
            ocrResult: assignment.ocrResult,
            compressionInfo: {
              originalSize: 0,
              compressedSize: 0,
              compressionRatio: 1
            }
          };
        });

        setUploadedImages(restoredImages);
        setOcrProgressMessage(`已恢复 ${task.assignments.length} 个识别结果`);
        setIsProcessing(false);
        hasRestoredData = true;
        return;
      }

      // 如果任务数据中没有，尝试从localStorage恢复
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);

          // 检查数据是否匹配当前任务
          if (parsed.taskId === task?.id && parsed.uploadedImages) {
            console.log('🔄 从localStorage恢复读后续写OCR数据:', {
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
            hasRestoredData = true;
          }
        }
      } catch (error) {
        console.warn('从localStorage恢复读后续写OCR数据失败:', error);
        // 清理损坏的数据
        localStorage.removeItem(STORAGE_KEY);
      }

      if (!hasRestoredData) {
        // 没有恢复到数据，初始化为空
        setUploadedImages([]);
        setOcrProgressMessage('');
        setIsProcessing(false);
      }
    };

    restoreData();
  }, [task?.id, task?.assignments, STORAGE_KEY]);

  // 🔧 增强的存储空间检测函数
  const checkStorageQuota = (requiredSpace = 1024) => {
    try {
      // 先清理过期数据释放空间
      cleanupExpiredData();

      // 计算当前存储使用情况
      let totalSize = 0;
      let batchSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            totalSize += size;
            if (key.startsWith('batch_ocr_')) {
              batchSize += size;
            }
          }
        }
      }

      console.log('💾 存储使用情况:', {
        总使用: Math.round(totalSize / 1024) + 'KB',
        批量OCR: Math.round(batchSize / 1024) + 'KB',
        需要空间: Math.round(requiredSpace / 1024) + 'KB'
      });

      // 估算localStorage限制（通常为5-10MB）
      const estimatedLimit = 5 * 1024 * 1024; // 5MB保守估计
      const availableSpace = estimatedLimit - totalSize;

      // 如果可用空间不足，尝试清理
      if (availableSpace < requiredSpace) {
        console.warn('⚠️ 存储空间不足，尝试清理历史数据');

        // 清理过期数据
        cleanupExpiredData();

        // 如果批量数据超过2MB，进行紧急清理
        if (batchSize > 2 * 1024 * 1024) {
          cleanupAllBatchData();
        }

        // 重新计算可用空间
        let newTotalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            if (value) {
              newTotalSize += new Blob([value]).size;
            }
          }
        }

        const newAvailableSpace = estimatedLimit - newTotalSize;
        if (newAvailableSpace < requiredSpace) {
          console.error('❌ 清理后空间仍不足:', {
            需要空间: Math.round(requiredSpace / 1024) + 'KB',
            可用空间: Math.round(newAvailableSpace / 1024) + 'KB'
          });
          return false;
        }
      }

      // 实际测试写入
      const testKey = 'test_storage_quota_continuation_' + Date.now();
      try {
        localStorage.setItem(testKey, 'x'.repeat(requiredSpace));
        localStorage.removeItem(testKey);
        return true;
      } catch (testError) {
        console.error('❌ 存储写入测试失败:', testError);
        return false;
      }

    } catch (error) {
      console.error('❌ 存储空间检测异常:', error);
      return false;
    }
  };

  // 清理过期数据函数
  const cleanupExpiredData = () => {
    try {
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith('batch_ocr_continuation_') && key.includes('task_')
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

  // 🔧 紧急清理所有批量数据的函数
  const cleanupAllBatchData = () => {
    try {
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith('batch_ocr_') || key.startsWith('batch_ocr_continuation_')
      );

      let cleanedCount = 0;
      keys.forEach(key => {
        localStorage.removeItem(key);
        cleanedCount++;
      });

      if (cleanedCount > 0) {
        console.log('🗑️ 紧急清理批量数据，清理数量:', cleanedCount);
      }
    } catch (error) {
      console.error('❌ 紧急清理批量数据失败:', error);
    }
  };

  // 估算数据大小函数
  const estimateDataSize = () => {
    try {
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
        fileSize: img.file?.size,
        fileName: img.file?.name,
        compressionInfo: img.compressionInfo
      }));

      const dataToSave = {
        taskId: task?.id,
        uploadedImages: optimizedImages,
        isProcessing,
        ocrProgressMessage,
        timestamp: Date.now(),
        version: 'optimized'
      };

      const jsonString = JSON.stringify(dataToSave);
      return jsonString.length * 2; // 乘以2作为缓冲，考虑字符串开销
    } catch (error) {
      console.warn('估算数据大小失败:', error);
      return 50 * 1024; // 默认50KB
    }
  };

  // 优化的数据保存函数（只保存必要数据，排除大文件）
  const saveOptimizedData = () => {
    // 先估算要保存的数据大小
    const estimatedSize = estimateDataSize();
    if (!checkStorageQuota(estimatedSize)) {
      console.warn('存储空间不足，跳过保存。需要空间:', Math.round(estimatedSize / 1024), 'KB');
      return false;
    }

    try {
      // 清理过期数据
      cleanupExpiredData();

      // 使用估算的数据，避免重复计算
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
        uploadedImages: optimizedImages,
        isProcessing,
        ocrProgressMessage,
        timestamp: Date.now(),
        version: 'optimized'
      };

      const jsonString = JSON.stringify(dataToSave);

      // 如果数据超过500KB，尝试最小化格式
      if (jsonString.length > 500 * 1024) {
        console.warn('⚠️ 数据过大，尝试最小化格式。大小:', Math.round(jsonString.length / 1024), 'KB');

        const minimalData = {
          taskId: task?.id,
          uploadedImages: uploadedImages.map(img => ({
            id: img.id,
            status: img.status,
            // 只保存成功结果的基本信息
            hasResult: img.status === 'completed' && !!img.ocrResult?.result,
            resultLength: img.status === 'completed' && img.ocrResult?.result ? img.ocrResult.result.length : 0,
            studentName: img.status === 'completed' && img.ocrResult?.result && img.ocrResult.result.includes('学生姓名：') ?
              img.ocrResult.result.split('学生姓名：')[1]?.split('\n')[0]?.trim() : '未知',
          })),
          completedCount: uploadedImages.filter(img => img.status === 'completed').length,
          totalCount: uploadedImages.length,
          isProcessing,
          timestamp: Date.now(),
          version: 'minimal'
        };

        const minimalJson = JSON.stringify(minimalData);
        if (minimalJson.length <= 500 * 1024) {
          localStorage.setItem(STORAGE_KEY, minimalJson);
          console.log('💾 已使用最小化格式保存:', {
            taskId: task?.id,
            原始大小: Math.round(jsonString.length / 1024) + 'KB',
            压缩后: Math.round(minimalJson.length / 1024) + 'KB'
          });
          return true;
        } else {
          console.warn('⚠️ 即使最小化格式也超过500KB限制');
          return false;
        }
      }

      try {
        localStorage.setItem(STORAGE_KEY, jsonString);
        console.log('💾 已保存读后续写OCR数据:', {
          taskId: task?.id,
          imageSize: Math.round(jsonString.length / 1024) + 'KB',
          imagesCount: uploadedImages.length
        });
        return true;
      } catch (saveError) {
        // 检查是否是配额超限错误
        if (saveError instanceof Error && saveError.name === 'QuotaExceededError') {
          console.error('❌ localStorage配额已满，尝试紧急清理后重试');

          // 紧急清理所有批量数据
          cleanupAllBatchData();

          // 清理后，尝试只保存最关键的信息
          try {
            const minimalData = {
              taskId: task?.id,
              completedCount: uploadedImages.filter(img => img.status === 'completed').length,
              totalCount: uploadedImages.length,
              isProcessing,
              timestamp: Date.now(),
              version: 'emergency'
            };

            const minimalJson = JSON.stringify(minimalData);
            localStorage.setItem(STORAGE_KEY, minimalJson);
            console.log('💾 紧急模式保存成功，仅保存关键状态信息');
            return true;
          } catch (emergencyError) {
            console.error('❌ 即使是紧急模式也无法保存数据:', emergencyError);
            // 最后的手段：完全清除存储
            try {
              clearStoredData();
              console.log('🗑️ 已清除所有存储数据，释放空间');
            } catch (clearError) {
              console.error('❌ 连清除存储都失败了:', clearError);
            }
            return false;
          }
        } else {
          console.warn('保存读后续写OCR数据失败:', saveError);
          return false;
        }
      }
    } catch (error) {
      console.warn('保存读后续写OCR数据失败:', error);
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
    console.log('🗑️ 读后续写OCR数据已清理');
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // 读后续写作文无图片数量限制
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
    console.log(`🔧 开始压缩 ${newImages.length} 张新上传的读后续写图片...`);
    compressNewImages(newImages);
  };

  // 处理Word文档上传
  const handleWordUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    console.log(`📝 开始处理 ${files.length} 个Word文档...`);

    for (const file of Array.from(files)) {
      try {
        // 验证文件类型
        if (!file.name.toLowerCase().endsWith('.docx') && !file.name.toLowerCase().endsWith('.doc')) {
          alert(`文件 "${file.name}" 不是Word文档格式，请选择.docx或.doc文件`);
          continue;
        }

        // 创建一个新的图片项来表示Word文档
        const wordImage: UploadedImage = {
          id: `word_${Date.now()}_${Math.random()}`,
          originalFile: file,
          file,
          preview: '', // Word文档不需要预览
          status: 'processing'
        };

        // 添加到已上传图片列表
        setUploadedImages(prev => [...prev, wordImage]);

        // 读取Word文档内容
        const content = await readWordDocument(file);

        // 创建OCR结果
        const ocrResult: OCRResult = {
          content: content,
          originalContent: content,
          wordCount: content.length,
          studentName: extractStudentName(content),
          originalText: content
        };

        // 更新wordCount
        updateOCRResultWordCount(ocrResult);

        // 更新状态为完成
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === wordImage.id
              ? { ...img, status: 'completed', ocrResult }
              : img
          )
        );

        console.log(`✅ Word文档 "${file.name}" 处理完成，提取文本长度: ${content.length}`);

      } catch (error) {
        console.error(`❌ Word文档 "${file.name}" 处理失败:`, error);

        // 更新状态为失败
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === `word_${Date.now()}_${Math.random()}`
              ? { ...img, status: 'failed', error: error instanceof Error ? error.message : 'Word文档处理失败' }
              : img
          )
        );
      }
    }

    // 重置文件输入
    if (wordInputRef.current) {
      wordInputRef.current.value = '';
    }
  };

  // 读取Word文档内容
  const readWordDocument = async (file: File): Promise<string> => {
    // 这里需要使用Word文档解析库
    // 暂时使用简单的文本提取方法
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // 由于浏览器安全限制，这里暂时返回文件名作为占位符
          // 实际项目中需要使用mammoth.js等库来解析Word文档
          const placeholderContent = `Word文档内容：${file.name}\n\n请手动复制Word文档内容到此处。`;
          resolve(placeholderContent);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 从文本中提取学生姓名
  const extractStudentName = (content: string): string => {
    // 匹配常见的学生姓名格式
    const patterns = [
      /姓名[：:]\s*([^\n\r]+)/,
      /([^\n\r]+?)(?:同学|学生)/,
      /^([^\n\r]{2,4})\s*[:：]?/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '未识别姓名';
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
        console.log(`📝 开始自适应压缩读后续写图片: ${image.originalFile.name}`);
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
        console.log(`📝 读后续写图片压缩完成: ${image.originalFile.name}`, {
          原始大小: `${originalSizeMB}MB`,
          压缩后大小: `${compressedSizeMB}MB`,
          压缩率: `${compressionInfo.compressionRatio}%`,
          状态: compressionInfo.compressionRatio > 0 ? '✅ 成功压缩' : 'ℹ️ 已符合要求'
        });

      } catch (error) {
        console.error(`压缩读后续写图片失败: ${image.originalFile.name}`, error);

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

  // 单独重试某张图片的OCR
  const retrySingleImage = async (imageId: string) => {
    const image = uploadedImages.find(img => img.id === imageId);
    if (!image) return;

    console.log(`🔄 开始重试图片OCR: ${image.id.substring(0, 8)}...`);

    // 更新状态为处理中
    setUploadedImages(prev =>
      prev.map(img =>
        img.id === imageId
          ? { ...img, status: 'processing', error: undefined }
          : img
      )
    );

    try {
      const ocrResult = await processImage(image);

      if (ocrResult && task) {
        // 创建作业记录
        const assignment: ContinuationWritingAssignment = {
          id: `assignment_${Date.now()}_${Math.random()}_retry`,
          student: {
            id: `temp_${ocrResult.studentName}_retry`,
            name: ocrResult.studentName,
            createdAt: new Date()
          },
          ocrResult,
          status: 'pending',
          createdAt: new Date()
        };

        // 更新任务中的作业列表
        const existingAssignments = task.assignments || [];
        const updatedAssignments = existingAssignments.filter(ass => !ass.ocrResult.imageId.includes(imageId));
        const newAssignments = [...updatedAssignments, assignment];

        setTask({
          ...task,
          assignments: newAssignments
        });

        // 更新图片状态为完成
        setUploadedImages(prev => prev.map(img =>
          img.id === imageId ? { ...img, status: 'completed', ocrResult } : img
        ));

        console.log(`✅ 重试成功: ${ocrResult.studentName}`);
      }
    } catch (error) {
      console.error(`❌ 重试失败:`, error);

      // 更新状态为失败
      setUploadedImages(prev => prev.map(img =>
        img.id === imageId ? {
          ...img,
          status: 'failed',
          error: error instanceof Error ? error.message : '重试失败'
        } : img
      ));
    }
  };

  // 处理单个图片OCR（带重试机制）
  const processImage = async (image: UploadedImage, retryCount: number = 0): Promise<OCRResult | null> => {
    const maxRetries = 2; // 最多重试2次

    try {
      // 将文件转换为base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(image.file);
      });

      // 为重试添加延迟，避免立即重试
      if (retryCount > 0) {
        const delay = Math.pow(2, retryCount) * 1000; // 指数退避：2s, 4s
        console.log(`⏳ 图片 ${image.id.substring(0, 8)}... 第${retryCount}次重试，等待${delay/1000}秒...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`🔄 开始处理图片 ${image.id.substring(0, 8)}... (尝试${retryCount + 1}/${maxRetries + 1})`);

      // 使用极客智坊OCR API，提供更好的读后续写识别效果
      const response = await fetch('/api/ai/ocr-geekai', {
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
        console.log('🔍 读后续写OCR API响应前200字符:', responseText.substring(0, 200));

        // 检查响应是否为JSON格式
        const trimmedText = responseText.trim();
        if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
          console.error('❌ 读后续写OCR API返回非JSON格式响应:', responseText.substring(0, 500));
          throw new Error(`API返回非JSON格式响应: ${responseText.substring(0, 200)}...`);
        }

        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ 读后续写OCR JSON解析失败:', parseError);
        throw new Error(`API响应解析失败: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      console.log('📝📝📝 读后续写OCR API响应数据检查：', {
        success: data.success,
        result: data.result ? data.result.substring(0, 100) + '...' : 'null',
        englishOnly: data.englishOnly ? data.englishOnly.substring(0, 100) + '...' : 'null',
        imageId: image.id,
        model: data.metadata?.model,
        processingTime: data.metadata?.processingTime
      });

      if (data.success && data.result) {
        // 直接解析OCR结果，使用读后续写OCR的英文分离结果，包含图片数据
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
      console.error(`❌ OCR处理失败 (尝试${retryCount + 1}/${maxRetries + 1}):`, error);

      // 如果还有重试次数，则重试
      if (retryCount < maxRetries) {
        console.log(`🔄 准备重试图片 ${image.id.substring(0, 8)}... (剩余重试次数: ${maxRetries - retryCount})`);
        return processImage(image, retryCount + 1);
      }

      // 重试次数用完，抛出最终错误
      console.error(`❌ 图片 ${image.id.substring(0, 8)}... 重试次数已用完，最终失败`);
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

    console.log(`📝 读后续写OCR解析完成 (${imageId}):`, {
      原文长度: originalText.length,
      中文内容长度: chineseContent.length,
      英文内容长度: content.length,
      包含图片数据: !!imageData,
      优化: "跳过姓名提取，专注文字识别"
    });

    const ocrResult = {
      imageId,
      studentName: "待确认", // 标记为待确认，在下一步骤中提取
      originalText,
      chineseContent,
      content,
      confidence: 0.9, // 提升置信度，因为更专注于识别
      processedAt: new Date(),
      imageData: imageData // 保存图片数据
    };

    // 立即计算字数统计
    const ocrResultWithWordCount = updateOCRResultWordCount(ocrResult);
    console.log(`📊 字数统计完成 (${imageId}): ${ocrResultWithWordCount.wordCount}词`);

    return ocrResultWithWordCount;
  };

  // 批量处理所有图片（并行处理）- 读后续写专用版
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

    // 显示进度提醒 - 15张优化并行处理的极速性能
    // 优化估计：15张并发，平均每张5秒（提高并发，效率与稳定兼顾），批次间延迟减少
    const estimatedMinutes = Math.max(1, Math.ceil((uploadedImages.length * 5) / 60) + Math.ceil(uploadedImages.length / 15) * 0.2);
    const message = `AI优化并行处理中... 预计${uploadedImages.length}张图片大约需要${estimatedMinutes}分钟（${Math.min(15, uploadedImages.length)}张同时处理，极速性能模式）。`;
    console.log(`🎯 ${message}`);

    // 设置进度消息
    setOcrProgressMessage(message);

    const assignments: ContinuationWritingAssignment[] = [];
    const errors: string[] = [];
    let completedCount = 0;

    // 优化的并行处理，避免API过载
    const batchSize = 15; // 优化并发：15张图片同时处理，提升处理效率
    const batches = [];

    for (let i = 0; i < uploadedImages.length; i += batchSize) {
      batches.push(uploadedImages.slice(i, i + batchSize));
    }

    console.log(`📝 开始读后续写批量处理 ${uploadedImages.length} 张图片，优化并发数: ${batchSize} 张/批次（稳定OCR版 - 15张并发）`);

    // 性能监控
    const startTime = Date.now();
    const allAssignments: ContinuationWritingAssignment[] = [];
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
        let assignment: ContinuationWritingAssignment | null = null;

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

      // 批次间添加短暂延迟，避免API过载
      if (batchIndex > 0) {
        const batchDelay = 2000; // 2秒批次间延迟
        console.log(`⏳ 批次间延迟${batchDelay/1000}秒，避免API过载...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

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

    console.log(`🎉 读后续写处理完成！优化性能统计：
    📊 总图片数: ${uploadedImages.length} 张
    ⚡ 优化并发数: ${concurrencyRatio} 张/批次
    ⏱️ 总耗时: ${totalTime.toFixed(2)} 秒
    📈 平均每张: ${avgTimePerImage.toFixed(2)} 秒
    🚀 极速性能: 15张并行处理，效率与稳定兼顾
    ✅ 重试机制: 失败图片自动重试，提高成功率`);

    setIsProcessing(false);
    setOcrProgressMessage(`✅ OCR识别完成！成功处理 ${allAssignments.length}/${uploadedImages.length} 张图片`);

    // 如果有失败的图片，显示错误信息
    if (errors.length > 0) {
      console.warn(`⚠️ 部分图片处理失败:`, errors);
      setOcrProgressMessage(prev => `${prev}，${errors.length} 张图片失败`);
    }

    // 保存最终结果
    setTimeout(() => {
      clearStoredData(); // 处理完成后清理localStorage
    }, 2000);
  };

  // 处理OCR识别
  const processOCR = async (imageIds: string[]) => {
    if (!task) return;

    setIsProcessing(true);
    setOcrProgressMessage('准备处理读后续写图片...');
    clearStoredData(); // 开始处理前清理旧数据

    const startTime = Date.now();

    try {
      // 更新统计信息
      setProcessingStats(prev => ({
        ...prev,
        totalImages: prev.totalImages + imageIds.length,
        processedImages: prev.processedImages,
        totalApplications: prev.totalApplications
      }));

      // 逐个处理图片
      for (let i = 0; i < imageIds.length; i++) {
        const imageId = imageIds[i];
        const imageData = uploadedImages.find(img => img.id === imageId);

        if (!imageData) continue;

        try {
          setOcrProgressMessage(`正在处理第 ${i + 1}/${imageIds.length} 张读后续写图片...`);

          // 更新状态为处理中
          setUploadedImages(prev =>
            prev.map(img =>
              img.id === imageId ? { ...img, status: 'processing' } : img
            )
          );

          // 强制压缩图片为base64，最大500KB
          console.log(`🎯 强制压缩读后续写图片到500KB以下: ${imageData.originalFile.name}`);
          const compressedImageBase64 = await compressImageForOCR(imageData.file);

          // 发送OCR请求
          const ocrResponse = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: compressedImageBase64,
              type: 'application'
            }),
          });

          if (!ocrResponse.ok) {
            throw new Error(`OCR请求失败: ${ocrResponse.status}`);
          }

          const ocrData = await ocrResponse.json();

          if (ocrData.error) {
            throw new Error(ocrData.error);
          }

          console.log(`✅ 读后续写OCR识别成功: ${imageData.originalFile.name}`, {
            学生姓名: ocrData.studentName || '未识别',
            识别文本长度: ocrData.content?.length || 0,
            置信度: ocrData.confidence || 0
          });

          // 创建OCR结果
          const ocrResult: OCRResult = {
            success: true,
            imageId,
            studentName: ocrData.studentName || '',
            originalText: ocrData.originalText || '',
            chineseContent: ocrData.chineseContent || '',
            content: ocrData.content || '',
            wordCount: 0, // 将在后面计算
            confidence: ocrData.confidence || 0,
            processedAt: new Date(),
            imageData: compressedImageBase64
          };

          // 创建学生作业
          const assignment: ContinuationWritingAssignment = {
            id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            student: {
              id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: ocrData.studentName || '未知学生',
              createdAt: new Date()
            },
            ocrResult,
            status: 'pending',
            createdAt: new Date()
          };

          // 更新任务状态
          setTask(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              assignments: [...prev.assignments, assignment]
            };
          });

          // 更新图片状态
          setUploadedImages(prev =>
            prev.map(img =>
              img.id === imageId
                ? { ...img, status: 'completed', ocrResult }
                : img
            )
          );

          // 更新统计信息
          setProcessingStats(prev => ({
            ...prev,
            processedImages: prev.processedImages + 1,
            totalApplications: prev.totalApplications + 1
          }));

        } catch (error) {
          console.error(`读后续写图片 ${imageId} OCR处理失败:`, error);
          const errorMessage = error instanceof Error ? error.message : '处理失败';

          // 更新图片状态为失败
          setUploadedImages(prev =>
            prev.map(img =>
              img.id === imageId
                ? { ...img, status: 'failed', error: errorMessage }
                : img
            )
          );
        }

        // 添加延迟以避免API限流
        if (i < imageIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const processingTime = Date.now() - startTime;

      // 更新最终统计信息
      setProcessingStats(prev => ({
        ...prev,
        processingTime: prev.processingTime + processingTime,
        errors: [
          ...prev.errors,
          ...uploadedImages
            .filter(img => img.status === 'failed')
            .map(img => `${img.originalFile.name}: ${img.error}`)
        ]
      }));

      setOcrProgressMessage('读后续写OCR处理完成！');

      // 🔧 优化：保存最终状态到localStorage，使用增强的存储检查
      const finalData = {
        taskId: task?.id,
        uploadedImages: uploadedImages.map(img => ({ ...img, status: img.status === 'completed' ? img.status : 'failed' })),
        isProcessing: false,
        ocrProgressMessage: '读后续写OCR处理完成！',
        timestamp: Date.now()
      };

      try {
        const finalJsonString = JSON.stringify(finalData);

        // 检查最终数据大小
        if (finalJsonString.length > 500 * 1024) {
          console.warn('⚠️ 最终数据也过大，使用最小化格式保存');

          // 使用最小化格式只保存必要信息
          const minimalFinalData = {
            taskId: finalData.taskId,
            uploadedImages: finalData.uploadedImages.map(img => ({
              id: img.id,
              status: img.status
            })),
            isProcessing: false,
            timestamp: finalData.timestamp,
            version: 'final_minimal'
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalFinalData));
          console.log('💾 已使用最小化格式保存最终状态:', {
            taskId: task?.id,
            originalSize: Math.round(finalJsonString.length / 1024) + 'KB',
            minimalSize: Math.round(JSON.stringify(minimalFinalData).length / 1024) + 'KB'
          });
        } else {
          localStorage.setItem(STORAGE_KEY, finalJsonString);
          console.log('💾 读后续写OCR最终状态已保存:', {
            taskId: task?.id,
            imageCount: uploadedImages.length,
            successCount: uploadedImages.filter(img => img.status === 'completed').length,
            failedCount: uploadedImages.filter(img => img.status === 'failed').length,
            dataSize: Math.round(finalJsonString.length / 1024) + 'KB'
          });
        }
      } catch (saveError) {
        console.warn('⚠️ 保存最终状态失败:', saveError);
        // 不中断处理，只记录错误
      }

    } catch (error) {
      console.error('批量读后续写OCR处理失败:', error);
      setOcrProgressMessage('读后续写OCR处理过程中发生错误');
    } finally {
      setIsProcessing(false);
    }
  };

  // 删除图片
  const removeImage = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));

    // 同时从任务数据中删除对应的作业
    if (task && task.assignments.some(assignment => assignment.id === imageId)) {
      const updatedAssignments = task.assignments.filter(assignment => assignment.id !== imageId);
      setTask({
        ...task,
        assignments: updatedAssignments
      });
    }
  };

  // 清空所有图片
  const clearAllImages = () => {
    if (isProcessing) return;
    setUploadedImages([]);
    clearStoredData();
  };

  // 重新处理失败的图片
  const retryFailedImages = () => {
    const failedImages = uploadedImages.filter(img => img.status === 'failed');
    if (failedImages.length > 0) {
      console.log(`🔄 重试 ${failedImages.length} 张失败的读后续写图片...`);
      processOCR(failedImages.map(img => img.id));
    }
  };

  
  // 查看图片
  const viewImage = (imageData: string) => {
    setPreviewImage(imageData);
  };

  const completedImages = uploadedImages.filter(img => img.status === 'completed');
  const failedImages = uploadedImages.filter(img => img.status === 'failed');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">批量OCR识别</h2>
        <p className="text-gray-600 text-sm">
          上传学生读后续写作业图片，系统将自动进行OCR文字识别。支持JPG、PNG等格式，建议图片清晰以提高识别准确率。
          系统会自动压缩图片确保OCR识别的稳定性。
        </p>
      </div>

      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">上传读后续写作图片</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const syntheticEvent = {
                target: {
                  files: e.dataTransfer.files
                }
              } as React.ChangeEvent<HTMLInputElement>;
              handleFileUpload(syntheticEvent);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isProcessing}
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-gray-600">拖拽读后续写图片到此处或点击上传</p>
              <p className="text-sm text-gray-500">支持JPG、PNG等格式，可批量上传，无数量限制</p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                选择读后续写图片
              </Button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
              disabled={isProcessing}
            >
              <Image className="w-4 h-4" />
              选择图片
            </Button>

            {uploadedImages.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={clearAllImages}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  title={hasProcessingImages ? "警告：有图片正在处理中，清空可能会中断OCR识别" : "清空全部图片"}
                  disabled={isProcessing}
                >
                  <Trash2 className="w-4 h-4" />
                  清空全部
                </Button>

                {failedImages.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={retryFailedImages}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    重试失败项 ({failedImages.length})
                  </Button>
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
              <span>已上传读后续写图片 ({uploadedImages.length})</span>
              <div className="flex gap-2">
                {completedImages.length > 0 && (
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 font-medium px-2 py-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    成功 {completedImages.length}
                  </Badge>
                )}
                {failedImages.length > 0 && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 font-medium px-2 py-1">
                    <X className="w-3 h-3 mr-1" />
                    失败 {failedImages.length}
                  </Badge>
                )}
                {(completedImages.length + failedImages.length) === 0 && uploadedImages.length > 0 && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 font-medium px-2 py-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    待处理 {uploadedImages.length}
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedImages.map((image) => (
                <div key={image.id} className="border rounded-lg overflow-hidden">
                  <div className="relative">
                    <img
                      src={image.preview}
                      alt={image.originalFile.name}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => viewImage(image.preview)}
                        className="p-1"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      {image.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retrySingleImage(image.id)}
                          disabled={isProcessing}
                          className="p-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                          title="重试OCR"
                        >
                          <Camera className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(image.id)}
                        disabled={isProcessing || image.status === 'processing' || image.status === 'compressing'}
                        className="p-1"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge
                        variant={
                          image.status === 'completed' ? 'default' :
                          image.status === 'failed' ? 'destructive' :
                          image.status === 'processing' ? 'secondary' :
                          'outline'
                        }
                        className={`text-xs font-medium ${
                          image.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                          image.status === 'failed' ? 'bg-red-100 text-red-800 border-red-200' :
                          image.status === 'processing' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}
                      >
                        {image.status === 'pending' && (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            等待中
                          </>
                        )}
                        {image.status === 'compressing' && (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            压缩中
                          </>
                        )}
                        {image.status === 'processing' && (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            识别中
                          </>
                        )}
                        {image.status === 'completed' && (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            已完成
                          </>
                        )}
                        {image.status === 'failed' && (
                          <>
                            <X className="w-3 h-3 mr-1" />
                            失败
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{image.originalFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {image.compressionInfo && (
                        <>
                          压缩率: {image.compressionInfo.compressionRatio}%
                          ({(image.compressionInfo.originalSize / 1024).toFixed(1)}KB
                          → {image.compressionInfo.compressedSize}KB)
                        </>
                      )}
                    </p>
                    {image.error && (
                      <div className="mt-1 p-1 bg-red-50 rounded text-xs">
                        <p className="text-red-600 font-medium">识别失败</p>
                        <p className="text-red-500">{image.error}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retrySingleImage(image.id)}
                          disabled={isProcessing}
                          className="mt-1 h-6 text-xs bg-red-100 hover:bg-red-200 text-red-700 border-red-300 w-full"
                        >
                          <Camera className="w-3 h-3 mr-1" />
                          重试
                        </Button>
                      </div>
                    )}
                    {image.ocrResult && (
                      <div className="mt-1 p-1 bg-green-50 rounded text-xs">
                        <p className="text-green-600 font-medium flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          识别成功
                        </p>
                        <p className="text-green-700">学生: {image.ocrResult.studentName || '未知学生'}</p>
                        <p className="text-green-600">
                          字数: {image.ocrResult.content?.length || 0} 字符
                        </p>
                        <p className="text-green-600">
                          置信度: {Math.round((image.ocrResult.confidence || 0) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 处理进度 */}
      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">{ocrProgressMessage}</p>
                <div className="w-full bg-blue-100 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(processingStats.processedImages / processingStats.totalImages) * 100}%`
                    }}
                  />
                </div>
              </div>
              <span className="text-sm text-blue-600">
                {processingStats.processedImages}/{processingStats.totalImages}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 图片预览 */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] mx-4">
            <img
              src={previewImage}
              alt="预览图片"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* 状态提示信息 */}
      {uploadedImages.length > 0 && !isProcessing && (
        <Card>
          <CardContent className="pt-6">
            {/* 部分成功时的提示信息 */}
            {completedImages.length > 0 && failedImages.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-800 font-medium">
                    部分图片识别失败，但您可以继续下一步处理已成功识别的 {completedImages.length} 篇作文
                  </span>
                </div>
              </div>
            )}

            {/* 全部失败时的提示信息 */}
            {completedImages.length === 0 && failedImages.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-800 font-medium">
                    所有图片识别失败，请检查图片质量后重试，或重新上传清晰的图片
                  </span>
                </div>
              </div>
            )}

            {/* 全部成功的提示信息 */}
            {completedImages.length > 0 && failedImages.length === 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    所有图片识别成功！您可以继续下一步处理 {completedImages.length} 篇作文
                  </span>
                </div>
              </div>
            )}
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
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPrev}>
            上一步
          </Button>
        </div>

        <div className="flex gap-2">
          {/* 开始OCR识别按钮 - 仅在有图片且未处理时显示 */}
          {uploadedImages.length > 0 && !hasProcessedImages && (
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
          )}

          <Button
            onClick={onNext}
            disabled={completedImages.length === 0}
            className="px-8"
          >
            下一步：确认读后续写内容 ({completedImages.length}篇成功{failedImages.length > 0 ? `，${failedImages.length}篇失败` : ''})
          </Button>

          {failedImages.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                // 跳过失败的图片，直接进入下一步
                if (completedImages.length > 0) {
                  onNext();
                }
              }}
              className="px-6"
            >
              跳过失败图片进入下一步
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchImageUploader;