import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const audioUrl = searchParams.get('url');

  if (!audioUrl) {
    return NextResponse.json(
      { error: '缺少音频URL参数' },
      { status: 400 }
    );
  }

  try {
    console.log('🎵 音频代理请求:', audioUrl.substring(0, 100) + '...');

    // 从MiniMax URL获取音频文件
    const audioResponse = await fetch(audioUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!audioResponse.ok) {
      console.error('音频获取失败:', {
        status: audioResponse.status,
        statusText: audioResponse.statusText,
        url: audioUrl.substring(0, 100) + '...'
      });
      return NextResponse.json(
        { error: `音频获取失败: ${audioResponse.status} ${audioResponse.statusText}` },
        { status: audioResponse.status }
      );
    }

    // 获取音频数据的Buffer
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioData = Buffer.from(audioBuffer);

    // 设置合适的Content-Type
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';

    // 返回音频数据，设置缓存头
    const response = new NextResponse(audioData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
        'Access-Control-Allow-Origin': '*', // 允许跨域访问
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

    console.log('🎵 音频代理成功，文件大小:', audioData.length, 'bytes');
    return response;

  } catch (error) {
    console.error('音频代理错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 支持OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}