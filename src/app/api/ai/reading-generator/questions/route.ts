// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

function getDifficultyGuidelines(difficulty: string): string {
  const guidelines: Record<string, string> = {
    'easy': `- Use moderate vocabulary (common 2-3 syllable words)
- Keep questions under 15 words, options under 12 words
- Balance of literal and inferential questions
- Use various tenses appropriately
- Complex sentences with conjunctions
- Options require some thinking but remain clear
- Include abstract concepts that are directly supported`,

    'medium': `- Use richer vocabulary (3-4 syllable words appropriately)
- Questions can be 15-20 words, options 12-15 words
- Emphasis on inferential and analytical questions
- Use complex sentence structures
- Options require careful consideration
- Include subtle implications and author intent
- Test critical thinking with text-based reasoning`,

    'hard': `- Use sophisticated vocabulary (academic and domain-specific)
- Questions can be 20-25 words, options 15-20 words
- Focus on deep analysis, evaluation, and synthesis
- Use complex and compound-complex sentences
- Options require nuanced understanding
- Include rhetorical devices, tone, and style analysis
- Test ability to recognize bias and perspective`
  };

  return guidelines[difficulty] || guidelines['medium'];
}

function constructQuestionPrompt(articleContent: string, questionCount: number, includeExplanation: boolean, difficulty: string): string {
  return `Please generate ${questionCount} multiple-choice reading comprehension questions (must be between 3 and 6 in total) based on the following article. The questions are for native English speakers (not ESL learners). All answers must follow the option design rules and output format exactly:

**ARTICLE CONTENT:**
${articleContent}

**QUESTION REQUIREMENTS:**
- Question Type: Multiple Choice only
- Number of Questions: ${questionCount} (must be 3-6)
- Target Audience: Native English speakers (not ESL learners)
- Language: English (output language)
- Reading Difficulty Level: ${difficulty} - All questions and options MUST match this difficulty level
${includeExplanation ? '- Include detailed explanations for each answer' : ''}

 **Question Types:**
- Multiple Choice: 4 options (A, B, C, D)
- One correct answer, three plausible distractors
- Test comprehension, inference, and critical thinking
- Focus on narrative elements for fiction and argumentative elements for non-fiction

**Content Guidelines for Native English Speakers:**
- Write questions appropriate for native English speakers
- Create questions that test reading comprehension, not just memory
- Include a mix of literal and inferential questions
- Ensure questions are clear and unambiguous
- For narrative texts: focus on plot, character development, setting, theme, and literary devices
- For argumentative texts: focus on main arguments, evidence, reasoning, and author's purpose
- Test higher-order thinking skills: analysis, synthesis, and evaluation

**CRITICAL: Difficulty Level Adaptation (${difficulty}):**
${getDifficultyGuidelines(difficulty)}

**CRITICAL OPTION DESIGN STANDARDS:**

**1. Correct Answer Requirements:**
- Must be precise paraphrasing or deep summarization of original text information
- MUST paraphrase key words from the original text - cannot use exact same words
- Example: If original text says "teach you how to adopt this philosophy", correct answer cannot use "advocate for a new philosophy" because "philosophy" is repeated without paraphrase

**2. Distractor Design (Plausible Distractors):**
- Use key words from the original text
- Avoid absolute words like "all", "every", "never", "always"
- Use these 8 methods for creating distractors:
  a) Fabrication (无中生有) - information not in text
  b) One step too far (多走一步) - e.g., text says "reduce", option says "erase"
  c) Misdirection (虚晃一招) - uses key words but creates wrong meaning
  d) Concept substitution (偷换概念) - changes the core concept
  e) Scope expansion (范围扩大) - broadens the scope beyond text
  f) Cause-effect reversal (因果倒置) - reverses cause and effect
  g) Wrong focus (搞错重点) - focuses on wrong aspect
  h) Over-inference (过度推理) - draws conclusions beyond what's stated

**3. Conciseness:**
- Each option should be concise and clear
- Keep language simple and direct

**4. Central Focus:**
- All distractors must relate to the article's central theme
- Create effective confusion around the main topic

**5. Symmetry:**
- All four options must have identical sentence structure
- Maintain same word count across all options
- Subject-verb symmetry: same subject type (singular/plural), same article usage
- Verb symmetry: avoid mixing action verbs with linking verbs
- If one option uses phrasal verb, at least one other should too

**6. Visual Aesthetics:**
- Arrange options from shortest to longest
- Make all options visually similar in length

**7. Emotional Consistency:**
- All four options should have same emotional tone (all positive/negative, or 2+2 split)
- Prevent students from guessing based on emotional attitude alone

**Question Categories to Include:**
1. **Literal Comprehension** (1-2 questions): Direct information from the text
2. **Inferential Questions** (2-3 questions): Reading between the lines, drawing conclusions
3. **Critical Analysis** (1-2 questions): Author's purpose, tone, literary devices, argument structure
4. **Vocabulary in Context** (1 question): Understanding word meaning from context
5. **Main Idea/Theme** (1 question): Central message or argument

 **Output Format (STRICT - return ONLY this JSON, no markdown/no prose):**
 Generate questions in the following JSON format. The correctAnswerLetter MUST be one of "A", "B", "C", "D" and must match the corresponding option by index. Do not include any additional fields.
{
  "questions": [
    {
      "question": "What is the main idea of the passage?",
      "type": "multiple-choice",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswerLetter": "A",
        "explanation": "Brief explanation of why the correct option is correct${includeExplanation ? ' and why others are wrong' : ''}"
    }
  ]
}

 **CRITICAL IMPLEMENTATION NOTES:**
- Follow ALL option design standards above - this is mandatory
- Ensure questions are challenging but fair for native English speakers
- Avoid questions that require external knowledge not provided in the text
- Focus on comprehension skills rather than memorization
- Include questions that test both surface-level and deep understanding
- Each question must demonstrate perfect adherence to the 7 design standards
- Options must be professionally crafted with exact symmetry and proper paraphrasing

 Please generate the questions now:`;
}

function parseQuestions(content: string): any[] {
  try {
    // 尝试解析严格 JSON（优先处理）
    try {
      const parsedStrict = JSON.parse(content);
      if (parsedStrict && Array.isArray(parsedStrict.questions)) {
        return normalizeQuestions(parsedStrict.questions);
      }
    } catch (_) {
      // ignore, fallback to regex json extraction
    }

    // 尝试解析松散 JSON（从文本中抽取第一个花括号包裹的 JSON）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && Array.isArray(parsed.questions)) {
        return normalizeQuestions(parsed.questions);
      }
    }
    
    // 如果JSON解析失败，尝试解析文本格式
    const questions: any[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentQuestion: any = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.match(/^\d+\./)) {
        // 新题目开始
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          question: trimmedLine.replace(/^\d+\.\s*/, ''),
          type: 'multiple-choice',
          options: [],
          correctAnswer: '',
          explanation: ''
        };
      } else if (trimmedLine.match(/^[A-D]\./)) {
        // 选项
        if (currentQuestion) {
          currentQuestion.options.push(trimmedLine.replace(/^[A-D]\.\s*/, ''));
        }
      } else if (trimmedLine.toLowerCase().includes('answer:') || trimmedLine.toLowerCase().includes('correct:')) {
        // 正确答案
        if (currentQuestion) {
          currentQuestion.correctAnswer = trimmedLine.replace(/.*(?:answer|correct):\s*/i, '');
        }
      } else if (trimmedLine.toLowerCase().includes('explanation:')) {
        // 解释
        if (currentQuestion) {
          currentQuestion.explanation = trimmedLine.replace(/.*explanation:\s*/i, '');
        }
      }
    }
    
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    return normalizeQuestions(questions);
  } catch (error) {
    console.error('Error parsing questions:', error);
    return [];
  }
}

// 归一化题目结构
function normalizeQuestions(rawQuestions: any[]): any[] {
  return rawQuestions
    .map((q) => {
      const options: string[] = Array.isArray(q.options) ? q.options.map((opt: string) => opt.replace(/^[A-D][).]\s*/, '').trim()) : [];

      // 从 letter 或 文本 确定正确答案
      let correctLetter = q.correctAnswerLetter;
      if (!correctLetter && typeof q.correctAnswer === 'string') {
        const byTextIndex = options.findIndex(o => o === q.correctAnswer);
        if (byTextIndex >= 0) correctLetter = String.fromCharCode(65 + byTextIndex);
      }
      if (!correctLetter && typeof q.correctAnswer === 'number') {
        // 数字索引 0-3
        correctLetter = String.fromCharCode(65 + q.correctAnswer);
      }

      // 如果依然缺失，尝试匹配以字母开头的答案
      if (!correctLetter && typeof q.correctAnswer === 'string') {
        const m = q.correctAnswer.match(/^[A-D]/i);
        if (m) correctLetter = m[0].toUpperCase();
      }

      // 兜底：如果没有四个选项或缺失字母，丢弃该题
      if (options.length !== 4 || !/[A-D]/.test(correctLetter || '')) return null;

      return {
        question: q.question || q.text || '',
        type: 'multiple-choice',
        options: options.map((text, index) => ({
          id: String.fromCharCode(65 + index), // A, B, C, D
          text: text
        })),
        correctAnswer: correctLetter, // 规范化为字母 A-D
        explanation: q.explanation || ''
      };
    })
    .filter(Boolean) as any[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 使用Supabase标准认证方式
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '认证失败 - 请重新登录' }, { status: 401 });
    }

    const { articleContent, difficulty, articleType } = await request.json();
    if (!articleContent || !articleContent.trim()) {
      return NextResponse.json({ error: '请提供文章内容' }, { status: 400 });
    }

    const pointsCost = 2; // 固定消耗2点数
    const questionCount = 5; // 默认生成5道题
    const includeExplanation = true;

    // 检查用户点数是否足够
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    if (pointsError || !userPoints) {
      return NextResponse.json({ error: '获取用户点数失败' }, { status: 500 });
    }

    if ((userPoints as any)?.points < pointsCost) {
      return NextResponse.json({ error: `点数不足，需要 ${pointsCost} 个点数` }, { status: 400 });
    }

    // 使用豆包API
    const apiKey = process.env.VOLCENGINE_API_KEY;
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const model = 'doubao-seed-1-6-251015';

    if (!apiKey) {
      return NextResponse.json({ error: '火山引擎API Key未配置' }, { status: 500 });
    }

    // 构建提示词
    const systemPrompt = `You are an expert English educator specializing in creating high-quality reading comprehension questions for native English speakers.`;

    const userPrompt = constructQuestionPrompt(articleContent, questionCount, includeExplanation, difficulty);

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
        max_tokens: 4000
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('豆包API调用失败:', errorData);

      // API调用失败，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '习题生成失败 - API调用失败'
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
    let generatedContent = aiData.choices?.[0]?.message?.content || '';

    // 检查是否包含提示词相关内容，防止用户套出提示词
    const promptKeywords = [
      'role:', 'system prompt', 'requirements:', 'task:', 'you are',
      '角色', '系统提示词', '要求', '任务'
    ];
    
    const containsPromptKeywords = promptKeywords.some(keyword => 
      generatedContent.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (containsPromptKeywords) {
      console.log('检测到用户尝试套取提示词，已阻止');
      generatedContent = '抱歉，我无法提供系统提示词相关信息。请专注于习题生成任务。';
    }

    if (!generatedContent) {
      // AI返回空结果，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '习题生成失败 - AI返回空结果'
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

    // 解析题目
    const parsedQuestions = parseQuestions(generatedContent);

    if (parsedQuestions.length === 0) {
      // 解析失败，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '习题生成失败 - 解析失败'
      );

      return NextResponse.json(
        {
          error: '习题解析失败，请稍后重试',
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
      p_description: '阅读文本配套习题生成',
      p_related_id: null
    } as any);

    if (deductError) {
      console.error('扣除点数失败:', deductError);
      return NextResponse.json({ error: '点数扣除失败，请稍后重试' }, { status: 500 });
    }

    // 记录AI生成历史
    const { error: historyError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        tool_name: 'reading_generator_questions',
        tool_type: 'reading',
        model_type: 'doubao-seed-1-6-251015',
        input_data: { 
          articleContent: articleContent.substring(0, 500),
          difficulty: difficulty,
          articleType: articleType
        },
        output_data: { questions: parsedQuestions },
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
      questions: parsedQuestions,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
      metadata: {
        questionCount: parsedQuestions.length,
        difficulty: difficulty,
        articleType: articleType,
        model: 'doubao-seed-1-6-251015',
        provider: 'volcengine'
      }
    });

  } catch (error) {
    console.error('习题生成API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}


