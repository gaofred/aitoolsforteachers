import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const generalKey = process.env.CLOUDMIST_API_KEY;
    const googleKey = process.env.CLOUDMIST_GOOGLE_API_KEY;
    const volcengineKey = process.env.VOLCENGINE_API_KEY;

    return NextResponse.json({
      success: true,
      hasGeneralKey: !!generalKey,
      hasGoogleKey: !!googleKey,
      hasVolcengineKey: !!volcengineKey,
      generalKeyPreview: generalKey ? `${generalKey.substring(0, 10)}...` : 'Not set',
      googleKeyPreview: googleKey ? `${googleKey.substring(0, 10)}...` : 'Not set',
      volcengineKeyPreview: volcengineKey ? `${volcengineKey.substring(0, 10)}...` : 'Not set',
      message: 'API配置检查完成'
    });
  } catch (error) {
    console.error('检查API配置失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '检查配置失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { model, message } = await request.json();
    
    // 根据模型类型选择API Key
    let apiKey;
    if (model?.includes('google') || model?.includes('gemini')) {
      apiKey = process.env.CLOUDMIST_GOOGLE_API_KEY;
    } else if (model?.includes('doubao') || model?.includes('volcengine') || model?.includes('volc')) {
      apiKey = process.env.VOLCENGINE_API_KEY;
    } else {
      apiKey = process.env.CLOUDMIST_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API Key not configured',
        message: '云雾API Key未配置'
      }, { status: 500 });
    }

    // 测试API调用
    const response = await fetch('https://api.cloudmist.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: message || 'Hello, this is a test message from the English Teaching Platform!' }
        ],
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('云雾API调用失败:', errorData);
      return NextResponse.json({
        success: false,
        error: 'API call failed',
        message: `云雾API调用失败: ${response.status} ${response.statusText}`,
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    
      // 确定使用的API Key类型
      let usedApiKeyType = 'general';
      if (apiKey === process.env.CLOUDMIST_GOOGLE_API_KEY) {
        usedApiKeyType = 'google';
      } else if (apiKey === process.env.VOLCENGINE_API_KEY) {
        usedApiKeyType = 'volcengine';
      }

      return NextResponse.json({
        success: true,
        message: 'API调用成功',
        response: data,
        usedApiKey: usedApiKeyType
      });

  } catch (error) {
    console.error('云雾API测试失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'API test failed',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
