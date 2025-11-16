import { NextResponse } from "next/server";

const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

export async function POST() {
  console.log('🔥 OCR连接测试API被调用');

  // 1. 检查API密钥
  if (!VOLCENGINE_API_KEY) {
    console.error('❌ 火山引擎API密钥未配置');
    return NextResponse.json({
      success: false,
      error: "火山引擎API密钥未配置",
      details: {
        envVarExists: !!process.env.VOLCENGINE_API_KEY,
        varName: 'VOLCENGINE_API_KEY'
      }
    }, { status: 500 });
  }

  console.log('✅ API密钥检查通过，长度:', VOLCENGINE_API_KEY.length);

  // 2. 创建测试图片（1x1像素的PNG）
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const imageDataUrl = `data:image/png;base64,${testImageBase64}`;

  // 3. 测试连接火山引擎API
  const startTime = Date.now();
  console.log('🌐 开始测试火山引擎API连接...');

  try {
    const response = await fetch(VOLCENGINE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOLCENGINE_API_KEY}`
      },
      signal: AbortSignal.timeout(30000), // 30秒超时
      body: JSON.stringify({
        model: "doubao-seed-1-6-flash-250828",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "识别图中文字，原文输出。不要做任何改动。如果图片中没有文字，请回复'无文字内容'"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 100 // 测试用，减少token消耗
      })
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📊 API响应完成，耗时: ${duration}ms`);
    console.log(`📋 响应状态: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ OCR连接测试成功');
      console.log('📝 响应内容:', JSON.stringify(data, null, 2));

      return NextResponse.json({
        success: true,
        message: "OCR连接测试成功",
        data: {
          responseTime: duration,
          responseStatus: response.status,
          model: "doubao-seed-1-6-flash-250828",
          result: data
        },
        timestamp: new Date().toISOString()
      });
    } else {
      const errorData = await response.text();
      console.error('❌ API请求失败:', errorData);

      return NextResponse.json({
        success: false,
        error: "火山引擎API请求失败",
        details: {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData.substring(0, 500) // 限制错误信息长度
        },
        responseTime: duration,
        timestamp: new Date().toISOString()
      }, { status: response.status });
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error('💥 OCR连接测试失败:', error);

    let errorType = 'unknown';
    if (error.name === 'AbortError') {
      errorType = 'timeout';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorType = 'network';
    } else if (error.name === 'TypeError') {
      errorType = 'fetch_error';
    }

    return NextResponse.json({
      success: false,
      error: "OCR连接测试失败",
      details: {
        errorType,
        errorMessage: error.message,
        responseTime: duration
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}