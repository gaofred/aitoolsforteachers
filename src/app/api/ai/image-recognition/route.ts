import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// 火山引擎API配置
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

export async function POST(request: NextRequest) {
  try {
    console.log('图片识别API - 开始处理请求');

    // 检查API配置
    if (!VOLCENGINE_API_KEY) {
      console.error('火山引擎API Key未配置');
      return NextResponse.json(
        { error: '火山引擎API Key未配置' },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    // 获取Supabase认证相关的cookies
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    console.log('图片识别API - Cookie检查:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      allCookies: cookieStore.getAll().map(c => c.name)
    });

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

    // 确保图片数据是完整的data URL格式
    let imageDataUrl = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      // 如果不是data URL格式，添加JPEG的data URL前缀
      imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    console.log('图片识别 - 数据格式检查:', {
      原始格式: imageBase64.substring(0, 50) + '...',
      最终格式: imageDataUrl.substring(0, 50) + '...',
      是否DataURL: imageDataUrl.startsWith('data:'),
      数据长度: imageDataUrl.length
    });

    const pointsCost = 0; // 识图功能免费

    // 免费功能，无需检查点数

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
                  url: imageDataUrl
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

    // 免费功能，无需扣除点数

    return NextResponse.json({
      success: true,
      result: data.choices[0].message.content,
      pointsCost: pointsCost,
      message: "OCR识图功能免费使用"
    });

  } catch (error) {
    console.error("识图处理错误:", error);
    return NextResponse.json({ 
      success: false, 
      error: "识图处理失败" 
    }, { status: 500 });
  }
}