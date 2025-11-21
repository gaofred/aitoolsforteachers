"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import toast from 'react-hot-toast'

export default function GapFillingExerciseAnalysisPage() {
  const router = useRouter()
  const { currentUser, userPoints, refreshUser } = useUser()

  // 调试日志：页面加载检查
  console.log('🔍 语法填空解析页面加载完成, currentUser:', currentUser ? '已登录' : '未登录');

  const [text, setText] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const toolCost = 4
  const hasEnoughPoints = userPoints >= toolCost

  // 摄像头相关状态
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 使用 useEffect 避免水合错误
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  
  // 组件卸载时清理摄像头
  useEffect(() => {
    return () => {
      stopCamera()
      clearUploadedImage()
    }
  }, [stream])

  // 摄像头功能函数 - 移到条件渲染之前
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('摄像头访问失败:', error)
      alert('无法访问摄像头，请检查权限设置')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const clearPhoto = () => {
    setPhoto(null)
  }

  const clearUploadedImage = () => {
    setUploadedImages([])
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // 验证最多只能上传3张图片
    if (files.length > 3) {
      alert('最多只能上传3张图片')
      return
    }

    const validFiles: string[] = []
    let processedCount = 0

    Array.from(files).forEach((file, index) => {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert(`第${index + 1}个文件不是图片格式`)
        return
      }

      // 验证文件大小 (10MB限制)
      if (file.size > 10 * 1024 * 1024) {
        alert(`第${index + 1}个图片文件过大，请选择小于10MB的图片`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          // 压缩图片
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) {
              validFiles.push(result)
              processedCount++
              if (processedCount === files.length) {
                if (validFiles.length > 0) {
                  setUploadedImages(validFiles)
                  setPhoto(null)
                }
                setIsRecognizing(false)
              }
              return
            }

            // 计算压缩后的尺寸
            const maxWidth = 1920
            const maxHeight = 1080
            let width = img.width
            let height = img.height

            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height)
              width *= ratio
              height *= ratio
            }

            canvas.width = width
            canvas.height = height

            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height)

            // 转换为base64，质量设置为0.8
            const compressedResult = canvas.toDataURL('image/jpeg', 0.8)
            validFiles.push(compressedResult)

            processedCount++
            if (processedCount === files.length) {
              if (validFiles.length > 0) {
                setUploadedImages(validFiles)
                setPhoto(null)
              }
              setIsRecognizing(false)
            }
          }
          img.src = result
        }
      }
      reader.onerror = () => {
        alert(`第${index + 1}个图片读取失败，请重试`)
        processedCount++
        if (processedCount === files.length) {
          setIsRecognizing(false)
        }
      }
      reader.readAsDataURL(file)
    })

    setIsRecognizing(true)
  }

  const recognizeText = async () => {
    console.log('recognizeText函数被调用了！')
    const imagesToRecognize = uploadedImages.length > 0 ? uploadedImages : (photo ? [photo] : [])
    console.log('要识别的图片数量:', imagesToRecognize.length)
    if (imagesToRecognize.length === 0) {
      alert('请先拍照或上传图片')
      return
    }

    // 创建图片的快照，防止在识别过程中被清除
    const imageSnapshot = [...imagesToRecognize]
    setIsRecognizing(true)
    const allTexts: string[] = []

    try {
      // 并行识别所有图片（使用快照，防止状态被清除）
      const recognitionPromises = imageSnapshot.map(async (imageBase64, index) => {
        try {
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

      // 等待所有识别任务完成
      const results = await Promise.all(recognitionPromises)

      // 按原始顺序过滤成功的结果
      const successfulResults = results
        .filter(result => result.success)
        .sort((a, b) => a.index - b.index)
        .map(result => result.text)

      if (successfulResults.length > 0) {
        // 合并所有识别的文本，保持上传顺序
        const combinedText = successfulResults.join('\n\n')
        setText(prev => prev + (prev ? '\n\n' : '') + combinedText)

        // 延迟清除图片状态，确保文本已经成功添加
        setTimeout(() => {
          setIsCameraOpen(false)
          clearPhoto()
          clearUploadedImage()
          stopCamera()
        }, 100)

        // 显示成功信息
        const failedCount = imageSnapshot.length - successfulResults.length
        if (failedCount > 0) {
          setTimeout(() => {
            alert(`成功识别${successfulResults.length}张图片，${failedCount}张图片识别失败`)
          }, 150)
        }
      } else {
        alert('所有图片识别都失败了，请重试')
      }
    } catch (error) {
      console.error('文字识别错误:', error)
      alert('文字识别失败，请重试')
    } finally {
      setIsRecognizing(false)
    }
  }

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const photoData = canvas.toDataURL('image/jpeg', 0.8)
        setPhoto(photoData)
      }
    }
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  // 移除强制登录检查，与其他工具保持一致
  // 在实际使用功能时才检查登录状态

  const handleAnalyze = async () => {
    if (!currentUser) {
      alert('请先登录后再使用此功能')
      return
    }

    if (!text.trim()) {
      alert('请输入要分析的语法填空题内容')
      return
    }

    if (!hasEnoughPoints) {
      alert(`点数不足，需要 ${toolCost} 个点数`)
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/ai/gap-filling-exercise-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          userId: currentUser.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAnalysisResult(data.result)
        await refreshUser()
      } else {
        // 显示错误信息，如果包含退点信息则一起显示
        let errorMessage = data.error || '分析失败，请稍后重试'
        if (data.refunded && data.pointsRefunded) {
          errorMessage += `\n\n已退还 ${data.pointsRefunded} 点数到您的账户`
        }
        alert(errorMessage)
        await refreshUser() // 刷新用户点数信息
      }
    } catch (error) {
      console.error('分析错误:', error)
      alert('分析失败，请稍后重试')
      await refreshUser() // 刷新用户信息，以防出现异常情况
    } finally {
      setIsAnalyzing(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">语法填空解析工具</h1>
                <p className="text-sm text-gray-500">专业的语法填空AI分析工具（Gemini-2.5-Pro模型驱动）</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">点数: {userPoints}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>语法填空解析工具</span>
                  <div className="flex gap-2">
                    <Badge className="bg-indigo-100 text-indigo-800">
                      Gemini-2.5-Pro模型驱动 (4点)
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    请输入要分析的语法填空题内容：
                  </label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="在此粘贴语法填空题内容，或使用火山引擎豆包模型拍照识别图片中的文字...

支持分析以下语法考点：
• 动词时态和语态
• 非谓语动词
• 词汇变形（名词、形容词、副词转换）
• 从句引导词
• 介词和连词
• 冠词和代词
• 情态动词和虚拟语气"
                    className="h-[300px] resize-none overflow-y-auto"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCameraOpen(true)
                        startCamera()
                      }}
                      className="flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h7.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018 13H9a2 2 0 01-2-2V7a2 2 0 012-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3" />
                      </svg>
                      拍照识图
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 00-2h-10a2 2 0 00-2v-4a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8H7a2 2 0 00-2v4a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13l-7 7m0 0l-7 7m0 0v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 002-2z" />
                      </svg>
                      上传图片(最多3张)
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
                  {(photo || uploadedImages.length > 0) && (
                    <>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            console.log('OCR按钮被点击了！')
                            recognizeText()
                          }}
                          disabled={isRecognizing}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          {isRecognizing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              AI识图中，请耐心等待......
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              豆包OCR识别
                            </>
                          )}
                        </Button>
                        <span className="text-xs text-green-600 whitespace-nowrap">免费使用</span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          clearPhoto()
                          clearUploadedImage()
                        }}
                      >
                        清除图片
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    当前点数: <span className="font-semibold">{userPoints}</span>
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={!hasEnoughPoints || isAnalyzing || !text.trim()}
                    className="px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI分析中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        开始语法解析
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：结果区域 */}
          <div className="space-y-6">
            {isAnalyzing && !analysisResult && (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center">
                    <span className="text-indigo-600">
                      Gemini-2.5-Pro模型分析中......大约需要2分钟
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[400px]">
                  <div className="text-center space-y-6">
                    {/* AI机器人动画 */}
                    <div className="relative inline-flex">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>

                      {/* 思维泡泡动画 */}
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="absolute -top-4 -right-6 w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute -top-1 -right-8 w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
                    </div>

                    {/* 打字机效果 */}
                    <div className="space-y-2">
                      <div className="flex space-x-1 justify-center">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <p className="text-sm text-gray-600 animate-pulse">
                        正在使用Gemini-2.5-Pro模型进行深度语法填空解析...
                      </p>
                      <p className="text-xs text-gray-500">
                        预计耗时 1-2 分钟，请耐心等待
                      </p>
                    </div>

                    {/* 进度条动画 */}
                    <div className="w-64 mx-auto">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse"
                             style={{
                               width: '60%',
                               animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                             }}>
                        </div>
                      </div>
                    </div>

                    {/* 提示信息 */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 max-w-sm mx-auto">
                      <div className="flex items-center space-x-2 text-indigo-700 text-sm">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>AI正在分析语法考点，生成专业的语法填空解析内容</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysisResult && !isAnalyzing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>语法填空解析结果</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        AI生成完成
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(analysisResult)
                          toast.success('解析内容已复制到剪贴板')
                        }}
                        className="flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2v4a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 01-2z" />
                        </svg>
                        复制原文
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const element = document.createElement('a')
                          const file = new Blob([analysisResult], { type: 'text/plain;charset=utf-8' })
                          element.href = URL.createObjectURL(file)
                          element.download = '语法填空解析.txt'
                          document.body.appendChild(element)
                          element.click()
                          document.body.removeChild(element)
                          URL.revokeObjectURL(element.href)
                          toast.success('导出成功')
                        }}
                        className="flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6M8 21l4-4m0 0l4 4m-4-4v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 00-2v6a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2z" />
                        </svg>
                        导出文本
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[600px] overflow-y-auto">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {analysisResult}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}


            {!analysisResult && !isAnalyzing && (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full h-[400px]">
                  <div className="text-center text-gray-500">
                    <p>分析结果将在这里显示</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 摄像头模态框 */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">拍照识图（火山引擎豆包模型）</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCameraOpen(false)
                  stopCamera()
                  clearPhoto()
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* 摄像头预览 */}
              {uploadedImages.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">已上传 {uploadedImages.length} 张图片：</div>
                  <div className="grid grid-cols-3 gap-2" style={{ aspectRatio: '4/3' }}>
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative bg-gray-100 rounded-lg overflow-hidden">
                        <img src={image} alt={`上传的第${index + 1}张图片`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : photo ? (
                <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <img src={photo} alt="拍摄的图片" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* 隐藏的canvas用于拍照 */}
              <canvas ref={canvasRef} className="hidden" />

              {/* 控制按钮 */}
              <div className="flex justify-center space-x-3">
                {!photo ? (
                  <>
                    <Button
                      onClick={takePhoto}
                      className="flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6" />
                      </svg>
                      拍照
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={recognizeText}
                      disabled={isRecognizing}
                      className="flex items-center space-x-2"
                    >
                      {isRecognizing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          识别中...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2V7a2 2 0 012-2h14a2 2 0 012 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21v-2a2 2 0 012-2h4a2 2 0 012 2v2" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17v-1" />
                          </svg>
                          识别文字(消耗2点数)
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        clearPhoto()
                        startCamera()
                      }}
                    >
                      重拍/重选
                    </Button>
                  </>
                )}
              </div>

              {/* 识别结果 */}
              {isRecognizing && (
                <div className="text-center text-sm text-gray-600">
                  正在识别图片中的文字，请稍候...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}