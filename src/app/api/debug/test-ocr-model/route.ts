import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 测试OCR使用的qwen3-vl-flash模型');

    // 使用和ocr-aliyun相同的环境变量逻辑
    const DASHSCOPE_API_KEY = process.env.ALiYunSingapore_APIKEY ||
                            process.env.DASHSCOPE_API_KEY ||
                            process.env.AliYun_APIKEY;

    const DASHSCOPE_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: '未找到API密钥'
      }, { status: 500 });
    }

    // 测试qwen3-vl-flash模型 (OCR使用的模型)
    const testPayload = {
      model: 'qwen3-vl-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Hello, this is a test for qwen3-vl-flash model.'
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    };

    console.log('📤 测试qwen3-vl-flash模型...');

    const response = await fetch(DASHSCOPE_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(30000)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ qwen3-vl-flash测试失败:', responseData);
      return NextResponse.json({
        success: false,
        error: `qwen3-vl-flash测试失败 (${response.status}): ${response.statusText}`,
        details: responseData
      });
    }

    const result = responseData.choices?.[0]?.message?.content;

    console.log('✅ qwen3-vl-flash测试成功');

    return NextResponse.json({
      success: true,
      message: 'qwen3-vl-flash模型访问成功',
      model: 'qwen3-vl-flash',
      result: result,
      keyInfo: {
        usedKey: DASHSCOPE_API_KEY.substring(0, 10) + '...',
        length: DASHSCOPE_API_KEY.length,
        source: process.env.ALiYunSingapore_APIKEY ? 'ALiYunSingapore_APIKEY' :
               process.env.DASHSCOPE_API_KEY ? 'DASHSCOPE_API_KEY' : 'AliYun_APIKEY'
      }
    });

  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    return NextResponse.json({
      success: false,
      error: '测试过程出错',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}