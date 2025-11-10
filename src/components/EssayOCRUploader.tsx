"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, X, Eye, Trash2, Loader2, RefreshCw } from "lucide-react";
import { compressImageForOCR } from "@/lib/image-compressor";

interface EssayOCRResult {
  text: string;
  englishOnly: string;
  metadata: {
    hasChinese: boolean;
    originalLength: number;
    englishOnlyLength: number;
    processingTime: number;
    model: string;
  };
}

interface UploadedEssayImage {
  id: string;
  file: File;
  originalFile: File;
  preview: string;
  status: 'pending' | 'compressing' | 'processing' | 'completed' | 'failed';
  ocrResult?: EssayOCRResult;
  error?: string;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
}

interface EssayOCRUploaderProps {
  onOCRComplete: (result: EssayOCRResult) => void;
  maxImages?: number;
}

const EssayOCRUploader: React.FC<EssayOCRUploaderProps> = ({
  onOCRComplete,
  maxImages = 10
}) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedEssayImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // 限制图片数量
    const remainingSlots = maxImages - uploadedImages.length;
    if (remainingSlots <= 0) {
      alert(`最多只能上传${maxImages}张图片`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newImages: UploadedEssayImage[] = filesToProcess.map(file => ({
      id: `essay_${Date.now()}_${Math.random()}`,
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
    console.log(`🔧 开始压缩 ${newImages.length} 张作文图片...`);
    compressNewEssayImages(newImages);
  };

  // 压缩新上传的图片
  const compressNewEssayImages = async (images: UploadedEssayImage[]) => {
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

        // 作文OCR使用适配Vercel限制的压缩设置
        const originalSize = image.originalFile.size;
        const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);

        const compressedFile = await compressImageForOCR(image.originalFile, {
          maxSizeMB: 3, // 限制为3MB，避免Vercel函数请求体过大
          maxWidthOrHeight: 2048, // 适度降低分辨率，平衡质量和大小
          quality: 0.9, // 适度降低质量，确保文件大小符合要求
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
          压缩率: `${compressionInfo.compressionRatio}%`
        });

      } catch (error) {
        console.error(`压缩作文图片失败: ${image.originalFile.name}`, error);

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
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // OCR识别单张图片
  const recognizeEssayImage = async (image: UploadedImage): Promise<EssayOCRResult | null> => {
    const attemptOCR = async (): Promise<EssayOCRResult | null> => {
      try {
        // 将文件转换为base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(image.file);
        });

        // 使用专门的作文OCR API
        const response = await fetch('/api/ai/essay-ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: base64
          })
        });

        // 安全解析JSON响应
        let data;
        try {
          const responseText = await response.text();
          console.log('📝 作文OCR API响应前200字符:', responseText.substring(0, 200));

          const trimmedText = responseText.trim();
          if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
            console.error('❌ 作文OCR API返回非JSON格式响应:', responseText.substring(0, 500));
            throw new Error(`API返回非JSON格式响应: ${responseText.substring(0, 200)}`);
          }

          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ 作文OCR JSON解析失败:', parseError);
          throw new Error(`API响应解析失败: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }

        console.log('📝 作文OCR响应数据检查：', {
          success: data.success,
          resultLength: data.result?.length || 0,
          englishOnlyLength: data.englishOnly?.length || 0,
          model: data.metadata?.model,
          processingTime: data.metadata?.processingTime
        });

        if (data.success && data.result) {
          return {
            text: data.result,
            englishOnly: data.englishOnly || '',
            metadata: data.metadata
          };
        } else {
          let errorMessage = data.error || '作文OCR识别失败';
          if (data.details && typeof data.details === 'string') {
            errorMessage += ` (${data.details})`;
          }
          throw new Error(errorMessage);
        }

      } catch (error) {
        console.error(`作文OCR处理失败:`, error);
        throw error;
      }
    };

    try {
      return await attemptOCR();
    } catch (error) {
      throw error;
    }
  };

  // 处理图片识别
  const processImages = async () => {
    if (uploadedImages.length === 0) return;

    setIsProcessing(true);
    setProcessingMessage("开始识别作文内容...");

    const results: EssayOCRResult[] = [];

    try {
      // 串行处理每张图片，确保质量
      for (let i = 0; i < uploadedImages.length; i++) {
        const image = uploadedImages[i];

        setProcessingMessage(`正在识别第${i + 1}/${uploadedImages.length}张图片...`);

        // 更新图片状态为处理中
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'processing' as const, error: undefined }
              : img
          )
        );

        try {
          const ocrResult = await recognizeEssayImage(image);

          if (ocrResult) {
            results.push(ocrResult);

            // 更新图片状态为完成
            setUploadedImages(prev =>
              prev.map(img =>
                img.id === image.id
                  ? { ...img, status: 'completed' as const, ocrResult }
                  : img
              )
            );

            // 调用回调函数
            onOCRComplete(ocrResult);

            console.log(`✅ 第${i + 1}张作文图片识别完成`);
          }
        } catch (error) {
          console.error(`❌ 第${i + 1}张作文图片识别失败:`, error);

          // 更新图片状态为失败
          setUploadedImages(prev =>
            prev.map(img =>
              img.id === image.id
                ? {
                    ...img,
                    status: 'failed' as const,
                    error: error instanceof Error ? error.message : '识别失败'
                  }
                : img
            )
          );
        }
      }

      if (results.length > 0) {
        setProcessingMessage(`识别完成！成功识别${results.length}张图片`);
      } else {
        setProcessingMessage("识别失败，请检查图片质量");
      }

    } catch (error) {
      console.error("批量作文OCR处理失败:", error);
      setProcessingMessage("处理过程中出现错误");
    } finally {
      setIsProcessing(false);
    }
  };

  // 手动重试失败的图片
  const retryFailedImages = async () => {
    const failedImages = uploadedImages.filter(img => img.status === 'failed');

    if (failedImages.length === 0) return;

    setIsProcessing(true);
    setProcessingMessage(`重试${failedImages.length}张失败的图片...`);

    for (const image of failedImages) {
      // 重置状态
      setUploadedImages(prev =>
        prev.map(img =>
          img.id === image.id
            ? { ...img, status: 'processing' as const, error: undefined }
            : img
        )
      );

      try {
        const ocrResult = await recognizeEssayImage(image);

        if (ocrResult) {
          setUploadedImages(prev =>
            prev.map(img =>
              img.id === image.id
                ? { ...img, status: 'completed' as const, ocrResult }
                : img
            )
          );

          onOCRComplete(ocrResult);
          console.log(`✅ 重试成功: ${image.id}`);
        }
      } catch (error) {
        setUploadedImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? {
                  ...img,
                  status: 'failed' as const,
                  error: error instanceof Error ? error.message : '重试失败'
                }
              : img
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const completedCount = uploadedImages.filter(img => img.status === 'completed').length;
  const failedCount = uploadedImages.filter(img => img.status === 'failed').length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="w-5 h-5" />
          作文OCR识别 (doubao-seed-1-6-lite)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 文件上传区域 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="essay-file-upload"
          />
          <label
            htmlFor="essay-file-upload"
            className="cursor-pointer inline-block"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              点击上传作文图片，或拖拽文件到此处
            </p>
            <p className="text-sm text-gray-500">
              支持 JPG, PNG, GIF 格式，最多{maxImages}张图片
            </p>
            <Button variant="outline" className="mt-4">
              选择图片
            </Button>
          </label>
        </div>

        {/* 已上传图片列表 */}
        {uploadedImages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                已上传图片 ({uploadedImages.length}/{maxImages})
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={processImages}
                  disabled={isProcessing || uploadedImages.every(img => img.status === 'processing')}
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {processingMessage}
                    </>
                  ) : (
                    "开始识别"
                  )}
                </Button>
                {failedCount > 0 && (
                  <Button
                    onClick={retryFailedImages}
                    disabled={isProcessing}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重试失败 ({failedCount})
                  </Button>
                )}
              </div>
            </div>

            {/* 处理进度提示 */}
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm">{processingMessage}</p>
              </div>
            )}

            {/* 图片预览网格 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploadedImages.map((image) => (
                <div
                  key={image.id}
                  className="relative border rounded-lg overflow-hidden bg-white"
                >
                  <div className="aspect-square relative">
                    <img
                      src={image.preview}
                      alt="作文图片预览"
                      className="w-full h-full object-cover"
                    />

                    {/* 状态覆盖层 */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      {image.status === 'compressing' && (
                        <div className="text-white text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <p className="text-xs">压缩中</p>
                        </div>
                      )}
                      {image.status === 'processing' && (
                        <div className="text-white text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <p className="text-xs">识别中</p>
                        </div>
                      )}
                      {image.status === 'completed' && (
                        <div className="text-white text-center">
                          <Eye className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs">已完成</p>
                        </div>
                      )}
                      {image.status === 'failed' && (
                        <div className="text-white text-center">
                          <X className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs">失败</p>
                        </div>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 w-6 h-6 p-0"
                      onClick={() => removeImage(image.id)}
                      disabled={isProcessing}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* 图片信息 */}
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          image.status === 'completed' ? 'default' :
                          image.status === 'failed' ? 'destructive' :
                          image.status === 'processing' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {image.status === 'pending' && '待处理'}
                        {image.status === 'compressing' && '压缩中'}
                        {image.status === 'processing' && '处理中'}
                        {image.status === 'completed' && '已完成'}
                        {image.status === 'failed' && '失败'}
                      </Badge>
                    </div>

                    {/* 压缩信息 */}
                    {image.compressionInfo && (
                      <div className="text-xs text-gray-500">
                        压缩率: {image.compressionInfo.compressionRatio}%
                      </div>
                    )}

                    {/* OCR结果信息 */}
                    {image.ocrResult && (
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>原文: {image.ocrResult.metadata.originalLength}字符</div>
                        <div>英文: {image.ocrResult.metadata.englishOnlyLength}字符</div>
                        <div>耗时: {image.ocrResult.metadata.processingTime}ms</div>
                        <div>模型: {image.ocrResult.metadata.model}</div>
                      </div>
                    )}

                    {/* 错误信息 */}
                    {image.error && (
                      <div className="text-xs text-red-600">
                        {image.error}
                      </div>
                    )}

                    {/* 文件名 */}
                    <div className="text-xs text-gray-500 truncate" title={image.originalFile.name}>
                      {image.originalFile.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 统计信息 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <div>✅ 已完成: {completedCount} 张</div>
                <div>❌ 失败: {failedCount} 张</div>
                <div>⏳ 等待处理: {uploadedImages.filter(img => img.status === 'pending').length} 张</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EssayOCRUploader;