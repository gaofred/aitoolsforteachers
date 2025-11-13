"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, CheckCircle, Camera, Upload, X, File } from "lucide-react";
import * as mammoth from 'mammoth';
import type { ContinuationWritingBatchTask } from "../types";

interface ContinuationWritingTopicInputProps {
  task: ContinuationWritingBatchTask | null;
  setTask: (task: ContinuationWritingBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
}

const ContinuationWritingTopicInput: React.FC<ContinuationWritingTopicInputProps> = ({
  task,
  setTask,
  onNext,
  onPrev
}) => {
  const [topic, setTopic] = useState(task?.topic || "");

  // OCR 相关状态
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [recognitionMessage, setRecognitionMessage] = useState<string>("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Word 文档相关状态
  const [isProcessingWord, setIsProcessingWord] = useState(false);
  const [wordProcessingMessage, setWordProcessingMessage] = useState<string>("");
  const wordInputRef = useRef<HTMLInputElement>(null);

  // 示例题目
  const sampleTopics = [
    {
      title: "装饰自行车 (Bike Parade)",
      content: "阅读下面短文，根据其内容写一篇150词左右的续写短文。\n\nParagraph 1:\nThe girls sat under their sign in the park, which read \"Decorate Your Bike Here!\" Park managers had set up a Bike Parade. Bella and Mia planned to earn money by decorating kids' bikes for the event.\nMia's dad, an inventor, had given them a basket of bells, whistles, gadgets and spare parts. Bella, who loves painting, brought paints, brushes, stickers, feathers and other decorations. They had already decorated a few bikes, but Bella felt frustrated.\n\"Your mechanical things are better,\" Bella grumbled to Mia, watching her friend easily assemble the parts of a fancy bell. She held up her own works — colorful flags and a dragon-painted horn — and sighed, wishing they had more use. \"The horn sounds like an annoying goose, not a dragon!\" she complained. Mia laughed out loud, truly delighted by the funny sound, and confidently told Bella the customer would find it charming.\nJust then, Bella looked at the bike bell she'd been trying to assemble. \"See? Every mechanical thing I try fails!\" she murmured. Mia leaned over to offer suggestions. Bella tried again, but the pieces still wouldn't work. Her frustration grew. \"I don't know what I'm doing!\" she cried, throwing the bell onto the grass and sitting back beside it, defeated. \"Try again, Bella! You can do this,\" Mia encouraged gently. Bella kept her eyes shut, hoping no customers would come and pretending she wasn't a total failure.\nBut soon a shadow blocked her sun. Her brother Leo and his friend Izzy stood there. \"Your bikes need decorating!\" Mia announced before Bella could speak. \"That's why we're here!\" Izzy smiled. Bella's mouth fell open in surprise, but she quickly closed it, afraid to look silly.\nAfter discussing ideas, Mia sent the boys away. She grabbed Bella's arm and said, \"We'll make these the coolest bikes. You do Izzy's, and I'll do Leo's. Come on!\"\n\nParagraph 2 (续写开头):\n\"I can't!\" Bella frowned, her heart sinking.\n\n注意：\n1. 所续写短文的词数应为150左右；\n2. 续写部分分为两段，必须从给定开头继续写作；\n3. 续写必须符合逻辑，保持人物性格和情感连贯性；\n4. 注意运用所给情境中的细节和词汇。"
    }
  ];

  const handleTopicChange = (newTopic: string) => {
    setTopic(newTopic);
    if (task) {
      setTask({
        ...task,
        topic: newTopic
      });
    }
  };

  const loadSampleTopic = (sampleTopic: string) => {
    handleTopicChange(sampleTopic);
  };

  // Word 文档处理函数
  const handleWordUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型（基于文件扩展名）
    const fileName = file.name.toLowerCase();
    const isValidWordFile = fileName.endsWith('.docx') || fileName.endsWith('.doc');

    if (!isValidWordFile) {
      alert('请上传Word文档 (.docx 或 .doc)');
      return;
    }

    // 检查文件大小 (10MB限制)
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过10MB');
      return;
    }

    setIsProcessingWord(true);
    setWordProcessingMessage("正在提取Word文档文本...");

    try {
      // 使用mammoth.js提取文本
      const arrayBuffer = await file.arrayBuffer();

      let result;
      if (fileName.endsWith('.docx')) {
        // 处理.docx文件
        result = await mammoth.extractRawText({ arrayBuffer });
      } else {
        // 处理.doc文件 (可能需要额外配置)
        result = await mammoth.extractRawText({ arrayBuffer });
      }

      if (result.value && result.value.trim()) {
        // 清理提取的文本
        let extractedText = result.value.trim();

        // 移除多余的空白字符和换行
        extractedText = extractedText
          .replace(/\r\n/g, '\n')
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n')
          .trim();

        handleTopicChange(extractedText);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        setWordProcessingMessage("Word文档处理完成！");

        console.log('Word文档提取成功，文本长度:', extractedText.length);
      } else {
        // 如果提取失败，显示文件信息
        const fileInfo = `[Word文档信息]\n文件名: ${file.name}\n文件大小: ${(file.size / 1024).toFixed(1)}KB\n\n未能提取文本内容，请根据Word文档内容手动输入题目。`;
        handleTopicChange(fileInfo);

        // 警告用户
        alert(`Word文档: ${file.name} (${(file.size / 1024).toFixed(1)}KB)\n\n未能提取文本内容，请手动输入题目文本。`);
      }

    } catch (error) {
      console.error('Word文档处理失败:', error);
      const errorInfo = error instanceof Error ? error.message : '未知错误';

      // 显示错误信息和文件信息
      const errorText = `[Word文档处理失败]\n文件名: ${file.name}\n错误信息: ${errorInfo}\n\n请根据Word文档内容手动输入题目文本。`;
      handleTopicChange(errorText);

      alert(`Word文档处理失败: ${errorInfo}\n\n请手动输入题目文本。`);
    } finally {
      setIsProcessingWord(false);
      setWordProcessingMessage("");
      // 清空文件输入
      if (wordInputRef.current) {
        wordInputRef.current.value = '';
      }
    }
  };


  // OCR 相关函数
  const startCamera = async () => {
    console.log('🎥 摄像头启动函数被调用!');
    try {
      console.log('📱 开始请求摄像头权限...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      console.log('✅ 摄像头权限获取成功!', mediaStream);

      // 先设置状态，让覆盖层渲染出来
      setIsCameraOpen(true);
      streamRef.current = mediaStream;

      // 使用setTimeout确保DOM已经渲染完成
      setTimeout(() => {
        if (videoRef.current) {
          console.log('📹 设置视频源...');
          videoRef.current.srcObject = mediaStream;
          console.log('🎯 摄像头状态已设置为开启');
        } else {
          console.error('❌ videoRef.current 仍然为空!');
          alert('摄像头组件初始化失败，请稍后重试');
          setIsCameraOpen(false);
        }
      }, 100);

    } catch (e: any) {
      console.error('❌ 摄像头访问失败:', e);

      let errorMessage = '无法访问摄像头';
      if (e.name === 'NotAllowedError') {
        errorMessage = '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问权限';
      } else if (e.name === 'NotFoundError') {
        errorMessage = '未检测到摄像头设备，请检查设备连接';
      }

      alert(errorMessage);
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      streamRef.current = null;
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoDataUrl);
        stopCamera();
      }
    }
  };

  const recognizeText = async (images: string[]) => {
    if (images.length === 0) return;

    setIsRecognizing(true);
    setRecognitionMessage("正在识别图片内容...");

    // 创建图片的快照，防止在识别过程中被清除
    const imageSnapshot = [...images];

    try {
      // 并行识别所有图片（使用快照，防止状态被清除）
      const recognitionPromises = imageSnapshot.map(async (imageBase64, index) => {
        try {
          setRecognitionMessage(`正在识别第${index + 1}张图片...`);

          const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: imageBase64,
              type: 'application' // 保持原有的type值，复用现有的OCR接口
            }),
          });

          if (!response.ok) {
            throw new Error(`OCR请求失败: ${response.status}`);
          }

          const result = await response.json();

          if (result.error) {
            throw new Error(result.error);
          }

          return {
            index,
            text: result.text || '',
            confidence: result.confidence || 0
          };
        } catch (error) {
          console.error(`第${index + 1}张图片识别失败:`, error);
          return {
            index,
            text: '',
            confidence: 0,
            error: error instanceof Error ? error.message : '识别失败'
          };
        }
      });

      // 等待所有识别完成
      const results = await Promise.all(recognitionPromises);

      // 合并所有识别结果
      let combinedText = results
        .filter(result => result.text && result.text.trim())
        .map(result => result.text.trim())
        .join('\n\n');

      if (combinedText) {
        // 如果已经有题目内容，则追加；否则替换
        const newTopic = topic.trim() ?
          `${topic}\n\n【图片识别内容】\n${combinedText}` :
          combinedText;

        handleTopicChange(newTopic);

        // 清空已识别的图片
        setUploadedImages([]);
        setPhoto(null);

        // 显示成功消息
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      } else {
        // 检查是否有错误信息
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
          alert(`部分图片识别失败：${errors.map(e => e.error).join(', ')}`);
        } else {
          alert('未能识别出有效文字，请检查图片质量或重新拍摄');
        }
      }
    } catch (error) {
      console.error('批量识别失败:', error);
      alert('图片识别失败，请重试');
    } finally {
      setIsRecognizing(false);
      setRecognitionMessage("");
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imagePromises = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(images => {
      const newImages = [...uploadedImages, ...images].slice(0, 2); // 限制最多2张图片
      setUploadedImages(newImages);
    });
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
  };

  const confirmRecognition = () => {
    const imagesToRecognize = photo ? [photo] : uploadedImages;
    recognizeText(imagesToRecognize);
  };

  const clearPhoto = () => {
    setPhoto(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">输入读后续写题目</h2>
        <p className="text-gray-600 text-sm">
          请输入本次批改的读后续写题目要求，或选择示例题目。支持手动输入、拍照识别或上传图片识别。
        </p>
      </div>

      {/* 成功提示 */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">题目识别成功！</span>
          </div>
        </div>
      )}

      {/* 示例题目 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            示例题目
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sampleTopics.map((sample, index) => (
            <div key={index} className="border rounded-lg p-3">
              <h3 className="font-medium text-gray-900 mb-2">{sample.title}</h3>
              <p className="text-sm text-gray-600 mb-2 whitespace-pre-line">{sample.content}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadSampleTopic(sample.content)}
                className="text-xs"
              >
                使用此题目
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Word文档和OCR识别区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            Word文档和图片识别
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Word文档上传 */}
          <div className="border rounded-lg p-4 bg-green-50">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-green-800 mb-2">Word文档上传</h3>
              <p className="text-sm text-green-700">支持从Word文档 (.docx/.doc) 中直接提取题目文本</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={wordInputRef}
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleWordUpload}
                  disabled={isProcessingWord}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button
                  variant="outline"
                  disabled={isProcessingWord}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <File className="w-4 h-4" />
                  {isProcessingWord ? '处理中...' : '选择Word文档'}
                </Button>
              </div>
            </div>
          </div>

          {/* Word处理进度 */}
          {isProcessingWord && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent"></div>
                <span className="text-green-800">{wordProcessingMessage}</span>
              </div>
            </div>
          )}

          {/* 图片上传 */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-blue-800 mb-2">图片OCR识别</h3>
              <p className="text-sm text-blue-700">通过拍照或上传图片识别题目文本</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={startCamera}
                disabled={isCameraOpen || isRecognizing}
                className="flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                拍照识别
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isRecognizing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button
                  variant="outline"
                  disabled={isRecognizing}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  上传图片识别
                </Button>
              </div>
            </div>
          </div>

          {/* 已上传的图片预览 */}
          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">已上传图片 ({uploadedImages.length}/2)</h3>
              <div className="grid grid-cols-2 gap-2">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`上传的图片 ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 拍照后的图片预览 */}
          {photo && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">拍摄的照片</h3>
              <div className="relative group">
                <img
                  src={photo}
                  alt="拍摄的照片"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <button
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Button
                onClick={confirmRecognition}
                disabled={isRecognizing}
                className="w-full"
              >
                {isRecognizing ? '识别中...' : '开始识别'}
              </Button>
            </div>
          )}

          {/* 识别按钮 */}
          {uploadedImages.length > 0 && !photo && (
            <Button
              onClick={confirmRecognition}
              disabled={isRecognizing}
              className="w-full"
            >
              {isRecognizing ? recognitionMessage || '识别中...' : '识别所有图片'}
            </Button>
          )}

          {/* 识别进度 */}
          {isRecognizing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-blue-800">{recognitionMessage}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 手动输入区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            手动输入题目
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="请输入读后续写题目要求..."
            value={topic}
            onChange={(e) => handleTopicChange(e.target.value)}
            className="min-h-[200px]"
          />
          <div className="mt-2 text-sm text-gray-500">
            当前字数：{topic.length}
          </div>
        </CardContent>
      </Card>

      {/* 摄像头覆盖层 */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-lg w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">拍照识别题目</h3>
            </div>

            <div className="relative mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-black rounded-lg object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={capturePhoto}
                className="flex-1"
              >
                拍照
              </Button>
              <Button
                variant="outline"
                onClick={stopCamera}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <Button
          onClick={onNext}
          disabled={!topic.trim()}
          className="px-8"
        >
          下一步：批量OCR识别
        </Button>
      </div>
    </div>
  );
};

export default ContinuationWritingTopicInput;