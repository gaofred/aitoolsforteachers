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
  const [p1Content, setP1Content] = useState("");
  const [p2Content, setP2Content] = useState("");

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

  // 验证相关状态
  const [validationError, setValidationError] = useState<string>("");

  // 验证P1和P2格式
  const validateTopicFormat = (topicContent: string): { isValid: boolean; error: string } => {
    if (!topicContent || topicContent.trim().length === 0) {
      return { isValid: false, error: "请输入读后续写题目内容" };
    }

    // 支持多种P1格式
    const p1Patterns = [
      "P1:", "P1：",    // 标准格式
      "Paragraph1:", "Paragraph 1:", "Paragraph1：", "Paragraph 1：", // 完整格式
      "Paragraph", // 简单格式（后面跟冒号）
    ];

    // 支持多种P2格式
    const p2Patterns = [
      "P2:", "P2：",    // 标准格式
      "Paragraph2:", "Paragraph 2:", "Paragraph2：", "Paragraph 2：", // 完整格式
      "Paragraph", // 简单格式（后面跟冒号）
    ];

    // 检查P1格式
    const hasP1 = p1Patterns.some(pattern => topicContent.includes(pattern));

    // 检查P2格式
    const hasP2 = p2Patterns.some(pattern => topicContent.includes(pattern));

    if (!hasP1 && !hasP2) {
      return {
        isValid: false,
        error: "请输入两段续写首句，支持格式：P1: P2:、Paragraph1: Paragraph2:、Paragraph 1: Paragraph 2:"
      };
    }

    if (!hasP1) {
      return {
        isValid: false,
        error: "请输入第一段续写首句，支持格式：P1:、Paragraph1:、Paragraph 1:"
      };
    }

    if (!hasP2) {
      return {
        isValid: false,
        error: "请输入第二段续写首句，支持格式：P2:、Paragraph2:、Paragraph 2:"
      };
    }

    return { isValid: true, error: "" };
  };

  // 处理下一步点击
  const handleNextClick = () => {
    // 检查P1和P2内容
    if (!p1Content.trim()) {
      setValidationError("请输入或确认第一段续写首句 (P1)");
      setTimeout(() => setValidationError(""), 5000);
      return;
    }

    if (!p2Content.trim()) {
      setValidationError("请输入或确认第二段续写首句 (P2)");
      setTimeout(() => setValidationError(""), 5000);
      return;
    }

    // 构建完整的题目内容，包含P1和P2
    const fullTopic = topic.trim() +
      (topic.trim() ? '\n\n' : '') +
      `P1: ${p1Content.trim()}\nP2: ${p2Content.trim()}`;

    if (task) {
      setTask({
        ...task,
        topic: fullTopic,
        p1Content: p1Content.trim(),
        p2Content: p2Content.trim()
      });
    }

    setValidationError("");
    onNext();
  };

  // 示例题目
  const sampleTopics = [
    {
      title: "神秘邻居的秘密棚屋",
      content: "My closest neighbor, Mrs. Harrington, was mysterious. From the moment I moved into the neighborhood, she had been distant, almost to the point of being rude. She avoided eye contact and brushed off any attempts at conversation.\nEvery day, she would head to the old shack(棚屋) 20 feet away from her house at 9 a.m. and again at 9 p.m. She always had two shopping bags in hand, and she would go into the shack for about 20 minutes before returning to her house.\nOne afternoon, while I was out for a walk, I accidentally approached the shack. The moment Mrs. Harrington saw me approaching, she dashed out of the door, her eyes wide with anger. \"Stay away! I'll call the police!\" she screamed, her voice high-pitched and desperate.\nAstonished, I began to apologize and wanted to clarify that I hadn't meant to intrude (闯入), but Mrs. Harrington cut me off with another sharp outburst, demanding that I leave immediately. The unfriendliness in her tone made it clear that arguing would be useless. I turned and walked back home. The way Mrs. Harrington screamed at me and the panic in her eyes didn't feel right. I decided to investigate.\nOne night, I slipped out of my front door when she was back inside her house and all the lights were off. Reaching the shack, I noticed there was a large padlock on the door. I took a closer look and spotted a small gap in the wooden door, just big enough to peek through. I hesitated for a moment but finally pressed my nose against the door and peeked inside through the gap.\nThe inside was dark, but as my eyes adjusted, I nearly fainted at what I saw. Inside the shack were dozens of dogs and they were nothing more than skin and bones! What was going on here? Were they being mistreated by her? I started pulling at the lock, trying to force it open. Suddenly, a light flicked on inside Mrs. Harrington's house. I froze, realizing that I'd woken her up.\n注意：\n1. 续写词数应为150个左右；\n2. 请按如下格式在答题卡的相应位置作答。\n\nParagraph 1 (续写开头):\nBefore I could react, the front door burst open, and she rushed toward me.\n\nParagraph 2 (续写开头):\nHearing what Mrs. Harrington said, I breathed a sigh of relief."
    }
  ];

  const handleTopicChange = (newTopic: string) => {
    // 提取P1和P2内容
    const { cleanedTopic, p1, p2 } = extractP1P2FromTopic(newTopic);

    setTopic(cleanedTopic);
    setP1Content(p1);
    setP2Content(p2);

    if (task) {
      setTask({
        ...task,
        topic: cleanedTopic,
        p1Content: p1.trim(),
        p2Content: p2.trim()
      });
    }
  };

  // 从题目中提取P1和P2内容
  const extractP1P2FromTopic = (topicContent: string) => {
    let cleanedTopic = topicContent;
    let p1 = "";
    let p2 = "";

    // 支持多种P1格式
    const p1Patterns = [
      { pattern: /P1:\s*([^\n\r]+?)(?=\n*P2:|\n*Paragraph|\n*$)/i, type: "P1:" },
      { pattern: /P1：\s*([^\n\r]+?)(?=\n*P2：|\n*Paragraph|\n*$)/i, type: "P1：" },
      { pattern: /Paragraph1:\s*([^\n\r]+?)(?=\n*Paragraph2:|\n*Paragraph\s*2:|\n*$)/i, type: "Paragraph1:" },
      { pattern: /Paragraph\s*1:\s*([^\n\r]+?)(?=\n*Paragraph\s*2:|\n*$)/i, type: "Paragraph 1:" },
      { pattern: /Paragraph1：\s*([^\n\r]+?)(?=\n*Paragraph2：|\n*Paragraph\s*2：|\n*$)/i, type: "Paragraph1：" },
      { pattern: /Paragraph\s*1：\s*([^\n\r]+?)(?=\n*Paragraph\s*2：|\n*$)/i, type: "Paragraph 1：" },
    ];

    // 支持多种P2格式
    const p2Patterns = [
      { pattern: /P2:\s*([^\n\r]+?)(?=\n*Paragraph|\n*$)/i, type: "P2:" },
      { pattern: /P2：\s*([^\n\r]+?)(?=\n*Paragraph|\n*$)/i, type: "P2：" },
      { pattern: /Paragraph2:\s*([^\n\r]+?)(?=\n*Paragraph|\n*$)/i, type: "Paragraph2:" },
      { pattern: /Paragraph\s*2:\s*([^\n\r]+?)(?=\n*Paragraph|\n*$)/i, type: "Paragraph 2:" },
      { pattern: /Paragraph2：\s*([^\n\r]+?)(?=\n*Paragraph|\n*$)/i, type: "Paragraph2：" },
      { pattern: /Paragraph\s*2：\s*([^\n\r]+?)(?=\n*Paragraph|\n*$)/i, type: "Paragraph 2：" },
    ];

    // 提取P1内容
    for (const { pattern, type } of p1Patterns) {
      const match = cleanedTopic.match(pattern);
      if (match && match[1]) {
        p1 = match[1].trim();
        cleanedTopic = cleanedTopic.replace(match[0], "").trim();
        break;
      }
    }

    // 提取P2内容
    for (const { pattern, type } of p2Patterns) {
      const match = cleanedTopic.match(pattern);
      if (match && match[1]) {
        p2 = match[1].trim();
        cleanedTopic = cleanedTopic.replace(match[0], "").trim();
        break;
      }
    }

    // 清理多余的空行
    cleanedTopic = cleanedTopic.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

    // 删除中文汉字
    cleanedTopic = cleanedTopic.replace(/[\u4e00-\u9fa5]/g, "").trim();

    // 清理删除汉字后可能出现的多余空格和换行
    cleanedTopic = cleanedTopic.replace(/\s+/g, " ").replace(/\n\s*\n/g, "\n").trim();

    return { cleanedTopic, p1, p2 };
  };

  // 处理P1内容变化
  const handleP1Change = (newP1: string) => {
    setP1Content(newP1);
  };

  // 处理P2内容变化
  const handleP2Change = (newP2: string) => {
    setP2Content(newP2);
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

      {/* Word文档和图片识别区域 - 已移动到续写题目输入框上方 */}

      {/* 手动输入区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            手动输入题目
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              <span>输入注意事项</span>
            </h4>
            <div className="space-y-2 text-sm text-amber-800">
              <p>请按以下格式完整输入读后续写题目内容：</p>
              <div className="bg-white rounded border border-amber-300 p-3">
                <p><strong>1. 原文内容：</strong>包括所有背景段落和情节描述</p>
                <p><strong>2. 续写要求：</strong>词数要求、格式要求等</p>
                <p><strong>3. 两段首句：</strong>必须用以下格式标明其一：</p>
                <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                  P1: [第一段首句] P2: [第二段首句]<br/>
                  或 Paragraph1: [第一段] Paragraph2: [第二段]<br/>
                  或 Paragraph 1: [第一段] Paragraph 2: [第二段]
                </p>
              </div>
            </div>
          </div>

          {/* 三个识别按钮 - 放在续写题目输入框上方 */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-blue-800 mb-2">快速识别题目</h3>
              <p className="text-sm text-blue-700">通过拍照、上传图片或选择Word文档快速识别题目文本</p>
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

              <div className="relative">
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
                  className="flex items-center gap-2"
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

          <Textarea
            placeholder="请输入完整的读后续写题目，包括原文、要求和两段首句（支持P1: P2: 或 Paragraph1: Paragraph2: 等格式）..."
            value={topic}
            onChange={(e) => handleTopicChange(e.target.value)}
            className="min-h-[400px]" // 从200px增加到400px
          />
          <div className="mt-2 text-sm text-gray-500 flex justify-between">
            <span>当前字数：{topic.length}</span>
            <span className="text-gray-400">建议包含：原文+要求（P1/P2会自动提取到下方）</span>
          </div>
        </CardContent>
      </Card>

      {/* P1和P2独立输入框 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            续写首句（自动提取或手动输入）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-purple-600 font-semibold">P1 (第一段首句)</span>
                <span className="text-gray-400 text-xs ml-2">已自动从题目中提取</span>
              </label>
              <Textarea
                placeholder="请输入第一段续写首句..."
                value={p1Content}
                onChange={(e) => handleP1Change(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="mt-1 text-sm text-gray-500">
                字数：{p1Content.length}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="text-purple-600 font-semibold">P2 (第二段首句)</span>
                <span className="text-gray-400 text-xs ml-2">已自动从题目中提取</span>
              </label>
              <Textarea
                placeholder="请输入第二段续写首句..."
                value={p2Content}
                onChange={(e) => handleP2Change(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="mt-1 text-sm text-gray-500">
                字数：{p2Content.length}
              </div>
            </div>
          </div>

          {/* 自动提取提示 */}
          {(p1Content || p2Content) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">
                  已自动提取续写首句，可以手动编辑调整
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 验证错误提示 */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-600 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.82 16.833c-.77.833-1.964.833-2.732 0L3.82 7.5c-.77-.833.192-1.667 1.732-2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-red-800 mb-1">格式验证失败</h4>
              <p className="text-sm text-red-700">{validationError}</p>
              <div className="mt-2 text-xs text-red-600 bg-red-100 rounded p-2">
                <strong>支持的格式：</strong><br/>
                • <span className="font-mono">P1: [第一段] P2: [第二段]</span><br/>
                • <span className="font-mono">Paragraph1: [第一段] Paragraph2: [第二段]</span><br/>
                • <span className="font-mono">Paragraph 1: [第一段] Paragraph 2: [第二段]</span><br/>
                • <span className="font-mono">P1：[第一段] P2：[第二段]</span> (中文冒号)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 示例题目 - 移到手动输入下方 */}
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
              <p className="text-sm text-gray-600 mb-2 whitespace-pre-line max-h-32 overflow-y-auto">{sample.content}</p>
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
          onClick={handleNextClick}
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