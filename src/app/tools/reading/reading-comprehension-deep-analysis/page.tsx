"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BookOpen,
  Brain,
  Target,
  Lightbulb,
  Zap,
  FileText,
  Image,
  Camera,
  Upload,
  Trash2,
  ArrowLeft,
  Home,
  Copy,
  Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import toast from 'react-hot-toast'


export default function ReadingComprehensionDeepAnalysisPage() {
  const router = useRouter()
  const { currentUser, userPoints, refreshUser } = useUser()
  const [text, setText] = useState('')
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  
  const toolCost = 6
  const hasEnoughPoints = userPoints >= toolCost

  // 摄像头相关状态
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isTakingPhoto, setIsTakingPhoto] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 使用 useEffect 避免水合错误
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // 清理函数定义 - 必须在useEffect之前定义
  const stopCamera = () => {
    console.log('🛑 [DEBUG] stopCamera called')
    if (stream) {
      console.log('🛑 [DEBUG] Stopping stream tracks')
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    console.log('🛑 [DEBUG] Setting isCameraOpen to false')
    setIsCameraOpen(false)
    setCameraError(null)
    console.log('🛑 [DEBUG] stopCamera completed')
  }

  const clearUploadedImage = () => {
    setUploadedImages([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 组件卸载时清理摄像头 - 只在组件真正卸载时清理，不要依赖stream变化
  useEffect(() => {
    console.log('🧹 [DEBUG] Component mount cleanup effect set up')
    return () => {
      console.log('🧹 [DEBUG] Component unmounting, stopping camera')
      stopCamera()
      clearUploadedImage()
    }
  }, []) // 空依赖数组，只在组件挂载/卸载时执行

  // Auto start camera when overlay opens (with delay)
  useEffect(() => {
    console.log('🔄 [DEBUG] useEffect triggered, isCameraOpen:', isCameraOpen, 'photo:', photo, 'cameraError:', cameraError)
    if (isCameraOpen && !photo && !cameraError) {
      console.log('🔄 [DEBUG] Conditions met, calling startCamera after 500ms delay')
      const timer = setTimeout(() => {
        console.log('🔄 [DEBUG] Timer triggered, calling startCamera')
        startCamera()
      }, 500)
      return () => {
        console.log('🔄 [DEBUG] Cleanup timer')
        clearTimeout(timer)
      }
    } else {
      console.log('🔄 [DEBUG] Conditions not met for auto-start')
    }
  }, [isCameraOpen, photo, cameraError])

  // Debug overlay rendering
  useEffect(() => {
    console.log('弹窗状态调试 - isClient:', isClient, 'isCameraOpen:', isCameraOpen, 'cameraError:', cameraError)
  }, [isClient, isCameraOpen, cameraError])

  // 如果不是客户端，显示加载界面
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  // 摄像头功能函数
  const startCamera = async () => {
    console.log('🎬 [DEBUG] startCamera called')
    try {
      console.log('🎬 [DEBUG] Requesting camera permission...')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      console.log('🎬 [DEBUG] Camera permission granted, stream obtained:', mediaStream.id)
      setStream(mediaStream)
      console.log('🎬 [DEBUG] Stream set, isCameraOpen currently:', isCameraOpen)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        console.log('🎬 [DEBUG] Video stream set to video element')

        // 添加视频加载完成事件监听器
        videoRef.current.onloadedmetadata = () => {
          console.log('🎬 [DEBUG] Video metadata loaded:', {
            videoWidth: videoRef.current?.videoWidth,
            videoHeight: videoRef.current?.videoHeight,
            isCameraOpen: isCameraOpen
          })
        }

        // 添加视频开始播放事件监听器
        videoRef.current.onplay = () => {
          console.log('🎬 [DEBUG] Video started playing, isCameraOpen:', isCameraOpen)
        }
      }
    } catch (error) {
      console.error('🎬 [DEBUG] Camera access failed:', error)
      setCameraError('无法访问摄像头，请检查权限设置')
      toast.error('无法访问摄像头，请检查权限设置')
      console.log('🎬 [DEBUG] Camera error state set')
    }
  }

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('摄像头未就绪')
      return
    }

    const context = canvasRef.current.getContext('2d')
    if (!context) {
      toast.error('无法创建画布上下文')
      return
    }

    setIsTakingPhoto(true)

    try {

    // 等待视频流完全加载
    const video = videoRef.current

    // 如果视频还没有准备好，等待一段时间
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('视频未就绪，等待加载...', {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      })

      // 等待最多3秒让视频加载完成
      let attempts = 0
      const maxAttempts = 30 // 3000ms / 100ms间隔

      const waitForVideo = () => {
        return new Promise<boolean>((resolve) => {
          const checkVideo = () => {
            attempts++
            console.log(`检查视频状态 (${attempts}/${maxAttempts}):`, {
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            })

            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
              console.log('视频已就绪！')
              resolve(true)
            } else if (attempts >= maxAttempts) {
              console.log('等待视频超时')
              resolve(false)
            } else {
              setTimeout(checkVideo, 100)
            }
          }
          checkVideo()
        })
      }

      const videoReady = await waitForVideo()
      if (!videoReady) {
        toast.error('摄像头视频加载超时，请重试')
        setIsTakingPhoto(false)
        return
      }
    }

    // 检查视频尺寸并拍照
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    console.log('开始拍照，视频尺寸:', {
      videoWidth,
      videoHeight,
      videoReady: video.readyState,
      currentTime: video.currentTime
    })

    // 使用视频的实际尺寸
    canvasRef.current.width = videoWidth
    canvasRef.current.height = videoHeight
    context.drawImage(video, 0, 0, videoWidth, videoHeight)

    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9)
    console.log('拍照成功，图片数据长度:', imageData.length, '尺寸:', { width: videoWidth, height: videoHeight })

    setPhoto(imageData)
    toast.success('拍照成功！')
    setIsTakingPhoto(false)
    } catch (error) {
      console.error('拍照失败:', error)
      toast.error('拍照失败，请重试')
      setIsTakingPhoto(false)
    }
  }

  const clearPhoto = () => {
    setPhoto(null)
    // 重新启动摄像头
    startCamera()
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const validFiles = Array.from(files).slice(0, 3) // 最多3张图片
      const imagePromises = validFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })
      })

      Promise.all(imagePromises).then(images => {
        setUploadedImages(images)
        toast.success(`成功上传 ${images.length} 张图片`)
      })
    }
  }

  const recognizeText = async (images: string[]) => {
    if (images.length === 0) return
    setIsRecognizing(true)
    // Show recognition alert
    alert('识图中，请稍等...')
    try {
      const texts: string[] = []
      for (const img of images) {
        const res = await fetch('/api/ai/image-recognition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: [img] })
        })
        const d = await res.json()
        if (d.success && d.result) texts.push(d.result)
      }
      if (texts.length) {
        setText(prevText => prevText + (prevText ? '\n\n' : '') + texts.join('\n\n'))
        toast.success('识别成功！')
      } else {
        toast.error('识别失败')
      }
    } catch (e) {
      console.error(e)
      toast.error('识别错误')
    }
    setIsRecognizing(false)
    // 不要重置摄像头状态，让用户可以继续拍照
    if (!photo && !uploadedImages.length) {
      setIsCameraOpen(false)
      stopCamera()
    }
    setUploadedImages([])
  }

  
  // 一键复制功能
  const copyToClipboard = async () => {
    if (!analysisResult) return

    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(analysisResult)
      toast.success('内容已复制到剪贴板！')
    } catch (error) {
      console.error('复制失败:', error)
      // 备用复制方法
      const textArea = document.createElement('textarea')
      textArea.value = analysisResult
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('内容已复制到剪贴板！')
    } finally {
      setIsCopying(false)
    }
  }

  // 导出txt文件功能
  const exportToTxt = () => {
    if (!analysisResult) {
      toast.error('没有可导出的内容！')
      return
    }

    try {
      // 创建文件内容，移除HTML标签
      const cleanText = analysisResult
        .replace(/<[^>]*>/g, '') // 移除HTML标签
        .replace(/&nbsp;/g, ' ') // 替换空格实体
        .replace(/&lt;/g, '<') // 替换小于号实体
        .replace(/&gt;/g, '>') // 替换大于号实体
        .replace(/&amp;/g, '&') // 替换和号实体
        .replace(/&quot;/g, '"') // 替换引号实体
        .replace(/&#39;/g, "'"); // 替换单引号实体

      // 创建Blob对象
      const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' })

      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // 生成文件名（使用当前日期）
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
      const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '')
      link.download = `阅读理解深度分析_${dateStr}_${timeStr}.txt`

      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('文件导出成功！')
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败，请重试')
    }
  }

  
  
  // 检测题干选项的函数 (与首页一致)
  const detectQuizOptions = (inputText: string): boolean => {
    const text = inputText.trim();
    if (!text) return false;

    // 检测题干模式：以数字开头，后跟问号的问题（更严格的匹配）
    const questionPattern = /^\d+\.\s+.*[？?]\s*$/im;

    // 检测选项模式：更严格的选项检测，避免误判普通句子
    // 要求：行首是单个大写字母，后跟点号，然后是选项内容（不含数字开头，且长度适中）
    const optionPattern = /^[A-D]\.\s+[a-zA-Z][^0-9]*$/im;

    // 检测括号选项模式：(A) (B) (C) (D)
    const bracketOptionPattern = /\([A-D]\)[^)]*$/im;

    // 检测连续选项模式：必须包含多个选项才算真正的是选择题
    const multipleOptionsPattern = (/[A-D]\.\s+.*\n.*[B-D]\.\s+/im ||
                                  /\([A-D]\).*\n.*\([B-D]\)/im);

    // 检测问题关键词模式（但需要结合其他条件）
    const questionKeywords = /\b(Which|What|When|Where|Why|How|Choose|Select)\b.*\?/i;

    try {
      const hasQuestions = questionPattern.test(text);
      const hasSingleOption = optionPattern.test(text);
      const hasBracketOption = bracketOptionPattern.test(text);
      const hasMultipleOptions = multipleOptionsPattern.test(text);
      const hasQuestionKeywords = questionKeywords.test(text);

      // 更严格的判断：
      // 1. 要么有明确的数字题目格式
      // 2. 要么有多个连续的选项
      // 3. 或者有问题关键词 + 选项模式
      const hasValidOptions = (hasSingleOption || hasBracketOption) && (hasMultipleOptions || hasQuestionKeywords);

      console.log('题干选项检测结果 (深度分析页面):', {
        hasQuestions,
        hasSingleOption,
        hasBracketOption,
        hasMultipleOptions,
        hasQuestionKeywords,
        hasValidOptions,
        textLength: text.length,
        textPreview: text.substring(0, 100) + '...'
      });

      return hasQuestions || hasValidOptions;
    } catch (error) {
      console.error('检测题干选项时出错:', error);
      return false;
    }
  }

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error('请输入要分析的文本内容')
      return
    }

    // 检测题干选项 (与首页一致)
    if (detectQuizOptions(text)) {
      alert('\u26a0\ufe0f 检测到您输入的内容包含题干和ABCD选项。\n\n请删除题干和选项，只输入英文文章原文。\n\nFred老师原创提示词需要纯文本才能生成高质量的深度分析内容。')
      return
    }

    if (!hasEnoughPoints) {
      toast.error(`积分不足，需要 ${toolCost} 点`)
      return
    }

    setIsAnalyzing(true)

    try {
      // 调用文本分析API (与首页保持一致)
      const response = await fetch('/api/ai/text-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify({
          text: text,
          analysisType: "comprehensive"
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAnalysisResult(data.result)
        await refreshUser()
        alert(`文本分析完成！消耗 ${data.pointsCost} 个点数，剩余 ${data.remainingPoints} 个点数`)
      } else {
        console.error('❌ 文本分析失败:', data.error)
        alert(data.error || '文本分析失败，请稍后重试')
        await refreshUser()
      }
    } catch (error) {
      console.error('分析失败:', error)
      toast.error('分析失败，请重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const goHome = () => {
    router.push('/')
  }

  
  if (!isClient) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={goHome}
                className="text-gray-600 hover:text-gray-900 px-2 sm:px-3"
              >
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">首页</span>
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate max-w-[150px] sm:max-w-none">
                阅读理解深度分析
              </h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Badge variant="outline" className="text-xs sm:text-sm">
                <BookOpen className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">深度分析</span>
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm">
                <Brain className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">AI驱动</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Panel - Input */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">

            {/* Text Input */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  文本内容
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="请粘贴您要分析的英语文章..."
                  className="min-h-[200px] sm:min-h-[300px] resize-none text-sm sm:text-base"
                />

                {/* 重要警告信息 */}
                <div className="mt-3 p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-1 sm:space-x-2">
                    <span className="text-amber-600 text-sm sm:text-lg">📝</span>
                    <div className="text-xs text-amber-700">
                      <p className="font-medium mb-1">重要提醒：</p>
                      <ul className="list-disc list-inside space-y-1 text-amber-600">
                        <li>请只输入英文文章原文，不要包含题干和ABCD选项</li>
                        <li>Fred老师原创提示词需要纯文本才能生成最佳分析效果</li>
                        <li>如果检测到题干选项，系统会自动提醒您修改</li>
                      </ul>
                      <div className="mt-2 pt-2 border-t border-amber-200">
                        <p className="text-amber-700 font-medium">
                          <span className="text-amber-600">⚠️</span> 该功能只适用于全国卷、北京卷、天津卷、上海卷等风格的阅读题
                        </p>
                        <p className="text-amber-600 mt-1">
                          不适合段落较多的课文文章，如需剖析课文，请访问
                          <a
                            href="/tools/reading/textbook_passage_analysis"
                            className="text-blue-600 hover:text-blue-800 underline ml-1"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            课本文章分析
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('📸 [DEBUG] Camera button clicked, setting isCameraOpen to true')
                      setIsCameraOpen(true)
                      console.log('📸 [DEBUG] isCameraOpen set to true, current value:', isCameraOpen)
                    }}
                    className="flex items-center text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    拍照识图
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    上传图片
                  </Button>
                </div>

                {/* 隐藏的文件输入框 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>

            
            {/* Uploaded Images */}
            {uploadedImages.length > 0 && (
              <Card>
                <CardContent className="p-2 sm:p-4">
                  <div className="space-y-2">
                    {uploadedImages.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`上传的图片 ${index + 1}`}
                        className="w-full rounded-lg"
                      />
                    ))}
                  </div>
                  <div className="mt-3 sm:mt-4 flex gap-2">
                    <Button
                      onClick={() => recognizeText(uploadedImages)}
                      disabled={isRecognizing}
                      className="flex-1 text-sm"
                    >
                      {isRecognizing ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent mr-2" />
                          OCR识别中...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          识别全部
                        </>
                      )}
                    </Button>
                    <Button onClick={clearUploadedImage} variant="outline" size="sm" className="px-2 sm:px-3">
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={!text.trim() || isAnalyzing || !hasEnoughPoints}
              className="w-full py-4 sm:py-6 text-base sm:text-lg font-semibold"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent mr-2 sm:mr-3" />
                  AI分析中...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                  开始神奇分析!
                </>
              )}
            </Button>

                      </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            {analysisResult ? (
              <Card className="h-full">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-500" />
                    分析结果
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <ScrollArea className="h-[400px] sm:h-[600px]">
                    <div className="prose prose-xs sm:prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-gray-700">
                        {analysisResult}
                      </pre>
                    </div>
                  </ScrollArea>

                  {/* 复制和导出按钮 */}
                  <div className="mt-4 flex flex-wrap gap-2 sm:gap-3 justify-center">
                    <Button
                      onClick={copyToClipboard}
                      disabled={isCopying}
                      className="flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
                      variant="outline"
                    >
                      {isCopying ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent mr-1 sm:mr-2" />
                          复制中...
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          一键复制
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={exportToTxt}
                      className="flex items-center gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      导出TXT
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Empty State */
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12 sm:py-20 px-4">
                  <Brain className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-3 sm:mb-4" />
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                    开始文本分析
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                    输入英文文章，获得Fred老师原创AI深度分析
                  </p>
                  <div className="space-y-2 text-left max-w-md mx-auto">
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      全文解读和中心思想分析
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      段落分析与篇章结构
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      词汇语法深度剖析
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* OCR overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-4">
            <h3 className="text-lg font-semibold text-center">拍照识图</h3>

            {/* 添加一个临时的测试按钮 */}
            <div className="text-center">
              <p className="text-green-600 mb-2">🎉 摄像头弹窗已修复！</p>
              <p className="text-sm text-gray-500">状态：isClient={isClient ? '✓' : '✗'}, isCameraOpen={isCameraOpen ? '✓' : '✗'}, stream={stream ? '✓' : '✗'}</p>
            </div>

            {cameraError ? (
              // 显示错误状态
              <div className="text-center space-y-4">
                <div className="text-red-500 text-4xl mb-2">⚠️</div>
                <p className="text-red-600">{cameraError}</p>
                <div className="text-sm text-gray-500 space-y-2">
                  <p>请确保：</p>
                  <ul className="text-left space-y-1">
                    <li>• 摄像头权限已授予</li>
                    <li>• 摄像头未被其他应用占用</li>
                    <li>• 浏览器支持摄像头访问</li>
                  </ul>
                </div>
                <Button onClick={startCamera} size="sm" variant="outline">
                  重试
                </Button>
              </div>
            ) : photo ? (
              // 显示拍摄的照片
              <img src={photo} alt="photo" className="w-full rounded-lg" />
            ) : (
              // 显示摄像头预览
              <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover rounded-lg" />
            )}

            <canvas ref={canvasRef} className="hidden" />

            {!cameraError && (
              <div className="flex justify-between">
                {!photo && <Button onClick={takePhoto} size="sm" disabled={isTakingPhoto}>{isTakingPhoto ? '拍照中...' : '拍照'}</Button>}
                {photo && <Button onClick={() => recognizeText([photo])} size="sm" disabled={isRecognizing}>{isRecognizing ? '识别中' : 'OCR识别'}</Button>}
                <Button variant="outline" size="sm" onClick={() => {
  console.log('❌ [DEBUG] Close button clicked, closing overlay');
  setIsCameraOpen(false);
  stopCamera();
  setPhoto(null);
  console.log('❌ [DEBUG] Close button actions completed');
}}>关闭</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OCR recognizing overlay */}
      {isRecognizing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000]">
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
    </div>
  )
}