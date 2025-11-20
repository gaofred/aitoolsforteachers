import { NextResponse } from 'next/server';

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

// SSVIP DMX API配置（备用方案）
const SSVIP_DMX_API_URL = "https://ssvip.dmxapi.com/v1/chat/completions";
const SSVIP_DMX_API_KEY = process.env.ssvip_dmx;

// DMXAPI DeepSeek OCR配置
const DMXAPI_DEEPSEEK_URL = "https://www.dmxapi.cn/v1/chat/completions";
const DMXAPI_DEEPSEEK_KEY = process.env.DMXAPI_KEY;

export async function POST(request: Request) {
  try {
    // OCR识图是免费功能，无需认证检查
    console.log('图片识别API - 免费功能，跳过认证检查');

    // 获取请求数据
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({
        success: false,
        error: "未提供图片数据"
      }, { status: 400 });
    }

    // 确保图片数据是完整的data URL格式
    let imageDataUrl = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      // 如果不是data URL格式，添加JPEG的data URL前缀
      imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    console.log('图片识别 - 数据格式检查:', {
      原始格式: imageBase64.substring(0, 50) + '...',
      最终格式: imageDataUrl.substring(0, 50) + '...',
      是否DataURL: imageDataUrl.startsWith('data:'),
      数据长度: imageDataUrl.length
    });

    const pointsCost = 0; // 识图功能免费

    // 免费功能，无需检查点数

    // 尝试火山引擎API进行识图
    let rawText = '';
    let usedProvider = '';

    try {
      console.log('🌋 尝试使用火山引擎API进行OCR识别...');
      rawText = await recognizeWithVolcengine(imageDataUrl);
      usedProvider = '火山引擎';
      console.log('✅ 火山引擎OCR识别成功，原文长度:', rawText.length);
    } catch (volcengineError) {
      console.error('❌ 火山引擎OCR识别失败:', volcengineError);

      // 火山引擎失败，尝试SSVIP DMX备用方案
      try {
        console.log('🤖 火山引擎失败，尝试使用SSVIP DMX doubao模型作为备用...');
        rawText = await recognizeWithSsvipDmx(imageDataUrl);
        usedProvider = 'SSVIP DMX doubao-seed-1-6-flash-250615';
        console.log('✅ SSVIP DMX OCR识别成功，原文长度:', rawText.length);
      } catch (ssvipDmxError) {
        console.error('❌ SSVIP DMX OCR识别也失败:', ssvipDmxError);

        // SSVIP DMX也失败，尝试DMXAPI DeepSeek OCR作为第三方案
        try {
          console.log('🧠 前两个服务都失败，尝试使用DMXAPI DeepSeek OCR作为第三方案...');
          rawText = await recognizeWithDeepSeek(imageDataUrl);
          usedProvider = 'DMXAPI-DeepSeek';
          console.log('✅ DMXAPI DeepSeek OCR识别成功，原文长度:', rawText.length);
        } catch (deepseekError) {
          console.error('❌ DMXAPI DeepSeek OCR识别也失败:', deepseekError);
          return NextResponse.json({
            success: false,
            error: "OCR识别失败：所有OCR服务均不可用（火山引擎、SSVIP DMX、DeepSeek）"
          }, { status: 500 });
        }
      }
    }

    // 简化：只返回OCR识别的原文，不做任何智能处理
    return NextResponse.json({
      success: true,
      result: rawText,
      pointsCost: pointsCost,
      message: `OCR识图功能免费使用 (服务提供商: ${usedProvider})`,
      provider: usedProvider
    });
  } catch (error) {
    console.error("识图处理错误:", error);
    return NextResponse.json({
      success: false,
      error: "识图处理失败"
    }, { status: 500 });
  }
}

// 火山引擎OCR识别函数
async function recognizeWithVolcengine(imageDataUrl: string): Promise<string> {
  if (!VOLCENGINE_API_KEY) {
    throw new Error('火山引擎API Key未配置');
  }

  const ocrResponse = await fetch(VOLCENGINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VOLCENGINE_API_KEY}`
    },
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
      max_tokens: 1000
    })
  });

  const ocrData = await ocrResponse.json();

  if (!ocrResponse.ok) {
    console.error("火山引擎API错误:", ocrData);
    throw new Error(`火山引擎API调用失败: ${ocrData.error?.message || "未知错误"}`);
  }

  return ocrData.choices[0].message.content;
}

// SSVIP DMX OCR识别函数（备用方案）
async function recognizeWithSsvipDmx(imageDataUrl: string): Promise<string> {
  if (!SSVIP_DMX_API_KEY) {
    throw new Error('SSVIP DMX API Key未配置');
  }

  const ocrResponse = await fetch(SSVIP_DMX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SSVIP_DMX_API_KEY}`
    },
    body: JSON.stringify({
      model: "doubao-seed-1-6-flash-250615",
      messages: [
        {
          role: "system",
          content: "你是一个专业的OCR文字识别专家。请准确识别图片中的所有文字内容，保持原文格式不变。"
        },
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
      max_tokens: 1000,
      stream: false
    })
  });

  const ocrData = await ocrResponse.json();

  if (!ocrResponse.ok) {
    console.error("SSVIP DMX API错误:", ocrData);
    throw new Error(`SSVIP DMX API调用失败: ${ocrData.error?.message || "未知错误"}`);
  }

  // SSVIP DMX API使用OpenAI兼容格式
  if (!ocrData.choices || !ocrData.choices[0]) {
    throw new Error('SSVIP DMX API返回格式异常');
  }

  return ocrData.choices[0].message?.content || '';
}

// DMXAPI DeepSeek OCR识别函数（第三方案）
async function recognizeWithDeepSeek(imageDataUrl: string): Promise<string> {
  if (!DMXAPI_DEEPSEEK_KEY) {
    throw new Error('DMXAPI DeepSeek OCR Key未配置');
  }

  const ocrResponse = await fetch(DMXAPI_DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DMXAPI_DEEPSEEK_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-ocr-chat",
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
      max_tokens: 1000
    })
  });

  const ocrData = await ocrResponse.json();

  if (!ocrResponse.ok) {
    console.error("DMXAPI DeepSeek OCR API错误:", ocrData);
    throw new Error(`DMXAPI DeepSeek OCR API调用失败: ${ocrData.error?.message || "未知错误"}`);
  }

  // DeepSeek OCR API使用OpenAI兼容格式
  if (!ocrData.choices || !ocrData.choices[0]) {
    throw new Error('DMXAPI DeepSeek OCR API返回格式异常');
  }

  let result = ocrData.choices[0].message?.content || '';

  // 处理可能的Unicode转义字符
  if (result && typeof result === 'string') {
    try {
      // 尝试解析JSON格式的内容
      const parsed = JSON.parse(result);
      result = JSON.stringify(parsed, null, 2);
    } catch {
      // 如果不是JSON格式，尝试解码unicode转义字符
      try {
        result = decodeURIComponent(result);
      } catch {
        // 如果解码失败，保持原样
      }
    }
  }

  return result;
}