import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// 火山引擎API配置
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

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
      console.error('图片识别认证错误:', authError);
      return NextResponse.json(
        { error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('图片识别用户认证成功:', user.id);

    // 获取请求数据
    const { imageBase64 } = await request.json();
    
    if (!imageBase64) {
      return NextResponse.json({ 
        success: false, 
        error: "未提供图片数据" 
      }, { status: 400 });
    }

    // 检查用户点数
    const { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", user.id)
      .single();

    if (pointsError || !userPoints) {
      return NextResponse.json({ 
        success: false, 
        error: "获取用户点数失败" 
      }, { status: 400 });
    }

    const pointsCost = 2; // 识图功能消耗2个点数
    
    if ((userPoints as any).points < pointsCost) {
      return NextResponse.json({ 
        success: false, 
        error: `点数不足，需要${pointsCost}个点数，当前剩余${(userPoints as any).points}个点数` 
      }, { status: 400 });
    }

    // 调用火山引擎API进行识图
    const response = await fetch(VOLCENGINE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOLCENGINE_API_KEY}`
      },
      body: JSON.stringify({
        model: "doubao-seed-1-6-vision-250815",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请识别图片中的所有文字内容，直接输出文字原文，不要添加任何解释或描述。如果图片中没有文字，请回复'无文字内容'。"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("火山引擎API错误:", data);
      return NextResponse.json({ 
        success: false, 
        error: `识图失败: ${data.error?.message || "未知错误"}` 
      }, { status: 500 });
    }

    // 扣除用户点数
    const { error: deductError } = await (supabase as any).rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: '图像识别功能',
      p_related_id: null,
      p_metadata: {
        tool: 'image_recognition',
        points_cost: pointsCost
      }
    });

    if (deductError) {
      console.error("扣除点数失败:", deductError);
      // 即使扣除点数失败，也返回结果
    }

    // 获取更新后的点数
    const { data: updatedPoints } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      result: data.choices[0].message.content,
      pointsCost: pointsCost,
      remainingPoints: (updatedPoints as any)?.points || (userPoints as any).points - pointsCost
    });

  } catch (error) {
    console.error("识图处理错误:", error);
    return NextResponse.json({ 
      success: false, 
      error: "识图处理失败" 
    }, { status: 500 });
  }
}