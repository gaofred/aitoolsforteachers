import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// 退还点数的辅助函数
async function refundPoints(supabase: any, userId: string, amount: number, reason: string) {
  try {
    const { error } = await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'REFUND',
      p_description: reason,
      p_related_id: null,
      p_metadata: {
        tool: 'cd_adaptation',
        refund_reason: reason
      }
    } as any);

    if (error) {
      console.error('退还点数失败:', error);
      return false;
    }
    console.log(`成功退还 ${amount} 点数给用户 ${userId}，原因: ${reason}`);
    return true;
  } catch (error) {
    console.error('退还点数异常:', error);
    return false;
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

    const { text, version } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: '请提供要改编的文章内容' },
        { status: 400 }
      );
    }

    // 确定版本和消耗的点数
    const isAdvanced = version === 'advanced';
    const pointsCost = isAdvanced ? 8 : 5;
    const modelType = isAdvanced ? 'zhipu-qingyan' : 'doubao-seed-1-6-251015';

    // 检查用户点数是否足够
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id)
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

    // 根据版本选择API Key和模型
    let apiKey, apiUrl, model;
    
    if (isAdvanced) {
      // 进阶版使用云雾API
      apiKey = process.env.CLOUDMIST_API_KEY;
      apiUrl = 'https://yunwu.ai/v1/chat/completions';
      model = 'glm-4.6';
    } else {
      // 基础版使用豆包
      apiKey = process.env.VOLCENGINE_API_KEY;
      apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      model = 'doubao-seed-1-6-251015';
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: `${isAdvanced ? '云雾API' : '火山引擎'}API Key未配置` },
        { status: 500 }
      );
    }

    // 构建提示词
    const systemPrompt = `- Role: 中国高中英语教研员
- Background: 用户需要将一篇英文文章改编成适合中国高中生阅读的文本，用于考察学生语言能力和思维品质。改编后的文本需符合特定的字数、词汇和难度要求。
- Profile: 你是一位资深的中国高中英语教研员，拥有丰富的文本改编经验，熟悉中国高中英语教学大纲和学生水平，能够精准地对文本进行改编。
- Skills: 你具备文本分析、词汇筛选、句式简化、语篇结构调整等能力，能够将复杂的文本改编成适合特定水平学生的材料，同时保留原文的核心内容和亮点。
- Goals:
  1. 判断文章所属类别（自然理工科学类、人文社会科学类理论类、人文社会科学类非理论类）。
  2. 按照语篇框架对文章进行改编，控制字数在320-350词以内。
  3. 确保改编后的文本适合中国高中生阅读（欧州语言标准B2级别），语法句式复杂度保持在欧标B2水平。
  4. 保留原文中的精彩语句，确保文本结构清晰，围绕主旨展开。

- Constrains: 改编后的文本词汇需在我给你的课标3000词范围内（注意，课标3000词的对应词性转化仍属于课标3000范畴），段落控制在4-5段。

-改编框架：
自然理工类
①问题/现象引入型：现在有某种问题（problem/phenomenon/concern）→针对该问题，有人进行了研究，发现了XX/得出了某种结论（researchers/professors/scientists/experts; found/revealed/explained/concluded that XX）→研究人员是怎么进行研究/实验的〔研究/实验对象（participants/subjects）、研究/实验方法（methods）、研究/实验步骤（steps/procedures）、研究/实验中遇到的问题（problems）〕→研究的价值（values）/潜在运用（applications/prospect/future）→关于该研究的评价（significance/limitations）
②开门见山型：研究人员发现了XX（researchers found that XX）→研究人员是怎么进行研究/实验的〔研究/实验对象（participants/subjects）、研究/实验方法（methods）、研究/实验步骤（steps/procedures）、研究/实验中遇到的问题（problems）〕→就研究的发现进行具体展开说明→研究的价值/潜在运用（applications/prospect/future）
③人文社会科学类（理论类）：
理论的起源（谁提出、发现的过程、理论的内涵是什么）→理论的具体表现→理论的影响/功能/作用→理论的局限性/批判
④人文社会科学类（非理论类）：
现象引入→提出观点→历史案例→现状分析→反思与呼吁
提出问题→核心论点→论证→结论

改编后的文章要适合中国高中生阅读（欧州语言标准B2级别），语法句式复杂度可以保持在欧标B2水平。可以删减（与主线不相干的内容全部删掉，留下主干部分），改述（对于生词、难词、长难句等，在不影响原文意思的前提下，改述成学生易懂的表达方式），替换（用一个简单的词替换较难的词），移动（改变词汇或句子的位置）、合并（将部分零散的信息进行整合）、拆分（将1个句子或段落拆分成多个句子或段落）。总之，改编后的文章要紧紧围绕文章主旨大意，结构清晰，同时要尽量保留原文中的精彩有亮点的语句。文本段落控制在4-5段，不多不少。

- OutputFormat: 改编后的英文文本，字数控制在320-350词以内，段落4-5段。
- Workflow:
  1. 分析文章所属类别（以上4种的哪一种），确定改编框架。
  2. 梳理文章主线，删减与主线无关的内容，保留核心部分。
  3. 如果文章里有专家或相关人员说的话"直接引语"，可适当保留一两句，以"直接引语"呈现，以增强文章的信服力。
  4. 对生词、难词、长难句进行改述或替换，调整词汇和句式复杂度。句子层面删除冗余信息，提升文本信息密度和表达效率；单词层面替换专业术语与非常用词，删减冗余修饰词，辅以术语注释，全面提升文本的清晰度、流畅性与大众可读性。
  5. 优化语篇结构，确保段落清晰，逻辑连贯。
  6. 检查字数、词汇范围，确保符合要求。`;

    const userPrompt = `请对以下文章进行改编：\n\n${text}`;

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
      console.error(`${isAdvanced ? '云雾API' : '豆包'}API调用失败:`, errorData);

      // API调用失败，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        `CD篇改编失败 - ${isAdvanced ? '进阶版' : '基础版'}API调用失败`
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
    const adaptedText = aiData.choices?.[0]?.message?.content || '';

    if (!adaptedText) {
      // AI返回空结果，退还点数
      const refundSuccess = await refundPoints(
        supabase,
        user.id,
        pointsCost,
        `CD篇改编失败 - ${isAdvanced ? '进阶版' : '基础版'}AI返回空结果`
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
      p_description: `CD篇改编 - ${isAdvanced ? '进阶版' : '基础版'}`,
      p_related_id: null,
      p_metadata: {
        tool: 'cd_adaptation',
        version: version,
        points_cost: pointsCost,
        original_length: text.length,
        adapted_length: adaptedText.length
      }
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
        tool_name: 'cd_adaptation',
        tool_type: 'reading',
        model_type: modelType,
        input_data: { text: text },
        output_data: { adapted_text: adaptedText },
        points_cost: pointsCost,
        status: 'COMPLETED',
        metadata: {
          version: version,
          original_length: text.length,
          adapted_length: adaptedText.length,
          api_provider: isAdvanced ? 'yunwu' : 'volcengine'
        }
      } as any);

    if (historyError) {
      console.error('记录AI生成历史失败:', historyError);
    }

    // 获取更新后的用户点数
    const { data: updatedUserPoints } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      result: adaptedText,
      pointsCost: pointsCost,
      remainingPoints: (updatedUserPoints as any)?.points || 0,
        metadata: {
          version: version,
          originalLength: text.length,
          adaptedLength: adaptedText.length,
          model: modelType,
          provider: isAdvanced ? 'yunwu' : 'volcengine'
        }
    });

  } catch (error) {
    console.error('CD篇改编API错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
