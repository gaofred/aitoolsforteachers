import { NextRequest, NextResponse } from 'next/server';

// 阿里云DashScope API配置 - 使用国内版
const DASHSCOPE_API_KEY = process.env.AliYun_APIKEY || process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

interface EduTutorRequest {
  image: string; // base64图片数据
  question?: string; // 可选的问题文本
}

interface EduTutorResponse {
  success: boolean;
  result?: string;
  error?: string;
  details?: any;
}

// 调用阿里云DashScope多模态API进行K12解题
const callEduTutorAPI = async (image: string, question?: string): Promise<string> => {
  console.log('🎓 开始调用阿里云DashScope教育解题API...');

  if (!DASHSCOPE_API_KEY) {
    console.error('❌ 阿里云DashScope API密钥未配置');
    throw new Error('阿里云API密钥未配置，请联系管理员配置环境变量');
  }

  console.log('✅ 阿里云DashScope API密钥验证通过，密钥长度:', DASHSCOPE_API_KEY.length);

  try {
    // 构建K12教育专用系统提示词
    const systemPrompt = `你是一位专业的K12全科教师，精通小学、初中、高中各学科知识，包括语文、数学、英语、物理、化学、生物等六大主科，具备强大的多模态图像分析能力。

你的任务是：
1. 分析图片中的K12阶段题目（可能包含数学公式、图表、特殊符号等）
2. 自动识别题目所属学科和年级阶段
3. 按照标准格式输出解题结果
4. 提供详细的解题思路和步骤
5. 给出答案置信度评估

标准输出格式要求：
## 📚 学科识别
【学科】：[学科名称]
【年级阶段】：[小学/初中/高中]
【知识点】：[相关知识点]

## 🎯 题目分析
【题型分析】：[题目类型和难度]
【解题思路】：[整体解题策略和思路]

## 💡 详细解析
【解题步骤】：[分步骤详细解题过程]
【关键点】：[解题关键要点和技巧]

## ✅ 最终答案
【标准答案】：[最终答案]
【答案置信度】：[高/中/低]（基于题目明确度和解题确定性）

## 📖 知识拓展
【相关知识点】：[相关联的知识点]
【学习方法】：[该类题目的解题方法和技巧]

请严格按照上述格式输出，确保解析专业、准确、易懂。`;

    // 构建多模态请求
    const requestBody = {
      model: "qwen-vl-plus", // 阿里云通义千问多模态模型
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: image
              }
            },
            {
              type: "text",
              text: question || "请分析这张图片中的K12阶段题目并提供详细的解题分析。"
            }
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 6000,
      stream: false
    };

    console.log('📝 阿里云DashScope多模态请求参数:', {
      model: requestBody.model,
      has_image: true,
      max_tokens: requestBody.max_tokens,
      image_url_length: image.length
    });

    const response = await fetch(DASHSCOPE_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('❌ 阿里云DashScope API HTTP错误:', {
        status: response.status,
        statusText: response.statusText,
        url: DASHSCOPE_BASE_URL
      });

      let errorDetails = '';
      try {
        const errorText = await response.text();
        console.error('❌ API错误响应:', errorText);
        errorDetails = errorText;
      } catch (textError) {
        console.error('❌ 无法读取错误响应:', textError);
      }

      throw new Error(`阿里云DashScope API请求失败 (${response.status}): ${response.statusText} ${errorDetails ? `- ${errorDetails.substring(0, 200)}` : ''}`);
    }

    // 安全地解析JSON响应
    let data;
    const responseText = await response.text();
    console.log('📥 阿里云DashScope原始响应类型:', typeof responseText);
    console.log('📥 阿里云DashScope响应长度:', responseText.length);

    // 检查是否是data URI格式
    if (responseText.startsWith('data:')) {
      console.error('❌ 阿里云DashScope API返回了data URI格式而不是JSON:', responseText.substring(0, 100));
      throw new Error('阿里云DashScope API返回了意外的数据格式，请稍后重试');
    }

    try {
      data = JSON.parse(responseText);
      console.log('✅ 阿里云DashScope API调用成功');
    } catch (parseError) {
      console.error('❌ JSON解析失败，原始响应前500字符:', responseText.substring(0, 500));
      console.error('❌ 解析错误详情:', parseError);
      throw new Error('阿里云DashScope API返回格式错误，请稍后重试');
    }

    console.log('📊 解析后的数据结构:', Object.keys(data));

    // 提取回复内容
    const result = data.choices?.[0]?.message?.content ||
                  data.result?.output ||
                  data.output ||
                  data.content ||
                  data.message?.content;

    if (!result) {
      console.error('❌ 阿里云DashScope API返回空结果，完整响应:', JSON.stringify(data, null, 2));
      throw new Error('阿里云教育API返回了空结果，请稍后重试');
    }

    console.log('✅ 获取到解题结果，内容长度:', result.length);
    return result.trim();

  } catch (error) {
    console.error('❌ 阿里云DashScope API调用失败:', error);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 阿里云教育解题API被调用！');

    // 获取请求数据
    const requestData: EduTutorRequest = await request.json();
    const { image, question } = requestData;

    console.log('📝 解题请求接收到:', {
      hasImage: !!image,
      hasQuestion: !!question,
      imageLength: image?.length,
      questionLength: question?.length
    });

    // 验证必要参数
    if (!image) {
      console.error('❌ 缺少图片参数');
      return NextResponse.json({
        success: false,
        error: '请提供图片内容'
      }, { status: 400 });
    }

    // 验证图片格式
    if (!image.startsWith('data:image/')) {
      console.error('❌ 图片格式错误');
      return NextResponse.json({
        success: false,
        error: '图片格式不正确，请上传有效的图片文件'
      }, { status: 400 });
    }

    // 验证图片大小（base64大约比原图大33%，所以限制base64长度为6MB左右）
    const base64Data = image.split(',')[1] || image;
    if (base64Data.length > 6000000) { // 约6MB
      console.error('❌ 图片文件过大');
      return NextResponse.json({
        success: false,
        error: '图片文件过大，请控制在6MB以内'
      }, { status: 400 });
    }

    // 调用阿里云教育解题辅导API
    let solution;
    try {
      console.log('🎓 开始调用阿里云教育解题辅导API...');

      solution = await callEduTutorAPI(image.trim(), question);

      console.log('✅ 阿里云教育解题完成');

    } catch (error) {
      console.error('❌ 阿里云教育解题调用失败:', error);

      return NextResponse.json({
        success: false,
        error: `教育解题服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: {
          errorType: 'api_call_failed',
        }
      }, { status: 500 });
    }

    const response: EduTutorResponse = {
      success: true,
      result: solution
    };

    console.log('✅ 成功生成阿里云解题响应:', {
      success: response.success,
      resultLength: solution?.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 阿里云解题失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '解题失败，请稍后重试'
    }, { status: 500 });
  }
}