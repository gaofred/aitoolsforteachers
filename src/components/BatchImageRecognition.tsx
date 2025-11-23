import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/lib/user-context";

interface BatchImageRecognitionProps {
  onResultChange?: (result: string) => void;
  onBatchResultChange?: (images: string[]) => void;
  maxImages?: number;
}

export function BatchImageRecognition({ onResultChange, onBatchResultChange, maxImages = 2 }: BatchImageRecognitionProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useUser();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // 检查图片数量限制
    if (selectedImages.length + files.length > maxImages) {
      setError(`最多只能上传${maxImages}张图片`);
      return;
    }

    // 检查每个文件
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件');
        return false;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('图片大小不能超过10MB');
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    setError(null);

    // 处理每个有效文件
    const processFiles = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            resolve(event.target.result.toString());
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(processFiles).then(dataUrls => {
      setSelectedImages(prev => [...prev, ...dataUrls].slice(0, maxImages));
    });
  };

  // 拍照功能
  const handleCameraCapture = async () => {
    try {
      // 请求相机权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // 创建视频元素和canvas
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // 等待视频加载
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // 创建canvas来捕获图片
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0);

        // 转换为data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // 检查数量限制
        if (selectedImages.length >= maxImages) {
          setError(`最多只能上传${maxImages}张图片`);
        } else {
          setSelectedImages(prev => [...prev, dataUrl]);
          setError(null);
        }

        // 停止相机流
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('相机访问错误:', error);
      setError('无法访问相机，请检查权限设置或使用文件上传');

      // 如果相机不可用，回退到文件选择
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const handleRecognize = async () => {
    if (selectedImages.length === 0) {
      setError('请先选择图片');
      return;
    }

    if (!currentUser) {
      setError('请先登录后再使用识图功能');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 如果提供了onBatchResultChange回调，则直接调用它传递图片数组
      if (onBatchResultChange) {
        onBatchResultChange(selectedImages);
        return;
      }

      // 否则使用原有的处理逻辑
      const batchPromises = selectedImages.map(async (img, index) => {
        const res = await fetch('/api/ai/image-recognition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: img
          })
        });

        const data = await res.json();
        if (data.success && data.result) {
          return { index, result: data.result };
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);

      // 过滤掉空结果并按索引排序
      const validResults = batchResults
        .filter((item): item is { index: number; result: string } => item !== null)
        .sort((a, b) => a.index - b.index)
        .map(item => item.result);

      if (validResults.length > 0) {
        const combinedText = validResults.join('\n\n');
        setResult(combinedText);
        if (onResultChange) {
          onResultChange(combinedText);
        }
      } else {
        setError('未检测到有效文字内容');
      }
    } catch (err) {
      console.error('批量识图请求错误:', err);
      setError('识图请求失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setSelectedImages([]);
    setResult('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onResultChange) {
      onResultChange('');
    }
  };

  return (
    <Card className="w-full bg-white shadow-sm border-gray-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">批量图像识别 (最多{maxImages}张)</h3>
          <div className="text-xs text-green-600">阿里云OCR · 免费使用</div>
        </div>

        {/* 图片上传区域 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              ref={fileInputRef}
              id="batch-image-upload"
            />
            <label
              htmlFor="batch-image-upload"
              className="px-3 py-2 bg-blue-50 text-blue-600 rounded-md cursor-pointer hover:bg-blue-100 border border-blue-200 transition-colors text-sm"
            >
              选择图片 ({selectedImages.length}/{maxImages})
            </label>
            <Button
              onClick={handleCameraCapture}
              variant="outline"
              className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 text-sm"
              disabled={selectedImages.length >= maxImages}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              拍照
            </Button>
            <Button
              onClick={handleRecognize}
              disabled={selectedImages.length === 0 || isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  识别中...
                </>
              ) : (
                `开始识别 (${selectedImages.length}张)`
              )}
            </Button>
            {selectedImages.length > 0 && (
              <Button
                onClick={handleClear}
                variant="outline"
                className="border-gray-300 text-sm"
              >
                清除全部
              </Button>
            )}
          </div>

          {/* 图片预览区域 */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`}
                    alt={`预览图片 ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md border border-gray-200"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    图片 {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="text-red-500 text-sm p-3 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          {/* 识别结果 */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">识别结果</label>
                <span className="text-xs text-green-600">共识别到 {selectedImages.length} 张图片</span>
              </div>
              <Textarea
                value={result}
                readOnly
                className="min-h-[120px] text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
              />
            </div>
          )}

          {/* 使用提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">💡 阿里云批量识图提示</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 最多可同时上传{maxImages}张图片进行阿里云OCR识别</li>
                  <li>• 使用阿里云国内OCR服务，识别速度快稳定性高</li>
                  <li>• 支持拍照或选择本地图片文件</li>
                  <li>• 所有图片会同时处理，提高识别效率</li>
                  <li>• 识别结果会按图片顺序合并显示</li>
                  <li>• 点击图片右上角的 × 可以删除单张图片</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}