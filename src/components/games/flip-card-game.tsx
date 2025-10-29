'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, RotateCcw, Trophy } from 'lucide-react'

interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

interface FlipCardGameProps {
  questions: Question[]
  title?: string
  onGameComplete?: (score: number, total: number) => void
}

export default function FlipCardGame({
  questions,
  title = "翻卡片游戏",
  onGameComplete
}: FlipCardGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [score, setScore] = useState(0)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
  const [showResult, setShowResult] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const isAnswered = answeredQuestions.has(currentQuestionIndex)
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const handleAnswerClick = (answerIndex: number) => {
    if (isAnswered) return

    setSelectedAnswer(answerIndex)
    setIsFlipped(true)
    setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex))

    // 检查答案
    if (answerIndex === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1)
    }

    // 2秒后自动进入下一题
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        nextQuestion()
      } else {
        setShowResult(true)
        onGameComplete?.(score + (answerIndex === currentQuestion.correctAnswer ? 1 : 0), questions.length)
      }
    }, 2000)
  }

  const nextQuestion = () => {
    setCurrentQuestionIndex(prev => prev + 1)
    setSelectedAnswer(null)
    setIsFlipped(false)
  }

  const resetGame = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setIsFlipped(false)
    setScore(0)
    setAnsweredQuestions(new Set())
    setShowResult(false)
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 游戏标题和进度 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{title}</h1>
        <div className="flex items-center justify-center gap-4 mb-4">
          <Badge variant="outline" className="text-sm">
            题目 {currentQuestionIndex + 1} / {questions.length}
          </Badge>
          <Badge variant="outline" className="text-sm">
            得分: {score}
          </Badge>
        </div>
        {/* 进度条 */}
        <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
          <motion.div
            className="bg-blue-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* 游戏结果 */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center py-8 sm:py-12 px-2"
          >
            <Trophy className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">游戏完成！</h2>
            <p className="text-base sm:text-lg mb-4 sm:mb-6">
              你答对了 {score} / {questions.length} 道题
            </p>
            <Button onClick={resetGame} className="px-4 sm:px-6 py-2 sm:py-3">
              <RotateCcw className="w-4 h-4 mr-2" />
              重新开始
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 问题卡片 */}
      <AnimatePresence mode="wait">
        {!showResult && currentQuestion && (
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="perspective-1000"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* 问题卡片 */}
              <Card className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <CardContent className="p-8 text-center">
                  <h3 className="text-xl font-semibold mb-4">问题</h3>
                  <p className="text-lg">{currentQuestion.question}</p>
                </CardContent>
              </Card>

              {/* 3D翻转卡片 */}
              <div className="relative h-64">
                <motion.div
                  className="absolute inset-0 w-full h-full"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* 卡片正面 - 选项 */}
                  <Card
                    className={`absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer ${
                      isAnswered ? 'pointer-events-none' : 'hover:shadow-lg transition-shadow'
                    }`}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <CardContent className="p-6 w-full">
                      <h3 className="text-lg font-semibold mb-4 text-center">选择答案</h3>
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => (
                          <motion.div
                            key={index}
                            whileHover={isAnswered ? {} : { scale: 1.02 }}
                            whileTap={isAnswered ? {} : { scale: 0.98 }}
                          >
                            <Button
                              variant="outline"
                              className={`w-full text-left justify-start h-auto p-4 ${
                                isAnswered && index === currentQuestion.correctAnswer
                                  ? 'bg-green-100 border-green-500 text-green-800'
                                  : isAnswered && index === selectedAnswer
                                  ? 'bg-red-100 border-red-500 text-red-800'
                                  : ''
                              }`}
                              onClick={() => handleAnswerClick(index)}
                              disabled={isAnswered}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 卡片背面 - 答案和反馈 */}
                  <Card
                    className={`absolute inset-0 w-full h-full flex items-center justify-center ${
                      isCorrect ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'
                    } text-white`}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)"
                    }}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="mb-4">
                        {isCorrect ? (
                          <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                        ) : (
                          <XCircle className="w-12 h-12 mx-auto mb-2" />
                        )}
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        {isCorrect ? '回答正确！' : '回答错误'}
                      </h3>
                      <p className="text-lg mb-2">
                        正确答案: {currentQuestion.options[currentQuestion.correctAnswer]}
                      </p>
                      {currentQuestion.explanation && (
                        <p className="text-sm opacity-90">
                          {currentQuestion.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* 手动下一题按钮（仅在答题后显示） */}
            {isAnswered && currentQuestionIndex < questions.length - 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <Button onClick={nextQuestion} variant="outline">
                  下一题 →
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 添加必要的样式 */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  )
}