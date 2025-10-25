import { createServerSupabaseClient } from '../src/lib/supabase-server';

async function initDecimalAITools() {
  console.log('🚀 初始化支持小数点数的AI工具配置...');

  const supabase = createServerSupabaseClient();

  try {
    // 更新现有工具配置，添加一些小数点数的选项
    console.log('📝 更新AI工具配置支持小数点数...');

    const toolUpdates = [
      // 识图功能设置为免费
      {
        tool_type: 'image-recognition',
        tool_name: 'OCR图像识别',
        description: '识别图片中的文字内容，支持中英文OCR识别',
        category: 'multimedia',
        standard_cost: 0,
        pro_cost: 0,
        is_pro_only: false,
        is_active: true
      },
      // 一些工具设置为0.5点数
      {
        tool_type: 'quick-grammar-check',
        tool_name: '快速语法检查',
        description: '快速检查文本中的语法错误，提供基础修改建议',
        category: 'grammar',
        standard_cost: 0.5,
        pro_cost: 0.3,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'word-definition',
        tool_name: '单词释义查询',
        description: '查询英语单词的释义、例句和用法',
        category: 'vocabulary',
        standard_cost: 0.5,
        pro_cost: 0,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'sentence-translate',
        tool_name: '单句翻译',
        description: '翻译单个句子，支持中英文互译',
        category: 'translation',
        standard_cost: 0.5,
        pro_cost: 0,
        is_pro_only: false,
        is_active: true
      }
    ];

    // 插入或更新工具配置
    for (const config of toolUpdates) {
      const { error } = await supabase
        .from('ai_tool_configs')
        .upsert(config, {
          onConflict: 'tool_type',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`❌ 工具配置失败 ${config.tool_type}:`, error);
      } else {
        console.log(`✅ 工具配置成功: ${config.tool_name} (${config.standard_cost}点数)`);
      }
    }

    // 查看所有工具配置
    console.log('\n📋 当前所有AI工具配置:');
    const { data: allConfigs, error: fetchError } = await supabase
      .from('ai_tool_configs')
      .select('*')
      .order('category');

    if (fetchError) {
      console.error('❌ 获取工具配置失败:', fetchError);
    } else {
      allConfigs?.forEach(config => {
        const costInfo = config.pro_cost !== null
          ? `标准: ${config.standard_cost}点 | Pro: ${config.pro_cost}点`
          : `标准: ${config.standard_cost}点`;
        console.log(`  - ${config.tool_name} (${config.tool_type}): ${costInfo}`);
      });
    }

    console.log('\n🎉 小数点数AI工具配置初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 运行初始化
if (require.main === module) {
  initDecimalAITools()
    .then(() => {
      console.log('✅ 初始化成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 初始化失败:', error);
      process.exit(1);
    });
}

export { initDecimalAITools };