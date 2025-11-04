import { NextResponse } from "next/server";

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;

export async function POST(request: Request) {
  try {
    // 获取请求数据
    const { text, options = {} } = await request.json();

    if (!text) {
      return NextResponse.json({
        success: false,
        error: "未提供文本内容"
      }, { status: 400 });
    }

    console.log('句子提取API - 收到文本:', text.substring(0, 100) + '...');

    // 提取选项
    const {
      minLength = 10,           // 最小长度
      includeFragments = false, // 是否包含片段
      preserveOriginal = true   // 是否保持原格式
    } = options;

    const prompt = `请从以下文本中准确提取所有完整的英文句子。文本可能是词汇表、练习题、作文或其他格式化内容。

要求：
1. 只提取完整的英文句子（必须包含主语和谓语，以句号、问号、感叹号结尾）
2. 忽略词汇、短语、中文翻译、数字编号、格式化标记
3. 保持句子的原始形式，不要修改或润色，确保完整性
4. 句子长度至少${minLength}个字符
5. 每行一个句子，不要编号
6. 确保提取的是完整可用的句子，不是单词或片段

${!includeFragments ? '重要：请提取完整的句子，而不是片段！' : ''}

示例：
输入：
applause echo
When he won the first place in the sports meeting, there was a roar applause echo from the audience 当他在运动会取得第一名时，台下响起了轰鸣般的掌声

输出：
When he won the first place in the sports meeting, there was a roar applause echo from the audience.

现在请处理以下文本：
${text}

请只输出提取的完整英文句子，每行一句：`;

    // 调用火山引擎API进行句子提取
    const response = await fetch(VOLCENGINE_API_URL, {
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
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("句子提取API错误:", data);
      return NextResponse.json({
        success: false,
        error: `句子提取失败: ${data.error?.message || "未知错误"}`
      }, { status: 500 });
    }

    const aiResult = data.choices[0].message.content;
    console.log('AI句子提取结果:', aiResult.substring(0, 200) + '...');

    // 解析AI返回的句子
    const sentences = aiResult
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // 基础过滤
        if (line.length < minLength) return false;
        if (!/[a-zA-Z]/.test(line)) return false;

        // 如果不包含片段，检查是否是完整句子
        if (!includeFragments) {
          // 必须以标点符号结尾
          if (!/[.!?]$/.test(line.trim())) return false;

          // 必须包含主语和谓语（简单判断）
          const words = line.toLowerCase().split(/\s+/);
          const hasSubject = words.some(word => ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'].includes(word));
          const hasVerb = words.some(word => ['is', 'am', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'can', 'could', 'should', 'would', 'may', 'might', 'must', 'do', 'does', 'did'].includes(word) || word.endsWith('ed') || word.endsWith('ing'));

          if (!hasSubject && !hasVerb && !/[.!?]/.test(line)) return false;
        }

        return true;
      });

    console.log(`成功提取 ${sentences.length} 个句子`);

    return NextResponse.json({
      success: true,
      result: {
        originalText: text,
        extractedSentences: sentences,
        extractionMethod: 'ai',
        options: {
          minLength,
          includeFragments,
          preserveOriginal
        }
      },
      message: "成功提取句子"
    });
  } catch (error) {
    console.error("句子提取处理错误:", error);
    return NextResponse.json({
      success: false,
      error: "句子提取处理失败"
    }, { status: 500 });
  }
}