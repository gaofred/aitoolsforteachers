import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ImageRecognition } from './ImageRecognition';

interface ImageRecognitionButtonProps {
  onResultChange?: (result: string) => void;
  className?: string;
}

export function ImageRecognitionButton({ onResultChange, className = '' }: ImageRecognitionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleResultChange = (result: string) => {
    if (onResultChange) {
      onResultChange(result);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={handleToggle}
        variant="outline"
        size="sm"
        className={`flex items-center gap-2 ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        图像识别
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="p-1">
              <ImageRecognition onResultChange={handleResultChange} />
            </div>
            <div className="p-2 border-t flex justify-end">
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                size="sm"
                className="text-gray-500"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




