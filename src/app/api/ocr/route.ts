import { NextResponse } from 'next/server';

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

// 极客智坊API配置（备用方案）
const GEEKAI_API_URL = "https://geekai.co/api/v1/chat/completions";
const GEEKAI_API_KEY = process.env.GEEKAI_API_KEY;

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

      // 火山引擎失败，尝试极客智坊备用方案
      try {
        console.log('🤖 火山引擎失败，尝试使用极客智坊Gemini模型作为备用...');
        rawText = await recognizeWithGeekai(imageDataUrl);
        usedProvider = '极客智坊 Gemini-2.5-flash-lite';
        console.log('✅ 极客智坊OCR识别成功，原文长度:', rawText.length);
      } catch (geekaiError) {
        console.error('❌ 极客智坊OCR识别也失败:', geekaiError);
        return NextResponse.json({
          success: false,
          error: "OCR识别失败：主要服务和备用服务均不可用"
        }, { status: 500 });
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

// 极客智坊Gemini OCR识别函数（备用方案）
async function recognizeWithGeekai(imageDataUrl: string): Promise<string> {
  if (!GEEKAI_API_KEY) {
    throw new Error('极客智坊API Key未配置');
  }

  const ocrResponse = await fetch(GEEKAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GEEKAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash-lite",
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
    console.error("极客智坊API错误:", ocrData);
    throw new Error(`极客智坊API调用失败: ${ocrResponse.error?.message || "未知错误"}`);
  }

  // 极客智坊API使用OpenAI兼容格式
  if (!ocrData.choices || !ocrData.choices[0]) {
    throw new Error('极客智坊API返回格式异常');
  }

  return ocrData.choices[0].message?.content || '';
}