import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 检查环境变量配置
    const googleKey = process.env.CLOUDMIST_GOOGLE_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    return NextResponse.json({
      hasGoogleKey: !!googleKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      googleKeyPreview: googleKey ? `${googleKey.substring(0, 10)}...` : 'Not set',
      supabaseUrlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Not set',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('测试API失败:', error);
    return NextResponse.json(
      { error: '测试API失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 测试云雾API调用
    const CLOUDMIST_GOOGLE_API_KEY = process.env.CLOUDMIST_GOOGLE_API_KEY;
    const CLOUDMIST_API_URL = 'https://yunwu.ai/v1/chat/completions';

    if (!CLOUDMIST_GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: '云雾谷歌专用API Key未配置' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { testMessage = "Hello, this is a test." } = body;

    console.log('🧪 测试云雾API调用...');

    const response = await fetch(CLOUDMIST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDMIST_GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: testMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    console.log('📡 测试响应状态码:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('云雾API测试失败:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });

      return NextResponse.json(
        {
          error: '云雾API调用失败',
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('✅ 云雾API测试成功！');

    const generatedContent = data.choices?.[0]?.message?.content;

    return NextResponse.json({
      success: true,
      generatedContent,
      model: data.model,
      usage: data.usage,
      fullResponse: data
    });

  } catch (error) {
    console.error('测试API POST失败:', error);
    return NextResponse.json(
      {
        error: '测试API POST失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}