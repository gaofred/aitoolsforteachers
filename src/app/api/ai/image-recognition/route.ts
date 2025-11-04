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
                text: "你是专业的OCR文字识别专家。请极其仔细地识别图片中的所有文字内容，保持精确的段落结构。\n\n**极其重要的识别要求：**\n1. **精确识别中文姓名**：第一行通常是学生的中文姓名（2-4个汉字），必须准确识别并保留\n2. **严格保持段落结构**：\n   - 每个独立的段落必须单独成行\n   - 段落之间的空行也要保留\n   - 标题、正文、落款都要区分开\n   - 如果原文有换行，你必须用\\n表示换行\n3. **完整识别所有内容**：中文和英文内容都要完整识别，不能忽略任何一种语言\n4. **保持标点符号**：所有标点符号（包括中英文标点）都要准确识别\n5. **保持格式缩进**：如果有缩进格式，请保持原样\n6. **逐字逐句输出**：不要省略任何文字，不要合并段落\n7. **直接输出原文**：不要添加任何解释、格式化或描述\n\n**特别强调：**\n- 如果看到\"1. 2. 3.\"这样的编号格式，每个编号项必须是独立段落\n- 如果有标题（如\"Notice\"），它应该单独成行\n- 邮件、通知等应用文的格式结构必须严格保持\n- 段落之间不要随意合并，保持原文的分段逻辑\n\n警告：任何文字和格式都不能遗漏！如果图片中没有文字，请回复'无文字内容'。"
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
                  text: "紧急重新识别！上次识别可能遗漏了中文内容或段落结构错误。请极其仔细地重新识别：\n\n**重点识别要求：**\n1. 第一行的中文名字（2-4个汉字）\n2. **严格保持段落结构**：每个段落必须单独成行，不要合并\n3. 如果看到\"Notice\"、\"1.\"、\"2.\"等，它们必须独立成行\n4. 所有的换行和空行都要保留\n5. 完整的英文内容，包括所有标点符号\n\n直接输出完整原文，不要解释，确保段落格式正确！"
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