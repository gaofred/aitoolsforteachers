"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, X, Copy, FileText, Loader2, Zap, Image as ImageIcon, ArrowLeft, Home } from 'lucide-react'
import { useUser } from '@/lib/user-context'
import { pointsEventManager } from '@/lib/points-events'
import toast from 'react-hot-toast'

export default function ReadingComprehensionAnalysis() {
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const [textC, setTextC] = useState('')
  const [textD, setTextD] = useState('')
  const [resultA, setResultA] = useState('')
  const [resultB, setResultB] = useState('')
  const [resultC, setResultC] = useState('')
  const [resultD, setResultD] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // OCR 相关状态 - 支持多图片并行识别
  const [cameraOpenFor, setCameraOpenFor] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [capturing, setCapturing] = useState<Record<string, boolean>>({})
  const [parallelImages, setParallelImages] = useState<Record<string, Array<{ id: string, file: File, url: string }>>>({ A: [], B: [], C: [], D: [] })
  const [parallelProcessing, setParallelProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const parallelFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({ A: null, B: null, C: null, D: null })

  const { currentUser } = useUser()

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('无法访问摄像头，请检查权限设置')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  // 清理和格式化结果，移除Markdown格式符号
  const cleanResult = (result: string): string => {
    if (!result) return ''
    return result
      .replace(/^#{1,6}\s+/gm, '') // 移除标题符号 (#、##、###等)
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除加粗 (**text**)
      .replace(/\*([^*]+)\*/g, '$1') // 移除斜体 (*text*)
      .replace(/`([^`]+)`/g, '$1') // 移除行内代码 (`text`)
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接，保留文字
      .replace(/^\s*[-*+]\s+/gm, '') // 移除列表符号
      .replace(/^\s*\d+\.\s+/gm, '') // 移除数字列表
      .replace(/###\s*/g, '') // 移除剩余的###符号
      .replace(/\*\*/g, '') // 移除剩余的**符号
      .replace(/\*/g, '') // 移除剩余的*符号
      .replace(/\n{3,}/g, '\n\n') // 合并多个换行为两个换行
      .trim()
  }

  const capturePhoto = (inputId: string) => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const photoData = canvas.toDataURL('image/jpeg')
        setPhotos(prev => ({ ...prev, [inputId]: photoData }))
      }
    }
  }

  const clearPhoto = (inputId: string) => {
    setPhotos(prev => {
      const newPhotos = { ...prev }
      delete newPhotos[inputId]
      return newPhotos
    })
  }

  const retakePhoto = (inputId: string) => {
    clearPhoto(inputId)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, inputId: string) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotos(prev => ({ ...prev, [inputId]: e.target?.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  // OCR识别文字 - 指定输入框
  const recognizeText = async (inputId: string) => {
    const photo = photos[inputId]
    if (!photo) return

    setCapturing(prev => ({ ...prev, [inputId]: true }))
    try {
      const formData = new FormData()

      // 将base64转换为blob
      const response = await fetch(photo)
      const blob = await response.blob()
      formData.append('image', blob)

      const ocrResponse = await fetch('/api/ai/ocr-image', {
        method: 'POST',
        body: formData
      })

      if (!ocrResponse.ok) {
        throw new Error('OCR识别失败')
      }

      const data = await ocrResponse.json()
      if (data.text) {
        // 设置到指定输入框
        switch (inputId) {
          case 'A': setTextA(data.text); break
          case 'B': setTextB(data.text); break
          case 'C': setTextC(data.text); break
          case 'D': setTextD(data.text); break
        }

        toast.success(`文字已识别并填入${inputId}篇`)

        // 识别完成后关闭相机并清理
        setCameraOpenFor(null)
        clearPhoto(inputId)
        stopCamera()
      } else {
        toast.error('未能识别到文字内容')
      }
    } catch (err) {
      console.error('OCR识别失败:', err)
      toast.error('OCR识别失败，请重试')
    } finally {
      setCapturing(prev => ({ ...prev, [inputId]: false }))
    }
  }

  // 处理指定输入框的多文件上传
  const handleParallelFileUpload = (event: React.ChangeEvent<HTMLInputElement>, inputId: string) => {
    const files = event.target.files
    if (!files) return

    const newImages: Array<{ id: string, file: File, url: string }> = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const url = URL.createObjectURL(file)
      newImages.push({
        id: `${inputId}-${i + 1}`,
        file,
        url
      })
    }

    setParallelImages(prev => ({
      ...prev,
      [inputId]: [...prev[inputId], ...newImages]
    }))

    toast.success(`${inputId}篇已添加${newImages.length}张图片待识别`)
  }

  // 并行识别指定输入框的多张图片
  const recognizeParallelImages = async (inputId: string) => {
    const images = parallelImages[inputId]
    if (images.length === 0) return

    setParallelProcessing(true)

    try {
      // 并行处理该输入框的所有图片
      const recognitionPromises = images.map(async (image) => {
        const formData = new FormData()
        formData.append('image', image.file)

        try {
          const ocrResponse = await fetch('/api/ai/ocr-image', {
            method: 'POST',
            body: formData
          })

          if (!ocrResponse.ok) {
            throw new Error('OCR识别失败')
          }

          const data = await ocrResponse.json()
          return { success: true, text: data.text || '' }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'OCR识别失败'
          return { success: false, text: '', error: errorMsg }
        }
      })

      const results = await Promise.allSettled(recognitionPromises)

      // 合并所有识别结果
      let combinedText = ''
      let successCount = 0

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success && result.value.text) {
          if (combinedText) combinedText += '\n\n'
          combinedText += result.value.text
          successCount++
        }
      })

      // 设置到对应输入框
      switch (inputId) {
        case 'A': setTextA(combinedText); break
        case 'B': setTextB(combinedText); break
        case 'C': setTextC(combinedText); break
        case 'D': setTextD(combinedText); break
      }

      if (successCount > 0) {
        toast.success(`${inputId}篇成功识别${successCount}张图片`)
      } else {
        toast.error(`${inputId}篇所有图片识别失败`)
      }

      // 清理该输入框的图片状态
      setParallelImages(prev => ({
        ...prev,
        [inputId]: []
      }))

      // 清理URL
      images.forEach(image => URL.revokeObjectURL(image.url))

    } catch (err) {
      console.error('并行识别错误:', err)
      toast.error(`${inputId}篇并行识别过程中出现错误`)
    } finally {
      setParallelProcessing(false)
    }
  }

  // 移除指定输入框的单张图片
  const removeParallelImage = (inputId: string, imageId: string) => {
    setParallelImages(prev => {
      const images = prev[inputId]
      const index = images.findIndex(img => img.id === imageId)
      if (index !== -1) {
        URL.revokeObjectURL(images[index].url)
        return {
          ...prev,
          [inputId]: images.filter(img => img.id !== imageId)
        }
      }
      return prev
    })
  }

  // 获取总图片数量
  const getTotalImageCount = () => {
    return Object.values(parallelImages).reduce((total, images) => total + images.length, 0)
  }

  const handleAnalyze = async () => {
    // 收集所有非空的文章
    const articles = [
      { id: 'A', text: textA },
      { id: 'B', text: textB },
      { id: 'C', text: textC },
      { id: 'D', text: textD }
    ].filter(article => article.text.trim())

    if (articles.length === 0) {
      setError('请至少输入一篇文章的内容')
      return
    }

    if (!currentUser) {
      setError('请先登录')
      return
    }

    const pointsPerArticle = 8
    const totalPointsCost = pointsPerArticle * articles.length

    if (currentUser.points < totalPointsCost) {
      setError(`点数不足，需要 ${totalPointsCost} 个点数（每篇文章 ${pointsPerArticle} 点）`)
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      // 并行处理所有文章
      const analysisPromises = articles.map(async (article) => {
        const response = await fetch('/api/ai/reading-comprehension-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: article.text,
            userId: currentUser.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `处理${article.id}篇失败`)
        }

        const data = await response.json()
        return { id: article.id, result: data.result }
      })

      const results = await Promise.allSettled(analysisPromises)

      // 处理结果
      results.forEach((result, index) => {
        const articleId = articles[index].id
        if (result.status === 'fulfilled') {
          switch (articleId) {
            case 'A': setResultA(result.value.result); break
            case 'B': setResultB(result.value.result); break
            case 'C': setResultC(result.value.result); break
            case 'D': setResultD(result.value.result); break
          }
        } else {
          const errorMsg = `处理${articleId}篇失败: ${result.reason.message}`
          console.error(errorMsg)
          toast.error(errorMsg)
        }
      })

      // 触发点数变化事件
      if (totalPointsCost > 0) {
        pointsEventManager.emit({
          type: 'DEDUCT_POINTS',
          userId: currentUser.id,
          amount: -totalPointsCost,
          newBalance: currentUser.points - totalPointsCost,
          description: `阅读理解解析 - ${articles.length}篇文章`,
          timestamp: Date.now()
        })
      }

      const successCount = results.filter(r => r.status === 'fulfilled').length
      toast.success(`成功解析 ${successCount} 篇文章`)

    } catch (err) {
      console.error('Analysis error:', err)
      setError('分析过程中出现错误，请稍后重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('已复制到剪贴板')
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('复制失败')
    }
  }

  const copyAllResults = async () => {
    const allResults = [
      { id: 'A', result: resultA },
      { id: 'B', result: resultB },
      { id: 'C', result: resultC },
      { id: 'D', result: resultD }
    ]
      .filter(item => item.result)
      .map(item => `=== ${item.id}篇解析 ===\n${cleanResult(item.result)}`)
      .join('\n\n')

    if (allResults) {
      try {
        await navigator.clipboard.writeText(allResults)
        toast.success('全部解析结果已复制到剪贴板')
      } catch (err) {
        console.error('Failed to copy all:', err)
        toast.error('复制失败')
      }
    }
  }

  const exportAsText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportAllResults = () => {
    const allResults = [
      { id: 'A', result: resultA },
      { id: 'B', result: resultB },
      { id: 'C', result: resultC },
      { id: 'D', result: resultD }
    ]
      .filter(item => item.result)
      .map(item => `=== ${item.id}篇解析 ===\n${cleanResult(item.result)}`)
      .join('\n\n')

    if (allResults) {
      exportAsText(allResults, `阅读理解解析_${new Date().toISOString().split('T')[0]}`)
      toast.success('全部解析结果已导出')
    }
  }

  const clearAll = () => {
    setTextA('')
    setTextB('')
    setTextC('')
    setTextD('')
    setResultA('')
    setResultB('')
    setResultC('')
    setResultD('')
    setPhotos({})
    setParallelImages({ A: [], B: [], C: [], D: [] })
    setError('')
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 max-w-7xl px-2 sm:px-4">
      <div className="space-y-4 sm:space-y-6">
        {/* 返回首页按钮 */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>
          <div className="flex-1" />
        </div>

        {/* 头部信息 */}
        <div className="text-center space-y-2 px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">阅读理解解析</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base px-4">
            输入或拍照上传阅读文章，AI将深度分析文章结构、核心词汇、语法知识点和教学要点，支持A、B、C、D四篇并行解析
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm text-gray-500 px-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              每篇消耗 8 点
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              支持4篇并行
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              独立拍照识图
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Upload className="w-3 h-3" />
              批量上传识别
            </Badge>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 px-4">
          {/* 左侧：输入区域 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">文章内容</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={isAnalyzing}
                className="text-xs sm:text-sm"
              >
                清空全部
              </Button>
            </div>

            
            {/* 四个输入框 */}
            <div className="grid grid-cols-1 gap-4">
              {['A', 'B', 'C', 'D'].map((label) => {
                const text = label === 'A' ? textA : label === 'B' ? textB : label === 'C' ? textC : textD
                const setText = label === 'A' ? setTextA : label === 'B' ? setTextB : label === 'C' ? setTextC : setTextD

                return (
                  <Card key={label} className="relative">
                    <CardHeader className="pb-2 sm:pb-3">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                          {label}
                        </span>
                        {label}篇
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={`输入${label}篇阅读文章内容...`}
                        className="min-h-[150px] sm:min-h-[200px] resize-y text-sm"
                        disabled={isAnalyzing}
                      />

                      {/* 批量上传图片区域 */}
                      {parallelImages[label] && parallelImages[label].length > 0 && (
                        <div className="space-y-2 p-3 bg-gray-50 rounded border">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">待识别图片 ({parallelImages[label].length}张)</p>
                            <Button
                              size="sm"
                              onClick={() => recognizeParallelImages(label)}
                              disabled={parallelProcessing || isAnalyzing}
                              className="flex items-center gap-1 h-7"
                            >
                              {parallelProcessing ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  识别中
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3 h-3" />
                                  批量识别
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {parallelImages[label].map((image) => (
                              <div key={image.id} className="flex items-start gap-2 p-2 bg-white rounded border">
                                <img
                                  src={image.url}
                                  alt={`${label}篇`}
                                  className="w-10 h-10 object-cover rounded flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-600 truncate">{image.file.name}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeParallelImage(label, image.id)}
                                  className="h-5 w-5 p-0 flex-shrink-0"
                                >
                                  <X className="w-2 h-2" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 操作按钮区域 */}
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[label]?.click()}
                          disabled={isAnalyzing}
                          className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">上传图片</span>
                          <span className="sm:hidden">上传</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => parallelFileInputRefs.current[label]?.click()}
                          disabled={isAnalyzing || parallelProcessing}
                          className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">批量上传</span>
                          <span className="sm:hidden">批量</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCameraOpenFor(label)
                            setTimeout(startCamera, 100)
                          }}
                          className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">拍照识图</span>
                          <span className="sm:hidden">拍照</span>
                        </Button>
                      </div>

                      {/* 隐藏的文件输入 */}
                      <input
                        type="file"
                        ref={(el) => fileInputRefs.current[label] = el}
                        onChange={(e) => handleFileUpload(e, label)}
                        accept="image/*"
                        className="hidden"
                      />
                      <input
                        type="file"
                        ref={(el) => parallelFileInputRefs.current[label] = el}
                        onChange={(e) => handleParallelFileUpload(e, label)}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* 分析按钮 */}
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!textA.trim() && !textB.trim() && !textC.trim() && !textD.trim())}
              className="w-full h-12 sm:h-14 text-sm sm:text-base"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  <span className="hidden sm:inline">正在解析...</span>
                  <span className="sm:hidden">解析中...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden sm:inline">并行解析四篇文章</span>
                  <span className="sm:hidden">开始解析</span>
                </>
              )}
            </Button>
          </div>

          {/* 右侧：结果区域 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">解析结果</h2>
              {(resultA || resultB || resultC || resultD) && (
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllResults}
                    className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">一键复制全部</span>
                    <span className="sm:hidden">复制全部</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAllResults}
                    className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">导出全部</span>
                    <span className="sm:hidden">导出全部</span>
                  </Button>
                </div>
              )}
            </div>

            {/* 分析中状态 */}
            {isAnalyzing && (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                  <p className="text-center mt-4 text-gray-600">
                    AI分析中，请耐心等待两分钟。
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 显示结果 */}
            {(resultA || resultB || resultC || resultD) && !isAnalyzing && (
              <div className="space-y-4">
                {[
                  { id: 'A', result: resultA },
                  { id: 'B', result: resultB },
                  { id: 'C', result: resultC },
                  { id: 'D', result: resultD }
                ].map(({ id, result }) =>
                  result ? (
                    <Card key={id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span className="bg-green-100 text-green-800 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                              {id}
                            </span>
                            {id}篇解析
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(cleanResult(result))}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportAsText(cleanResult(result), `阅读理解${id}篇解析`)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4">
                        <div className="h-[400px] sm:h-[600px] overflow-y-auto">
                          <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                            {cleanResult(result)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null
                )}
              </div>
            )}

            {/* 空状态 */}
            {(!resultA && !resultB && !resultC && !resultD) && !isAnalyzing && (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-[300px] sm:h-[400px] p-4">
                  <div className="text-center text-gray-500">
                    <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
                    <p className="text-sm sm:text-base">分析结果将在这里显示</p>
                    <p className="text-xs sm:text-sm mt-2">支持A、B、C、D四篇并行解析</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 摄像头模态框 */}
      {cameraOpenFor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{cameraOpenFor}篇拍照识图</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCameraOpenFor(null)
                  stopCamera()
                  clearPhoto(cameraOpenFor)
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4">
              {!photos[cameraOpenFor] ? (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button
                      onClick={() => capturePhoto(cameraOpenFor)}
                      disabled={capturing[cameraOpenFor]}
                      className="flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      拍照
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={photos[cameraOpenFor]}
                      alt="Captured"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={() => retakePhoto(cameraOpenFor)}
                      variant="outline"
                      disabled={capturing[cameraOpenFor]}
                    >
                      重新拍摄
                    </Button>
                    <Button
                      onClick={() => recognizeText(cameraOpenFor)}
                      disabled={capturing[cameraOpenFor]}
                      className="flex items-center gap-2"
                    >
                      {capturing[cameraOpenFor] ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          识别中...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          识别文字
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}