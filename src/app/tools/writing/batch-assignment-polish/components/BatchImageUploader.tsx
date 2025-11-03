"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress"; // 暂时移除
import { Badge } from "@/components/ui/badge";
// import { Alert, AlertDescription } from "@/components/ui/alert"; // 暂时移除
import { Upload, X, Eye, RotateCcw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { StudentAssignment, OCRResult, ProcessingStats } from "../types";

interface BatchImageUploaderProps {
  onOCRComplete: (assignments: StudentAssignment[]) => void;
  onStatsUpdate: (stats: ProcessingStats) => void;
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  ocrResult?: OCRResult;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  retryCount?: number; // 重试次数
}

export const BatchImageUploader: React.FC<BatchImageUploaderProps> = ({
  onOCRComplete,
  onStatsUpdate
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [buttonClicks, setButtonClicks] = useState(0); // 新增：按钮点击计数
  const [stats, setStats] = useState<ProcessingStats>({
    totalImages: 0,
    processedImages: 0,
    totalSentences: 0,
    polishedSentences: 0,
    errors: [],
    processingTime: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 测试组件是否正常工作
  console.log('🔧 BatchImageUploader component rendered!', {
    imagesCount: images.length,
    isProcessing,
    onOCRCompleteExists: typeof onOCRComplete === 'function'
  });

  // 拖拽上传
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    console.log('Files dropped:', e.dataTransfer.files.length);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    console.log('Valid image files from drop:', files.length);

    if (files.length > 0) {
      handleFilesAdd(files);
    } else {
      console.log('No valid image files in drop');
      alert('请拖拽有效的图片文件（JPG、PNG、GIF格式）');
    }
  }, []);

  // 文件选择上传
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input triggered, isProcessing:', isProcessing);
    console.log('Files selected:', e.target.files);

    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      console.log('Processing', files.length, 'files');
      handleFilesAdd(files);
    } else {
      console.log('No files selected');
    }

    // 清空input值，允许重复选择同一文件
    e.target.value = '';
  };

  // 处理添加的文件
  const handleFilesAdd = (files: File[]) => {
    console.log('handleFilesAdd called with', files.length, 'files');

    try {
      const validFiles = files.filter(file => file.type.startsWith('image/'));
      console.log('Valid image files:', validFiles.length);

      if (validFiles.length === 0) {
        console.log('No valid image files found');
        alert('请选择有效的图片文件（JPG、PNG、GIF格式）');
        return;
      }

      const newImages: UploadedImage[] = validFiles.map((file, index) => {
        const preview = URL.createObjectURL(file);
        return {
          id: `img_${Date.now()}_${index}`,
          file,
          preview,
          status: 'pending'
        };
      });

      console.log('Created', newImages.length, 'new image entries');

      setImages(prev => {
        const updated = [...prev, ...newImages];
        console.log('Total images after adding:', updated.length);
        return updated;
      });

      setStats(prev => {
        const updated = {
          ...prev,
          totalImages: prev.totalImages + newImages.length
        };
        console.log('Updated stats:', updated);
        return updated;
      });

    } catch (error) {
      console.error('Error in handleFilesAdd:', error);
      alert('处理文件时出错，请重试');
    }
  };

  // 删除图片
  const removeImage = (imageId: string) => {
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== imageId);
      setStats({
        totalImages: newImages.length,
        processedImages: newImages.filter(img => img.status === 'completed').length,
        totalSentences: 0,
        polishedSentences: 0,
        errors: [],
        processingTime: 0
      });
      return newImages;
    });
  };

  // 重新处理图片（手动重试）
  const retryImage = async (imageId: string) => {
    const image = images.find(img => img.id === imageId);
    if (!image) return;

    console.log(`手动重试图片: ${image.file.name}`);
    
    setImages(prev => prev.map(img =>
      img.id === imageId ? { 
        ...img, 
        status: 'pending', 
        error: undefined,
        retryCount: 0 // 重置重试计数
      } : img
    ));

    await processSingleImage(image, 0); // 从0开始重试
  };

  // 处理单个图片OCR（带重试机制）
  const processSingleImage = async (image: UploadedImage, retryCount: number = 0): Promise<OCRResult | null> => {
    const maxRetries = 1; // 最多重试1次
    
    try {
      // 更新状态为处理中
      setImages(prev => prev.map(img =>
        img.id === image.id ? { 
          ...img, 
          status: 'processing',
          error: undefined,
          retryCount: retryCount
        } : img
      ));

      // 转换图片为base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result);
        };
        reader.readAsDataURL(image.file);
      });

      const base64Data = await base64Promise;

      // 调用OCR API
      const response = await fetch('/api/ai/image-recognition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64Data
        })
      });

      if (!response.ok) {
        throw new Error(`OCR API错误: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'OCR识别失败');
      }

      const ocrText = data.result;
      console.log(`OCR识别原文 (尝试${retryCount + 1}):`, ocrText);

      // 简化处理：直接使用基础解析，不再进行AI提取
      const parsedResult = parseOCRResult(ocrText, image.id);

      // 更新图片状态
      setImages(prev => prev.map(img =>
        img.id === image.id ? { 
          ...img, 
          ocrResult: parsedResult, 
          status: 'completed',
          retryCount: retryCount
        } : img
      ));

      return parsedResult;

    } catch (error) {
      console.error(`OCR处理失败 (尝试${retryCount + 1}):`, error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      // 如果还有重试次数，自动重试
      if (retryCount < maxRetries) {
        console.log(`开始第${retryCount + 2}次尝试...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 延迟2秒后重试
        return await processSingleImage(image, retryCount + 1);
      }

      // 重试次数用完，标记为错误
      setImages(prev => prev.map(img =>
        img.id === image.id ? { 
          ...img, 
          status: 'error', 
          error: `${errorMessage} (已重试${maxRetries}次)`,
          retryCount: retryCount
        } : img
      ));

      return null;
    }
  };

  // 解析OCR结果 - 优化中文姓名识别
  const parseOCRResult = (ocrText: string, imageId: string): OCRResult => {
    console.log('OCR识别的原始文本:', ocrText);

    // 尝试提取学生姓名和英文句子
    const lines = ocrText.split('\n').filter(line => line.trim());
    console.log('按行分割后的文本:', lines);

    let studentName = "";
    let englishText = "";

    // 优化学生姓名识别逻辑 - 优先识别中文姓名
    let nameIndex = -1;
    
    // 1. 优先查找 "中文姓名." 格式（如 "张三.", "李明."）
    const chineseNameWithDotPattern = /^[\u4e00-\u9fa5]{2,4}\.$/;
    nameIndex = lines.findIndex(line => chineseNameWithDotPattern.test(line.trim()));
    
    if (nameIndex !== -1) {
      // 找到了 "中文姓名." 格式，去掉末尾的点
      studentName = lines[nameIndex].trim().replace(/\.$/, '');
      console.log(`✅ 识别到中文姓名格式 "XX.": ${studentName}`);
      // 合并姓名之后的所有行作为英文文本
      englishText = lines.slice(nameIndex + 1).join(' ');
    } else {
      // 2. 查找纯中文姓名（2-4个中文字符，最常见）
      const chineseNamePattern = /^[\u4e00-\u9fa5]{2,4}$/;
      nameIndex = lines.findIndex(line => chineseNamePattern.test(line.trim()));
      
      if (nameIndex !== -1) {
        studentName = lines[nameIndex].trim();
        console.log(`✅ 识别到中文姓名: ${studentName}`);
        englishText = lines.slice(nameIndex + 1).join(' ');
      } else {
        // 3. 尝试从包含中文的行中提取姓名（可能是混合格式，如 "姓名: 张三"）
        const mixedNamePattern = /[\u4e00-\u9fa5]{2,4}/;
        const firstLineWithChinese = lines.find(line => mixedNamePattern.test(line));

        if (firstLineWithChinese) {
          // 提取中文部分作为姓名（优先提取2-4个中文字符）
          const chineseMatch = firstLineWithChinese.match(/[\u4e00-\u9fa5]{2,4}/);
          if (chineseMatch) {
            studentName = chineseMatch[0];
            console.log(`✅ 从混合文本中提取中文姓名: ${studentName}`);
            
            // 去除姓名行，保留剩余文本
            const nameLineIndex = lines.indexOf(firstLineWithChinese);
            englishText = lines.slice(nameLineIndex + 1).join(' ');
          } else {
            // 如果没找到2-4个字符的，尝试提取任何中文
            const anyChineseMatch = firstLineWithChinese.match(/[\u4e00-\u9fa5]+/);
            studentName = anyChineseMatch ? anyChineseMatch[0] : "未知学生";
            console.log(`⚠️ 提取到中文姓名（可能不完整）: ${studentName}`);
            const nameLineIndex = lines.indexOf(firstLineWithChinese);
            englishText = lines.slice(nameLineIndex + 1).join(' ');
          }
        } else {
          // 4. 如果完全没找到中文姓名，使用第一行作为姓名（但标注为未知）
          studentName = lines[0]?.trim() || "未知学生";
          console.log(`⚠️ 未找到中文姓名，使用第一行: ${studentName}`);
          console.log(`⚠️ 提示：OCR识别结果中未找到中文姓名，请检查图片或手动匹配`);
          englishText = lines.slice(1).join(' ');
        }
      }
    }

    console.log('提取的学生姓名:', studentName);
    console.log('合并后的英文文本:', englishText);

    // 简化句子分割 - 只按标点符号分割
    const sentences = englishText
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 5 && /[a-zA-Z]/.test(sentence));

    console.log('基础分割后的句子:', sentences);

    return {
      imageId,
      studentName,
      originalText: ocrText, // 保存完整的OCR原文
      sentences: sentences.length > 0 ? sentences : [englishText.trim() || ocrText],
      confidence: 0.8, // 模拟置信度
      processedAt: new Date()
    };
  };

  // 注意：AI提取功能已移至独立的句子提取步骤



  // 批量处理OCR
  const processBatchOCR = async () => {
    console.log('🚀 processBatchOCR called!');
    console.log('📊 Images available:', images.length);
    console.log('📊 Images details:', images.map(img => ({ id: img.id, status: img.status })));

    if (images.length === 0) {
      console.log('❌ No images to process, returning early');
      return;
    }

    console.log('✅ Starting OCR processing...');
    setIsProcessing(true);
    const startTime = Date.now();

    try {
      const pendingImages = images.filter(img => img.status === 'pending');
      const totalToProcess = pendingImages.length;

      // 并行处理所有图片
      const promises = pendingImages.map(async (image, index) => {
        console.log(`🔄 Processing image ${index + 1}/${totalToProcess}: ${image.id}`);
        const result = await processSingleImage(image);
        console.log(`✅ Image ${index + 1} processing completed. Result:`, result ? 'SUCCESS' : 'FAILED');

        // 更新进度
        setProcessingProgress((index + 1) / totalToProcess * 100);

        return { image, result };
      });

      const results = await Promise.all(promises);

      // 统计结果
      const successfulResults = results
        .filter(r => r.result !== null)
        .map(r => r.result as OCRResult);

      const totalSentences = successfulResults.reduce(
        (total, result) => total + result.sentences.length,
        0
      );

      // 创建作业列表
      const assignments: StudentAssignment[] = successfulResults.map(result => ({
        id: `assignment_${result.imageId}`,
        student: {
          id: `student_${result.imageId}`,
          name: result.studentName,
          originalName: result.studentName,
          confirmed: false
        },
        ocrResult: result,
        polishedSentences: [],
        processedAt: new Date()
      }));

      // 更新统计信息
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const errors = results
        .filter(r => r.result === null)
        .map(r => r.image.file.name);

      const newStats: ProcessingStats = {
        totalImages: images.length,
        processedImages: successfulResults.length,
        totalSentences,
        polishedSentences: 0,
        errors,
        processingTime
      };

      setStats(newStats);
      onStatsUpdate(newStats);

      console.log('=== OCR BATCH PROCESSING COMPLETED ===');
      console.log('Total assignments created:', assignments.length);
      console.log('Assignments details:', assignments);
      console.log('About to call onOCRComplete callback...');

      // 确保assignments不为空
      if (assignments.length > 0) {
        console.log('✅ Calling onOCRComplete with real assignments');
        console.log('📋 About to call parent callback with:', assignments);
        try {
          onOCRComplete(assignments);
          console.log('✅ onOCRComplete callback called successfully');
        } catch (error) {
          console.error('❌ Error calling onOCRComplete:', error);
        }
      } else {
        console.error('❌ No assignments to pass to parent');
        console.error('❌ This should not happen if OCR was successful!');
        // 创建一个虚拟assignment以避免阻塞流程
        const fallbackAssignment: StudentAssignment = {
          id: 'fallback_assignment',
          student: {
            id: 'fallback_student',
            name: '未知学生',
            originalName: '未知学生',
            confirmed: false
          },
          ocrResult: {
            imageId: 'fallback_img',
            studentName: '未知学生',
            sentences: ['No sentences found'],
            confidence: 0.1,
            processedAt: new Date()
          },
          polishedSentences: [],
          processedAt: new Date()
        };
        console.log('⚠️ Calling onOCRComplete with fallback assignment');
        onOCRComplete([fallbackAssignment]);
        console.log('⚠️ Fallback onOCRComplete callback called');
      }

    } catch (error) {
      console.error('批量OCR处理失败:', error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // 清空所有图片
  const clearAll = () => {
    if (images.length > 0 && confirm('确定要清空所有图片吗？')) {
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      setStats({
        totalImages: 0,
        processedImages: 0,
        totalSentences: 0,
        polishedSentences: 0,
        errors: [],
        processingTime: 0
      });
    }
  };

  return (
    <div className="space-y-6">

      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">上传学生作业图片</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isProcessing
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : isDragging
                ? 'border-green-500 bg-green-50 scale-[1.02] shadow-lg'
                : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 cursor-pointer'
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="batch-upload"
              disabled={isProcessing}
              style={{ display: 'none' }}
              key={isProcessing ? 'disabled' : 'enabled'} // 强制重新渲染
            />

            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload className="w-12 h-12 text-blue-400" />
              </div>

              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isProcessing
                    ? '正在处理中...'
                    : isDragging
                    ? '松开鼠标上传图片'
                    : '拖拽图片到此处或点击上传'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  支持JPG、PNG、GIF格式，可同时上传多张图片
                </p>
                {!isProcessing && !isDragging && (
                  <p className="text-xs text-blue-600 mt-2">
                    💡 提示：你可以直接拖拽图片到这里，或点击下方按钮选择文件
                  </p>
                )}
              </div>

              {!isProcessing && (
                <>
                  <label htmlFor="batch-upload" className="inline-block cursor-pointer">
                    <Button
                      type="button"
                      className="cursor-pointer !pointer-events-auto"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('Button clicked, isProcessing:', isProcessing);
                        console.log('fileInputRef.current:', fileInputRef.current);
                        fileInputRef.current?.click();
                      }}
                      onMouseDown={(e) => {
                        console.log('Button mouse down');
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      选择图片
                    </Button>
                  </label>

                  {/* 备用按钮，直接调用文件选择 */}
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2 cursor-pointer !pointer-events-auto"
                    onClick={async () => {
                      console.log('Fallback button clicked');
                      try {
                        // 创建临时input元素
                        const tempInput = document.createElement('input');
                        tempInput.type = 'file';
                        tempInput.multiple = true;
                        tempInput.accept = 'image/*';
                        tempInput.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          const files = Array.from(target.files || []);
                          if (files.length > 0) {
                            handleFilesAdd(files);
                          }
                        };
                        tempInput.click();
                      } catch (error) {
                        console.error('Fallback file selection failed:', error);
                        alert('文件选择失败，请重试');
                      }
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    备用选择
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 处理进度 */}
          {isProcessing && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">OCR处理进度</span>
                <span className="text-sm text-gray-600">
                  {Math.round(processingProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => {
                const clickCount = buttonClicks + 1;
                setButtonClicks(clickCount);

                console.log(`🔘 OCR Button clicked! (${clickCount} times)`);
                console.log('🔘 Button state check:', {
                  imagesLength: images.length,
                  isProcessing,
                  isDisabled: images.length === 0 || isProcessing
                });
                console.log('🔘 Images details:', images.map(img => ({ id: img.id, status: img.status })));

                // 立即调用处理函数
                processBatchOCR();
              }}
              disabled={images.length === 0 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  开始OCR识别
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={clearAll}
              disabled={images.length === 0 || isProcessing}
            >
              清空所有
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 图片列表 */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>已上传图片</span>
              <Badge variant="secondary">
                {images.length} 张图片
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="border rounded-lg overflow-hidden bg-white"
                >
                  {/* 图片预览 */}
                  <div className="relative">
                    <img
                      src={image.preview}
                      alt="预览"
                      className="w-full h-32 object-cover"
                    />

                    {/* 状态标签 */}
                    <div className="absolute top-2 right-2">
                      {image.status === 'pending' && (
                        <Badge variant="secondary">待处理</Badge>
                      )}
                      {image.status === 'processing' && (
                        <Badge variant="default" className="bg-blue-500">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {image.retryCount && image.retryCount > 0 
                            ? `重试中 (${image.retryCount + 1}/2)` 
                            : '处理中'}
                        </Badge>
                      )}
                      {image.status === 'completed' && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          已完成
                        </Badge>
                      )}
                      {image.status === 'error' && (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          失败
                        </Badge>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      disabled={isProcessing}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 图片信息 */}
                  <div className="p-3">
                    <p className="text-xs font-medium truncate" title={image.file.name}>
                      {image.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(image.file.size / 1024).toFixed(1)} KB
                    </p>

                    {/* OCR结果 */}
                    {image.ocrResult && (
                      <div className="mt-2 text-xs">
                        <p className="font-medium text-gray-700">
                          识别姓名: {image.ocrResult.studentName}
                        </p>
                        <p className="text-gray-600">
                          句子数量: {image.ocrResult.sentences.length}
                        </p>
                        {image.ocrResult.sentences.length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              查看句子
                            </summary>
                            <ul className="mt-1 space-y-1">
                              {image.ocrResult.sentences.map((sentence, idx) => (
                                <li key={idx} className="text-gray-600 truncate">
                                  {idx + 1}. {sentence}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}

                    {/* 错误信息 */}
                    {image.error && (
                      <div className="mt-2">
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <AlertCircle className="inline h-3 w-3 mr-1" />
                          {image.error}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryImage(image.id)}
                          className="mt-2 w-full text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          重试
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2">使用说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>批量上传</strong>：支持拖拽或点击选择多张图片</li>
            <li>• <strong>OCR识别</strong>：专注于图像文字识别，提取原始文本内容</li>
            <li>• <strong>智能重试</strong>：识别失败时自动重试1次，最终失败可手动重试</li>
            <li>• <strong>并行处理</strong>：同时处理多张图片，提高效率</li>
            <li>• <strong>错误恢复</strong>：针对具体错误图片可单独重新处理</li>
            <li>• <strong>格式要求</strong>：建议图片清晰，文字大小适中</li>
            <li>• <strong>命名建议</strong>：图片中最好包含学生姓名便于匹配</li>
            <li>• <strong>下一步</strong>：句子提取将在单独步骤中进行智能处理</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};