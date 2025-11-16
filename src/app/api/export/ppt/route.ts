/**
 * HTML动画练习材料导出API路由
 * 处理时态练习游戏的HTML动画页面生成请求
 */

import { NextRequest, NextResponse } from 'next/server'

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

interface PPTRequest {
  tenseSet: TenseSet
}

export async function POST(request: NextRequest) {
  try {
    const body: PPTRequest = await request.json()
    const { tenseSet } = body

    if (!tenseSet) {
      return NextResponse.json(
        { error: '缺少时态练习数据' },
        { status: 400 }
      )
    }

    // 验证数据结构
    if (!tenseSet.questions || !Array.isArray(tenseSet.questions)) {
      return NextResponse.json(
        { error: '无效的题目数据' },
        { status: 400 }
      )
    }

    // 动态导入HTMLExportService
    const { default: HTMLExportService } = await import('@/lib/html-export-service')

    // 生成动画HTML页面
    const htmlExportService = new HTMLExportService()
    const htmlContent = htmlExportService.generateAnimatedHTML(tenseSet)

    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', 'text/html; charset=utf-8')

    // 处理中文文件名编码问题
    const safeFileName = tenseSet.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    const encodedFileName = encodeURIComponent(`${safeFileName}_动画练习材料.html`)
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`)
    headers.set('Cache-Control', 'no-cache')

    return new NextResponse(htmlContent, {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error('HTML生成失败:', error)
    return NextResponse.json(
      {
        error: 'HTML生成失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: '不支持的请求方法' },
    { status: 405 }
  )
}