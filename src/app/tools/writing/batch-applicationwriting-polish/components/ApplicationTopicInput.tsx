"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, CheckCircle, Camera, Upload, X } from "lucide-react";
import type { ApplicationBatchTask } from "../types";

interface ApplicationTopicInputProps {
  task: ApplicationBatchTask | null;
  setTask: (task: ApplicationBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
}

const ApplicationTopicInput: React.FC<ApplicationTopicInputProps> = ({
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

  // 示例题目
  const sampleTopics = [
    {
      title: "邀请信",
      content: "假定你是李华，你的英国朋友Peter来信询问你校学生体育运动情况。请给他写封回信，内容包括：\n1. 学校体育活动情况介绍；\n2. 你最喜欢的体育运动；\n3. 询问对方学校体育活动情况。"
    },
    {
      title: "建议信",
      content: "假定你是李华，你的美国朋友Tom发邮件说他最近学习压力很大，请你给他写封回信，内容包括：\n1. 表示理解和安慰；\n2. 提出具体建议（至少两条）；\n3. 表达祝愿。"
    },
    {
      title: "通知",
      content: "你校将举办英语演讲比赛。请你根据以下信息，以学生会的名义写一则通知：\n1. 比赛时间：下周五下午2:00-5:00；\n2. 比赛地点：学校礼堂；\n3. 参赛要求：每班推荐1名学生参加；\n4. 联系人：李华（电话：12345678）。"
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

          const response = await fetch('/api/ai/image-recognition', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: imageBase64
            })
          })

          const data = await response.json()

          if (data.success && data.result) {
            console.log(`第${index + 1}张图片识别成功`)
            return { success: true, text: data.result, index }
          } else {
            console.warn(`第${index + 1}张图片识别失败:`, data.error)
            return { success: false, error: data.error, index }
          }
        } catch (error) {
          console.error(`第${index + 1}张图片识别错误:`, error)
          return { success: false, error: (error as Error).message, index }
        }
      })

      setRecognitionMessage("正在处理识别结果...");

      // 等待所有识别任务完成
      const results = await Promise.all(recognitionPromises)

      // 按原始顺序过滤成功的结果
      const successfulResults = results
        .filter(result => result.success)
        .sort((a, b) => a.index - b.index)
        .map(result => result.text)

      if (successfulResults.length > 0) {
        // 合并所有识别的文本，保持上传顺序
        const combinedText = successfulResults.join('\n\n').trim();
        handleTopicChange(combinedText);

        // 延迟清除图片状态，确保文本已经成功添加
        setTimeout(() => {
          setPhoto(null);
          setUploadedImages([]);
          setRecognitionMessage("");
          setShowSuccessMessage(true);

          // 显示成功信息
          const failedCount = imageSnapshot.length - successfulResults.length;
          if (failedCount > 0) {
            setRecognitionMessage(`成功识别${successfulResults.length}张图片，${failedCount}张图片识别失败`);
          } else {
            setRecognitionMessage("识别成功！题目内容已自动填入");
          }

          // 3秒后隐藏成功消息
          setTimeout(() => {
            setShowSuccessMessage(false);
            setRecognitionMessage("");
          }, 3000);
        }, 100);
      } else {
        setRecognitionMessage("所有图片识别都失败了，请重试");
        setTimeout(() => {
          setRecognitionMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error('文字识别错误:', error);
      setRecognitionMessage("文字识别失败，请重试");
      setTimeout(() => {
        setRecognitionMessage("");
      }, 3000);
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // 题目识别限制2张图片
    if (files.length > 2) {
      alert(`题目识别最多只能上传2张图片！本次选择了${files.length}张图片，超出限制。`);
      return;
    }

    // 验证并压缩图片
    const validFiles: string[] = [];
    let processedCount = 0;

    Array.from(files).forEach((file, index) => {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert(`第${index + 1}个文件不是图片格式`);
        return;
      }

      // 验证文件大小 (10MB限制)
      if (file.size > 10 * 1024 * 1024) {
        alert(`第${index + 1}个图片文件过大，请选择小于10MB的图片`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          // 压缩图片
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              validFiles.push(result);
              processedCount++;
              if (processedCount === files.length) {
                if (validFiles.length > 0) {
                  setUploadedImages(validFiles);
                  recognizeText(validFiles);
                }
              }
              return;
            }

            // 计算压缩后的尺寸
            const maxWidth = 1920;
            const maxHeight = 1080;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width *= ratio;
              height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;

            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height);

            // 转换为base64，质量设置为0.8
            const compressedResult = canvas.toDataURL('image/jpeg', 0.8);
            validFiles.push(compressedResult);

            processedCount++;
            if (processedCount === files.length) {
              if (validFiles.length > 0) {
                setUploadedImages(validFiles);
                recognizeText(validFiles);
              }
            }
          };
          img.src = result;
        }
      };
      reader.onerror = () => {
        alert(`第${index + 1}个图片读取失败，请重试`);
        processedCount++;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCaptureAndRecognize = () => {
    if (photo) {
      recognizeText([photo]);
    }
  };

  const canProceed = topic.trim().length > 10;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">输入应用文题目</h2>
        <p className="text-gray-600 text-sm">
          请输入完整的应用文写作题目，包括写作要求、字数限制等详细信息
        </p>
      </div>

      {/* OCR 图片识别区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-600" />
            智能图片识别
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            拍照或上传题目图片，AI将自动识别并填入题目内容（最多2张图片）
          </p>

          <div className="flex flex-wrap gap-3">
            {/* 拍照上传按钮 */}
            <Button
              variant="outline"
              onClick={() => {
                console.log('🔘 拍照上传按钮被点击!');
                console.log('📊 当前状态:', { isRecognizing, isCameraOpen });
                startCamera();
              }}
              disabled={isRecognizing || isCameraOpen}
              className="flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              拍照上传
            </Button>

            {/* 图片上传按钮 */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={isRecognizing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Button
                variant="outline"
                disabled={isRecognizing}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                上传图片
              </Button>
            </div>
          </div>

      {/* 摄像头覆盖层 - 模仿阅读生成器的实现方式 */}
      {isCameraOpen && (
        <>
          {console.log('🎬 渲染摄像头覆盖层! isCameraOpen =', isCameraOpen)}
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">拍照上传题目</h3>
                <p className="text-sm text-gray-600">请将题目放置在取景框内</p>
              </div>

              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                  onLoadedMetadata={() => console.log('📹 视频元数据已加载')}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-2">
                <Button onClick={capturePhoto} className="flex items-center gap-2 flex-1">
                  <Camera className="w-4 h-4" />
                  拍照
                </Button>
                <Button variant="outline" onClick={stopCamera} className="flex-1">
                  取消
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 拍摄照片确认覆盖层 */}
      {photo && !isCameraOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">确认照片</h3>
              <p className="text-sm text-gray-600">请确认照片清晰可识别</p>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-gray-50">
              <img src={photo} alt="拍摄的照片" className="w-full h-64 object-contain" />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCaptureAndRecognize}
                disabled={isRecognizing}
                className="flex items-center gap-2 flex-1"
              >
                {isRecognizing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    识别中...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    开始识别
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setPhoto(null)} className="flex-1">
                重新拍照
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 识别进度提示 */}
      {isRecognizing && recognitionMessage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">智能识别中</h3>
              <p className="text-sm text-gray-600 mt-2">
                {recognitionMessage}
              </p>
            </div>

            <div className="flex items-center justify-center py-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 w-12 h-12 border-4 border-purple-600 border-r-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500">
              AI正在努力识别图片内容，请稍候...
            </div>
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {showSuccessMessage && recognitionMessage && !isRecognizing && (
        <div className="fixed top-4 right-4 z-50 animate-pulse">
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  {recognitionMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 上传图片识别覆盖层 */}
      {uploadedImages.length > 0 && !isRecognizing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">正在识别图片</h3>
              <p className="text-sm text-gray-600">
                已上传 {uploadedImages.length} 张图片，正在识别中...
              </p>
            </div>

            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-600">正在识别图片内容...</span>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              请稍候，正在处理您上传的图片...
            </div>
          </div>
        </div>
      )}
        </CardContent>
      </Card>

      {/* 题目输入区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            应用文题目
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              完整题目内容 *
            </label>

            {/* 特别提醒 */}
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-600 text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-base font-bold text-amber-800">特别提醒</p>
                  <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                    请手动删除应用文题目中的"词数80左右"的部分，会干扰AI的批改（况且高考中，敢让学生只写80个词么...）
                  </p>
                </div>
              </div>
            </div>

            <Textarea
              placeholder="请输入完整的应用文题目，包括背景、写作要求、字数限制等..."
              value={topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="min-h-[200px] text-sm"
              maxLength={2000}
            />
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>请确保题目信息完整，AI将根据此题目进行批改</span>
              <span>{topic.length}/2000</span>
            </div>
          </div>

          {/* 状态指示 */}
          <div className="flex items-center gap-2">
            {canProceed ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">题目信息完整，可以进行下一步</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                <span className="text-sm text-gray-500">请输入至少10个字符的题目内容</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 示例题目 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            示例题目
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            点击下方示例可快速加载常见应用文题目
          </p>
          
          <div className="grid gap-4">
            {sampleTopics.map((sample, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {sample.title}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleTopic(sample.content)}
                    className="text-xs"
                  >
                    使用此题目
                  </Button>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {sample.content.length > 150 
                    ? sample.content.substring(0, 150) + "..." 
                    : sample.content
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          上一步
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="px-8"
        >
          下一步：批量OCR识别
        </Button>
      </div>
    </div>
  );
};

export default ApplicationTopicInput;


