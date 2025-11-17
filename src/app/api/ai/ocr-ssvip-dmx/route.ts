import { NextResponse } from "next/server";

// SSVIP DMX API配置
const SSVIP_DMX_API_URL = "https://api.dmxapi.com/v1/chat/completions";
const SSVIP_DMX_API_KEY = process.env.ssvip_dmx;

// 备用OCR服务配置
const ALIYUN_SG_API_KEY = process.env.AliYunSingapore_APIKEY;
const ALIYUN_SG_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 备用服务开关
const ALIYUN_SG_AVAILABLE = !!ALIYUN_SG_API_KEY;
const VOLCENGINE_AVAILABLE = !!VOLCENGINE_API_KEY;

export async function POST(request: Request) {
  try {
    console.log('🚀 SSVIP DMX OCR API - 开始处理请求...');

    // 检查主API密钥配置
    if (!SSVIP_DMX_API_KEY) {
      console.error('❌ SSVIP DMX API密钥未配置');
      return NextResponse.json({
        success: false,
        error: "SSVIP DMX OCR服务暂时不可用",
        details: "SSVIP DMX API配置错误"
      }, { status: 500 });
    }

    console.log(`✅ SSVIP DMX API密钥已配置，长度: ${SSVIP_DMX_API_KEY.length}`);
    console.log(`🔧 备用服务配置: 阿里云新加坡=${ALIYUN_SG_AVAILABLE}, 火山引擎=${VOLCENGINE_AVAILABLE}`);

    // 获取请求数据
    const { imageBase64, images, prompt } = await request.json();

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

    console.log('SSVIP DMX OCR - 数据格式检查:', {
      原始格式: imageDataUrl.substring(0, 50) + '...',
      最终格式: imageDataUrl.substring(0, 50) + '...',
      是否DataURL: imageDataUrl.startsWith('data:'),
      数据长度: imageDataUrl.length
    });

    // 记录请求开始时间
    const startTime = Date.now();
    console.log('🚀 开始调用SSVIP DMX API进行OCR识别...');

    const pointsCost = 0; // OCR识图是免费功能

    // 首先调用SSVIP DMX API进行OCR识别
    let ocrResponse;
    try {
      console.log('🌋 调用SSVIP DMX API...');

      // 构建提示词
      let ocrPrompt = '识别图片中的文字内容，原文输出，保持格式不变。如果图片中没有文字，请回复"无文字内容"';
      if (prompt) {
        ocrPrompt = prompt;
      }

      ocrResponse = await fetch(SSVIP_DMX_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SSVIP_DMX_API_KEY}`,
          "User-Agent": "AIToolsForTeachers/1.0 (SSVIP-DMX)",
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate, br"
        },
        signal: AbortSignal.timeout(120000), // 120秒超时
        body: JSON.stringify({
          model: "doubao-seed-1-6-flash-250615",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: ocrPrompt
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
          max_tokens: 4000,
          stream: false
        })
      });

      console.log('📡 SSVIP DMX API响应状态:', ocrResponse.status);
    } catch (networkError) {
      console.error('❌ SSVIP DMX网络请求失败:', networkError);

      // SSVIP DMX失败，尝试阿里云新加坡作为备用
      if (ALIYUN_SG_AVAILABLE) {
        console.log('🔄 SSVIP DMX失败，尝试使用阿里云新加坡作为备用服务...');
        try {
          const aliyunResult = await callAliyunSingaporeOCR(imageDataUrl, prompt);
          if (aliyunResult.success) {
            console.log('✅ 阿里云新加坡备用OCR识别成功！');
            return NextResponse.json({
              success: true,
              result: aliyunResult.result,
              provider: '阿里云新加坡',
              fallback: true,
              message: 'SSVIP DMX失败，使用备用OCR服务（阿里云新加坡）',
              model: 'qwen3-vl-flash'
            });
          }
        } catch (aliyunError) {
          console.error('❌ 阿里云新加坡备用OCR也失败:', aliyunError);

          // 阿里云新加坡也失败，尝试火山引擎作为最终备用
          if (VOLCENGINE_AVAILABLE) {
            console.log('🔄 阿里云新加坡也失败，尝试使用火山引擎作为最终备用...');
            try {
              const volcengineResult = await callVolcengineOCR(imageDataUrl, prompt);
              if (volcengineResult.success) {
                console.log('✅ 火山引擎最终备用OCR识别成功！');
                return NextResponse.json({
                  success: true,
                  result: volcengineResult.result,
                  provider: '火山引擎',
                  fallback: true,
                  message: 'SSVIP DMX和阿里云新加坡均失败，使用最终备用OCR服务（火山引擎）',
                  model: 'doubao-seed-1-6-flash-250828'
                });
              }
            } catch (volcengineError) {
              console.error('❌ 火山引擎最终备用OCR也失败:', volcengineError);
            }
          }
        }
      }

      return NextResponse.json({
        success: false,
        error: "OCR服务网络连接失败",
        details: {
          primaryError: `SSVIP DMX网络请求失败: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`,
          fallbackAvailable: ALIYUN_SG_AVAILABLE || VOLCENGINE_AVAILABLE,
          fallbackTried: ALIYUN_SG_AVAILABLE || VOLCENGINE_AVAILABLE
        }
      }, { status: 500 });
    }

    let ocrData;
    try {
      const responseText = await ocrResponse.text();
      console.log('🔍 SSVIP DMX API原始响应前500字符:', responseText.substring(0, 500));
      console.log('🔍 响应状态码:', ocrResponse.status);
      console.log('🔍 响应头:', Object.fromEntries(ocrResponse.headers.entries()));

      // 检查响应是否为JSON格式
      const trimmedText = responseText.trim();
      if (!trimmedText.startsWith('{') && !trimmedText.startsWith('[')) {
        console.error('❌ SSVIP DMX API返回的不是JSON格式');
        console.error('❌ 完整响应内容:', responseText.substring(0, 1000));

        // 尝试使用备用服务
        if (ALIYUN_SG_AVAILABLE) {
          console.log('🔄 SSVIP DMX响应格式错误，尝试使用阿里云新加坡作为备用...');
          try {
            const aliyunResult = await callAliyunSingaporeOCR(imageDataUrl, prompt);
            if (aliyunResult.success) {
              return NextResponse.json({
                success: true,
                result: aliyunResult.result,
                provider: '阿里云新加坡',
                fallback: true,
                message: 'SSVIP DMX响应格式错误，使用备用OCR服务（阿里云新加坡）',
                model: 'qwen3-vl-flash'
              });
            }
          } catch (aliyunError) {
            console.error('❌ 阿里云新加坡备用OCR也失败:', aliyunError);
          }
        }

        throw new Error(`SSVIP DMX API返回非JSON格式响应: ${responseText.substring(0, 200)}`);
      }

      ocrData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ SSVIP DMX JSON解析失败:', parseError);

      // 尝试使用备用服务
      if (ALIYUN_SG_AVAILABLE) {
        console.log('🔄 SSVIP DMX解析失败，尝试使用阿里云新加坡作为备用...');
        try {
          const aliyunResult = await callAliyunSingaporeOCR(imageDataUrl, prompt);
          if (aliyunResult.success) {
            return NextResponse.json({
              success: true,
              result: aliyunResult.result,
              provider: '阿里云新加坡',
              fallback: true,
              message: 'SSVIP DMX解析失败，使用备用OCR服务（阿里云新加坡）',
              model: 'qwen3-vl-flash'
            });
          }
        } catch (aliyunError) {
          console.error('❌ 阿里云新加坡备用OCR也失败:', aliyunError);
        }
      }

      return NextResponse.json({
        success: false,
        error: "OCR服务响应格式错误",
        details: {
          parseError: parseError instanceof Error ? parseError.message : 'Unknown error',
          responseStatus: ocrResponse.status,
          fallbackAvailable: ALIYUN_SG_AVAILABLE || VOLCENGINE_AVAILABLE,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

    // 计算并记录网络延迟
    const endTime = Date.now();
    const networkLatency = endTime - startTime;
    console.log(`🚀 SSVIP DMX API响应完成，总耗时: ${networkLatency}ms (${(networkLatency/1000).toFixed(2)}秒)`);

    if (!ocrResponse.ok) {
      console.error("❌ SSVIP DMX API HTTP错误:", ocrData);

      // 尝试使用备用服务
      if (ALIYUN_SG_AVAILABLE) {
        console.log('🔄 SSVIP DMX HTTP错误，尝试使用阿里云新加坡作为备用...');
        try {
          const aliyunResult = await callAliyunSingaporeOCR(imageDataUrl, prompt);
          if (aliyunResult.success) {
            return NextResponse.json({
              success: true,
              result: aliyunResult.result,
              provider: '阿里云新加坡',
              fallback: true,
              message: `SSVIP DMX HTTP ${ocrResponse.status} 错误，使用备用OCR服务（阿里云新加坡）`,
              model: 'qwen3-vl-flash'
            });
          }
        } catch (aliyunError) {
          console.error('❌ 阿里云新加坡备用OCR也失败:', aliyunError);
        }
      }

      return NextResponse.json({
        success: false,
        error: `SSVIP DMX HTTP错误 (${ocrResponse.status}): ${ocrData.error?.message || "HTTP请求失败"}`,
        details: {
          httpStatus: ocrResponse.status,
          httpStatusText: ocrResponse.statusText,
          fallbackAvailable: ALIYUN_SG_AVAILABLE || VOLCENGINE_AVAILABLE,
          ssvipError: ocrData
        }
      }, { status: 500 });
    }

    let rawText = ocrData.choices?.[0]?.message?.content || '';
    console.log('SSVIP DMX OCR识别完成，原文长度:', rawText.length);
    console.log('SSVIP DMX OCR识别结果预览:', rawText.substring(0, 200));

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

    console.log('SSVIP DMX OCR处理完成 - 原文长度:', rawText.length, '纯英文长度:', englishOnlyText.length);

    return NextResponse.json({
      success: true,
      result: rawText,
      englishOnly: englishOnlyText, // 纯英文版本
      pointsCost: pointsCost,
      provider: 'SSVIP DMX',
      model: 'doubao-seed-1-6-flash-250615',
      message: "OCR识图功能免费使用（SSVIP DMX）"
    });

  } catch (error) {
    console.error("SSVIP DMX OCR处理错误:", error);

    // 提供更详细的错误信息
    let errorMessage = "SSVIP DMX OCR处理失败";
    let errorType = "unknown";

    if (error.name === 'AbortError') {
      errorType = "timeout";
      errorMessage = "OCR识别超时，请尝试上传更清晰的图片或稍后重试";
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorType = "network";
      errorMessage = "网络连接失败，请检查网络连接后重试";
    } else if (error.message && error.message.includes('InvalidParameter')) {
      errorType = "image_quality";
      errorMessage = "图片质量问题：请确保图片清晰、文字可辨";
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

// 阿里云新加坡OCR识别函数（备用方案）
async function callAliyunSingaporeOCR(imageDataUrl: string, customPrompt?: string): Promise<{success: boolean, result: string}> {
  try {
    if (!ALIYUN_SG_API_KEY) {
      throw new Error('阿里云新加坡API Key未配置');
    }

    console.log('🌏 开始调用阿里云新加坡备用OCR...');

    let prompt = '识别图片中的文字内容，原文输出。如果图片中没有文字，请回复"无文字内容"';
    if (customPrompt) {
      prompt = customPrompt;
    }

    const ocrResponse = await fetch(ALIYUN_SG_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ALIYUN_SG_API_KEY}`,
        "User-Agent": "AIToolsForTeachers/1.0 (Fallback-AliyunSG)"
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: "qwen3-vl-flash",
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
                text: prompt
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
        max_tokens: 4000,
        stream: false
      })
    });

    const ocrData = await ocrResponse.json();

    if (!ocrResponse.ok) {
      console.error("❌ 阿里云新加坡API错误:", ocrData);
      throw new Error(`阿里云新加坡API调用失败: ${ocrData.error?.message || "未知错误"}`);
    }

    const result = ocrData.choices[0]?.message?.content || '';
    console.log('✅ 阿里云新加坡OCR识别成功，原文长度:', result.length);

    return {
      success: true,
      result: result
    };

  } catch (error) {
    console.error('❌ 阿里云新加坡OCR识别失败:', error);
    return {
      success: false,
      result: ''
    };
  }
}

// 火山引擎OCR识别函数（最终备用方案）
async function callVolcengineOCR(imageDataUrl: string, customPrompt?: string): Promise<{success: boolean, result: string}> {
  try {
    if (!VOLCENGINE_API_KEY) {
      throw new Error('火山引擎API Key未配置');
    }

    console.log('🌋 开始调用火山引擎最终备用OCR...');

    let prompt = '识别图片中的文字内容，原文输出。如果图片中没有文字，请回复"无文字内容"';
    if (customPrompt) {
      prompt = customPrompt;
    }

    const ocrResponse = await fetch(VOLCENGINE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOLCENGINE_API_KEY}`,
        "User-Agent": "AIToolsForTeachers/1.0 (Fallback-Volcengine)"
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: "doubao-seed-1-6-flash-250828",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
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

    const ocrData = await ocrResponse.json();

    if (!ocrResponse.ok) {
      console.error("❌ 火山引擎API错误:", ocrData);
      throw new Error(`火山引擎API调用失败: ${ocrData.error?.message || "未知错误"}`);
    }

    const result = ocrData.choices[0]?.message?.content || '';
    console.log('✅ 火山引擎OCR识别成功，原文长度:', result.length);

    return {
      success: true,
      result: result
    };

  } catch (error) {
    console.error('❌ 火山引擎OCR识别失败:', error);
    return {
      success: false,
      result: ''
    };
  }
}