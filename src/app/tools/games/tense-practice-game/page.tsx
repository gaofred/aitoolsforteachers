'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, Volume2, RotateCcw, Trophy, Play, Pause, Maximize2, Minimize2, Download, FileText, Home } from 'lucide-react'
import FlipCardGame from '@/components/games/flip-card-game'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

interface TenseSet {
  id: string
  name: string
  description: string
  questions: Question[]
}

const tenseSets: TenseSet[] = [
  {
    id: 'present-perfect-past-simple',
    name: 'Present Perfect vs Past Simple',
    description: 'Practice the difference between present perfect and past simple tense',
    questions: [
      {
        id: 1,
        question: 'I ___ to London last year.',
        options: ['have been', 'went', 'have gone', 'go'],
        correctAnswer: 1,
        explanation: 'last year is a specific past time, so we use past simple.'
      },
      {
        id: 2,
        question: 'She ___ three books this month.',
        options: ['read', 'has read', 'reads', 'reading'],
        correctAnswer: 1,
        explanation: 'this month is an unfinished time period, so we use present perfect.'
      },
      {
        id: 3,
        question: 'They ___ breakfast when I arrived.',
        options: ['had', 'have had', 'were having', 'are having'],
        correctAnswer: 2,
        explanation: 'when I arrived indicates an action in progress at a specific past time.'
      },
      {
        id: 4,
        question: 'I ___ my keys. I can\'t find them anywhere.',
        options: ['lost', 'have lost', 'lose', 'am losing'],
        correctAnswer: 1,
        explanation: 'The current result (can\'t find keys) indicates a past action with present relevance.'
      },
      {
        id: 5,
        question: 'We ___ in this house since 2010.',
        options: ['live', 'lived', 'have lived', 'living'],
        correctAnswer: 2,
        explanation: 'since 2010 indicates an action starting in the past and continuing to the present.'
      },
      {
        id: 6,
        question: 'He ___ football yesterday afternoon.',
        options: ['played', 'has played', 'plays', 'playing'],
        correctAnswer: 0,
        explanation: 'yesterday afternoon is a specific completed past time.'
      },
      {
        id: 7,
        question: 'I ___ my homework yet.',
        options: ['didn\'t finish', 'haven\'t finished', 'don\'t finish', 'am not finishing'],
        correctAnswer: 1,
        explanation: 'yet is typically used with present perfect tense.'
      },
      {
        id: 8,
        question: 'She ___ her umbrella last week.',
        options: ['lost', 'has lost', 'loses', 'is losing'],
        correctAnswer: 0,
        explanation: 'last week is a specific completed past time.'
      },
      {
        id: 9,
        question: 'They ___ this movie before.',
        options: ['saw', 'have seen', 'see', 'seeing'],
        correctAnswer: 1,
        explanation: 'before indicates past experience relevant to the present.'
      },
      {
        id: 10,
        question: 'I ___ him yesterday.',
        options: ['met', 'have met', 'meet', 'meeting'],
        correctAnswer: 0,
        explanation: 'yesterday is a specific completed past time.'
      },
      {
        id: 11,
        question: 'She ___ here for five years.',
        options: ['works', 'worked', 'has worked', 'working'],
        correctAnswer: 2,
        explanation: 'for five years indicates duration from past to present.'
      },
      {
        id: 12,
        question: 'We ___ to the cinema last night.',
        options: ['go', 'went', 'have gone', 'going'],
        correctAnswer: 1,
        explanation: 'last night is a specific completed past time.'
      },
      {
        id: 13,
        question: 'I ___ this book twice.',
        options: ['read', 'have read', 'reads', 'reading'],
        correctAnswer: 1,
        explanation: 'twice indicates life experience relevant to the present.'
      },
      {
        id: 14,
        question: 'He ___ his job last month.',
        options: ['leaves', 'left', 'has left', 'leaving'],
        correctAnswer: 1,
        explanation: 'last month is a specific completed past time.'
      },
      {
        id: 15,
        question: 'They ___ married for twenty years.',
        options: ['are', 'were', 'have been', 'being'],
        correctAnswer: 2,
        explanation: 'for twenty years indicates duration from past to present.'
      }
    ]
  }
]

export default function TensePracticeGamePage() {
  const router = useRouter()
  const [selectedSet, setSelectedSet] = useState<string>(tenseSets[0].id)
  const [currentSet, setCurrentSet] = useState<TenseSet>(tenseSets[0])
  const [showIntro, setShowIntro] = useState(true)
  const [showGame, setShowGame] = useState(false)
  const [gameScore, setGameScore] = useState<{ score: number; total: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExportingPPT, setIsExportingPPT] = useState(false)

  useEffect(() => {
    const set = tenseSets.find(s => s.id === selectedSet)
    if (set) {
      setCurrentSet(set)
      setShowGame(false)
      setGameScore(null)
    }
  }, [selectedSet])

  const handleGameComplete = (score: number, total: number) => {
    setGameScore({ score, total })
    const percentage = Math.round((score / total) * 100)
    if (percentage >= 80) {
      toast.success(`Excellent! You got ${score}/${total} correct! 🎉`)
    } else if (percentage >= 60) {
      toast(`Good job! You got ${score}/${total} correct! Keep practicing! 💪`)
    } else {
      toast(`You got ${score}/${total} correct. More practice will help! 📚`)
    }
  }

  const startGame = () => {
    setShowIntro(false)
    setShowGame(true)
    setGameScore(null)
  }

  const resetToIntro = () => {
    setShowIntro(true)
    setShowGame(false)
    setGameScore(null)
  }

  const goHome = () => {
    router.push('/')
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      speechSynthesis.speak(utterance)
    }
  }

  const handleExportPPT = async () => {
    if (isExportingPPT) return

    setIsExportingPPT(true)
    try {
      const response = await fetch('/api/export/ppt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenseSet: currentSet
        }),
      })

      if (!response.ok) {
        throw new Error('HTML动画生成失败')
      }

      // 下载HTML文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentSet.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_动画练习材料.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`✅ ${currentSet.name} 动画版已生成并开始下载！`)
    } catch (error) {
      console.error('HTML动画导出失败:', error)
      toast.error('❌ 动画版生成失败，请重试')
    } finally {
      setIsExportingPPT(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header Controls */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goHome}
              className="text-white hover:bg-white/20"
            >
              <Home className="w-4 h-4 mr-2" />
              首页
            </Button>
            {showGame && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToIntro}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回选择
              </Button>
            )}
            <h1 className="text-xl font-bold text-white">English Grammar Practice</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => speakText(currentSet.name)}
              className="text-white hover:bg-white/20"
            >
              <Volume2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPPT}
              disabled={isExportingPPT}
              className="text-white hover:bg-white/20 disabled:opacity-50"
              title="导出为动画版HTML页面"
            >
              {isExportingPPT ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Introduction Screen */}
          <AnimatePresence>
            {showIntro && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="min-h-[80vh] flex items-center justify-center"
              >
                <Card className="w-full max-w-4xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
                  <CardContent className="p-12 text-center">
                    <div className="mb-8">
                      <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h1 className="text-4xl font-bold text-gray-800 mb-4">
                          English Grammar Challenge
                        </h1>
                        <p className="text-xl text-gray-600 mb-8">
                          Master verb tenses with interactive practice
                        </p>
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-6"
                    >
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                          Choose Your Challenge
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                          {tenseSets.map(set => (
                            <Card
                              key={set.id}
                              className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                                selectedSet === set.id
                                  ? 'ring-4 ring-blue-500 bg-blue-50'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedSet(set.id)}
                            >
                              <CardContent className="p-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                  {set.name}
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  {set.description}
                                </p>
                                <div className="flex justify-between items-center">
                                  <Badge variant="outline">
                                    {set.questions.length} questions
                                  </Badge>
                                  {selectedSet === set.id && (
                                    <div className="flex gap-2">
                                      <Badge className="bg-purple-500">
                                        <FileText className="w-3 h-3 mr-1" />
                                        支持动画版导出
                                      </Badge>
                                      <Badge className="bg-blue-500">
                                        Selected
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="pt-8 space-y-4">
                        <div className="flex justify-center gap-4">
                          <Button
                            onClick={startGame}
                            size="lg"
                            className="px-12 py-4 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                          >
                            <Play className="w-5 h-5 mr-2" />
                            Start Practice
                          </Button>
                          <Button
                            onClick={handleExportPPT}
                            disabled={isExportingPPT}
                            size="lg"
                            className="px-8 py-4 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                          >
                            {isExportingPPT ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            ) : (
                              <Download className="w-5 h-5 mr-2" />
                            )}
                            {isExportingPPT ? '生成中...' : '导出动画版'}
                          </Button>
                        </div>
                        <div className="text-center space-y-2">
                          <p className="text-sm text-gray-500">
                            ✨ 导出动画版HTML页面，包含完整动画效果
                          </p>
                          <p className="text-xs text-gray-400">
                            💡 可在浏览器中查看，支持打印和另存为PDF
                          </p>
                        </div>
                      </div>

                      {gameScore && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 p-6 bg-green-50 rounded-lg border border-green-200"
                        >
                          <p className="text-lg font-semibold text-green-800">
                            Last Score: {gameScore.score} / {gameScore.total}
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            {Math.round((gameScore.score / gameScore.total) * 100)}% accuracy
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Screen */}
          <AnimatePresence>
            {showGame && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="min-h-[80vh]"
              >
                {/* Game Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {currentSet.name}
                  </h2>
                  <p className="text-white/80">
                    {currentSet.description}
                  </p>
                </div>

                {/* Game Component */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
                  <FlipCardGame
                    questions={currentSet.questions}
                    title={currentSet.name}
                    onGameComplete={handleGameComplete}
                  />
                </div>

                {/* Navigation Controls */}
                <div className="flex justify-center mt-8 gap-4">
                  <Button
                    variant="outline"
                    onClick={resetToIntro}
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Choose Different Set
                  </Button>
                  {gameScore && (
                    <Button
                      onClick={startGame}
                      className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}