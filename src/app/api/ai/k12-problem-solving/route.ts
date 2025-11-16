import { NextRequest, NextResponse } from 'next/server';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// API端去重函数
const deduplicateSolution = (content: string): string => {
  // 检测是否有大段重复内容
  const sections = content.split(/\n##\s+/).filter(section => section.trim());

  // 如果发现多个相同的"📚 学科识别"模式，只保留第一个完整的section
  if (sections.length > 1) {
    console.log(`API端检测到重复内容 (${sections.length} 个section)，进行去重`);

    // 寻找第一个包含完整回答的section
    const firstSection = sections[0];
    if (firstSection.includes('📚 学科识别')) {
      // 重新组装第一个完整的section，确保包含"## "前缀
      let finalContent = '## ' + firstSection.trim();

      // 尝试从其他section中寻找知识拓展部分，如果有且更完整的话
      for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        if (section.includes('📖 知识拓展')) {
          const knowledgeMatch = section.match(/📖\s+知识拓展[\s\S]*/);
          if (knowledgeMatch) {
            // 添加知识拓展部分，确保有完整的格式
            if (!finalContent.includes('## 📖 知识拓展')) {
              finalContent += '\n\n## 📖 ' + knowledgeMatch[0];
            }
            break;
          }
        }
      }

      console.log('API端去重完成，保留第一个完整回答，长度:', finalContent.length);
      return finalContent;
    }
  }

  // 常规去重（保留原有逻辑）
  const lines = content.split('\n');
  const seenLines = new Set<string>();
  const deduplicatedLines: string[] = [];

  for (const line of lines) {
    const normalizedLine = line.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!seenLines.has(normalizedLine)) {
      seenLines.add(normalizedLine);
      deduplicatedLines.push(line);
    }
  }

  return deduplicatedLines.join('\n');
};

// 阿里云DashScope API配置 - 使用国内版
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.AliYun_APIKEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 智谱清言API配置
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_AGENTS_URL = 'https://open.bigmodel.cn/api/v1/agents';

interface K12ProblemSolvingRequest {
  problem: string;
  isImage?: boolean; // 标识是否为图像
  isWordFile?: boolean; // 标识是否为Word文件
  originalFileName?: string; // 原始文件名
}

interface K12ProblemSolvingResponse {
  success: boolean;
  solution?: string;
  error?: string;
  pointsCost?: number;
  remainingPoints?: number;
}

// 调用智谱清言agents API进行K12解题的函数
const callZhipuK12Solver = async (problem: string, originalFileName?: string): Promise<string> => {
  console.log('🎓 开始调用智谱清言agents K12解题API...');

  if (!ZHIPU_API_KEY) {
    console.error('❌ 智谱清言 API密钥未配置');
    throw new Error('智谱清言API密钥未配置，请联系管理员配置环境变量');
  }

  console.log('✅ 智谱清言 API密钥验证通过，密钥长度:', ZHIPU_API_KEY.length);

  try {
    // 检查文件类型，如果是Word文件，添加特殊处理
    const isWordFile = originalFileName?.toLowerCase().includes('.doc') ||
                      originalFileName?.toLowerCase().includes('.docx');

    // 构建智谱清言agents请求
    const requestBody = {
      agent_id: "intelligent_education_solve_agent", // 智能教育解题助手agent
      stream: false,
      messages: [
        {
          role: "user",
          content: isWordFile
            ? `请分析这个Word文档中的题目并提供详细的解题分析：\n\n文档内容：\n${problem}`
            : `请解答以下K12阶段题目：\n\n${problem}`
        }
      ],
      custom_variables: {
        education_level: "k12",
        subject: "auto_detect", // 自动识别学科
        language: "zh-CN",
        analysis_depth: "detailed", // 详细分析
        include_knowledge_points: true,
        include_study_tips: true,
        output_format: "structured"
      }
    };

    console.log('📝 智谱清言agents请求参数:', {
      agent_id: requestBody.agent_id,
      isWordFile: isWordFile,
      fileName: originalFileName,
      contentLength: requestBody.messages[0].content.length
    });

    const response = await fetch(ZHIPU_AGENTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('❌ 智谱清言 agents API HTTP错误:', {
        status: response.status,
        statusText: response.statusText,
        url: ZHIPU_AGENTS_URL
      });

      let errorDetails = '';
      try {
        const errorText = await response.text();
        console.error('❌ API错误响应:', errorText);
        errorDetails = errorText;
      } catch (textError) {
        console.error('❌ 无法读取错误响应:', textError);
      }

      throw new Error(`K12解题API请求失败 (${response.status}): ${response.statusText} ${errorDetails ? `- ${errorDetails.substring(0, 200)}` : ''}`);
    }

    // 安全地解析JSON响应
    let data;
    const responseText = await response.text();
    console.log('📥 智谱清言agents原始响应类型:', typeof responseText);
    console.log('📥 智谱清言agents响应长度:', responseText.length);

    try {
      data = JSON.parse(responseText);
      console.log('✅ 智谱清言agents K12解题API调用成功');
    } catch (parseError) {
      console.error('❌ JSON解析失败，原始响应前500字符:', responseText.substring(0, 500));
      console.error('❌ 解析错误详情:', parseError);
      throw new Error('K12解题API返回格式错误，请稍后重试');
    }

    // 提取回复内容 - 智谱清言agents响应格式可能与阿里云不同
    const result = data.choices?.[0]?.message?.content ||
                  data.result?.output?.text ||
                  data.result?.text ||
                  data.output?.text ||
                  data.content ||
                  data.message?.content ||
                  data.answer ||
                  data.response;

    if (!result) {
      console.error('❌ 智谱清言agents返回空结果，完整响应:', JSON.stringify(data, null, 2));
      throw new Error('K12解题AI服务返回了空结果，请稍后重试');
    }

    console.log('✅ 获取到智谱清言K12解题结果，内容长度:', result.length);
    console.log('🔍 智谱清言原始响应内容前500字符:', result.substring(0, 500));

    return result.trim();

  } catch (error) {
    console.error('❌ 智谱清言agents K12解题调用失败:', error);
    throw error;
  }
};

// 统一调用阿里云DashScope API进行K12解题的函数
const callK12ProblemSolver = async (problem: string, isImage?: boolean): Promise<string> => {
  console.log('🎓 开始调用阿里云DashScope K12解题API...');

  if (!DASHSCOPE_API_KEY) {
    console.error('❌ 阿里云DashScope API密钥未配置');
    throw new Error('阿里云API密钥未配置，请联系管理员配置环境变量');
  }

  console.log('✅ 阿里云DashScope API密钥验证通过，密钥长度:', DASHSCOPE_API_KEY.length);

  try {
    // 构建K12教育专用系统提示词
    const systemPrompt = `你是一位专业的K12全科教师，精通小学、初中、高中各学科知识。

请按照以下格式输出一个完整的解题分析：

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
【答案置信度】：[高/中/低]

## 📖 知识拓展
【相关知识点】：[相关联的知识点]
【学习方法】：[该类题目的解题方法和技巧]

重要要求：
- 只输出一个完整的分析，不要重复
- 保持专业、准确、易懂的风格
- 确保每个部分都有实质性内容`;

    // 根据输入类型构建请求
    const userContent = isImage ? [
      {
        type: "image_url",
        image_url: {
          url: problem
        }
      },
      {
        type: "text",
        text: "请分析这张图片中的K12阶段题目并提供详细的解题分析。"
      }
    ] : [
      {
        type: "text",
        text: `请解答以下K12阶段题目：\n\n${problem}`
      }
    ];

    // 构建请求
    const requestBody = {
      model: isImage ? "qwen-vl-plus" : "qwen-plus", // 图片用多模态模型，文本用文本模型
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.3,
      max_tokens: 6000,
      stream: false
    };

    console.log('📝 阿里云DashScope请求参数:', {
      model: requestBody.model,
      is_image: isImage,
      max_tokens: requestBody.max_tokens,
      input_length: JSON.stringify(userContent).length
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

      throw new Error(`K12解题API请求失败 (${response.status}): ${response.statusText} ${errorDetails ? `- ${errorDetails.substring(0, 200)}` : ''}`);
    }

    // 安全地解析JSON响应
    let data;
    const responseText = await response.text();
    console.log('📥 阿里云DashScope原始响应类型:', typeof responseText);
    console.log('📥 阿里云DashScope响应长度:', responseText.length);

    try {
      data = JSON.parse(responseText);
      console.log('✅ 阿里云DashScope K12解题API调用成功');
    } catch (parseError) {
      console.error('❌ JSON解析失败，原始响应前500字符:', responseText.substring(0, 500));
      console.error('❌ 解析错误详情:', parseError);
      throw new Error('K12解题API返回格式错误，请稍后重试');
    }

    // 提取回复内容
    const result = data.choices?.[0]?.message?.content ||
                  data.result?.output ||
                  data.output ||
                  data.content ||
                  data.message?.content;

    if (!result) {
      console.error('❌ K12解题API返回空结果，完整响应:', JSON.stringify(data, null, 2));
      throw new Error('K12解题AI服务返回了空结果，请稍后重试');
    }

    console.log('✅ 获取到K12解题结果，内容长度:', result.length);
    console.log('🔍 阿里云原始响应内容前500字符:', result.substring(0, 500));

    // 检查是否包含重复的"## 📚 学科识别"
    const disciplineMatches = result.match(/##\s+📚\s+学科识别/g);
    if (disciplineMatches && disciplineMatches.length > 1) {
      console.log('🚨 阿里云确实生成了重复内容！发现', disciplineMatches.length, '个"## 📚 学科识别"');
      console.log('🚨 前1000字符:', result.substring(0, 1000));
    } else {
      console.log('✅ 阿里云没有生成重复的学科识别');
    }

    return result.trim();

  } catch (error) {
    console.error('❌ 阿里云DashScope K12解题调用失败:', error);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 K12全能答疑API被调用！');

    // 获取请求数据
    const requestData: K12ProblemSolvingRequest = await request.json();
    const { problem, isImage, isWordFile, originalFileName } = requestData;

    console.log('📝 K12解题请求接收到:', {
      problemLength: problem?.length,
      isImage: isImage,
      problemPreview: problem?.substring(0, 100) + (problem?.length > 100 ? '...' : '')
    });

    // 验证必要参数
    if (!problem) {
      console.error('❌ 缺少题目参数');
      return NextResponse.json({ error: '请提供题目内容' }, { status: 400 });
    }

    // 处理不同输入类型的验证
    if (isImage && !isWordFile) {
      // 验证图片大小（通过base64长度估算）
      const base64Data = problem.split(',')[1] || problem;
      if (base64Data.length > 6000000) { // 约6MB
        console.error('❌ 图片文件过大');
        return NextResponse.json({ error: '图片文件过大，请控制在6MB以内' }, { status: 400 });
      }
    } else if (isWordFile) {
      // Word文件的特殊验证
      const base64Data = problem.split(',')[1] || problem;
      if (base64Data.length > 15000000) { // 约15MB (base64比原文件大33%)
        console.error('❌ Word文件过大');
        return NextResponse.json({ error: 'Word文件过大，请控制在10MB以内' }, { status: 400 });
      }
      console.log('✅ Word文件大小验证通过，base64长度:', base64Data.length);
    } else {
      // 文本题目长度验证
      if (problem.trim().length < 5) {
        console.error('❌ 题目内容过短');
        return NextResponse.json({ error: '题目内容过短，请提供完整的题目' }, { status: 400 });
      }

      if (problem.trim().length > 6000) {
        console.error('❌ 题目内容过长');
        return NextResponse.json({ error: '题目内容过长，请控制在6000字符以内' }, { status: 400 });
      }
    }

    // 使用Supabase进行用户认证和点数管理
    const { createServerSupabaseClient } = await import('@/lib/supabase-server');
    const supabase = createServerSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      console.error('K12解题API - 用户认证失败', {
        error: error?.message,
        hasUser: !!user
      });
      return NextResponse.json(
        { success: false, error: '用户认证失败，请重新登录' },
        { status: 401 }
      );
    }

    console.log('K12解题API - 用户验证成功', {
      userId: user.id,
      email: user.email
    });

    // 点数管理 - 每次解题消耗4点数
    const pointsCost = 4;
    const currentUserId = user.id;

    try {
      const pointsDeducted = await SupabasePointsService.deductPoints(currentUserId, pointsCost, 'k12_problem_solving');

      if (!pointsDeducted) {
        console.log('K12解题API - 点数不足，拒绝请求', { userId: currentUserId });
        return NextResponse.json(
          { success: false, error: `点数不足，需要${pointsCost}点数` },
          { status: 402 }
        );
      }

      console.log('K12解题API - 点数扣除成功', { userId: currentUserId, pointsCost });
    } catch (pointsError) {
      console.error('K12解题API - 点数扣除失败:', pointsError);
      return NextResponse.json(
        { success: false, error: '点数验证失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 智能选择API并调用K12解题
    let solution;
    try {
      console.log('🤖 开始智能选择K12解题API服务...');

      // 智能选择API：
      // 1. 图片文件 → 阿里云DashScope (qwen-vl-plus)
      // 2. Word文件 → 智谱清言 agents
      // 3. 纯文本 → 智谱清言 agents

      let solutionService = '';
      let selectedAPI = '';

      if (isImage) {
        solutionService = '阿里云DashScope (qwen-vl-plus)';
        selectedAPI = 'dashscope';
        solution = await callK12ProblemSolver(problem.trim(), isImage);
        console.log('✅ 使用阿里云DashScope完成图片K12解题');
      } else if (originalFileName?.toLowerCase().includes('.doc') || originalFileName?.toLowerCase().includes('.docx')) {
        solutionService = '智谱清言 agents';
        selectedAPI = 'zhipu';
        solution = await callZhipuK12Solver(problem.trim(), originalFileName);
        console.log('✅ 使用智谱清言agents完成Word文档K12解题');
      } else {
        // 纯文本优先使用智谱清言agents，如果失败则降级到阿里云
        solutionService = '智谱清言 agents';
        selectedAPI = 'zhipu';

        try {
          solution = await callZhipuK12Solver(problem.trim(), originalFileName);
          console.log('✅ 使用智谱清言agents完成纯文本K12解题');
        } catch (zhipuError) {
          console.warn('⚠️ 智谱清言agents失败，降级使用阿里云DashScope');
          solutionService = '阿里云DashScope (降级)';
          selectedAPI = 'dashscope';
          solution = await callK12ProblemSolver(problem.trim(), false);
          console.log('✅ 降级使用阿里云DashScope完成K12解题');
        }
      }

      console.log('📊 API调用完成，使用服务:', solutionService);

    } catch (error) {
      console.error('❌ K12解题API调用失败:', error);

      // API失败时退还点数
      try {
        const refundReason = `K12解题失败-${currentUserId}`;
        await SupabasePointsService.addPoints(currentUserId, pointsCost, refundReason);
        console.log('💰 已退还点数:', { userId: currentUserId, refundAmount: pointsCost, reason: refundReason });
      } catch (refundError) {
        console.error('退费失败:', refundError);
      }

      return NextResponse.json({
        success: false,
        error: `K12解题服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: {
          errorType: 'api_call_failed',
          pointsRefunded: true,
          refundAmount: pointsCost
        }
      }, { status: 500 });
    }

    const response: K12ProblemSolvingResponse = {
      success: true,
      solution: solution,
      pointsCost: 4,
      remainingPoints: 800 // 这里应该从数据库获取真实剩余点数
    };

    console.log('✅ 成功生成K12解题响应:', {
      success: response.success,
      solutionLength: solution?.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 K12解题失败:', error);

    // 系统错误时退还点数
    try {
      const refundReason = `K12解题系统错误-${currentUserId}`;
      await SupabasePointsService.addPoints(currentUserId, pointsCost, refundReason);
      console.log('💰 系统错误已退还点数:', { userId: currentUserId, refundAmount: pointsCost, reason: refundReason });
    } catch (refundError) {
      console.error('系统错误退费失败:', refundError);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'K12解题失败，请稍后重试',
      details: {
        errorType: 'system_error',
        pointsRefunded: true,
        refundAmount: pointsCost
      }
    }, { status: 500 });
  }
}