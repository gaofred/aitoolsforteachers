import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// 火山引擎API配置
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY

// 词汇提取的专用提示词
const EXTRACT_VOCABULARY_PROMPT = `请从以下文本中提取所有英文单词和短语。要求：

1. 提取所有英文词汇（包括单词、短语、固定搭配等）
2. 忽略所有中文内容
3. 删除重复词汇（每个词汇只保留一次）
4. 直接输出词汇列表，用 • 分隔
5. 每行8-10个词汇
6. 不添加任何解释、标题或其他无关内容

输出示例：
• the • and • is • are • was • were • have • has • will • can • could • should
• vocabulary • learning • teaching • important • useful • practice • improve • language

文本内容：`

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    // 验证必要参数
    if (!text) {
      return NextResponse.json(
        { error: '缺少必要参数：text' },
        { status: 400 }
      )
    }

    // 创建服务器端Supabase客户端
    const supabase = createServerSupabaseClient()

    // 验证用户身份和获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      )
    }

    console.log('用户认证成功:', user.id);

    // 获取用户点数信息
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single()

    if (pointsError || !userPoints) {
      console.error('获取用户点数失败:', pointsError);
      return NextResponse.json(
        { error: '获取用户信息失败' },
        { status: 500 }
      )
    }

    const points = (userPoints as any)?.points || 25;
    console.log('用户当前点数:', points);

    // 检查点数是否足够
    if (points < 1) {
      return NextResponse.json(
        { error: `积分不足，需要1点，当前${points}点` },
        { status: 400 }
      )
    }

    // 构建完整的提示词
    const fullPrompt = `${EXTRACT_VOCABULARY_PROMPT}

## 用户提供的文本：
${text}

请分析上述文本，提取其中的重点英语词汇并按照指定格式输出。`

    console.log('📝 开始词汇提取:', {
      userId: user.id,
      textLength: text.length,
      pointsBefore: points
    })

    // 调用火山引擎豆包模型进行词汇提取
    const response = await fetch(VOLCENGINE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCENGINE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'doubao-seed-1-6-251015',
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('火山引擎API错误:', data)
      throw new Error(data.error?.message || '火山引擎API调用失败')
    }

    const extractedVocabulary = data.choices[0].message.content

    // 扣除用户点数
    const newPoints = points - 1;
    const { error: updateError } = await supabase
      .from('user_points')
      .update({
        points: newPoints
      } as any)
      .eq('user_id', user.id as any)

    if (updateError) {
      console.error('更新用户点数失败:', updateError)
      throw new Error('点数扣除失败')
    }

    // 记录点数交易
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: user.id as any,
        type: 'USAGE',
        description: '词汇提取',
        points: -1,
        balance_before: points,
        balance_after: newPoints,
        metadata: {
          service: 'extract-vocabulary',
          text_length: text.length
        }
      } as any)

    if (transactionError) {
      console.error('记录点数交易失败:', transactionError)
      // 继续执行，不影响主要功能
    }

    console.log('✅ 词汇提取完成:', {
      userId: user.id,
      pointsConsumed: 1,
      remainingPoints: newPoints
    })

    return NextResponse.json({
      success: true,
      result: extractedVocabulary,
      remainingPoints: newPoints,
      message: '词汇提取成功'
    })

  } catch (error) {
    console.error('词汇提取失败:', error)

    // 返回错误信息
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '词汇提取失败，请稍后重试',
        success: false
      },
      { status: 500 }
    )
  }
}