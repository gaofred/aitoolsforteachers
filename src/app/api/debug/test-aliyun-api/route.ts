import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 开始测试阿里云API连接');

    // 获取API密钥
    const ALIYUN_API_KEY = process.env.ALiYunSingapore_APIKEY ||
                            process.env.DASHSCOPE_API_KEY ||
                            process.env.AliYun_APIKEY;

    const ALIYUN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

    if (!ALIYUN_API_KEY) {
      return NextResponse.json({
        success: false,
        error: '未找到阿里云API密钥'
      }, { status: 500 });
    }

    console.log('📝 API测试参数:', {
      url: ALIYUN_API_URL,
      keyLength: ALIYUN_API_KEY.length,
      keyPrefix: ALIYUN_API_KEY.substring(0, 10),
      usedEnvVar: process.env.ALiYunSingapore_APIKEY ? 'ALiYunSingapore_APIKEY' :
                   process.env.DASHSCOPE_API_KEY ? 'DASHSCOPE_API_KEY' : 'AliYun_APIKEY'
    });

    // 构造测试请求
    const testPayload = {
      model: "qwen3-max",
      messages: [
        {
          role: "user",
          content: "Hello, this is a simple test message."
        }
      ],
      temperature: 0.1,
      max_tokens: 50,
      stream: false
    };

    console.log('📤 发送测试API请求...');

    const startTime = Date.now();
    const response = await fetch(ALIYUN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ALIYUN_API_KEY}`
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(30000) // 30秒超时
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('📥 API响应状态:', {
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      headers: Object.fromEntries(response.headers.entries())
    });

    let responseData;
    try {
      const responseText = await response.text();
      console.log('📄 API响应内容:', responseText.substring(0, 500));
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ API响应解析失败:', parseError);
      const responseText = await response.text();
      return NextResponse.json({
        success: false,
        error: 'API响应解析失败',
        details: {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText.substring(0, 1000),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }
      }, { status: 500 });
    }

    if (!response.ok) {
      console.error('❌ API请求失败:', responseData);
      return NextResponse.json({
        success: false,
        error: `API请求失败 (${response.status}): ${response.statusText}`,
        details: {
          responseData,
          requestPayload: testPayload
        }
      }, { status: 500 });
    }

    const result = responseData.choices?.[0]?.message?.content;

    if (!result) {
      console.error('❌ API返回空结果:', responseData);
      return NextResponse.json({
        success: false,
        error: 'API返回空结果',
        details: { responseData }
      }, { status: 500 });
    }

    console.log('✅ API测试成功:', {
      resultLength: result.length,
      result: result.substring(0, 100)
    });

    return NextResponse.json({
      success: true,
      message: '阿里云API连接测试成功',
      details: {
        responseTime: `${responseTime}ms`,
        apiStatus: response.status,
        model: 'qwen3-max',
        result: result,
        usedEnvVar: process.env.ALiYunSingapore_APIKEY ? 'ALiYunSingapore_APIKEY' :
                   process.env.DASHSCOPE_API_KEY ? 'DASHSCOPE_API_KEY' : 'AliYun_APIKEY',
        keyInfo: {
          length: ALIYUN_API_KEY.length,
          prefix: ALIYUN_API_KEY.substring(0, 10)
        }
      }
    });

  } catch (error) {
    console.error('❌ API测试过程中发生错误:', error);

    let errorDetails = {};
    if (error instanceof Error) {
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return NextResponse.json({
      success: false,
      error: 'API测试失败',
      details: errorDetails
    }, { status: 500 });
  }
}