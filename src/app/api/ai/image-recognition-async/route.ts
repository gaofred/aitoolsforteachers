import { NextResponse } from "next/server";

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

// 极客智坊API配置（备用方案）
const GEEKAI_API_URL = "https://geekai.co/api/v1/chat/completions";
const GEEKAI_API_KEY = process.env.GEEKAI_API_KEY;

// 存储异步任务的简单内存存储（生产环境建议使用Redis）
const asyncTasks = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
}>();

// 清理超过1小时的任务
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  for (const [taskId, task] of asyncTasks.entries()) {
    if (now - task.createdAt > oneHour) {
      asyncTasks.delete(taskId);
    }
  }
}, 10 * 60 * 1000); // 每10分钟清理一次

export async function POST(request: Request) {
  try {
    console.log('🚀 异步OCR API - 开始处理请求');
    console.log('📝 提醒：如果看到 mcs.zijieapi.com 错误，请检查浏览器广告拦截器');

    // 获取请求数据
    const { imageBase64, images, async = false } = await request.json();

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

    // 异步模式：立即返回任务ID
    if (async) {
      const taskId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      asyncTasks.set(taskId, {
        status: 'pending',
        createdAt: Date.now()
      });

      // 异步处理任务
      processOCRTask(taskId, imageDataUrl).catch(error => {
        console.error(`❌ 任务 ${taskId} 处理失败:`, error);
        const task = asyncTasks.get(taskId);
        if (task) {
          task.status = 'failed';
          task.error = error.message;
        }
      });

      return NextResponse.json({
        success: true,
        taskId: taskId,
        message: "OCR任务已创建，请使用任务ID查询结果",
        pollUrl: `/api/ai/image-recognition-async/${taskId}`
      });
    }

    // 同步模式：直接处理（限制时间）
    console.log('🔄 同步模式处理OCR...');
    const result = await processOCRDirect(imageDataUrl);

    return NextResponse.json({
      success: true,
      result: result.text,
      englishOnly: result.englishOnly,
      pointsCost: 0,
      provider: result.provider,
      message: "OCR识图功能免费使用",
      syncMode: true
    });

  } catch (error) {
    console.error("❌ 异步OCR API错误:", error);

    let errorMessage = "识图处理失败";
    let errorType = "unknown";

    if (error.name === 'AbortError') {
      errorType = "timeout";
      errorMessage = "OCR识别超时，请使用异步模式或上传更清晰的图片";
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorType = "network";
      errorMessage = "网络连接失败，请检查网络连接后重试";
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      errorType: errorType,
      asyncSuggestion: "建议使用异步模式：{ async: true }"
    }, { status: 500 });
  }
}

// 查询异步任务结果
export async function GET(request: Request, { params }: { params: { taskId: string } }) {
  const taskId = params.taskId;

  if (!taskId) {
    return NextResponse.json({
      success: false,
      error: "未提供任务ID"
    }, { status: 400 });
  }

  const task = asyncTasks.get(taskId);

  if (!task) {
    return NextResponse.json({
      success: false,
      error: "任务不存在或已过期"
    }, { status: 404 });
  }

  // 如果任务完成，删除任务记录以节省内存
  if (task.status === 'completed' || task.status === 'failed') {
    const response = {
      success: task.status === 'completed',
      status: task.status,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt
    };

    // 延迟删除，让客户端有足够时间获取结果
    setTimeout(() => {
      asyncTasks.delete(taskId);
    }, 5000);

    return NextResponse.json(response);
  }

  return NextResponse.json({
    success: true,
    status: task.status,
    createdAt: task.createdAt,
    message: `任务${task.status === 'pending' ? '等待中' : '处理中'}，请继续轮询`
  });
}

// 异步处理OCR任务
async function processOCRTask(taskId: string, imageDataUrl: string) {
  try {
    console.log(`🔄 开始异步处理任务 ${taskId}`);

    const task = asyncTasks.get(taskId);
    if (task) {
      task.status = 'processing';
    }

    const result = await processOCRDirect(imageDataUrl);

    if (task) {
      task.status = 'completed';
      task.result = result;
    }

    console.log(`✅ 任务 ${taskId} 处理完成`);

  } catch (error) {
    console.error(`❌ 任务 ${taskId} 处理失败:`, error);

    const task = asyncTasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = error.message;
    }
  }
}

// 直接处理OCR（无超时限制）
async function processOCRDirect(imageDataUrl: string) {
  // 检查API密钥配置
  if (!VOLCENGINE_API_KEY) {
    throw new Error('火山引擎API密钥未配置');
  }

  // 尝试火山引擎API
  try {
    console.log('🌋 尝试使用火山引擎API...');

    const ocrResponse = await fetch(VOLCENGINE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOLCENGINE_API_KEY}`,
        "User-Agent": "AIToolsForTeachers/1.0 (Async)",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate, br"
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
        max_tokens: 4000
      })
    });

    const ocrData = await ocrResponse.json();

    if (!ocrResponse.ok) {
      console.error("❌ 火山引擎API错误:", ocrData);
      throw new Error(`火山引擎API调用失败: ${ocrData.error?.message || "未知错误"}`);
    }

    const rawText = ocrData.choices[0].message.content;
    const englishOnlyText = rawText
      .split('\n')
      .map(line => line.replace(/[\u4e00-\u9fff]/g, '').trim())
      .filter(line => line.length > 0)
      .join('\n');

    return {
      text: rawText,
      englishOnly: englishOnlyText,
      provider: '火山引擎'
    };

  } catch (volcengineError) {
    console.error('❌ 火山引擎失败:', volcengineError);

    // 尝试极客智坊备用方案
    if (GEEKAI_API_KEY) {
      try {
        console.log('🤖 尝试极客智坊备用方案...');

        const fallbackResponse = await fetch(GEEKAI_API_URL, {
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

        const fallbackData = await fallbackResponse.json();

        if (!fallbackResponse.ok) {
          throw new Error(`极客智坊API调用失败: ${fallbackData.error?.message || "未知错误"}`);
        }

        const rawText = fallbackData.choices[0].message?.content || '';
        const englishOnlyText = rawText
          .split('\n')
          .map(line => line.replace(/[\u4e00-\u9fff]/g, '').trim())
          .filter(line => line.length > 0)
          .join('\n');

        return {
          text: rawText,
          englishOnly: englishOnlyText,
          provider: '极客智坊 Gemini-2.5-flash-lite'
        };

      } catch (geekaiError) {
        console.error('❌ 极客智坊也失败:', geekaiError);
      }
    }

    throw new Error("OCR识别失败：所有服务均不可用");
  }
}