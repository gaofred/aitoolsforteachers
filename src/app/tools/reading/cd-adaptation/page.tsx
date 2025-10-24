"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'

export default function CDAdaptationPage() {
  const router = useRouter()
  const { currentUser, userPoints, refreshUser } = useUser()
  const [analysisLevel, setAnalysisLevel] = useState<'basic' | 'advanced'>('basic')
  const [article, setArticle] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 摄像头相关状态
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toolCost = analysisLevel === 'advanced' ? 8 : 5
  const hasEnoughPoints = userPoints >= toolCost

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

      // 验证文件大小 (5MB限制)
      if (file.size > 5 * 1024 * 1024) {
        alert(`第${index + 1}个图片文件过大，请选择小于5MB的图片`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          validFiles.push(result)
        }

        processedCount++
        if (processedCount === files.length) {
          // 所有文件处理完成
          if (validFiles.length > 0) {
            setUploadedImages(validFiles)
            setPhoto(null) // 清除拍照的照片
          }
          setIsRecognizing(false)
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
    const imagesToRecognize = uploadedImages.length > 0 ? uploadedImages : (photo ? [photo] : [])
    if (imagesToRecognize.length === 0) {
      alert('请先拍照或上传图片')
      return
    }

    setIsRecognizing(true)
    let allTexts: string[] = []

    try {
      // 逐个识别图片
      for (let i = 0; i < imagesToRecognize.length; i++) {
        const imageToRecognize = imagesToRecognize[i]

        try {
          const response = await fetch('/api/ai/image-recognition', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: imageToRecognize,
              type: 'text'
            })
          })

          const data = await response.json()

          if (data.success && data.text) {
            allTexts.push(data.text)
          } else {
            console.warn(`第${i + 1}张图片识别失败:`, data.error)
            // 继续处理其他图片
          }
        } catch (error) {
          console.error(`第${i + 1}张图片识别错误:`, error)
          // 继续处理其他图片
        }
      }

      if (allTexts.length > 0) {
        // 合并所有识别的文本
        const combinedText = allTexts.join('\n\n')
        setArticle(prev => prev + (prev ? '\n\n' : '') + combinedText)
        setIsCameraOpen(false)
        clearPhoto()
        clearUploadedImage()
        stopCamera()
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

  // 复制和导出功能
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(analysisResult)
      alert('文本已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      alert('复制失败，请手动复制')
    }
  }

  const exportToText = () => {
    try {
      const element = document.createElement('a')
      const file = new Blob([analysisResult], { type: 'text/plain;charset=utf-8' })
      element.href = URL.createObjectURL(file)
      element.download = 'CD_adaptation_result.txt'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(element.href)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请手动复制')
    }
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  // 只有在客户端状态下且确实没有用户时才显示登录提示
  // 避免认证状态加载时的闪烁
  if (isClient && !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">请先登录</h1>
          <Button onClick={() => router.push('/auth/signin')}>
            前往登录
          </Button>
        </div>
      </div>
    )
  }

  const handleAnalyze = async () => {
    if (!article.trim()) {
      alert('请输入要改编的文章内容')
      return
    }

    if (!hasEnoughPoints) {
      alert(`点数不足，需要 ${toolCost} 个点数`)
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/ai/cd-adaptation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: article,
          version: analysisLevel,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAnalysisResult(data.result)
        await refreshUser()
      } else {
        alert(data.error || '改编失败，请稍后重试')
      }
    } catch (error) {
      console.error('改编错误:', error)
      alert('改编失败，请稍后重试')
    } finally {
      setIsAnalyzing(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="text-2xl font-bold text-purple-600 hover:text-purple-700 transition-colors duration-200"
              >
                English Teaching Tools
              </button>
              <div className="ml-4 text-sm text-gray-500">
                / CD篇改编
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
                  <span>CD篇改编工具</span>
                  <div className="flex gap-2">
                    <Button
                      variant={analysisLevel === 'basic' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAnalysisLevel('basic')}
                    >
                      基础版 (5点)
                    </Button>
                    <Button
                      variant={analysisLevel === 'advanced' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAnalysisLevel('advanced')}
                    >
                      进阶版 (智谱清言驱动 8点)
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    请输入要改编的文章内容：
                  </label>
                  <Textarea
                    value={article}
                    onChange={(e) => setArticle(e.target.value)}
                    placeholder="在此粘贴英文文章内容或点击下方拍照识图..."
                    className="h-[400px] resize-none overflow-y-auto"
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
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    当前点数: <span className="font-semibold">{userPoints}</span>
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={!hasEnoughPoints || isAnalyzing || !article.trim()}
                    className="px-6"
                  >
                    {isAnalyzing ? '改编中...' : '开始改编'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：结果区域 */}
          <div className="space-y-6">
            {analysisResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>改编结果</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2v4a2 2 0 012 2h4a2 2 0 012-2v-4a2 2 0 01-2z" />
                        </svg>
                        一键复制
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToText}
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
                  <div className="h-[400px] overflow-y-auto prose prose-gray prose-sm max-w-none">
                    {analysisResult.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!analysisResult && (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full h-[400px]">
                  <div className="text-center text-gray-500">
                    <p>改编结果将在这里显示</p>
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
              <h3 className="text-lg font-semibold">拍照识图</h3>
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
                          识别文字
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