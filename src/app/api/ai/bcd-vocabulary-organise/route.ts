import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

// 退还点数的辅助函数
async function refundPoints(supabase: any, userId: string, amount: number, reason: string) {
  try {
    const { error } = await (supabase as any).rpc('add_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'REFUND',
      p_description: reason,
      p_related_id: null
    } as any);

    if (error) {
      console.error('退还点数失败:', error);
    }
  } catch (error) {
    console.error('退还点数异常:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: "用户未认证"
      }, { status: 401 });
    }

    const body = await request.json();
    const { text, organiseType, userId } = body;

    if (!text || !organiseType || !userId) {
      return NextResponse.json({
        success: false,
        error: "缺少必要参数"
      }, { status: 400 });
    }

    if (userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: "用户ID不匹配"
      }, { status: 403 });
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

    const pointsCost = 5; // BCD词汇整理消耗5个点数

    if ((userPoints as any).points < pointsCost) {
      return NextResponse.json({
        success: false,
        error: `点数不足，需要${pointsCost}个点数，当前剩余${(userPoints as any).points}个点数`
      }, { status: 400 });
    }

    // 构建提示词
    const systemPrompt = `- Role: 英语词汇教学专家
- Background: 用户需要整理BCD篇阅读文章中的重点词汇，你需要从文章中提取和整理出核心词汇、重要短语和固定搭配。
- Profile: 你是一位经验丰富的英语词汇教师，擅长帮助学生掌握阅读材料中的核心词汇。

## 整理要求

### 根据整理类型提供不同深度的分析：

#### 全面整理模式：
- 提取文章中的所有重要词汇（A2-C2级别）
- 识别核心短语和固定搭配
- 提供词汇的中文释义和英文释义
- 标注词汇等级和重要性
- 提供例句和用法说明

#### 核心词汇模式：
- 重点关注高频词汇和关键术语
- 提取最重要的固定搭配和短语
- 简化释义，突出实用性
- 适合快速复习和掌握

#### 进阶词汇模式：
- 重点关注高级词汇和复杂表达
- 分析词汇的词根词缀和构词法
- 提供近义词、反义词和词汇网络
- 适合词汇能力提升

## 输出格式

请按照以下格式输出词汇整理结果：

# 📚 BCD篇阅读重点词汇整理

## 🎯 核心词汇 (Core Vocabulary)

### 高频重点词汇
1. **词汇** - 中文释义 / English definition
   - 词性：[词性标注]
   - 等级：[CEFR等级]
   - 例句：文章中的例句 + 中文翻译
   - 搭配：常见固定搭配
   - 用法：使用说明和注意事项

### 主题相关词汇
[按主题分类的词汇列表]

## 🔗 核心短语与搭配 (Key Phrases & Collocations)

### 动词短语
- **短语**: 中文释义
  - 例句：使用示例
  - 替换表达：相似表达方式

### 介词短语
- **短语**: 中文释义和用法

### 固定搭配
- **搭配**: 中文释义
  - 使用场景和例句

## 📖 词汇拓展 (Vocabulary Extension)

### 同义词辨析
- **词汇组**: 近义词辨析和使用区别

### 词根词缀分析
- **词根**: 相关词汇家族
- **构词规律**: 帮助记忆的构词方法

## 💡 学习建议 (Study Tips)

- 词汇记忆技巧
- 重点词汇掌握优先级
- 与主题相关的词汇学习方法

## Constraints:
- 词汇释义准确，适合中国学生理解
- 例句来源于原文，确保语境真实
- 分类清晰，层次分明
- 突出实用性，便于学习和记忆
- 根据选择的分析类型调整详细程度
- 严格按照要求的格式输出，使用Markdown格式
- 词汇量控制在30-50个核心词汇（根据分析类型调整）
- 重点关注与BCD篇阅读理解相关的词汇

请开始整理用户提供的BCD篇阅读文章词汇。`;

    // 调用火山引擎API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOLCENGINE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'ep-20241203142515-mxqqr',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `请整理以下BCD篇阅读文章的词汇，整理类型：${organiseType}\n\n文章内容：\n${text}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      console.error('火山引擎API调用失败:', response.status, response.statusText);
      await refundPoints(supabase, user.id, pointsCost, 'BCD词汇整理失败退还');
      return NextResponse.json({
        success: false,
        error: "词汇整理服务暂时不可用，请稍后重试"
      }, { status: 500 });
    }

    const data = await response.json();
    const vocabularyResult = data.choices?.[0]?.message?.content || '';

    if (!vocabularyResult) {
      // AI返回空结果，退还点数
      await refundPoints(supabase, user.id, pointsCost, 'BCD词汇整理结果为空退还');
      return NextResponse.json({
        success: false,
        error: "词汇整理失败，请重试"
      }, { status: 500 });
    }

    // 扣除用户点数
    const { error: deductError } = await (supabase as any).rpc('add_user_points', {
      p_user_id: user.id,
      p_amount: -pointsCost,
      p_type: 'GENERATE',
      p_description: `BCD词汇整理 - ${organiseType}`,
      p_related_id: null
    } as any);

    if (deductError) {
      console.error("扣除点数失败:", deductError);
      // 即使扣除点数失败，也返回结果
    }

    // 记录生成历史
    const { error: historyError } = await supabase
      .from("ai_generations")
      .insert({
        user_id: user.id,
        tool_type: "bcd_vocabulary_organise",
        tool_name: "BCD篇阅读重点词汇整理",
        input_data: { text: text, organise_type: organiseType },
        output_data: { vocabulary_result: vocabularyResult },
        points_cost: pointsCost,
        status: 'COMPLETED'
      } as any);

    if (historyError) {
      console.error("记录生成历史失败:", historyError);
    }

    return NextResponse.json({
      success: true,
      result: vocabularyResult,
      pointsCost: pointsCost
    });

  } catch (error) {
    console.error('BCD词汇整理错误:', error);
    return NextResponse.json({
      success: false,
      error: "服务器错误，请稍后重试"
    }, { status: 500 });
  }
}