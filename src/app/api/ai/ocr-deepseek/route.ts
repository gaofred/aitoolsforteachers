import { NextRequest, NextResponse } from 'next/server';

// DMXAPI DeepSeek OCR 配置
const DMXAPI_BASE_URL = 'https://www.dmxapi.cn/v1/chat/completions';
const DMXAPI_KEY = process.env.DMXAPI_KEY;

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 开始处理DeepSeek OCR请求');

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

    if (!DMXAPI_KEY) {
      console.error('❌ 未找到DMXAPI密钥');
      return NextResponse.json(
        { success: false, error: '服务配置错误：未找到DMXAPI密钥' },
        { status: 500 }
      );
    }

    console.log(`📸 开始处理 ${imageData.length} 张图片的OCR识别（DeepSeek OCR）`);

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
6. 特别注意准确识别题目要求、段落结构和关键信息

请确保识别结果的准确性和完整性。`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt || '识别图中文字，依次原文输出，不要增加其他多余的解释和说明。'
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

    console.log('🚀 发送请求到DeepSeek OCR API（DMXAPI）');

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('⏰ DeepSeek OCR API请求超时，已取消请求');
    }, 120000); // 120秒超时

    try {
      // 调用DMXAPI的DeepSeek OCR
      const response = await fetch(DMXAPI_BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DMXAPI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-ocr-chat',
          messages: messages,
          max_tokens: 4000,
          temperature: 0.1,
          stream: false
        }),
        signal: controller.signal
      });

      // 清除超时定时器
      clearTimeout(timeoutId);

      console.log('📡 收到API响应，状态码:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DeepSeek OCR API请求失败:', response.status, errorText);

        if (response.status === 401) {
          return NextResponse.json(
            { success: false, error: 'DMXAPI密钥无效，请检查配置' },
            { status: 401 }
          );
        } else if (response.status === 429) {
          return NextResponse.json(
            { success: false, error: 'DMXAPI调用频率限制，请稍后重试' },
            { status: 429 }
          );
        } else if (response.status === 400) {
          return NextResponse.json(
            { success: false, error: '请求参数错误，请检查图片格式和大小' },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { success: false, error: `DeepSeek OCR API调用失败: ${response.status} ${errorText}` },
            { status: response.status }
          );
        }
      }

      const result = await response.json();
      console.log('✅ DeepSeek OCR API调用成功，获得识别结果');

      if (result.choices && result.choices.length > 0) {
        let ocrResult = result.choices[0].message.content;
        console.log('📝 DeepSeek OCR识别结果长度:', ocrResult?.length);

        // 处理可能存在的Unicode转义字符
        if (ocrResult && typeof ocrResult === 'string') {
          try {
            // 尝试解析JSON格式的内容
            const parsed = JSON.parse(ocrResult);
            ocrResult = JSON.stringify(parsed, null, 2);
          } catch {
            // 如果不是JSON格式，尝试解码unicode转义字符
            try {
              ocrResult = decodeURIComponent(ocrResult);
            } catch {
              // 如果解码失败，保持原样
            }
          }
        }

        return NextResponse.json({
          success: true,
          result: ocrResult,
          usage: result.usage,
          imagesProcessed: imageData.length,
          provider: 'DMXAPI-DeepSeek',
          model: 'deepseek-ocr-chat'
        });
      } else {
        console.error('❌ DeepSeek OCR API响应格式异常:', result);
        return NextResponse.json(
          { success: false, error: 'API响应格式异常' },
          { status: 500 }
        );
      }

    } catch (fetchError) {
      // 清除超时定时器（如果还未清除）
      clearTimeout(timeoutId);

      console.error('❌ DeepSeek OCR处理过程中发生错误:', fetchError);

      // 处理超时错误
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('⏰ DeepSeek OCR API请求超时');
        return NextResponse.json(
          { success: false, error: 'OCR处理超时，请尝试压缩图片或减少批量处理数量' },
          { status: 408 }
        );
      }

      if (fetchError instanceof Error) {
        return NextResponse.json(
          { success: false, error: `DeepSeek OCR处理失败: ${fetchError.message}` },
          { status: 500 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: 'DeepSeek OCR处理失败：未知错误' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('❌ DeepSeek OCR处理过程中发生错误:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: `DeepSeek OCR处理失败: ${error.message}` },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'DeepSeek OCR处理失败：未知错误' },
        { status: 500 }
      );
    }
  }
}