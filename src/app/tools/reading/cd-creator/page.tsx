"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'

export default function CDCreatorPage() {
  const router = useRouter()
  const { currentUser, userPoints, refreshUser } = useUser()
  const [difficulty, setDifficulty] = useState<'basic' | 'intermediate' | 'advanced'>('intermediate')
  const [article, setArticle] = useState('')
  const [creationResult, setCreationResult] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedResult, setOptimizedResult] = useState('')

  // 摄像头相关状态
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toolCost = difficulty === 'advanced' ? 6 : difficulty === 'intermediate' ? 4 : 2
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
        setArticle(prev => prev + (prev ? '\n\n' : '') + combinedText)

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

  // 复制和导出功能
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(creationResult)
      alert('文本已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      alert('复制失败，请手动复制')
    }
  }

  const exportToText = () => {
    try {
      const element = document.createElement('a')
      const file = new Blob([creationResult], { type: 'text/plain;charset=utf-8' })
      element.href = URL.createObjectURL(file)
      element.download = 'CD_questions_result.txt'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(element.href)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请手动复制')
    }
  }

  const exportOptimizedToText = () => {
    try {
      const element = document.createElement('a')
      const file = new Blob([optimizedResult], { type: 'text/plain;charset=utf-8' })
      element.href = URL.createObjectURL(file)
      element.download = 'CD_optimized_questions_result.txt'
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

  const handleCreate = async () => {
    if (!article.trim()) {
      alert('请输入要命题的文章内容')
      return
    }

    if (!hasEnoughPoints) {
      alert(`点数不足，需要 ${toolCost} 个点数`)
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/ai/cd-creator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: article,
          difficulty: difficulty,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCreationResult(data.result)
        setOptimizedResult('') // 清除之前的优化结果
        await refreshUser()
      } else {
        // 显示错误信息，如果包含退点信息则一起显示
        let errorMessage = data.error || '命题生成失败，请稍后重试'
        if (data.refunded && data.pointsRefunded) {
          errorMessage += `\n\n已退还 ${data.pointsRefunded} 点数到您的账户`
        }
        alert(errorMessage)
        await refreshUser() // 刷新用户点数信息
      }
    } catch (error) {
      console.error('命题生成错误:', error)
      alert('命题生成失败，请稍后重试')
      await refreshUser() // 刷新用户信息，以防出现异常情况
    } finally {
      setIsCreating(false)
    }
  }

  const handleOptimize = async () => {
    if (!creationResult || !creationResult.trim()) {
      alert('没有可优化的题目内容')
      return
    }

    if (userPoints < 1) {
      alert('点数不足，优化需要1个点数')
      return
    }

    setIsOptimizing(true)

    try {
      const response = await fetch('/api/ai/cd-creator', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: creationResult
        }),
      })

      const data = await response.json()

      if (data.success) {
        setOptimizedResult(data.result)
        await refreshUser()
        alert(`优化完成！消耗 ${data.pointsCost} 个点数，剩余 ${data.remainingPoints} 个点数`)
      } else {
        alert(data.error || '优化失败，请稍后重试')
        await refreshUser()
      }
    } catch (error) {
      console.error('优化错误:', error)
      alert('优化失败，请稍后重试')
      await refreshUser()
    } finally {
      setIsOptimizing(false)
    }
  }

  const getDifficultyLabel = (level: string) => {
    const labels = {
      'basic': '基础版',
      'intermediate': '标准版',
      'advanced': '进阶版'
    }
    return labels[level as keyof typeof labels] || level
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">CD篇命题工具</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">基于英文文章生成选择题题目和答案解析</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-purple-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border border-purple-200">
                <span className="text-xs sm:text-sm text-purple-700 font-medium">{userPoints}</span>
                <span className="text-xs sm:text-sm text-purple-600">点数</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-lg sm:text-xl">CD篇命题工具</span>
                  <div className="flex gap-2">
                    <Select value={difficulty} onValueChange={(value: 'basic' | 'intermediate' | 'advanced') => setDifficulty(value)}>
                      <SelectTrigger className="w-full sm:w-40 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">基础版 (豆包 2点)</SelectItem>
                        <SelectItem value="intermediate">标准版 (智谱清言 4点)</SelectItem>
                        <SelectItem value="advanced">进阶版 (Gemini-2.5-pro 6点)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    请输入要命题的文章内容：
                  </label>
                  <Textarea
                    value={article}
                    onChange={(e) => setArticle(e.target.value)}
                    placeholder="在此粘贴英文文章内容，或使用下方按钮拍照识别图片中的文字..."
                    className="h-64 sm:h-80 lg:h-[400px] resize-none overflow-y-auto text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCameraOpen(true)
                        startCamera()
                      }}
                      className="flex items-center justify-center gap-2 h-12 text-sm sm:text-base border-blue-200 hover:bg-blue-50"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h7.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018 13H9a2 2 0 01-2-2V7a2 2 0 012-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3" />
                      </svg>
                      <span className="sm:hidden">📷 拍照</span>
                      <span className="hidden sm:inline">拍照识图</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 h-12 text-sm sm:text-base border-blue-200 hover:bg-blue-50"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 00-2h-10a2 2 0 00-2v-4a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8H7a2 2 0 00-2v4a2 2 0 002 2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13l-7 7m0 0l-7 7m0 0v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 002-2z" />
                      </svg>
                      <span className="sm:hidden">📁 上传</span>
                      <span className="hidden sm:inline">上传图片(最多3张)</span>
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
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button
                          variant="default"
                          onClick={() => {
                            console.log('OCR按钮被点击了！')
                            recognizeText()
                          }}
                          disabled={isRecognizing}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 text-sm sm:text-base font-medium"
                        >
                          {isRecognizing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="hidden sm:inline">AI识图中，请耐心等待...</span>
                              <span className="sm:hidden">AI识图中...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="hidden sm:inline">豆包OCR识别</span>
                              <span className="sm:hidden">🔍 OCR识别</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            clearPhoto()
                            clearUploadedImage()
                          }}
                          className="h-12 px-4 sm:px-6 text-sm sm:text-base"
                        >
                          <span className="hidden sm:inline">清除图片</span>
                          <span className="sm:hidden">🗑️ 清除</span>
                        </Button>
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                          ✅ 免费使用
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">当前模式:</span>
                        <span className="sm:hidden">模式:</span>
                        <span className="font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded text-xs">
                          {getDifficultyLabel(difficulty)} - 选择题
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>消耗点数:</span>
                        <span className="font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded text-xs">{toolCost}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={!hasEnoughPoints || isCreating || !article.trim()}
                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-base sm:text-lg font-medium shadow-lg"
                  >
                    {isCreating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">AI生成中，请耐心等待...</span>
                        <span className="sm:hidden">AI生成中...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>🚀 开始命题</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* 右侧：结果区域 */}
          <div className="space-y-4 sm:space-y-6">
            {isCreating && !creationResult && (
              <Card className="h-full">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center justify-center">
                    <span className="text-purple-600 text-sm sm:text-base">
                      {difficulty === 'advanced' ? 'Gemini-2.5-pro模型生成中......大约需要2分钟' : difficulty === 'intermediate' ? '智谱清言模型生成中......大约需要1分钟' : '豆包模型生成中，请耐心等待...'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64 sm:h-80 lg:h-[400px]">
                  <div className="text-center space-y-6">
                    {/* AI机器人动画 */}
                    <div className="relative inline-flex">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-.983 5.976 5.976 0 01-.335-2z" clipRule="evenodd" />
                        </svg>
                      </div>

                      {/* 思维泡泡动画 */}
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="absolute -top-4 -right-6 w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute -top-1 -right-8 w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
                    </div>

                    {/* 打字机效果 */}
                    <div className="space-y-2">
                      <div className="flex space-x-1 justify-center">
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <p className="text-sm text-gray-600 animate-pulse">
                        {difficulty === 'advanced' ? '正在使用Gemini-2.5-pro模型进行深度题目生成...' : difficulty === 'intermediate' ? '正在使用智谱清言模型进行题目生成...' : '正在使用豆包模型进行题目生成...'}
                      </p>
                      <p className="text-xs text-gray-500">
                        正在生成选择题，难度等级：{getDifficultyLabel(difficulty)}
                      </p>
                    </div>

                    {/* 进度条动画 */}
                    <div className="w-64 mx-auto">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-blue-600 rounded-full animate-pulse"
                             style={{
                               width: '60%',
                               animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                             }}>
                        </div>
                      </div>
                    </div>

                    {/* 提示信息 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm mx-auto">
                      <div className="flex items-center space-x-2 text-blue-700 text-sm">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>AI正在分析文本内容，生成选择题</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {creationResult && !isCreating && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl">命题目结果</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        生成完成
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getDifficultyLabel(difficulty)} - 选择题
                      </Badge>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="flex items-center space-x-1 h-10 px-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2v4a2 2 0 012 2h4a2 2 0 012-2v-4a2 2 0 01-2z" />
                        </svg>
                        <span className="hidden sm:inline">一键复制</span>
                        <span className="sm:hidden">复制</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToText}
                        className="flex items-center space-x-1 h-10 px-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6M8 21l4-4m0 0l4 4m-4-4v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 00-2v6a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2z" />
                        </svg>
                        <span className="hidden sm:inline">导出文本</span>
                        <span className="sm:hidden">导出</span>
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="h-64 sm:h-80 lg:h-[400px] overflow-y-auto prose prose-gray prose-sm max-w-none" style={{ fontSize: '0.875rem' }}>
                    {creationResult.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4" style={{ fontSize: '0.875rem' }}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  
                  {/* 进一步优化按钮 */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      onClick={handleOptimize}
                      disabled={isOptimizing || userPoints < 1}
                      className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      {isOptimizing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          优化中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          进一步优化结果 (1点)
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 优化结果展示框 */}
            {optimizedResult && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>优化后结果</span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        Gemini大模型优化完成
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(optimizedResult)
                          alert('优化结果已复制到剪贴板！')
                        }}
                        className="flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2v4a2 2 0 012 2h4a2 2 0 012-2v-4a2 2 0 01-2z" />
                        </svg>
                        复制优化结果
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportOptimizedToText}
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
                  <div className="h-[400px] overflow-y-auto prose prose-gray prose-sm max-w-none" style={{ fontSize: '0.875rem' }}>
                    {optimizedResult.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4" style={{ fontSize: '0.875rem' }}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!creationResult && !isCreating && (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full h-[400px]">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p>CD篇命题目结果将在这里显示</p>
                    <p className="text-sm mt-2">请选择难度等级后开始生成选择题</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 摄像头模态框 */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
            <div className="flex justify-between items-center p-3 sm:p-4 border-b">
              <h3 className="text-base sm:text-lg font-semibold">
                <span className="hidden sm:inline">拍照识图（火山引擎豆包模型）</span>
                <span className="sm:hidden">📷 拍照识图</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCameraOpen(false)
                  stopCamera()
                  clearPhoto()
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* 摄像头预览 */}
              {uploadedImages.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    📁 已上传 {uploadedImages.length} 张图片
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3" style={{ aspectRatio: '4/3' }}>
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative bg-gray-100 rounded-lg overflow-hidden">
                        <img src={image} alt={`上传的第${index + 1}张图片`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : photo ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                    📷 拍照完成，请确认识别
                  </div>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <img src={photo} alt="拍摄的图片" className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg text-center">
                    📷 请对准需要识别的文字进行拍照
                  </div>
                  <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* 隐藏的canvas用于拍照 */}
              <canvas ref={canvasRef} className="hidden" />

              {/* 控制按钮 */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                {!photo ? (
                  <>
                    <Button
                      onClick={takePhoto}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-12 bg-blue-500 hover:bg-blue-600 text-white text-base sm:text-lg font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6" />
                      </svg>
                      📸 拍照
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={recognizeText}
                      disabled={isRecognizing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-12 bg-orange-500 hover:bg-orange-600 text-white text-base sm:text-lg font-medium"
                    >
                      {isRecognizing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="hidden sm:inline">识别中，请稍候...</span>
                          <span className="sm:hidden">识别中...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2V7a2 2 0 012-2h14a2 2 0 012 2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21v-2a2 2 0 012-2h4a2 2 0 012 2v2" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17v-1" />
                          </svg>
                          <span className="hidden sm:inline">🔍 识别文字(2点数)</span>
                          <span className="sm:hidden">🔍 识别(2点数)</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        clearPhoto()
                        startCamera()
                      }}
                      className="flex-1 sm:flex-none h-12 text-base sm:text-lg"
                    >
                      <span className="hidden sm:inline">🔄 重拍/重选</span>
                      <span className="sm:hidden">🔄 重拍</span>
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