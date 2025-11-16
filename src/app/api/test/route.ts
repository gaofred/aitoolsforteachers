import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🧪 测试API被调用了！')
  console.log('🕒 时间:', new Date().toISOString())
  console.log('📛 请求URL:', request.url)

  try {
    const body = await request.text()
    console.log('📦 请求体:', body)

    return NextResponse.json({
      success: true,
      message: '测试API工作正常！',
      timestamp: new Date().toISOString(),
      receivedBody: body
    })
  } catch (error) {
    console.error('❌ 测试API错误:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}