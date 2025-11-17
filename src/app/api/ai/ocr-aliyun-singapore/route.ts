import { NextRequest, NextResponse } from 'next/server';

// 阿里云新加坡DashScope API配置
const DASHSCOPE_SG_API_KEY = process.env.AliYunSingapore_APIKEY;
const DASHSCOPE_SG_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    console.log('🌏 开始处理阿里云新加坡OCR请求');

    const { imageBase64, images, prompt } = await request.json();

    // 兼容多种输入格式
    let imageData = [];

    if (imageBase64) {
      imageData = [imageBase64];
    } else if (images && images.length > 0) {
      imageData = images;
    }

    if (imageData.length === 0) {
      return NextResponse.json(
        { success: false, error: '请至少上传一张图片' },
        { status: 400 }
      );
    }

    if (!DASHSCOPE_SG_API_KEY) {
      console.error('❌ 未找到阿里云新加坡API密钥');
      return NextResponse.json(
        { success: false, error: '服务配置错误：未找到新加坡节点API密钥' },
        { status: 500 }
      );
    }

    console.log(`📸 开始处理 ${imageData.length} 张图片的OCR识别（新加坡节点）`);

    // 构建消息内容
    const messages = [
      {
        role: 'system',
        content: `你是一个专业的OCR文字识别助手。请仔细分析用户上传的图片，准确提取其中的所有文字内容。

要求：
1. 识别图片中的所有文字，包括中文、英文、数字、符号等
2. 保持原有的文字格式和段落结构
3. 如果是手写体，请尽量准确地识别
4. 如果有多张图片，请按顺序识别每张图片的内容
5. 输出格式：依次原文输出，不要增加其他多余的解释和说明
6. 特别注意准确识别读后续写题目的P1和P2段落标记

请确保识别结果的准确性和完整性。`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt || '识别图中文字，依次原文输出，不要增加其他多余的解释和说明。特别注意识别读后续写题目的段落结构和P1、P2标记。'
          },
          ...imageData.map((img: string) => ({
            type: 'image_url',
            image_url: {
              url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`
            }
          }))
        ]
      }
    ];

    console.log('🚀 发送请求到阿里云新加坡DashScope API');

    // 调用阿里云新加坡DashScope API
    const response = await fetch(DASHSCOPE_SG_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_SG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3-vl-flash',
        messages: messages,
        max_tokens: 4000,
        temperature: 0.1,
        stream: false
      })
    });

    console.log('📡 收到API响应，状态码:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 阿里云新加坡API请求失败:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { success: false, error: '阿里云新加坡API密钥无效，请检查配置' },
          { status: 401 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: '阿里云新加坡API调用频率限制，请稍后重试' },
          { status: 429 }
        );
      } else if (response.status === 400) {
        return NextResponse.json(
          { success: false, error: '请求参数错误，请检查图片格式和大小' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: `阿里云新加坡API调用失败: ${response.status} ${errorText}` },
          { status: response.status }
        );
      }
    }

    const result = await response.json();
    console.log('✅ 阿里云新加坡API调用成功，获得识别结果');

    if (result.choices && result.choices.length > 0) {
      const ocrResult = result.choices[0].message.content;
      console.log('📝 阿里云新加坡OCR识别结果长度:', ocrResult?.length);

      return NextResponse.json({
        success: true,
        result: ocrResult,
        usage: result.usage,
        imagesProcessed: imageData.length,
        provider: '阿里云新加坡',
        model: 'qwen3-vl-flash'
      });
    } else {
      console.error('❌ 阿里云新加坡API响应格式异常:', result);
      return NextResponse.json(
        { success: false, error: 'API响应格式异常' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ 阿里云新加坡OCR处理过程中发生错误:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: `阿里云新加坡OCR处理失败: ${error.message}` },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: '阿里云新加坡OCR处理失败：未知错误' },
        { status: 500 }
      );
    }
  }
}