import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ImageRecognitionProps {
  onResultChange?: (result: string) => void;
}

export function ImageRecognition({ onResultChange }: ImageRecognitionProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const base64String = event.target.result.toString().split(',')[1];
        setSelectedImage(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRecognize = async () => {
    if (!selectedImage) {
      setError('请先选择图片');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/image-recognition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
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
        <div className="text-xs text-gray-500">消耗2点数</div>
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
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md cursor-pointer hover:bg-blue-100 border border-blue-200 transition-colors flex-1 text-center"
          >
            选择图片
          </label>
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
              src={`data:image/jpeg;base64,${selectedImage}`}
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

