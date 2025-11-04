import { NextResponse } from "next/server";

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

export async function POST(request: Request) {
  try {
    // OCR识图是免费功能，无需认证检查
    console.log('图片识别API - 免费功能，跳过认证检查');

    // 获取请求数据
    const { imageBase64, images } = await request.json();

    // 兼容两种格式：单个图片的imageBase64和图片数组的images
    let imageDataUrl = null;

    if (imageBase64) {
      // 单个图片格式
      imageDataUrl = imageBase64;
    } else if (images && images.length > 0) {
      // 图片数组格式，取第一张图片
      imageDataUrl = images[0];
    }

    if (!imageDataUrl) {
      return NextResponse.json({
        success: false,
        error: "未提供图片数据"
      }, { status: 400 });
    }

    // 确保图片数据是完整的data URL格式
    if (!imageDataUrl.startsWith('data:')) {
      // 如果不是data URL格式，添加JPEG的data URL前缀
      imageDataUrl = `data:image/jpeg;base64,${imageDataUrl}`;
    }

    console.log('图片识别 - 数据格式检查:', {
      原始格式: imageDataUrl.substring(0, 50) + '...',
      最终格式: imageDataUrl.substring(0, 50) + '...',
      是否DataURL: imageDataUrl.startsWith('data:'),
      数据长度: imageDataUrl.length
    });

    // 记录请求开始时间，用于监控网络延迟
    const startTime = Date.now();
    console.log('🌐 开始调用火山引擎API (北京节点)...');

    const pointsCost = 0; // 识图功能免费

    // 免费功能，无需检查点数

    // 调用火山引擎API进行识图 - 专注于图像识别，添加超时控制
    const ocrResponse = await fetch(VOLCENGINE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOLCENGINE_API_KEY}`
      },
      signal: AbortSignal.timeout(60000), // 60秒超时，防止单个请求卡住
      body: JSON.stringify({
        model: "doubao-seed-1-6-flash-250828",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "识别图中所有文字，原文输出。保持原有的段落结构和换行。如果没有文字，请回复'无文字内容'。"
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
        max_tokens: 4000  // 增加到4000以支持更长的文本识别
      })
    });

    const ocrData = await ocrResponse.json();

    // 计算并记录网络延迟
    const endTime = Date.now();
    const networkLatency = endTime - startTime;
    console.log(`🌐 火山引擎API响应完成，总耗时: ${networkLatency}ms (${(networkLatency/1000).toFixed(2)}秒)`);

    if (!ocrResponse.ok) {
      console.error("火山引擎API错误:", ocrData);
      return NextResponse.json({
        success: false,
        error: `识图失败: ${ocrData.error?.message || "未知错误"}`
      }, { status: 500 });
    }

    let rawText = ocrData.choices[0].message.content;
    console.log('OCR识别完成，原文长度:', rawText.length);
    console.log('OCR识别结果预览:', rawText.substring(0, 200));

    // 检查是否包含中文字符
    const hasChineseChars = /[\u4e00-\u9fff]/.test(rawText);
    console.log('是否包含中文字符:', hasChineseChars);

    // 如果没有中文字符，尝试再次识别
    if (!hasChineseChars && rawText.length > 0) {
      console.log('⚠️ 警告：识别结果可能缺少中文，尝试重新识别...');

      // 第二次识别，更强调中文识别，添加超时控制
      const retryResponse = await fetch(VOLCENGINE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${VOLCENGINE_API_KEY}`
        },
        signal: AbortSignal.timeout(60000), // 60秒超时控制
        body: JSON.stringify({
          model: "doubao-seed-1-6-flash-250828",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "重新识别图片中的文字，原文输出。请确保识别完整，包括所有中英文内容。"
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
          max_tokens: 4000
        })
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryText = retryData.choices[0].message.content;
        console.log('重新识别结果:', retryText.substring(0, 200));

        // 如果重新识别的结果包含中文，则使用新结果
        if (/[\u4e00-\u9fff]/.test(retryText)) {
          rawText = retryText;
          console.log('✅ 重新识别成功，已包含中文内容');
        }
      }
    }

    // 处理文本：分离纯英文内容（移除中文，用于英语作文）
    const englishOnlyText = rawText
      .split('\n')
      .map(line => {
        // 移除所有中文字符，只保留英文、数字、标点符号和空格
        const cleaned = line.replace(/[\u4e00-\u9fff]/g, '').trim();
        return cleaned;
      })
      .filter(line => line.length > 0) // 移除空行
      .join('\n');

    console.log('OCR处理完成 - 原文长度:', rawText.length, '纯英文长度:', englishOnlyText.length);

    return NextResponse.json({
      success: true,
      result: rawText,
      englishOnly: englishOnlyText, // 新增：纯英文版本
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