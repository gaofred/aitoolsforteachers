import { NextResponse, NextRequest } from 'next/server';

// 极客智坊API配置
const GEEKAI_API_URL = 'https://geekai.co/api/v1/chat/completions';
const GEEKAI_API_KEY = process.env.GEEKAI_API_KEY;

export async function POST(request: NextRequest) {
  console.log('批量姓名提取API - 开始处理请求');

  try {
    const { assignments, source } = await request.json();

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供需要提取姓名的作文数据'
      }, { status: 400 });
    }

    console.log('批量姓名提取API - 处理数量:', assignments.length, '来源:', source || '未指定');

    // 检查极客智坊API Key配置
    if (!GEEKAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: '极客智坊API Key未配置，请检查环境变量 GEEKAI_API_KEY'
      }, { status: 500 });
    }

    const results = [];
    const batchSize = 10; // 批量处理，每批10个

    // 分批处理
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize);
      console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(assignments.length / batchSize)}`, {
        batchSize: batch.length
      });

      const batchPromises = batch.map(async (assignment) => {
        try {
          console.log(`提取姓名: ${assignment.id.substring(0, 8)}...`);

          // 预处理：只取前3行进行分析，避免从作文内容中提取错误姓名
          const text = assignment.text;
          const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          const firstLines = lines.slice(0, 3).join('\n');
          console.log(`批量提取前3行: ${firstLines.substring(0, 50)}...`);

          const response = await fetch(GEEKAI_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GEEKAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "qwen-plus",
              messages: [
                {
                  role: 'system',
                  content: '你是专业的学生姓名识别专家。你需要从文本中准确提取学生姓名。'
                },
                {
                  role: 'user',
                  content: `请从以下中文内容中提取学生的真实姓名。

**极其重要的规则：**
1. **绝对不要提取作文题目中的"李华"、"王明"、"张三"等通用化名**
2. **优先寻找"姓名："、"姓名:"、"学生："、"学生:"等明确标识**
3. **如果看到"姓名：李丹萍"这样的格式，请提取"李丹萍"**
4. **只提取明确标记的学生姓名，不要猜测或从作文内容中提取**
5. **${source === 'chinese_content' ? '现在是中文内容模式，更专注于中文姓名识别' : ''}**

**识别顺序：**
1. 首先找"姓名：XXX"格式 → 提取XXX
2. 其次找"姓名: XXX"格式 → 提取XXX
3. 再找"姓名 XXX"格式（姓名后有空格） → 提取XXX
4. 最后找独立的2-4个汉字姓名（排除标题词）

**特别注意：**
- 如果看到"姓名 俞丁悦"，请提取"俞丁悦"
- 如果看到"姓名 李明"，请提取"李明"
- "姓名"后面的汉字就是学生姓名

**通用化名黑名单：** 李华、王明、张三、李明、小红、小明等
**排除词：** 应用文、作文、班级、学号、制卡时间、天学网、出品、学网出品

如果找不到明确标记的学生姓名，请返回"未找到姓名"。

文本内容（仅前5行）：
${firstLines}`
                }
              ],
              temperature: 0.1,
              max_tokens: 50,
              stream: false,
            })
          });

          if (!response.ok) {
            throw new Error(`AI API请求失败: ${response.status}`);
          }

          const data = await response.json();
          const result = data.choices?.[0]?.message?.content;

          if (!result) {
            throw new Error('AI返回结果为空');
          }

          // 清理结果，只保留姓名
          let name = result.trim();

          // 处理可能的格式
          if (name.includes('未找到姓名') || name === '未找到姓名') {
            name = '';
          } else {
            // 移除可能的标点符号和额外文字
            name = name.replace(/[：:，。、\s]/g, '').trim();

            // 确保是2-4个汉字
            if (!/^[\u4e00-\u9fff]{2,4}$/.test(name)) {
              name = '';
            }
          }

          console.log(`姓名提取结果 ${assignment.id.substring(0, 8)}...:`, name);

          return {
            id: assignment.id,
            name: name,
            success: !!name
          };

        } catch (error) {
          console.error(`姓名提取失败 ${assignment.id.substring(0, 8)}...:`, error);
          return {
            id: assignment.id,
            name: '',
            success: false,
            error: error instanceof Error ? error.message : '提取失败'
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // 处理批次结果
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('批次处理失败:', result.reason);
        }
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log('批量姓名提取API - 完成', {
      total: assignments.length,
      success: successCount,
      failed: assignments.length - successCount
    });

    return NextResponse.json({
      success: true,
      results: results,
      statistics: {
        total: assignments.length,
        successful: successCount,
        failed: assignments.length - successCount
      },
      message: `批量姓名提取完成！成功${successCount}个，失败${assignments.length - successCount}个`
    });

  } catch (error) {
    console.error('批量姓名提取API错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '批量姓名提取失败，请稍后重试'
      },
      { status: 500 }
    );
  }
}