import { NextResponse } from 'next/server';

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

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

    // 调用火山引擎API进行识图 - 专注于图像识别
    const ocrResponse = await fetch(VOLCENGINE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOLCENGINE_API_KEY}`
      },
      body: JSON.stringify({
        model: "doubao-seed-1-6-vision-250815",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请识别图片中的所有文字内容，直接输出文字原文，不要添加任何解释或描述。请保持原文格式，包括换行和标点符号。如果图片中没有文字，请回复'无文字内容'。"
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
      return NextResponse.json({
        success: false,
        error: `识图失败: ${ocrData.error?.message || "未知错误"}`
      }, { status: 500 });
    }

    const rawText = ocrData.choices[0].message.content;
    console.log('OCR识别完成，原文长度:', rawText.length);

    // 简化：只返回OCR识别的原文，不做任何智能处理
    return NextResponse.json({
      success: true,
      result: rawText,
      pointsCost: pointsCost,
      message: "OCR识图功能免费使用"
    });
  } catch (error) {
    console.error("识图处理错误:", error);
    return NextResponse.json({
      success: false,
      error: "识图处理失败"
    }, { status: 500 });
  }
}