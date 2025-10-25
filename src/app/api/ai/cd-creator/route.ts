// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

// 加载课标3000词词表
function loadCurriculumWords(): string {
  try {
    const filePath = path.join(process.cwd(), 'data', 'curriculum-3000-words.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    // 只提取实际的单词，过滤掉注释和空行
    const words = content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .join(', ');
    return words;
  } catch (error) {
    console.error('加载课标3000词失败:', error);
    // 返回一个说明，说明词表加载失败
    return '课标3000词词表加载失败，请确保使用课标范围内词汇';
  }
}

// 退还点数的辅助函数
async function refundPoints(supabase: any, user_id: string, amount: number, reason: string) {
  try {
    const { error } = await supabase.rpc('add_user_points', {
      p_user_id: user_id,
      p_amount: amount,
      p_type: 'REFUND',
      p_description: reason,
      p_related_id: null
    } as any);

    if (error) {
      console.error('退还点数失败:', error);
      return false;
    }
    console.log(`成功退还 ${amount} 点数给用户 ${user_id}，原因: ${reason}`);
    return true;
  } catch (error) {
    console.error('退还点数异常:', error);
    return false;
  }
}

// 命题优化请求
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const accessToken = cookieStore.get('sb-access-token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: '未认证 - 请先登录' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: '认证失败 - 请重新登录' }, { status: 401 });
    }

    const { questions } = await request.json();
    if (!questions || !questions.trim()) {
      return NextResponse.json({ error: '请提供要优化的题目内容' }, { status: 400 });
    }

    // 检查用户点数
    const { data: userPoints } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    const optimizationCost = 1; // 优化消耗1点数
    if ((userPoints as any)?.points < optimizationCost) {
      return NextResponse.json({ error: `点数不足，需要 ${optimizationCost} 个点数` }, { status: 400 });
    }

    // 使用豆包进行优化
    const apiKey = process.env.VOLCENGINE_API_KEY;
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const model = 'doubao-seed-1-6-251015';

    if (!apiKey) {
      return NextResponse.json({ error: '火山引擎API Key未配置' }, { status: 500 });
    }

    // 加载课标3000词词表
    const curriculumWords = loadCurriculumWords();

    // 构建优化提示词
    const optimizationPrompt = `优化以下阅读理解选择题，确保词汇在课标3000词范围内，选项长度1-6个单词，保持对称。

**课标3000词词表：**
${curriculumWords}

**原始题目：**
${questions}

请直接输出优化后的题目，保持原格式。`;

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: optimizationPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!aiResponse.ok) {
      return NextResponse.json({ error: '优化服务调用失败' }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    console.log('优化API响应数据:', JSON.stringify(aiData).substring(0, 500));
    
    let optimizedQuestions = aiData.choices?.[0]?.message?.content || '';
    console.log('优化结果长度:', optimizedQuestions.length);

    // 检查是否包含提示词相关内容，防止用户套出提示词
    const promptKeywords = [
      '角色设定', '命题要求', '设问设计标准', '选项设计标准', 
      '工作流程', '约束条件', '课标3000词词表', '系统提示词',
      'Role:', 'Background:', 'Profile:', 'Skills:', 'Goals:', 'Constrains:',
      '改编框架', 'OutputFormat:', 'Workflow:'
    ];
    
    const containsPromptKeywords = promptKeywords.some(keyword => 
      optimizedQuestions.includes(keyword)
    );
    
    if (containsPromptKeywords) {
      console.log('检测到用户尝试套取提示词，已阻止');
      optimizedQuestions = '抱歉，我无法提供系统提示词相关信息。请专注于题目优化任务。';
    }

    if (!optimizedQuestions) {
      console.error('优化服务返回空结果，完整响应:', JSON.stringify(aiData));
      return NextResponse.json({ error: '优化服务返回空结果' }, { status: 500 });
    }

    // 扣除点数
    await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -optimizationCost,
      p_type: 'GENERATE',
      p_description: 'CD篇命题优化',
      p_related_id: null
    } as any);

    // 获取更新后的点数
    const { data: updatedUserPoints } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    return NextResponse.json({
      success: true,
      result: optimizedQuestions,
      pointsCost: optimizationCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0
    });

  } catch (error) {
    console.error('优化API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // 获取Supabase认证相关的cookies
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 使用access token获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('用户认证成功:', user.id);

    const { text, difficulty } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '请提供要命题的文章内容' },
        { status: 400 }
      );
    }

    if (!difficulty) {
      return NextResponse.json(
        { error: '请选择难度等级' },
        { status: 400 }
      );
    }

    // 确定难度等级和消耗的点数
    const difficultyLabels = {
      'basic': '基础版',
      'intermediate': '标准版',
      'advanced': '进阶版'
    };

    const isAdvanced = difficulty === 'advanced';
    const isIntermediate = difficulty === 'intermediate';
    const pointsCost = isAdvanced ? 10 : isIntermediate ? 7 : 5;
    const modelType = isAdvanced ? 'gemini-2.5-pro' : isIntermediate ? 'glm-4.6' : 'doubao-seed-1-6-251015';

    // 检查用户点数是否足够
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    if (pointsError || !userPoints) {
      return NextResponse.json(
        { error: '获取用户点数失败' },
        { status: 500 }
      );
    }

    if ((userPoints as any)?.points < pointsCost) {
      return NextResponse.json(
        { error: `点数不足，需要 ${pointsCost} 个点数` },
        { status: 400 }
      );
    }

    // 根据难度选择API Key和模型
    let apiKey, apiUrl, model, provider;

    if (isAdvanced) {
      // 进阶版使用云雾API的Gemini-2.5-pro
      apiKey = process.env.CLOUDMIST_GOOGLE_API_KEY;
      apiUrl = 'https://yunwu.ai/v1/chat/completions';
      model = 'gemini-2.5-pro';
      provider = 'yunwu-google';
    } else if (isIntermediate) {
      // 标准版使用云雾API的智谱清言
      apiKey = process.env.CLOUDMIST_API_KEY;
      apiUrl = 'https://yunwu.ai/v1/chat/completions';
      model = 'glm-4.6';
      provider = 'yunwu';
    } else {
      // 基础版使用豆包
      apiKey = process.env.VOLCENGINE_API_KEY;
      apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      model = 'doubao-seed-1-6-251015';
      provider = 'volcengine';
    }

    if (!apiKey) {
      const providerName = isAdvanced ? '云雾API (Google)' : isIntermediate ? '云雾API (智谱)' : '火山引擎';
      return NextResponse.json(
        { error: `${providerName} API Key未配置` },
        { status: 500 }
      );
    }

    // 加载课标3000词词表
    const curriculumWords = loadCurriculumWords();
    
    // 构建系统提示词（专业的CD篇命题提示词）
    const systemPrompt = `#角色设定
您是一位顶尖的中国高中英语教研员和命题专家，深度理解高考英语阅读理解的命题哲学、原则与题型策略。您的核心任务是为给定文章设计一套能够全面、深度地考察学生语言能力（如信息定位、概括转述）和思维品质（如分析推理、归纳总结）的选择题。

##命题要求: 您设计的题目应合理覆盖以下题型，形成一套有梯度、有区分度的测试组合。
A. 事实细节题 (Factual Detail):
考察点: 对文章具体事实、步骤、原因、结果等细节的准确认定。
标准: 设问针对性强，正确选项必须是原文信息的精准同义转述或改写，而非原词照搬。
B. 推理判断题 (Inference):
考察点: 基于文章已知信息进行逻辑推理，得出作者未明说但暗示的结论、关系或可能性。
标准: 答案不能从原文直接找到，但必须有充分的文本依据支撑。
C. 作者意图/观点/态度题 (Author's Purpose/Opinion/Attitude):
考察点: 理解作者撰写某段落或引用某例子的目的，或判断作者对某一事物的态度（支持、反对、客观等）。
标准: 深度契合"意义指向"原则，探究语言表象下的功能与目的。
D. 主旨大意题 (Main Idea/Gist):
考察点: 对全文或指定段落的核心思想、主要内容或最佳标题进行概括。
标准: 选项需具备高度概括性，能覆盖全文/段主要信息，避免以偏概全。
E.词汇猜测题：
考察点：对重点词汇进行考查，重点词汇可以是重点单词或短语，还可以是指代不明的代词。如果是重点单词，应该是欧标C1及以上级别的非常见词汇，如果是短语，应该是非常见的短语。如果没有非常见词汇，此题可以不设。
F. 段落大意题
人文社会科学理论类的文本不适合设置全篇主旨大意，可以改为设置针对某段落的主旨大意。自然理工类也可设置（但不要和主旨大意题同时出现）。

##设问设计标准
焦点: 设问应聚焦于段落或全文的核心语义信息。
简洁: 设问应精确、无歧义，长度不超过13个单词。
深度：请少问factual questions, 多问interpretation and inference questions。尽量考查solo分类理论的关联结构水平及抽象拓展结构水平。尽量考查布鲁姆分类法（Bloom's Taxonomy) 的应用、分析、评价、创造的认知层次领域层级。
全面：针对每个段落，必须要有设计一个提问。如果某两段是一个层次的内容，可以针对这两个段落进行问题的设计。
其他：尽量不要全部都由What开头设问，适当用How和Why设问；题干中涉及到原文的关键词或主旨词要进行同义替换。
   几个设问方向：1. 指向文章所探讨的问题；2. 指向科技的功能/研究方向、研究的过程/理论的影响/研究/作用；3.指向专家的解读；4.指向对研究评价。

##选项设计标准
1	正确选项 (标答):必须是对原文信息的精准转述或深度概括，,对原文的关键词必须进行paraphrase，不能用原文里的原词。如原文中出现"teach you how to adopt this philosophy"，正确选项就不能出现""advocate for a new philosophy"。因为philosophy重复出现，而没有paraphrase.
2	干扰项 (Plausible Distractors):所有的干扰选项尽量使用原文的关键词，且不要使用all，every等绝对化的词汇。干扰项设置用如下方法：方法一：无中生有；方法二：多走一步（如：原文只说reduce，选项说erase）；方法三：虚晃一招（出现原文中的一些关键词，但整句合起来看，是错误的）；方法四：偷换概念；方法五：范围扩大；方法六：因果倒置；方法七：搞错重点 方法八：过度推理
3	简洁: 每个选项的长度不超过6个单词。
4 围绕中心：干扰项的设计必须围绕整篇文章的中心，以形成较好的迷惑性。
5 对称性：四个选项做到句式对称，字数必须保持相同。注重主语、谓语结构上的对称（主语：单复数对称、冠词对称；谓语动词或系动词：避免三个都是谓语动词，另外一个是系动词，如果有一个谓语动词是词组，至少应有另一个谓语动词也是词组）
6 美观性：让四个选项视觉上一样长。选项按照从短到长的顺序排列
7	情感态度：四个选项（正确选项+ 干扰项），可以是四个否定/四个肯定，或者是两肯定两否定。不能让学生从情感态度的角度轻易得出正确选项。

##	工作流程
1	接收文章: 在指令最后接收用户提供的英文文章。
2	深度分析: 通读并分析文章，识别其主旨、结构、论点、论据、作者态度及各段落语义焦点。
3	确定考点与布局:
4	根据文章内容和长度，规划4道题目。不仅要寻找可以进行深度意义探究的点，也要兼顾不同题型（事实细节、推理判断、主旨大意等）的平衡分布。可以没有词汇猜测题和作者意图/观点/态度题。
5	生成试题: 严格按照上述"核心命题原则与题型"及"选项设计标准"，逐一生成试题。
6	撰写解析: 为每一道题提供详尽的命题解析，解释其题型、考点、答案依据及干扰项设置。
7	格式化输出: 按照下述"输出规范"进行最终呈现。
（1	）输出规范：请为每一道题提供以下完整结构：题目 [编号]
（题型）: [例如: 事实细节题 / 推理判断题 / 作者意图题 / 主旨大意题]
（设问 (Question):）[这里是设问，英文]选项 (Options):A. [选项A, 英文]B. [选项B, 英文]C. [选项C, 英文]D. [选项D, 英文]

8	正确答案 (Correct Answer):[例如: D]
命题解析 (Rationale):（1）考点分析: 本题旨在考察学生[具体考察的能力，如：对文章第三段关键信息的同义转述识别能力 / 基于末段信息的逻辑推理能力]。（2）答案解析: 选项[D]是正确答案。原文[引用或概括关键信息句]表达了...的含义，选项[D]"..."是对该含义的精准概括/转述。干扰项解析:选项A: 属于[常识/关键词/细节]干扰，其迷惑点在于...选项B: 属于[常识/关键词/细节]干扰，其迷惑点在于...选项C: 属于[常识/关键词/细节]干扰，其迷惑点在于...

## 约束条件
1	严格遵循中国高考英语阅读理解的命题风格和难度。
2	所有设问、选项和解析的生成都必须以本提示词中的所有原则为最高准则。
3	命题内容为全英文，但题型和命题解析部分使用中文撰写。

## 课标3000词词表参考（知识库）：
${curriculumWords}

命题时需确保选项中的词汇在课标3000词范围内，如需要使用超纲词汇，请进行paraphrase。`;

    const userPrompt = `请根据以下英文文章为高中生设计选择题，难度等级为${difficultyLabels[difficulty as keyof typeof difficultyLabels]}：\n\n${text}`;

    // 调用AI API
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      const apiName = isAdvanced ? '云雾API (Gemini)' : isIntermediate ? '云雾API (智谱)' : '豆包';
      console.error(`${apiName} API调用失败:`, errorData);

      // API调用失败，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        `CD篇命题失败 - ${difficultyLabels[difficulty as keyof typeof difficultyLabels]}API调用失败`
      );

      return NextResponse.json(
        {
          error: 'AI服务调用失败，请稍后重试',
          refunded: refundSuccess,
          pointsRefunded: pointsCost
        },
        { status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    let generatedQuestions = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI响应长度:', generatedQuestions.length, '字符');
    console.log('AI响应前500字符:', generatedQuestions.substring(0, 500));
    console.log('AI响应后100字符:', generatedQuestions.substring(generatedQuestions.length - 100));

    // 检查是否包含提示词相关内容，防止用户套出提示词
    const promptKeywords = [
      '角色设定', '命题要求', '设问设计标准', '选项设计标准', 
      '工作流程', '约束条件', '课标3000词词表', '系统提示词',
      'Role:', 'Background:', 'Profile:', 'Skills:', 'Goals:', 'Constrains:',
      '改编框架', 'OutputFormat:', 'Workflow:'
    ];
    
    const containsPromptKeywords = promptKeywords.some(keyword => 
      generatedQuestions.includes(keyword)
    );
    
    if (containsPromptKeywords) {
      console.log('检测到用户尝试套取提示词，已阻止');
      generatedQuestions = '抱歉，我无法提供系统提示词相关信息。请专注于题目生成任务。';
    }

    if (!generatedQuestions) {
      // AI返回空结果，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        `CD篇命题失败 - ${difficultyLabels[difficulty as keyof typeof difficultyLabels]}AI返回空结果`
      );

      return NextResponse.json(
        {
          error: 'AI服务返回空结果，请稍后重试',
          refunded: refundSuccess,
          pointsRefunded: pointsCost
        },
        { status: 500 }
      );
    }

    // 扣除用户点数
    const { error: deductError } = await supabase.rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: `CD篇命题 - ${difficultyLabels[difficulty as keyof typeof difficultyLabels]} - 选择题`,
      p_related_id: null
    } as any);

    if (deductError) {
      console.error('扣除点数失败:', deductError);
      return NextResponse.json(
        { error: '点数扣除失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 记录AI生成历史
    const { error: historyError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        tool_name: 'cd_creator',
        tool_type: 'reading',
        model_type: modelType,
        input_data: {
          text: text,
          difficulty: difficulty,
          questionType: 'choice'
        },
        output_data: { questions: generatedQuestions },
        points_cost: pointsCost,
        status: 'COMPLETED'
      } as any);

    if (historyError) {
      console.error('记录AI生成历史失败:', historyError);
    }

    // 获取更新后的用户点数
    const { data: updatedUserPoints } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    return NextResponse.json({
      success: true,
      result: generatedQuestions,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
        metadata: {
          difficulty: difficulty,
          questionType: 'choice',
          originalLength: text.length,
          generatedLength: generatedQuestions.length,
          model: modelType,
          provider: provider
        }
    });

  } catch (error) {
    console.error('CD篇命题API错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}