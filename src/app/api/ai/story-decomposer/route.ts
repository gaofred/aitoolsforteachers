import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// 豆包大模型API配置
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;
const VOLCENGINE_CHAT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export async function POST(request: NextRequest) {
  try {
    console.log('故事拆解API - 开始处理请求');

    // 检查API配置
    if (!VOLCENGINE_API_KEY) {
      console.error('火山引擎API Key未配置');
      return NextResponse.json(
        { success: false, error: '火山引擎API Key未配置' },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    // 获取Supabase认证相关的cookies
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    // 同时检查Authorization头（为Edge浏览器提供备用认证方式）
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    console.log('故事拆解API - 认证检查:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasBearerToken: !!bearerToken,
      accessTokenLength: accessToken?.length || 0,
      bearerTokenLength: bearerToken?.length || 0,
      allCookies: cookieStore.getAll().map(c => c.name)
    });

    // 优先使用Cookie，如果没有则使用Authorization头
    const finalToken = accessToken || bearerToken;

    if (!finalToken) {
      console.error('故事拆解API - 未找到认证token');
      return NextResponse.json(
        { success: false, error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 首先尝试标准的session认证
    let user, authError;
    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
      authError = result.error;

      console.log('故事拆解API - 标准认证结果:', {
        hasUser: !!user,
        authError: authError?.message
      });
    } catch (networkError) {
      console.error('故事拆解网络错误:', networkError);
    }

    // 如果标准认证失败，尝试使用直接token认证
    if (!user || authError) {
      console.log('故事拆解API - 标准认证失败，尝试直接token认证');
      try {
        const result = await supabase.auth.getUser(finalToken);
        user = result.data.user;
        authError = result.error;

        console.log('故事拆解API - 直接token认证结果:', {
          hasUser: !!user,
          authError: authError?.message
        });
      } catch (tokenError) {
        console.error('故事拆解API - 直接token认证错误:', tokenError);
        authError = tokenError as any;
      }
    }

    if (authError || !user) {
      console.error('故事拆解API - 所有认证方式都失败:', authError);
      return NextResponse.json(
        { success: false, error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('故事拆解用户认证成功:', user.id);

    // 获取请求数据
    const { story, style, styleConfig } = await request.json();

    if (!story || !story.trim()) {
      return NextResponse.json({
        success: false,
        error: "未提供故事内容"
      }, { status: 400 });
    }

    console.log('故事拆解 - 收到风格参数:', { style, styleConfig: styleConfig?.name });

    console.log('故事拆解 - 开始调用豆包大模型:', {
      storyLength: story.length,
      storyPreview: story.substring(0, 100) + '...'
    });

    // 调用豆包大模型进行故事拆解
    const response = await fetch(VOLCENGINE_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOLCENGINE_API_KEY}`
      },
      body: JSON.stringify({
        model: "doubao-seed-1-6-251015",
        messages: [
          {
            role: "system",
            content: `你是一个专业的故事分析师，专门将英语叙事文章拆解为5个关键阶段的简洁描述。

当前选择的绘图风格：${styleConfig?.name || '写实风'}
风格特点：${styleConfig?.description || '真实自然的视觉效果'}

请按照以下要求分析故事：
1. 识别故事的5个关键阶段：Exposition (开端)、Conflict (发展)、Climax (高潮)、Resolution (结局)、Ending (尾声)
2. 为每个阶段生成简洁的英文描述（1-2句话）
3. 确保描述适合AI图片生成，特别关注"${styleConfig?.name || '写实风'}"风格的视觉元素
4. 保持风格一致性，重点提取适合"${styleConfig?.name || '写实风'}"的场景细节

${style === 'realistic' ? '重点关注：现实场景、自然人物表情、日常环境、真实光影效果。' : ''}
${style === 'anime' ? '重点关注：角色特色外观、动态表情、幻想元素、鲜明色彩场景。' : ''}
${style === 'watercolor' ? '重点关注：柔和色调、情感氛围、自然景色、温馨场景。' : ''}
${style === 'cyberpunk' ? '重点关注：未来科技感、霓虹灯光、机械元素、都市环境。' : ''}

输出格式必须是JSON格式：
{
  "stages": [
    {
      "stage": "Exposition",
      "description": "简洁的英文描述，包括场景、人物、氛围等"
    },
    {
      "stage": "Conflict",
      "description": "简洁的英文描述，展现上升的行动和冲突"
    },
    {
      "stage": "Climax",
      "description": "简洁的英文描述，展现故事的高潮时刻"
    },
    {
      "stage": "Resolution",
      "description": "简洁的英文描述，展现故事的结局"
    },
    {
      "stage": "Ending",
      "description": "简洁的英文描述，展现故事的尾声和最终状态"
    }
  ]
}`
          },
          {
            role: "user",
            content: `请分析以下英语故事并拆解为5个阶段（针对${styleConfig?.name || '写实风'}风格）：\n\n${story.trim()}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("豆包大模型API错误:", data);
      return NextResponse.json({
        success: false,
        error: `故事拆解失败: ${data.error?.message || "未知错误"}`
      }, { status: 500 });
    }

    console.log('豆包大模型成功响应:', {
      hasChoices: !!data.choices,
      choiceCount: data.choices?.length || 0
    });

    // 提取AI回复内容
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('豆包大模型返回空响应');
      return NextResponse.json({
        success: false,
        error: "故事拆解失败：AI返回空响应"
      }, { status: 500 });
    }

    console.log('豆包大模型返回的拆解结果:', aiResponse);

    // 尝试解析JSON响应
    let parsedStages;
    try {
      // 尝试直接解析JSON
      parsedStages = JSON.parse(aiResponse);
    } catch (parseError) {
      console.warn('直接JSON解析失败，尝试提取JSON部分:', parseError);

      // 尝试从文本中提取JSON部分
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedStages = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          console.error('JSON提取也失败:', secondParseError);
          return NextResponse.json({
            success: false,
            error: "故事拆解失败：无法解析AI响应格式"
          }, { status: 500 });
        }
      } else {
        console.error('无法从响应中找到JSON格式');
        return NextResponse.json({
          success: false,
          error: "故事拆解失败：AI响应格式不正确"
        }, { status: 500 });
      }
    }

    // 验证解析结果
    if (!parsedStages || !parsedStages.stages || !Array.isArray(parsedStages.stages)) {
      console.error('解析结果格式不正确:', parsedStages);
      return NextResponse.json({
        success: false,
        error: "故事拆解失败：AI返回的数据格式不正确"
      }, { status: 500 });
    }

    if (parsedStages.stages.length !== 5) {
      console.warn('阶段数量不是5个:', parsedStages.stages.length);
    }

    console.log(`成功解析出 ${parsedStages.stages.length} 个故事阶段`);

    return NextResponse.json({
      success: true,
      stages: parsedStages.stages,
      originalStory: story,
      style: style,
      styleConfig: styleConfig,
      message: `成功拆解故事为 ${parsedStages.stages.length} 个阶段（${styleConfig?.name || '写实风'}）`
    });

  } catch (error) {
    console.error("故事拆解处理错误:", error);
    return NextResponse.json({
      success: false,
      error: "故事拆解处理失败"
    }, { status: 500 });
  }
}