"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// 完全动态导入所有组件，彻底避免服务端渲染
const Button = dynamic(() => import("@/components/ui/button").then(mod => ({ default: mod.Button })), {
  ssr: false
});

const Textarea = dynamic(() => import("@/components/ui/textarea").then(mod => ({ default: mod.Textarea })), {
  ssr: false
});

const UserMenu = dynamic(() => import("@/components/auth/UserMenu").then(mod => ({ default: mod.UserMenu })), {
  ssr: false
});

const LogoWithText = dynamic(() => import("@/components/Logo").then(mod => ({ default: mod.LogoWithText })), {
  ssr: false
});


// lucide-react 图标也需要动态导入
const BookOpen = dynamic(() => import("lucide-react").then(mod => ({ default: mod.BookOpen })), {
  ssr: false
});

const PenTool = dynamic(() => import("lucide-react").then(mod => ({ default: mod.PenTool })), {
  ssr: false
});

// useUser hook 也需要动态导入处理
const useUser = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshUser = async () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    // 只在客户端执行
    if (typeof window !== 'undefined') {
      const initUser = async () => {
        try {
          // 实际项目中应该从API获取用户信息
          const response = await fetch('/api/auth/user');
          if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
            setUserPoints(userData.user_points?.points || 0);
          }
        } catch (error) {
          console.error('Failed to load user:', error);
        } finally {
          setIsLoadingUser(false);
        }
      };

      initUser();
    }
  }, [refreshTrigger]);

  return {
    currentUser,
    userPoints,
    isLoadingUser,
    refreshUser
  };
};

export default function ContinuationWritingModelEssay() {
  return <ContinuationWritingContent />;
}

function ContinuationWritingContent() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // 强制客户端检测
  const [isClientSide, setIsClientSide] = useState(false);

  useEffect(() => {
    setIsClientSide(true);
    setIsMounted(true);
  }, []);

  // 表单状态
  const [originalText, setOriginalText] = useState("");
  const [paragraph1, setParagraph1] = useState("");
  const [paragraph2, setParagraph2] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate"); // beginner, intermediate, advanced

  // OCR状态
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [currentOCRField, setCurrentOCRField] = useState<'original' | 'paragraph1' | 'paragraph2' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 语音识别状态
  const [isRecording, setIsRecording] = useState(false);
  const [currentVoiceField, setCurrentVoiceField] = useState<'paragraph1' | 'paragraph2' | null>(null);
  const recognitionRef = useRef<any>(null);

  // 用户状态
  const { currentUser, userPoints, isLoadingUser, refreshUser } = useUser();
  const [isCopying, setIsCopying] = useState(false);

  // 根据难度设置点数消耗
  const getToolCost = (difficultyLevel: string) => {
    switch (difficultyLevel) {
      case "beginner": return 6;  // A2~B1 基础版
      case "intermediate": return 6;  // B1~B2 标准版
      case "advanced": return 6;  // B2~C1 进阶版
      default: return 6;
    }
  };

  const toolCost = getToolCost(difficulty);
  const hasEnoughPoints = userPoints >= toolCost;

  // 确保组件只在客户端渲染
  useEffect(() => {
    // 清除任何可能缓存的结果
    setAnalysisResult(null);
  }, []);

  // 重置组件状态以避免水合错误
  useEffect(() => {
    if (isClientSide) {
      // 确保语音识别状态正确初始化
      if (recognitionRef.current) {
        recognitionRef.current = null;
      }
      setIsRecording(false);
      setCurrentVoiceField(null);
    }
  }, [isClientSide]);

  // OCR功能函数
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (e) {
      console.error('摄像头访问失败:', e)
      alert('无法访问摄像头，请检查权限设置')
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const photoData = canvas.toDataURL('image/jpeg', 0.8)
      setPhoto(photoData)
      stopCamera()
    }
  }

  const recognizeText = async (images: string[]) => {
    if (images.length === 0 || !currentOCRField) return
    setIsRecognizing(true)
    alert('识图中，请稍等...')
    try {
      const texts: string[] = []
      for (const img of images) {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: img })
        })
        const d = await res.json()
        if (d.success && d.result) texts.push(d.result)
      }
      if (texts.length) {
        const recognizedText = texts.join('\n').trim()

        // 根据当前字段设置识别结果
        switch (currentOCRField) {
          case 'original':
            setOriginalText(prev => prev + (prev ? '\n' : '') + recognizedText)
            break
          case 'paragraph1':
            setParagraph1(prev => prev + (prev ? ' ' : '') + recognizedText)
            break
          case 'paragraph2':
            setParagraph2(prev => prev + (prev ? ' ' : '') + recognizedText)
            break
        }

        alert('识别成功！')
      } else {
        alert('识别失败')
      }
    } catch (e) {
      console.error(e)
      alert('识别错误')
    }
    setIsRecognizing(false)
    setIsCameraOpen(false)
    setPhoto(null)
    setUploadedImages([])
    setCurrentOCRField(null)
    stopCamera()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const arr: string[] = []
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = o => {
        if (typeof o.target?.result === 'string') {
          arr.push(o.target.result as string)
          if (arr.length === files.length) {
            recognizeText(arr)
          }
        }
      }
      reader.readAsDataURL(f)
    })
  }

  const openCameraForField = (field: 'original' | 'paragraph1' | 'paragraph2') => {
    setCurrentOCRField(field)
    setIsCameraOpen(true)
  }

  const openFileUploadForField = (field: 'original' | 'paragraph1' | 'paragraph2') => {
    setCurrentOCRField(field)
    fileInputRef.current?.click()
  }

  // Auto start camera when overlay opens
  useEffect(() => {
    if (isCameraOpen && !photo) {
      startCamera()
    }
  }, [isCameraOpen])

  // 语音识别功能 - 使用浏览器原生API
  const startVoiceRecording = (field: 'paragraph1' | 'paragraph2') => {
    // 检查是否在客户端环境
    if (typeof window === 'undefined') {
      console.warn('语音识别只能在客户端使用')
      return
    }

    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能')
      return
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.lang = 'en-US' // 设置为英语
      recognition.continuous = true // 启用连续识别，支持长句
      recognition.interimResults = false // 不返回中间结果
      recognition.maxAlternatives = 1 // 只返回最佳结果

      // 设置更长的静音超时时间，让用户有更长的停顿时间
      if ('grammars' in recognition) {
        // 尝试设置语法模式（部分浏览器支持）
        const speechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList
        if (speechGrammarList) {
          const grammar = new speechGrammarList()
          // 添加通用英语语法规则
          grammar.addFromString('#JSGF V1.0; grammar public; <sentence> *;', 1)
          recognition.grammars = grammar
        }
      }

      recognition.onresult = (event: any) => {
        // 获取最后一个结果（最新的识别内容）
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            // 只使用最终确定的结果
            if (finalTranscript && !finalTranscript.endsWith(' ')) {
              finalTranscript += ' '
            }
            finalTranscript += result[0].transcript
          }
        }

        if (finalTranscript.trim()) {
          // 根据当前字段设置识别结果
          switch (field) {
            case 'paragraph1':
              setParagraph1(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript.trim())
              break
            case 'paragraph2':
              setParagraph2(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript.trim())
              break
          }

          // 显示成功提示
          setTimeout(() => {
            alert(`语音识别成功！识别内容：${finalTranscript.trim()}`)
          }, 100)
        }
      }

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error)
        if (event.error === 'no-speech') {
          alert('未检测到语音，请重试')
        } else if (event.error === 'not-allowed') {
          alert('麦克风权限被拒绝，请在浏览器设置中允许麦克风权限')
        } else {
          alert('识别失败，请重试')
        }
        setIsRecording(false)
        setCurrentVoiceField(null)
      }

      recognition.onend = () => {
        setIsRecording(false)
        setCurrentVoiceField(null)
        console.log('语音识别结束')
      }

      recognitionRef.current = recognition
      setCurrentVoiceField(field)
      recognition.start()
      setIsRecording(true)

      // 更友好的开始提示
      alert('🎤 开始语音识别\n\n请朗读英文句子：\n• 可以有自然停顿\n• 朗读完成后系统会自动停止\n• 也可以点击"停止录音"按钮手动结束\n\n📝 识别结果会自动填入输入框')
    } catch (e) {
      console.error('麦克风访问失败:', e)
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  const stopVoiceRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      setCurrentVoiceField(null)
    }
  }

  // 一键复制功能
  const copyToClipboard = async () => {
    if (!analysisResult) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(analysisResult);
      alert('内容已复制到剪贴板！');
    } catch (error) {
      console.error('复制失败:', error);
      // 备用复制方法
      const textArea = document.createElement('textarea');
      textArea.value = analysisResult;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('内容已复制到剪贴板！');
    } finally {
      setIsCopying(false);
    }
  };

  // 导出txt文件功能
  const exportToTxt = () => {
    if (!analysisResult) {
      alert('没有可导出的内容！');
      return;
    }

    try {
      // 创建文件内容
      const cleanText = `
读后续写范文生成结果
生成时间：${new Date().toLocaleString('zh-CN')}

原文：
${originalText}

段落1开头：${paragraph1}
段落2开头：${paragraph2}

生成内容：
${analysisResult}
      `.trim();

      // 创建Blob对象
      const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
      link.download = `读后续写范文_${dateStr}_${timeStr}.txt`;

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理URL对象
      URL.revokeObjectURL(url);

      alert('文件导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试！');
    }
  };

  // 处理生成请求
  const handleGenerate = async () => {
    if (!originalText.trim() || !paragraph1.trim() || !paragraph2.trim()) {
      alert('请填写完整的续写内容！');
      return;
    }

    if (!hasEnoughPoints) {
      alert(`点数不足，需要${toolCost}个点数！`);
      return;
    }

    if (!currentUser) {
      alert('请先登录！');
      router.push('/auth/signin');
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('🚀 开始发送读后续写请求...');
      console.log('📝 原文长度:', originalText.length);
      console.log('📝 段落1开头:', paragraph1);
      console.log('📝 段落2开头:', paragraph2);

      const response = await fetch('/api/ai/continuation-writing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalText: originalText.trim(),
          paragraph1: paragraph1.trim(),
          paragraph2: paragraph2.trim(),
          difficulty: difficulty,
          userId: currentUser.id
        }),
      });

      console.log('📡 收到响应，状态码:', response.status);
      const data = await response.json();
      console.log('📊 响应数据:', data);

      if (data.success) {
        console.log('✅ 读后续写生成成功！结果长度:', data.result?.length);
        setAnalysisResult(data.result);
        await refreshUser();

        // 友好的成功提示
        setTimeout(() => {
          alert(`🎉 读后续写范文生成完成！\n\n✨ 消耗 ${data.pointsCost} 个点数\n💰 剩余 ${data.remainingPoints} 个点数\n\n📝 范文已生成在右侧，您可以直接复制或导出使用！`);
        }, 500);
      } else {
        console.error('❌ 读后续写生成失败:', data.error);

        // 检查是否已退回点数
        if (data.refunded && data.pointsRefunded) {
          alert(`⚠️ 生成失败，已自动退回 ${data.pointsRefunded} 个点数\n\n失败原因：${data.error || '读后续写生成失败，请稍后重试'}`);
        } else {
          alert(`❌ 生成失败：${data.error || '读后续写生成失败，请稍后重试'}\n\n如已扣费，系统将自动退回点数`);
        }

        await refreshUser();
      }
    } catch (error) {
      console.error('处理失败:', error);
      alert(`❌ 处理失败：网络错误或服务器异常\n\n如已扣费，系统将自动退回点数，请稍后重试`);
      // 恢复点数
      await refreshUser();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 加载示例文本
  const loadSampleText = () => {
    setOriginalText(`My wife and I wanted to share our new home with family and friends by hosting a small gathering in the early summer. She had prepared lots of snacks, while my job was to have the backyard in order.
There was plenty of space for the kids to run and play. There was just one thing I hadn't counted on: My brother chose to bring his dog Toby, a 50-pound ball of fire. Though friendly, he could easily knock over my niece's small boys and my six-month-old granddaughter. So, when my brother showed up, I asked him to watch Toby and keep him outside.
My plan was working out just fine. Toby was using up his energy by running back and forth in the backyard and giving the kids plenty of room. Unexpectedly, after supper, the weather changed. It started to rain and everyone went indoors.
It was an awkward moment. I didn't want Toby to be running around in the house, and my brother wasn't happy with driving home with a wet dog. Eventually, my brother decided to leave rather than force the issue.
A few days passed, and I hadn't heard anything from my brother. I texted him and expressed wishes for him to come out again. His reply came as a surprise — a shock, actually: "Not a chance." Clearly, he was unhappy over the way we had parted. After all, I had left him little choice. Well, he'll get over it, I reasoned.
Two months passed. My wife suggested I get in touch with my brother, but I resisted, thinking he should call first. However, my conscience (良心) kept bothering me. I tried to put myself in my brother's shoes. He was facing health issues and his wife of thirty-five years had passed away a few months earlier. Toby was his constant companion, the one who kept him going.`);

    setParagraph1("I realized it was me who was at fault.");
    setParagraph2("With the biscuits my wife had made, I arrived at my brother's door.");
  };

  // 水合错误保护 - 更严格的检查
  if (!isMounted || !isClientSide || typeof window === 'undefined') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载读后续写工具...</p>
        </div>
      </div>
    );
  }

  // 直接返回内容，因为我们已经在上面做了客户端检测
  return (
    <div className="min-h-screen transition-all duration-500 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-gradient-to-r from-white via-gray-50 to-white transition-all duration-300 backdrop-blur-sm shadow-sm">
        <div className="flex h-16 items-center justify-between px-2 sm:px-4 md:px-6">
          {/* 左侧：Logo + 菜单按钮 + 英语格言 */}
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-105"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <div className="hidden sm:block">
              <LogoWithText size="normal" />
            </div>
            {/* 移动端简化Logo */}
            <div className="sm:hidden w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>

            </div>

          {/* 右侧：用户信息 */}
          <div className="flex items-center gap-1 md:gap-3">
            {/* 点数显示 */}
            <div className="flex items-center gap-1 sm:gap-2 bg-secondary rounded-lg px-2 sm:px-3 py-2 border border-border">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-r from-primary to-blue-600 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-foreground">{userPoints}</span>
            </div>

            {/* 用户认证区域 */}
            {isLoadingUser ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
            ) : currentUser ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  请先登录使用AI功能
                </span>
                <Button
                  size="sm"
                  onClick={() => router.push('/auth/signin')}
                  className="evolink-button"
                >
                  <span className="hidden sm:inline">登录</span>
                  <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="min-h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
          {/* 左半部分：输入区域 */}
          <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* 工具信息卡片 */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center flex-shrink-0 border border-blue-200">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-semibold text-gray-900">
                    读后续写范文
                  </h1>
                  <span className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-200 font-medium">
                    {toolCost} 点数
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  输入英文文章原文和两段续写开头句，AI将为您生成高质量的读后续写范文，符合B1英语水平要求。
                </p>
              </div>
            </div>

            {/* 输入表单 */}
            <div className="space-y-4">
              {/* 难度选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  选择续写范文的文章复杂度（适合不同水平的学生）
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDifficulty("beginner")}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                      difficulty === "beginner"
                        ? "bg-green-100 border-green-300 text-green-800"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">A2~B1</div>
                    基础版 (6点)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDifficulty("intermediate")}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                      difficulty === "intermediate"
                        ? "bg-blue-100 border-blue-300 text-blue-800"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">B1~B2</div>
                    标准版 (6点)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDifficulty("advanced")}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                      difficulty === "advanced"
                        ? "bg-purple-100 border-purple-300 text-purple-800"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">B2~C1</div>
                    进阶版 (6点)
                  </button>
                </div>
              </div>

              {/* 原文输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-gray-500" />
                  原文内容 (Original Text)
                </label>
                <div className="relative">
                  <Textarea
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    placeholder="请粘贴英文文章原文..."
                    className="min-h-[200px] text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none transition-all duration-200 pr-20"
                    maxLength={5000}
                  />
                  {/* OCR按钮组 */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openFileUploadForField('original')}
                      title="上传图片"
                    >
                      📁
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openCameraForField('original')}
                      title="拍照识别"
                    >
                      📷
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {originalText.length}/5000
                </div>
              </div>

              {/* 段落1开头 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  段落1开头 (Paragraph 1 Starter)
                </label>
                <div className="relative">
                  <Textarea
                    value={paragraph1}
                    onChange={(e) => setParagraph1(e.target.value)}
                    placeholder="请输入第一段的开头句..."
                    className="min-h-[60px] text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none transition-all duration-200 pr-32"
                    maxLength={200}
                  />
                  {/* 按钮组 */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openFileUploadForField('paragraph1')}
                      title="上传图片"
                    >
                      📁
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openCameraForField('paragraph1')}
                      title="拍照识别"
                    >
                      📷
                    </Button>
                    {/* 语音按钮 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 ${isRecording && currentVoiceField === 'paragraph1' ? 'bg-red-100 text-red-600' : ''}`}
                      onClick={isRecording && currentVoiceField === 'paragraph1' ? stopVoiceRecording : () => startVoiceRecording('paragraph1')}
                      title={isRecording && currentVoiceField === 'paragraph1' ? '停止录音' : '语音输入'}
                    >
                      {isRecording && currentVoiceField === 'paragraph1' ? '🔴' : '🎤'}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {paragraph1.length}/200
                </div>
              </div>

              {/* 段落2开头 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  段落2开头 (Paragraph 2 Starter)
                </label>
                <div className="relative">
                  <Textarea
                    value={paragraph2}
                    onChange={(e) => setParagraph2(e.target.value)}
                    placeholder="请输入第二段的开头句..."
                    className="min-h-[60px] text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none transition-all duration-200 pr-32"
                    maxLength={200}
                  />
                  {/* 按钮组 */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openFileUploadForField('paragraph2')}
                      title="上传图片"
                    >
                      📁
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => openCameraForField('paragraph2')}
                      title="拍照识别"
                    >
                      📷
                    </Button>
                    {/* 语音按钮 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 ${isRecording && currentVoiceField === 'paragraph2' ? 'bg-red-100 text-red-600' : ''}`}
                      onClick={isRecording && currentVoiceField === 'paragraph2' ? stopVoiceRecording : () => startVoiceRecording('paragraph2')}
                      title={isRecording && currentVoiceField === 'paragraph2' ? '停止录音' : '语音输入'}
                    >
                      {isRecording && currentVoiceField === 'paragraph2' ? '🔴' : '🎤'}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  {paragraph2.length}/200
                </div>
              </div>

              {/* 使用提示 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">💡 使用说明</h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>• 原文建议提供完整的英文故事背景</p>
                      <p>• 段落开头句要简洁明了，为续写提供明确方向</p>
                      <p>• AI将生成约180词的续写内容，分为两个段落</p>
                      <p>• 生成内容符合B1英语水平，适合高中生学习</p>
                      <p>• 🎤 支持语音输入：支持自然停顿，可朗读完整句子</p>
                      <p>• 📷 支持图片识别：拍照或上传图片识别文字内容</p>
                      <p>• 💡 语音输入支持停顿，系统会智能检测朗读完成</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-3 pt-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    {originalText.trim() && paragraph1.trim() && paragraph2.trim() ? (
                      hasEnoughPoints ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">准备就绪</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-orange-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>需要 {toolCost} 点数</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1 text-gray-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>请填写完整内容</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={loadSampleText}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    加载示例
                  </button>
                </div>

                {!hasEnoughPoints && originalText.trim() && paragraph1.trim() && paragraph2.trim() && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-700 text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>点数不足，需要 {toolCost} 点数</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!originalText.trim() || !paragraph1.trim() || !paragraph2.trim() || isAnalyzing || !hasEnoughPoints}
                  className={`w-full h-12 font-medium text-base transition-all duration-300 ${
                    originalText.trim() && paragraph1.trim() && paragraph2.trim() && !isAnalyzing && hasEnoughPoints
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      AI正在生成中...
                    </>
                  ) : (
                    '开始生成读后续写范文'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 右半部分：结果展示区 */}
          <div className="w-full lg:w-1/2 bg-gray-50 rounded-lg p-6">
            {!analysisResult && !isAnalyzing ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 border border-gray-200 shadow-sm">
                    <BookOpen className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    准备生成读后续写范文
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    在左侧输入英文文章原文和两段开头句，点击"开始生成读后续写范文"按钮，
                    AI将为您生成符合要求的续写内容。
                  </p>
                </div>
              </div>
            ) : isAnalyzing ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center mx-auto mb-6 border border-blue-200 shadow-sm">
                    <svg className="animate-spin w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">AI正在生成中</h3>
                  <div className="text-center space-y-2">
                    <p className="text-gray-600">
                      正在根据您提供的内容生成读后续写范文...
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 text-sm font-medium">
                        ⏱️ 预计需要约1-2分钟，请耐心等待
                      </p>
                      <p className="text-blue-700 text-xs mt-1">
                        AI正在分析原文并生成符合要求的续写内容
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* 结果展示区域 */}
                <div className="flex-1 min-h-0">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">生成的读后续写范文</h3>
                      {/* 操作按钮移到这里 */}
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        <Button
                          onClick={copyToClipboard}
                          disabled={isCopying}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2 text-xs px-3 py-2"
                        >
                          {isCopying ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              复制中...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              一键复制
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={exportToTxt}
                          size="sm"
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white flex items-center gap-2 text-xs px-3 py-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          导出TXT
                        </Button>
                      </div>
                    </div>
                    <div className="max-w-none max-h-[calc(100vh-18rem)] overflow-y-auto text-sm leading-relaxed" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                      <div dangerouslySetInnerHTML={{
                        __html: (analysisResult || '')
                          .replace(/\n/g, '<br>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1f2937; font-weight: 600;">$1</strong>')
                          .replace(/\*\*Paragraph 1:\*\*/g, '<div style="color: #1f2937; font-size: 1rem; font-weight: 700; margin: 1rem 0 0.5rem 0; line-height: 1.6; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.25rem;">段落1：</div>')
                          .replace(/\*\*中文翻译 \(Chinese Translation\):\*\*/g, '<div style="color: #dc2626; font-size: 0.875rem; font-weight: 600; margin: 1rem 0 0.5rem 0; line-height: 1.6;">中文翻译：</div>')
                          .replace(/\*\*Paragraph 2:\*\*/g, '<div style="color: #1f2937; font-size: 1rem; font-weight: 700; margin: 1.5rem 0 0.5rem 0; line-height: 1.6; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.25rem;">段落2：</div>')
                          .replace(/Para1:/g, '<div style="color: #374151; font-size: 0.875rem; font-weight: 600; margin: 1rem 0 0.5rem 0; line-height: 1.6;">段落1：</div>')
                          .replace(/Para2:/g, '<div style="color: #374151; font-size: 0.875rem; font-weight: 600; margin: 1rem 0 0.5rem 0; line-height: 1.6;">段落2：</div>')
                          .replace(/(\d+)\. (.*)/g, '<div style="margin: 0.25rem 0; padding-left: 1rem; line-height: 1.6;">$1. $2</div>')
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 隐藏的文件输入框 */}
      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* OCR覆盖层 */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-4">
            {photo ? (
              <img src={photo} alt="photo" className="w-full" />
            ) : (
              <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
            )}
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-between">
              {!photo && <Button onClick={takePhoto} size="sm">拍照</Button>}
              {photo && <Button onClick={() => recognizeText([photo])} size="sm" disabled={isRecognizing}>{isRecognizing ? '识别中' : 'OCR识别'}</Button>}
              <Button variant="outline" size="sm" onClick={() => { setIsCameraOpen(false); stopCamera(); setPhoto(null); setCurrentOCRField(null); }}>关闭</Button>
            </div>
          </div>
        </div>
      )}

      {/* OCR识别中覆盖层 */}
      {isRecognizing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white px-6 py-4 rounded-lg shadow-lg text-center space-y-3">
            <div className="flex justify-center">
              <svg className="animate-spin h-6 w-6 text-purple-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <p className="text-sm text-gray-700">识图中，请稍等...</p>
          </div>
        </div>
      )}

      {/* 语音录音覆盖层 */}
      {isRecording && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <div className="bg-white px-8 py-6 rounded-lg shadow-lg text-center space-y-4 max-w-sm">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping"></div>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-lg font-semibold text-gray-800">
                🎤 正在录音...
              </p>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium">
                  请朗读{currentVoiceField === 'paragraph1' ? '段落1开头' : '段落2开头'}的英文句子
                </p>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium mb-1">💡 录音小贴士：</p>
                  <ul className="text-xs text-blue-600 space-y-0.5 text-left">
                    <li>• 可以有自然的停顿</li>
                    <li>• 语速适中，发音清晰</li>
                    <li>• 朗读完整句子</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                系统会检测到您朗读完成后自动停止
              </p>
            </div>
            <Button
              onClick={stopVoiceRecording}
              variant="outline"
              className="w-full"
            >
              完成录音
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}