"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'

export default function ReadingGeneratorPage() {
  const router = useRouter()
  const { currentUser, userPoints, refreshUser } = useUser()
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'a2' | 'b1' | 'b2' | 'c1'>('b1')
  const [category, setCategory] = useState<'general' | 'science' | 'business' | 'history' | 'literature'>('general')
  const [keywords, setKeywords] = useState('')
  const [articleType, setArticleType] = useState<'fiction' | 'non-fiction' | 'unspecified'>('unspecified')
  const [generationResult, setGenerationResult] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  // OCR states
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // start camera
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
      // Stop camera after taking photo
      stopCamera()
    }
  }

  const recognizeText = async (images: string[]) => {
    if (images.length===0) return
    setIsRecognizing(true)
    // Show recognition alert
    alert('识图中，请稍等...')
    try {
      const texts: string[] = []
      for (const img of images) {
        const res = await fetch('/api/ai/image-recognition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:img})})
        const d = await res.json()
        if (d.success && d.result) texts.push(d.result)
      }
      if(texts.length){
        setKeywords(prev=>prev+(prev? ', ':'')+texts.join(', '))
        alert('识别成功！')
      } else alert('识别失败')
    }catch(e){console.error(e);alert('识别错误')}
    setIsRecognizing(false)
    setIsCameraOpen(false)
    setPhoto(null)
    setUploadedImages([])
    stopCamera()
  }

  const handleImageUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const files=e.target.files
    if(!files) return
    const arr: string[]=[]
    Array.from(files).forEach(f=>{
      const reader=new FileReader();
      reader.onload=o=>{ if(typeof o.target?.result==='string'){arr.push(o.target.result as string); if(arr.length===files.length){recognizeText(arr)}} }
      reader.readAsDataURL(f)
    })
  }

  // 语音识别功能 - 使用浏览器原生API
  const recognitionRef = useRef<any>(null)

  const startRecording = () => {
    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能')
      return
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.lang = 'en-US' // 设置为英语
      recognition.continuous = false // 连续识别
      recognition.interimResults = false // 不返回中间结果
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        // 将单词用逗号分隔
        const words = transcript.split(/\s+/).join(', ')
        setKeywords(prev => prev + (prev ? ', ' : '') + words)
        alert('识别成功！')
      }
      
      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error)
        alert('识别失败，请重试')
      }
      
      recognition.onend = () => {
        setIsRecording(false)
      }
      
      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)
    } catch (e) {
      console.error('麦克风访问失败:', e)
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
  }

  const toolCost = 4
  const questionCost = 2
  const hasEnoughPoints = userPoints >= toolCost
  const hasEnoughPointsForQuestions = userPoints >= questionCost

  // 使用 useEffect 避免水合错误
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Auto start camera when overlay opens
  useEffect(() => {
    if (isCameraOpen && !photo) {
      startCamera()
    }
  }, [isCameraOpen])

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

  const handleGenerate = async () => {
    if (!topic.trim()) {
      alert('请输入要生成的文章主题')
      return
    }

    if (!hasEnoughPoints) {
      alert(`点数不足，需要 ${toolCost} 个点数`)
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/ai/reading-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          difficulty: difficulty,
          category: category,
          keywords: keywords,
          articleType: articleType,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGenerationResult(data.result)
        await refreshUser()
      } else {
        let errorMessage = data.error || '文本生成失败，请稍后重试'
        if (data.refunded && data.pointsRefunded) {
          errorMessage += `\n\n已退还 ${data.pointsRefunded} 点数到您的账户`
        }
        alert(errorMessage)
        await refreshUser()
      }
    } catch (error) {
      console.error('文本生成错误:', error)
      alert('文本生成失败，请稍后重试')
      await refreshUser()
    } finally {
      setIsGenerating(false)
    }
  }

  // 复制功能
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generationResult)
      alert('文本已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      alert('复制失败，请手动复制')
    }
  }

  // 导出功能
  const exportToText = () => {
    try {
      const element = document.createElement('a')
      const file = new Blob([generationResult], { type: 'text/plain;charset=utf-8' })
      element.href = URL.createObjectURL(file)
      element.download = 'reading_text_result.txt'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(element.href)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请手动复制')
    }
  }

  // 生成配套习题
  const handleGenerateQuestions = async () => {
    if (!generationResult || !generationResult.trim()) {
      alert('请先生成文章内容')
      return
    }

    if (!hasEnoughPointsForQuestions) {
      alert(`点数不足，需要 ${questionCost} 个点数`)
      return
    }

    setIsGeneratingQuestions(true)

    try {
      const response = await fetch('/api/ai/reading-generator/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleContent: generationResult,
          difficulty: difficulty,
          articleType: articleType,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setQuestions(data.questions)
        await refreshUser()
        alert(`习题生成完成！消耗 ${data.pointsCost} 个点数，剩余 ${data.remainingPoints} 个点数`)
      } else {
        alert(data.error || '习题生成失败，请稍后重试')
        await refreshUser()
      }
    } catch (error) {
      console.error('习题生成错误:', error)
      alert('习题生成失败，请稍后重试')
      await refreshUser()
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  const copyQuestions = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(questions, null, 2))
      alert('习题已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
      alert('复制失败，请手动复制')
    }
  }

  const exportQuestionsToText = () => {
    try {
      const element = document.createElement('a')
      const file = new Blob([JSON.stringify(questions, null, 2)], { type: 'text/plain;charset=utf-8' })
      element.href = URL.createObjectURL(file)
      element.download = 'reading_questions.json'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      URL.revokeObjectURL(element.href)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请手动复制')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => router.push('/')}
                className="text-base sm:text-xl md:text-2xl font-bold text-purple-600 hover:text-purple-700 transition-colors duration-200 truncate"
              >
                English Teaching Tools
              </button>
              <div className="ml-2 sm:ml-4 text-xs sm:text-sm text-gray-500 truncate hidden sm:block">
                / 阅读文本生成神器
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <span className="text-xs sm:text-sm text-gray-600">点数: {userPoints}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                  <span>阅读文本生成神器</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {/* 难度选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    难度等级：
                  </label>
                  <Select value={difficulty} onValueChange={(value: 'a2' | 'b1' | 'b2' | 'c1') => setDifficulty(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a2">简单 (A2)</SelectItem>
                      <SelectItem value="b1">中等 (B1)</SelectItem>
                      <SelectItem value="b2">偏难 (B2)</SelectItem>
                      <SelectItem value="c1">难 (C1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 话题分类 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    话题分类：
                  </label>
                  <Select value={category} onValueChange={(value: 'general' | 'science' | 'business' | 'history' | 'literature') => setCategory(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Knowledge</SelectItem>
                      <SelectItem value="science">Science & Technology</SelectItem>
                      <SelectItem value="business">Business & Economics</SelectItem>
                      <SelectItem value="history">History & Culture</SelectItem>
                      <SelectItem value="literature">Literature & Arts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 关键词 */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords & Key phrases（可选）：
                  </label>
                  <Textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="例如：sustainability, innovation, collaboration"
                    className="h-24 resize-none overflow-y-auto"
                  />
                  {/* small buttons */}
                  <div className="absolute top-0 right-0 flex gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>fileInputRef.current?.click()}>
                      📁
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCameraOpen(true)}>
                      📷
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? '⏹️' : '🎤'}
                    </Button>
                    <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  </div>
                </div>

                {/* 文章体裁 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文章体裁：
                  </label>
                  <Select value={articleType} onValueChange={(value: 'fiction' | 'non-fiction' | 'unspecified') => setArticleType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fiction">记叙文</SelectItem>
                      <SelectItem value="non-fiction">说明文/议论文</SelectItem>
                      <SelectItem value="unspecified">不限</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 主题输入 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    请输入要生成的文章主题：
                  </label>
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="请输入文章主题，例如：科技发展、环境保护..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-gray-600">
                    <div>消耗点数: <span className="font-semibold text-purple-600">{toolCost}</span></div>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={!hasEnoughPoints || isGenerating || !topic.trim()}
                    className="w-full sm:w-auto px-4 sm:px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-sm sm:text-base"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        AI生成中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        开始生成
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：结果区域 */}
          <div className="space-y-4 sm:space-y-6">
            {isGenerating && !generationResult && (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center">
                    <span className="text-purple-600">
                      AI文本生成中，请耐心等待...
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[400px]">
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
                        正在生成阅读文本...
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
                        <span>AI正在根据主题生成文本</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {generationResult && !isGenerating && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>生成结果</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        生成完成
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="flex items-center space-x-1 text-xs sm:text-sm"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2 2h4a2 2 0 012-2v-4a2 2 0 012-2H4z" />
                        </svg>
                        <span className="hidden sm:inline">一键复制</span>
                        <span className="sm:hidden">复制</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToText}
                        className="flex items-center space-x-1 text-xs sm:text-sm"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6M8 21l4-4m0 0l4 4m-4-4v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z" />
                        </svg>
                        <span className="hidden sm:inline">导出文本</span>
                        <span className="sm:hidden">导出</span>
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] sm:h-[400px] overflow-y-auto prose prose-gray prose-sm max-w-none" style={{ fontSize: '0.875rem' }}>
                    {generationResult.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4" style={{ fontSize: '0.875rem' }}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                  
                  {/* 生成配套习题按钮 */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      onClick={handleGenerateQuestions}
                      disabled={isGeneratingQuestions || !hasEnoughPointsForQuestions}
                      className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 text-sm sm:text-base"
                    >
                      {isGeneratingQuestions ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          生成中...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          生成配套习题 ({questionCost}点)
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 习题展示区域 */}
            {questions.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>配套习题</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        已生成
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyQuestions}
                        className="flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2 2h4a2 2 0 012-2v-4a2 2 0 012-2H4z" />
                        </svg>
                        一键复制
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportQuestionsToText}
                        className="flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6M8 21l4-4m0 0l4 4m-4-4v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z" />
                        </svg>
                        导出文本
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {questions.map((q, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="font-medium text-gray-800 mb-3">
                          {index + 1}. {q.question}
                        </div>
                        <div className="space-y-2 mb-3">
                          {q.options.map((opt: any) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded ${
                                opt.id === q.correctAnswer
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <span className="font-medium">{opt.id}.</span> {opt.text}
                              {opt.id === q.correctAnswer && (
                                <span className="ml-2 text-xs text-green-600 font-semibold">✓ 正确答案</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                            <span className="font-medium">解析：</span>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!generationResult && !isGenerating && (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full h-[400px]">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p>生成结果将在这里显示</p>
                    <p className="text-sm mt-2">请输入主题后开始生成文本</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {/* OCR overlay */}
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
              <Button variant="outline" size="sm" onClick={() => { setIsCameraOpen(false); stopCamera(); setPhoto(null); }}>关闭</Button>
            </div>
          </div>
        </div>
      )}
      {/* OCR recognizing overlay */}
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
    </div>
  )
}

