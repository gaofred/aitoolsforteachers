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

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // 使用Supabase标准认证方式
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '未认证 - 请先登录' }, { status: 401 });
    }

    const { topic, difficulty, category, keywords, articleType } = await request.json();
    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: '请提供要生成的文章主题' }, { status: 400 });
    }

    const pointsCost = 4; // 固定消耗4点数

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

    // 辅助函数
    const difficultyMap: Record<string, string> = {
      a2: 'A2 level (pre-intermediate)',
      b1: 'B1 level (intermediate)',
      b2: 'B2 level (upper-intermediate)',
      c1: 'C1 level (advanced)'
    };

    const categoryMap: Record<string, string> = {
      general: 'General Knowledge',
      science: 'Science & Technology',
      business: 'Business & Economics',
      history: 'History & Culture',
      literature: 'Literature & Arts'
    };

    const getArticleFramework = (type: string): string => {
      if (type === 'fiction') {
        return `For Fiction articles, use this narrative structure:
1. Setting & Character Introduction (establish time, place, and main characters)
2. Rising Action (develop the situation and introduce conflict or challenge)
3. Climax (the turning point or most intense moment of the story)
4. Resolution (how the conflict is resolved and consequences)
5. Conclusion (reflection, lesson learned, or final thoughts)

Create a complete short story with:
- Vivid descriptions and sensory details
- Character dialogue and interactions
- Emotional depth and character development
- A clear plot with beginning, middle, and end
- Engaging narrative voice and storytelling techniques`;
      } else if (type === 'non-fiction') {
        return `For Non-fiction articles, use one of these structures:
For Natural Science & Technology topics:
1. Problem/Phenomenon Introduction → Research Findings → Research Methods (participants/subjects, procedures, challenges) → Research Value/Applications → Significance/Limitations
2. Direct Research Discovery → Research Process → Detailed Findings Explanation → Applications/Future Prospects
3. Theory Origin (who proposed it, discovery process, core concepts) → Theory Manifestation → Theory Impact/Functions → Theory Limitations/Criticisms

For Humanities & Social Sciences (Theoretical):
1. Theory Origin → Theory Content → Theory Impact → Theory Limitations/Criticisms

For Humanities & Social Sciences (Non-theoretical):
1. Phenomenon Introduction → Core Argument → Historical Case Studies → Current Analysis → Reflection & Call to Action
2. Problem Introduction → Core Thesis → Evidence/Argumentation → Conclusion`;
      } else {
        const frameworks = [
          `For Fiction articles, use this narrative structure:
1. Event/Phenomenon/Character Introduction → Key Characters/Story Development (background, experience, motivation) → Problem/Conflict Presentation (story turning point or challenges faced) → Multiple Perspectives/Impact Analysis (effects and evaluations of events or character actions) → Reflection/Insights (lessons learned or calls to action from the story)`,
          `For Non-fiction articles, use one of these structures:
For Natural Science & Technology topics:
1. Problem/Phenomenon Introduction → Research Findings → Research Methods (participants/subjects, procedures, challenges) → Research Value/Applications → Significance/Limitations
2. Direct Research Discovery → Research Process → Detailed Findings Explanation → Applications/Future Prospects
3. Theory Origin (who proposed it, discovery process, core concepts) → Theory Manifestation → Theory Impact/Functions → Theory Limitations/Criticisms

For Humanities & Social Sciences (Theoretical):
1. Theory Origin → Theory Content → Theory Impact → Theory Limitations/Criticisms

For Humanities & Social Sciences (Non-theoretical):
1. Phenomenon Introduction → Core Argument → Historical Case Studies → Current Analysis → Reflection & Call to Action
2. Problem Introduction → Core Thesis → Evidence/Argumentation → Conclusion`
        ];
        return frameworks[Math.floor(Math.random() * frameworks.length)];
      }
    };

    const getContentGuidelines = (type: string): string => {
      if (type === 'fiction') {
        return `- Create an engaging fictional narrative with characters, setting, and plot
- Use descriptive language and dialogue to bring the story to life
- Include conflict, tension, or challenges that drive the narrative forward
- Focus on character development and emotional engagement
- Use narrative techniques like dialogue, description, and action
- Ensure the story has a clear beginning, middle, and end
- Make the content engaging and emotionally resonant for readers`;
      } else if (type === 'non-fiction') {
        return `- Focus on factual information and evidence-based content
- Include engaging and thought-provoking content
- Use appropriate academic vocabulary and sentence structures for the level
- Ensure logical flow and coherence throughout
- Remove any tangential content that doesn't support the main argument
- Present information in a clear, informative manner`;
      } else {
        return `- Focus on the main theme and core ideas
- Include engaging and thought-provoking content
- Use appropriate vocabulary and sentence structures for the level
- Ensure logical flow and coherence throughout
- Make the content relevant and interesting for the target audience`;
      }
    };

    const getOutputFormat = (type: string): string => {
      if (type === 'fiction') {
        return `Generate a complete short story with narrative elements. Include:
- Character development and dialogue
- Descriptive settings and atmosphere
- Plot progression with conflict and resolution
- Emotional engagement and storytelling techniques
- A satisfying beginning, middle, and end
The story should be engaging, emotionally resonant, and appropriate for reading comprehension testing for native English speakers.`;
      } else {
        return `Generate only the article content, no additional explanations, titles, or metadata. The article should be engaging, educational, and appropriate for reading comprehension testing for native English speakers.`;
      }
    };

    // 构建提示词
    const difficultyLevel = difficultyMap[difficulty] || 'B2 level';
    const categoryName = categoryMap[category] || 'General Knowledge';
    const wordCount = 300;

    const systemPrompt = `You are an experienced English educator and content creator specializing in reading comprehension materials for native English speakers.`;

    const userPrompt = `Please generate a reading comprehension article with the following specifications:

**Article Requirements:**
- Topic Category: ${categoryName}
- Difficulty Level: ${difficultyLevel} (European Language Standard)
- Target Word Count: ${wordCount} words
- Target Audience: Native English speakers
- Language: English (output language)
${keywords ? `- Keywords to include (please **bold** these exact words/phrases in the article): ${keywords}` : ''}

**Article Structure Framework:**
${getArticleFramework(articleType)}

**Content Guidelines:**
- Write for native English speakers at the specified CEFR level
- Maintain appropriate complexity for the difficulty level (B1: intermediate, B2: upper-intermediate, C1: advanced)
- Use clear, well-structured paragraphs (4-5 paragraphs total)
${getContentGuidelines(articleType)}
${keywords ? `- Naturally incorporate the specified keywords: "${keywords}" throughout the article` : ''}

**Output Format:**
${getOutputFormat(articleType)}

Topic: ${topic}

Please generate the article now:`;

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
        max_tokens: 2000
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
        '阅读文本生成失败 - API调用失败'
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
    let generatedText = aiData.choices?.[0]?.message?.content || '';

    // 检查是否包含提示词相关内容，防止用户套出提示词
    const promptKeywords = [
      'role:', 'system prompt', 'requirements:', 'task:', 'you are',
      '角色', '系统提示词', '要求', '任务'
    ];
    
    const containsPromptKeywords = promptKeywords.some(keyword => 
      generatedText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (containsPromptKeywords) {
      console.log('检测到用户尝试套取提示词，已阻止');
      generatedText = '抱歉，我无法提供系统提示词相关信息。请专注于文本生成任务。';
    }

    if (!generatedText) {
      // AI返回空结果，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        '阅读文本生成失败 - AI返回空结果'
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
      p_description: '阅读文本生成',
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
        tool_name: 'reading_generator',
        tool_type: 'reading',
        model_type: 'doubao-seed-1-6-251015',
        input_data: { 
          topic: topic,
          difficulty: difficulty,
          category: category,
          keywords: keywords,
          articleType: articleType
        },
        output_data: { text: generatedText },
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
      result: generatedText,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
      metadata: {
        topic: topic,
        difficulty: difficulty,
        category: category,
        keywords: keywords,
        articleType: articleType,
        generatedLength: generatedText.length,
        model: 'doubao-seed-1-6-251015',
        provider: 'volcengine'
      }
    });

  } catch (error) {
    console.error('阅读文本生成API错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

