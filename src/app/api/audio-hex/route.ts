import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { audioHex } = await request.json();

    if (!audioHex) {
      return NextResponse.json(
        { error: '缺少音频hex数据' },
        { status: 400 }
      );
    }

    console.log('🎵 处理音频hex数据，长度:', audioHex.length);

    try {
      // 将hex字符串转换为Buffer
      const audioBuffer = Buffer.from(audioHex, 'hex');

      console.log('🎵 音频数据转换成功，文件大小:', audioBuffer.length, 'bytes');

      // 返回音频数据，设置适当的MIME类型和缓存头
      const response = new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=3600', // 缓存1小时
          'Access-Control-Allow-Origin': '*', // 允许跨域访问
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });

      return response;

    } catch (hexError) {
      console.error('hex数据转换失败:', hexError);
      return NextResponse.json(
        { error: '音频数据格式错误' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('音频hex处理错误:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}