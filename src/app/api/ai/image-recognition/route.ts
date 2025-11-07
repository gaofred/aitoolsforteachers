import { NextResponse } from "next/server";

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

// 极客智坊API配置（备用方案）
const GEEKAI_API_URL = "https://geekai.co/api/v1/chat/completions";
const GEEKAI_API_KEY = process.env.GEEKAI_API_KEY;

// 备用OCR服务开关
const FALLBACK_OCR_AVAILABLE = !!GEEKAI_API_KEY;

export async function POST(request: Request) {
  try {
    // OCR识图是免费功能，无需认证检查
    console.log('🖼️ 图片识别API - 免费功能，跳过认证检查');

    // 检查API密钥配置
    if (!VOLCENGINE_API_KEY) {
      console.error('❌ 火山引擎API密钥未配置');
      return NextResponse.json({
        success: false,
        error: "OCR服务暂时不可用，请稍后重试",
        details: "API配置错误"
      }, { status: 500 });
    }

    console.log(`✅ 火山引擎API密钥已配置，长度: ${VOLCENGINE_API_KEY.length}`);

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
    let ocrResponse;
    try {
      // 构建更完整的请求头
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOLCENGINE_API_KEY}`,
        "User-Agent": "AIToolsForTeachers/1.0 (Production)",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate, br"
      };

      console.log('🔍 请求头配置:', {
        url: VOLCENGINE_API_URL,
        hasApiKey: !!VOLCENGINE_API_KEY,
        apiKeyLength: VOLCENGINE_API_KEY?.length,
        headers: Object.keys(headers)
      });

      ocrResponse = await fetch(VOLCENGINE_API_URL, {
        method: "POST",
        headers: headers,
        signal: AbortSignal.timeout(180000), // 增加到180秒超时
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
        max_tokens: 4000  // 增加到4000以支持更长的文本识别
      })
      });
    } catch (networkError) {
      console.error('❌ 火山引擎网络请求失败:', networkError);

      // 如果火山引擎网络失败且有备用服务，尝试使用极客智坊
      if (FALLBACK_OCR_AVAILABLE) {
        console.log('🔄 火山引擎网络失败，尝试使用极客智坊Gemini模型作为备用...');
        try {
          const fallbackResult = await callGeekAIOCR(imageDataUrl);
          if (fallbackResult.success) {
            console.log('✅ 极客智坊备用OCR识别成功！');
            return NextResponse.json({
              success: true,
              result: fallbackResult.result,
              provider: 'geekai',
              fallback: true,
              message: '使用备用OCR服务（极客智坊 Gemini-2.5-flash-lite）'
            });
          }
        } catch (geekaiError) {
          console.error('❌ 极客智坊备用OCR也失败:', geekaiError);
        }
      }

      return NextResponse.json({
        success: false,
        error: "识图服务网络连接失败",
        details: {
          primaryError: `火山引擎网络请求失败: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`,
          fallbackAvailable: FALLBACK_OCR_AVAILABLE,
          fallbackTried: FALLBACK_OCR_AVAILABLE
        }
      }, { status: 500 });
    }

    let ocrData;
    try {
      const responseText = await ocrResponse.text();
      console.log('🔍 火山引擎API原始响应前500字符:', responseText.substring(0, 500));
      console.log('🔍 响应状态码:', ocrResponse.status);
      console.log('🔍 响应头:', Object.fromEntries(ocrResponse.headers.entries()));

      // 分析常见的错误响应模式
      const lowerText = responseText.toLowerCase();
      let errorType = 'unknown';

      if (lowerText.includes('request entity too large')) {
        errorType = 'request_too_large';
      } else if (lowerText.includes('rate limit') || lowerText.includes('quota')) {
        errorType = 'rate_limit';
      } else if (lowerText.includes('unauthorized') || lowerText.includes('forbidden')) {
        errorType = 'auth_error';
      } else if (lowerText.includes('timeout')) {
        errorType = 'timeout';
      } else if (lowerText.includes('internal server error')) {
        errorType = 'server_error';
      }

      console.log('🔍 识别的错误类型:', errorType);

      // 检查响应是否为JSON格式
      const trimmedText = responseText.trim();
      if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
        console.error('❌ API返回的不是JSON格式，可能是错误页面');
        console.error('❌ 完整响应内容:', responseText.substring(0, 1000));

        // 尝试提供更具体的错误信息
        let specificError = "API返回非JSON格式响应";
        if (errorType === 'rate_limit') {
          specificError = "API调用频率超限，请稍后重试";
        } else if (errorType === 'auth_error') {
          specificError = "API认证失败，请检查API密钥配置";
        } else if (errorType === 'request_too_large') {
          specificError = "请求内容过大，请压缩图片后重试";
        } else if (errorType === 'timeout') {
          specificError = "API请求超时，请稍后重试";
        }

        throw new Error(`${specificError}: ${responseText.substring(0, 200)}`);
      }

      ocrData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ 火山引擎JSON解析失败:', parseError);

      // 如果火山引擎失败且有备用服务，尝试使用极客智坊
      if (FALLBACK_OCR_AVAILABLE) {
        console.log('🔄 火山引擎失败，尝试使用极客智坊Gemini模型作为备用...');
        try {
          const fallbackResult = await callGeekAIOCR(imageDataUrl);
          if (fallbackResult.success) {
            console.log('✅ 极客智坊备用OCR识别成功！');
            return NextResponse.json({
              success: true,
              result: fallbackResult.result,
              provider: 'geekai',
              fallback: true,
              message: '使用备用OCR服务（极客智坊 Gemini-2.5-flash-lite）'
            });
          }
        } catch (geekaiError) {
          console.error('❌ 极客智坊备用OCR也失败:', geekaiError);
        }
      }

      // 获取响应内容用于错误分析
      let responseText = '';
      try {
        responseText = await ocrResponse.text();
        console.error('❌ 原始响应内容:', responseText.substring(0, 1000));
        console.error('❌ 响应长度:', responseText.length);
      } catch (textError) {
        console.error('❌ 无法获取响应文本:', textError);
        responseText = '无法读取响应内容';
      }

      return NextResponse.json({
        success: false,
        error: "识图服务响应格式错误",
        details: {
          parseError: parseError instanceof Error ? parseError.message : 'Unknown error',
          responseStatus: ocrResponse.status,
          responseHeaders: Object.fromEntries(ocrResponse.headers.entries()),
          responsePreview: responseText.substring(0, 500),
          fallbackAvailable: FALLBACK_OCR_AVAILABLE,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

    // 计算并记录网络延迟
    const endTime = Date.now();
    const networkLatency = endTime - startTime;
    console.log(`🌐 火山引擎API响应完成，总耗时: ${networkLatency}ms (${(networkLatency/1000).toFixed(2)}秒)`);

    if (!ocrResponse.ok) {
      console.error("❌ 火山引擎API HTTP错误:", ocrData);

      // 如果火山引擎HTTP错误且有备用服务，尝试使用极客智坊
      if (FALLBACK_OCR_AVAILABLE) {
        console.log('🔄 火山引擎HTTP错误，尝试使用极客智坊Gemini模型作为备用...');
        try {
          const fallbackResult = await callGeekAIOCR(imageDataUrl);
          if (fallbackResult.success) {
            console.log('✅ 极客智坊备用OCR识别成功！');
            return NextResponse.json({
              success: true,
              result: fallbackResult.result,
              provider: 'geekai',
              fallback: true,
              message: `火山引擎HTTP ${ocrResponse.status} 错误，使用备用OCR服务（极客智坊 Gemini-2.5-flash-lite）`,
              originalError: {
                status: ocrResponse.status,
                statusText: ocrResponse.statusText,
                error: ocrData.error?.message || "HTTP错误"
              }
            });
          }
        } catch (geekaiError) {
          console.error('❌ 极客智坊备用OCR也失败:', geekaiError);
        }
      }

      return NextResponse.json({
        success: false,
        error: `火山引擎HTTP错误 (${ocrResponse.status}): ${ocrData.error?.message || "HTTP请求失败"}`,
        details: {
          httpStatus: ocrResponse.status,
          httpStatusText: ocrResponse.statusText,
          fallbackAvailable: FALLBACK_OCR_AVAILABLE,
          volcanoError: ocrData
        }
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
          max_tokens: 4000
        })
      });

      if (retryResponse.ok) {
        let retryData;
        try {
          const retryText = await retryResponse.text();
          console.log('🔍 重试API原始响应前200字符:', retryText.substring(0, 200));
          retryData = JSON.parse(retryText);
        } catch (retryParseError) {
          console.error('❌ 重试API JSON解析失败:', retryParseError);
          throw new Error(`重试API响应解析失败: ${retryParseError instanceof Error ? retryParseError.message : 'Unknown error'}`);
        }
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

    // 提供更详细的错误信息
    let errorMessage = "识图处理失败";
    let errorType = "unknown";

    if (error.name === 'AbortError') {
      errorType = "timeout";
      errorMessage = "OCR识别超时，请尝试上传更清晰的图片或稍后重试";
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorType = "network";
      errorMessage = "网络连接失败，请检查网络连接后重试";
    } else if (error.message && error.message.includes('InvalidParameter')) {
      errorType = "image_quality";
      errorMessage = "图片质量问题：请确保图片清晰、文字可辨，且图片尺寸不小于14像素";
    } else if (error.message && error.message.includes('429')) {
      errorType = "rate_limit";
      errorMessage = "请求过于频繁，请稍等片刻后重试";
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType: errorType,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

// 极客智坊Gemini OCR识别函数（备用方案）
async function callGeekAIOCR(imageDataUrl: string): Promise<{success: boolean, result: string}> {
  try {
    if (!GEEKAI_API_KEY) {
      throw new Error('极客智坊API Key未配置');
    }

    console.log('🤖 开始调用极客智坊Gemini OCR...');

    const ocrResponse = await fetch(GEEKAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEEKAI_API_KEY}`,
        "User-Agent": "AIToolsForTeachers/1.0 (Fallback)"
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
      console.error("❌ 极客智坊API错误:", ocrData);
      throw new Error(`极客智坊API调用失败: ${ocrData.error?.message || "未知错误"}`);
    }

    // 极客智坊API使用OpenAI兼容格式
    if (!ocrData.choices || !ocrData.choices[0]) {
      throw new Error('极客智坊API返回格式异常');
    }

    const result = ocrData.choices[0].message?.content || '';
    console.log('✅ 极客智坊OCR识别成功，原文长度:', result.length);

    return {
      success: true,
      result: result
    };

  } catch (error) {
    console.error('❌ 极客智坊OCR识别失败:', error);
    return {
      success: false,
      result: ''
    };
  }
}