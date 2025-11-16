// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 火山引擎API配置
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY;
const VOLCENGINE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

// 退还点数的辅助函数
async function refundPoints(supabase: any, user_id: string, amount: number, reason: string) {
  try {
    console.log(`开始退还 ${amount} 点数给用户 ${user_id}，原因: ${reason}`);

    // 使用 RPC 函数安全地添加点数
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

    console.log(`成功退还 ${amount} 点数给用户 ${user_id}`);
    return true;
  } catch (error) {
    console.error('退还点数异常:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('连环画生成API - 开始处理请求');

    // 检查API配置
    if (!VOLCENGINE_API_KEY) {
      console.error('火山引擎API Key未配置');
      return NextResponse.json(
        { success: false, error: '火山引擎API Key未配置' },
        { status: 500 }
      );
    }

    const supabase = createServerSupabaseClient();

    // 使用Supabase标准认证方式
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('连环画生成API - 认证失败:', authError);
      return NextResponse.json(
        { success: false, error: '认证失败 - 请重新登录' },
        { status: 401 }
      );
    }

    console.log('连环画生成用户认证成功:', user.id);

    // 获取请求数据
    const { stages, originalStory, style, styleConfig } = await request.json();
    const max_images = 5; // 固定生成5张图片，对应故事的5个阶段

    console.log('连环画生成 - 收到风格参数:', { style, styleConfig: styleConfig?.name });

    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({
        success: false,
        error: "未提供故事阶段描述"
      }, { status: 400 });
    }

    const pointsCost = 12; // 图片生成消耗12个点数（故事拆解2点数在前端扣除）

    // 检查用户点数
    const { data: userData, error: userError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', user.id as any)
      .single();

    if (userError || !userData) {
      console.error('获取用户点数失败:', userError);
      return NextResponse.json(
        { success: false, error: '获取用户信息失败' },
        { status: 500 }
      );
    }

    if ((userData as any).points < pointsCost) {
      return NextResponse.json(
        { success: false, error: `点数不足，需要${pointsCost}点数，当前余额${(userData as any).points}点数` },
        { status: 400 }
      );
    }

    console.log('故事图片生成 - 开始为每个阶段调用火山引擎API:', {
      stageCount: stages.length,
      pointsCost
    });

    // 根据风格设置全局参数
    let globalImageSize = '1K';
    let globalApiStyle = 'realistic';

    switch (style) {
      case 'realistic':
        globalImageSize = '1K';
        globalApiStyle = 'realistic';
        break;
      case 'anime':
        globalImageSize = '1K';
        globalApiStyle = 'vivid'; // 动漫风格使用鲜艳的色彩
        break;
      case 'watercolor':
        globalImageSize = '1K';
        globalApiStyle = 'natural'; // 水彩风格使用自然的色彩
        break;
      case 'cyberpunk':
        globalImageSize = '1K';
        globalApiStyle = 'dramatic'; // 赛博朋克风格使用戏剧性的色彩
        break;
      default:
        globalImageSize = '1K';
        globalApiStyle = 'realistic';
    }

    // 为每个故事阶段单独生成图片
    const generatedImages = [];

    for (let i = 0; i < Math.min(stages.length, 5); i++) {
      const stage = stages[i];

      // 根据风格生成对应的提示词
      let stagePrompt = '';
      const imageSize = globalImageSize;
      const apiStyle = globalApiStyle;

      if (styleConfig && styleConfig.prompt) {
        // 使用预定义的风格提示词模板
        stagePrompt = styleConfig.prompt.replace('[STAGE_DESCRIPTION]', `${stage.stage}: ${stage.description}`);
        // imageSize 和 apiStyle 已经在循环外部设置好了
      } else {
        // 默认提示词（向后兼容）
        stagePrompt = `Seedream 4.0 Generate image. Stage: ${stage.stage} - ${stage.description}.

Visual requirements:
- 电影大片级视觉冲击力，电影感，末日既视感
- 动感，对比色，OC渲染，光线追踪，动态模糊，景深
- 超现实主义风格，通过细腻丰富的色彩层次塑造主体与场景
- 质感真实，暗黑风背景的光影效果营造氛围
- 艺术幻想感，夸张的广角透视效果，耀光，反射
- 极致的光影效果，深蓝色调为主
- Size 1920x1080, High detail, clear focus on core scene

Color tone and emotional style should match the ${stage.stage} of this story stage.`;
      }

      console.log(`生成第 ${i + 1} 阶段图片 (${stage.stage}):`, {
        description: stage.description,
        promptPreview: stagePrompt.substring(0, 100) + '...'
      });

      try {
        console.log(`开始调用火山引擎API生成第 ${i + 1} 阶段图片...`);

        const response = await fetch(VOLCENGINE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${VOLCENGINE_API_KEY}`
          },
          body: JSON.stringify({
            model: "doubao-seedream-4-0-250828",
            prompt: stagePrompt,
            n: 1, // 每个阶段生成1张图片
            response_format: "url",
            size: imageSize,
            stream: false, // 对于图片生成，流式主要用于进度反馈
            watermark: false, // 去除水印
            sequential_image_generation: "disabled", // 明确禁用连续生成
            // 额外的质量参数
            quality: "hd",
            style: apiStyle
          })
        });

        console.log(`第 ${i + 1} 阶段API响应状态:`, response.status);

        const data = await response.json();

        if (!response.ok) {
          console.error(`第 ${i + 1} 阶段图片生成失败:`, data);
          continue; // 跳过失败的阶段，继续生成其他阶段
        }

        console.log(`第 ${i + 1} 阶段图片生成成功，响应数据:`, {
          hasData: !!data.data,
          dataLength: data.data?.length || 0,
          firstItemKeys: data.data?.[0] ? Object.keys(data.data[0]) : []
        });

        // 处理返回的图片数据
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          const imageData = data.data[0];
          console.log(`第 ${i + 1} 阶段图片数据字段:`, {
            url: imageData.url,
            image_url: imageData.image_url,
            src: imageData.src,
            otherFields: Object.keys(imageData).filter(k => !['url', 'image_url', 'src'].includes(k))
          });

          const imageUrl = imageData.url || imageData.image_url || imageData.src;
          if (imageUrl) {
            console.log(`第 ${i + 1} 阶段图片URL获取成功:`, imageUrl.substring(0, 100) + '...');
            generatedImages.push({
              url: imageUrl,
              index: i,
              stage: stage.stage,
              description: stage.description
            });
          } else {
            console.warn(`第 ${i + 1} 阶段图片数据中未找到URL字段`);
          }
        } else {
          console.warn(`第 ${i + 1} 阶段图片响应数据格式异常:`, {
            hasData: !!data.data,
            isArray: Array.isArray(data.data),
            length: data.data?.length || 0,
            dataKeys: Object.keys(data)
          });
        }
      } catch (error) {
        console.error(`第 ${i + 1} 阶段图片生成错误:`, {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
        continue;
      }

      // 添加小延迟避免API限制
      if (i < Math.min(stages.length, 4) - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`总共成功生成 ${generatedImages.length} 张图片`);

    // 检查生成结果：如果生成的图片数量少于总阶段数的一半，认为失败
    const expectedImages = 5; // 期望生成5张图片
    const successThreshold = Math.ceil(expectedImages / 2); // 至少需要成功一半

    if (generatedImages.length < successThreshold) {
      console.log(`图片生成失败：只生成了${generatedImages.length}张，期望至少${successThreshold}张`);

      // 退还点数
      const refundReason = `图片生成失败补偿（只成功${generatedImages.length}/${expectedImages}张）`;
      const refundSuccess = await refundPoints(supabase, user.id, pointsCost, refundReason);

      // 记录退款交易
      if (refundSuccess) {
        await supabase
          .from('point_transactions')
          .insert({
            user_id: user.id,
            amount: pointsCost,
            type: 'REFUND',
            description: refundReason,
            metadata: {
              generatedCount: generatedImages.length,
              expectedCount: expectedImages,
              failureType: 'insufficient_images'
            },
            created_at: new Date().toISOString()
          } as any);
      }

      return NextResponse.json({
        success: false,
        error: `图片生成失败，只成功生成${generatedImages.length}张图片（需要至少${successThreshold}张）。${refundSuccess ? '已为您退还12点数，' : '点数退还处理中，'}请稍后重试。`,
        generatedCount: generatedImages.length,
        expectedCount: expectedImages,
        pointsRefunded: refundSuccess,
        pointsAmount: pointsCost
      }, { status: 500 });
    }

    // 如果生成的图片数量不足4张，部分成功但仍扣除点数
    if (generatedImages.length < expectedImages) {
      console.log(`部分成功：生成了${generatedImages.length}/${expectedImages}张图片`);
    }

    // 简化版本：不进行复杂的数据库操作
    console.log(`成功生成 ${generatedImages.length} 张故事阶段图片，跳过数据库记录以提高稳定性`);

    // 成功生成图片，直接返回结果给用户（简化版本，不进行数据库操作）
    console.log(`✅ 成功生成 ${generatedImages.length} 张故事阶段图片，直接返回给用户`);

    const finalResponse = {
      success: true,
      images: generatedImages,
      pointsCost: 0, // 暂时不扣点数，等前端处理
      style: style,
      styleConfig: styleConfig,
      message: `成功生成${generatedImages.length}张${styleConfig?.name || '写实风'}故事阶段图片`
    };

    console.log('准备返回最终响应:', {
      success: finalResponse.success,
      imageCount: finalResponse.images.length,
      responseSize: JSON.stringify(finalResponse).length
    });

    try {
      return NextResponse.json(finalResponse);
    } catch (responseError) {
      console.error('返回响应时发生错误:', responseError);
      // 如果返回响应失败，也要退还点数
      const refundReason = `响应序列化失败补偿`;
      const refundSuccess = await refundPoints(supabase, user.id, pointsCost, refundReason);

      return NextResponse.json({
        success: false,
        error: `图片生成成功但返回响应失败。${refundSuccess ? '已为您退还12点数，' : '点数退还处理中，'}请稍后重试。`,
        pointsRefunded: refundSuccess,
        pointsAmount: pointsCost,
        generatedCount: generatedImages.length
      }, { status: 500 });
    }

  } catch (error) {
    console.error("连环画生成处理错误:", error);
    const pointsCost = 12; // 图片生成消耗12个点数

    // 发生严重错误时也要退款
    let refundMessage = "";
    try {
      const refundReason = `连环画生成系统错误补偿`;
      // 重新创建 supabase 客户端和获取用户信息
      const supabase = createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!authError && user) {
        const refundSuccess = await refundPoints(supabase, user.id, pointsCost, refundReason);

        if (refundSuccess) {
          await supabase
            .from('point_transactions')
            .insert({
              user_id: user.id,
              amount: pointsCost,
              type: 'REFUND',
              description: refundReason,
              metadata: {
                error: error instanceof Error ? error.message : 'Unknown error',
                failureType: 'system_error'
              },
              created_at: new Date().toISOString()
            } as any);
        }

        refundMessage = refundSuccess ? `已为您退还${pointsCost}点数，` : '点数退还处理中，';
      }
    } catch (refundError) {
      console.error('退款处理失败:', refundError);
      refundMessage = '点数退还处理中，';
    }

    return NextResponse.json({
      success: false,
      error: `系统错误导致连环画生成失败。${refundMessage}请稍后重试。`,
      pointsRefunded: true,
      pointsAmount: pointsCost,
      systemError: true
    }, { status: 500 });
  }
}