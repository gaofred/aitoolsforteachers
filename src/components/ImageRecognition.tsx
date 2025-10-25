import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/lib/user-context";

interface ImageRecognitionProps {
  onResultChange?: (result: string) => void;
}

export function ImageRecognition({ onResultChange }: ImageRecognitionProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useUser();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 检查文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过10MB');
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        // 保留完整的data URL，包含mime type
        const dataUrl = event.target.result.toString();
        setSelectedImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
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
        setSelectedImage(dataUrl);

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
    if (!selectedImage) {
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
      // 直接发送完整的data URL格式，使用cookie认证（不需要Authorization头）
      const response = await fetch('/api/ai/image-recognition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 确保发送cookies
        body: JSON.stringify({
          imageBase64: selectedImage
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.result);
        if (onResultChange) {
          onResultChange(data.result);
        }
      } else {
        console.error('识图API错误:', data);
        setError(data.error || '识图失败，请稍后重试');
      }
    } catch (err) {
      console.error('识图请求错误:', err);
      setError('识图请求失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
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
    <div className="w-full space-y-4 p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">图像识别</h3>
        <div className="text-xs text-green-600">免费使用</div>
      </div>

      {/* 图片上传区域 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            ref={fileInputRef}
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-md cursor-pointer hover:bg-blue-100 border border-blue-200 transition-colors flex-1 text-center text-sm"
          >
            选择图片
          </label>
          <Button
            onClick={handleCameraCapture}
            variant="outline"
            className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            拍照
          </Button>
          <Button
            onClick={handleRecognize}
            disabled={!selectedImage || isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
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
              '开始识别'
            )}
          </Button>
          {selectedImage && (
            <Button
              onClick={handleClear}
              variant="outline"
              className="border-gray-300"
            >
              清除
            </Button>
          )}
        </div>

        {/* 预览区域 */}
        {selectedImage && (
          <div className="mt-2 relative">
            <img
              src={selectedImage.startsWith('data:') ? selectedImage : `data:image/jpeg;base64,${selectedImage}`}
              alt="预览"
              className="max-h-48 rounded-md mx-auto border border-gray-200"
            />
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {/* 识别结果 */}
        {result && (
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-gray-700">识别结果</label>
            <Textarea
              value={result}
              readOnly
              className="min-h-[100px] text-sm border-gray-300 focus:border-purple-500 focus:ring-purple-500 resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}





