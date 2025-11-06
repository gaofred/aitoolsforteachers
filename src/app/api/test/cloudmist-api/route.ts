import { NextRequest, NextResponse } from 'next/server';

// 云雾API配置
const CLOUDMIST_API_URL = 'https://yunwu.ai/v1/chat/completions';
const CLOUDMIST_API_KEY = process.env.CLOUDMIST_API_KEY;

export async function POST(request: NextRequest) {
  try {
    console.log('测试云雾API连接...');
    
    // 检查API Key配置
    if (!CLOUDMIST_API_KEY) {
      return NextResponse.json({
        success: false,
        error: '云雾API Key未配置',
        details: 'CLOUDMIST_API_KEY环境变量未设置'
      }, { status: 500 });
    }

    console.log('API Key已配置，长度:', CLOUDMIST_API_KEY.length);

    // 发送测试请求
    const testPrompt = '请简单回复"测试成功"';
    
    const response = await fetch(CLOUDMIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLOUDMIST_API_KEY}`
      },
      body: JSON.stringify({
        model: 'glm-4.6',
        messages: [
          {
            role: 'user',
            content: testPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      })
    });

    console.log('API响应状态:', response.status);
    console.log('API响应头:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API调用失败，响应内容:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `API调用失败: ${response.status}`,
        details: errorText,
        status: response.status
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('API响应数据:', JSON.stringify(data, null, 2));

    // 解析响应
    let content = '';
    if (data.choices && data.choices[0]) {
      content = data.choices[0].message?.content || '';
    }

    return NextResponse.json({
      success: true,
      message: '云雾API连接测试成功',
      response: {
        content: content,
        model: data.model || 'glm-4.6',
        usage: data.usage || null
      },
      rawResponse: data
    });

  } catch (error) {
    console.error('测试云雾API时发生错误:', error);
    return NextResponse.json({
      success: false,
      error: '测试失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '请使用POST方法测试云雾API',
    endpoint: '/api/test/cloudmist-api',
    method: 'POST'
  });
}








