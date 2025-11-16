import { NextResponse } from "next/server";

// 智谱清言官方API配置
const GEEKAI_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const GEEKAI_API_KEY = process.env.ZhipuOfficial;

export async function POST(request: Request) {
  try {
    console.log('📝 批改作文OCR API - 专门用于作文批改功能');

    // 检查API密钥配置
    if (!GEEKAI_API_KEY) {
      console.error('❌ 智谱清言API密钥未配置');
      return NextResponse.json({
        success: false,
        error: "OCR服务暂时不可用，请稍后重试",
        details: "API配置错误"
      }, { status: 500 });
    }

    // 获取请求数据
    const { imageBase64, images } = await request.json();

    // 兼容两种格式：单个图片的imageBase64和图片数组的images
    let imageDataUrl = null;

    if (imageBase64) {
      imageDataUrl = imageBase64;
    } else if (images && images.length > 0) {
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
      imageDataUrl = `data:image/jpeg;base64,${imageDataUrl}`;
    }

    // 简化的数据格式检查（因为前端有压缩功能，不需要图片大小限制）
    console.log('作文OCR - 数据格式检查:', {
      原始格式: imageDataUrl.substring(0, 50) + '...',
      最终格式: imageDataUrl.substring(0, 50) + '...',
      是否DataURL: imageDataUrl.startsWith('data:'),
      数据长度: imageDataUrl.length
    });

    // 记录请求开始时间
    const startTime = Date.now();
    console.log('🌐 开始调用极客智坊 glm-4.1v-thinking-flashx模型...');

    try {
      // 构建请求头
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEEKAI_API_KEY}`,
        "User-Agent": "EssayOCR/1.0 (Production)",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate, br"
      };

      console.log('🔍 请求头配置:', {
        url: GEEKAI_URL,
        hasApiKey: !!GEEKAI_API_KEY,
        apiKeyLength: GEEKAI_API_KEY?.length,
        headers: Object.keys(headers)
      });

      // 智能重试机制：最多重试2次
      let lastError: Error | null = null;
      let success = false;
      let ocrData: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🌐 极客智坊 glm-4.1v-thinking-flashx 尝试 ${attempt}/3`);

          // 根据尝试次数调整超时时间
          const timeoutMs = attempt === 1 ? 60000 : attempt === 2 ? 90000 : 120000; // 60s, 90s, 120s

          const ocrResponse = await fetch(GEEKAI_URL, {
            method: "POST",
            headers: headers,
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify({
              model: "glm-4.1v-thinking-flashx",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "image_url",
                      image_url: {
                        url: imageDataUrl
                      }
                    },
                    {
                      type: "text",
                      text: "请识别图片中的所有文字内容，保持原文格式不变。特别注意：\n1. 准确识别所有文字，包括学生姓名、作文内容等\n2. 保持原文的段落结构和换行\n3. 如果是英语作文，请准确识别英文字母和标点符号\n4. 不要对文字进行任何修改或润色\n5. 如果图片中没有文字，请回复'无文字内容'"
                    }
                  ]
                }
              ],
              temperature: 0.1,
              max_tokens: 4000
            })
          });

          let responseData;
          try {
            const responseText = await ocrResponse.text();
            console.log(`🔍 极客智坊 API 尝试 ${attempt} 响应前500字符:`, responseText.substring(0, 500));
            console.log('🔍 响应状态码:', ocrResponse.status);

            // 检查响应是否为JSON格式
            const trimmedText = responseText.trim();
            if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
              console.error('❌ API返回非JSON格式响应:', responseText.substring(0, 1000));
              throw new Error(`API返回非JSON格式响应: ${responseText.substring(0, 200)}`);
            }

            responseData = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ JSON解析失败:', parseError);
            throw new Error(`API响应解析失败: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          }

          if (!ocrResponse.ok) {
            console.error("❌ 极客智坊 HTTP错误:", responseData);
            const errorMessage = responseData.error?.message || responseData.message || responseData.error || "HTTP请求失败";
            const errorDetails = {
              status: ocrResponse.status,
              statusText: ocrResponse.statusText,
              error: responseData.error,
              details: responseData
            };
            console.error("❌ 详细错误信息:", errorDetails);
            throw new Error(`极客智坊 HTTP错误 (${ocrResponse.status}): ${errorMessage}`);
          }

          // 成功获取响应
          ocrData = responseData;
          success = true;
          console.log(`✅ 极客智坊 glm-4.1v-thinking-flashx 尝试 ${attempt} 成功`);
          break;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`❌ 极客智坊 glm-4.1v-thinking-flashx 尝试 ${attempt} 失败:`, lastError.message);

          // 如果是最后一次尝试，不再重试
          if (attempt === 3) {
            break;
          }

          // 等待后重试，使用指数退避
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ 等待 ${waitTime}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // 如果所有尝试都失败，抛出最后的错误
      if (!success || !ocrData) {
        throw lastError || new Error('OCR识别失败：所有重试尝试均失败');
      }

      // 计算并记录网络延迟
      const endTime = Date.now();
      const networkLatency = endTime - startTime;
      console.log(`🌐 极客智坊 glm-4.1v-thinking-flashx API响应完成，总耗时: ${networkLatency}ms (${(networkLatency/1000).toFixed(2)}秒)`);

      const rawText = ocrData.choices[0].message.content;
      console.log('📝 极客智坊 glm-4.1v-thinking-flashx OCR识别完成，原文长度:', rawText.length);
      console.log('📝 极客智坊 glm-4.1v-thinking-flashx OCR识别结果预览:', rawText.substring(0, 200));

      // 检查是否包含中文字符
      const hasChineseChars = /[\u4e00-\u9fff]/.test(rawText);
      console.log('是否包含中文字符:', hasChineseChars);

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

      console.log('📝 极客智坊 glm-4.1v-thinking-flashx OCR处理完成 - 原文长度:', rawText.length, '纯英文长度:', englishOnlyText.length);

      return NextResponse.json({
        success: true,
        result: rawText,
        englishOnly: englishOnlyText, // 纯英文版本
        metadata: {
          hasChinese: hasChineseChars,
          originalLength: rawText.length,
          englishOnlyLength: englishOnlyText.length,
          processingTime: networkLatency,
          model: "glm-4.1v-thinking-flashx"
        },
        message: "极客智坊 glm-4.1v-thinking-flashx OCR识别完成"
      });

    } catch (networkError) {
      console.error('❌ 极客智坊 glm-4.1v-thinking-flashx 网络请求失败:', networkError);

      // 提供更详细的错误信息
      let errorMessage = "网络连接失败";
      let errorType = "network";

      if (networkError.name === 'AbortError') {
        errorType = "timeout";
        errorMessage = "极客智坊OCR识别超时，请尝试上传更清晰的图片或稍后重试";
      } else if (networkError.code === 'ENOTFOUND' || networkError.code === 'ECONNREFUSED') {
        errorType = "connection";
        errorMessage = "极客智坊网络连接失败，请检查网络连接后重试";
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        errorType: errorType,
        details: {
          networkError: networkError instanceof Error ? networkError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ 极客智坊 glm-4.1v-thinking-flashx OCR处理错误:", error);

    // 提供更详细的错误信息
    let errorMessage = "极客智坊 glm-4.1v-thinking-flashx OCR处理失败";
    let errorType = "unknown";

    if (error.name === 'AbortError') {
      errorType = "timeout";
      errorMessage = "极客智坊 glm-4.1v-thinking-flashx OCR识别超时，请尝试上传更清晰的图片或稍后重试";
    } else if (error.code === 'ENOTFOUND' || errorError.code === 'ECONNREFUSED') {
      errorType = "network";
      errorMessage = "极客智坊网络连接失败，请检查网络连接后重试";
    } else if (error.message && error.message.includes('InvalidParameter')) {
      errorType = "image_quality";
      errorMessage = "图片质量问题：请确保图片清晰、文字可辨，且图片尺寸不小于14像素";
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType: errorType,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      service: "geekai-ocr"
    }, { status: 500 });
  }
}