import { createServerSupabaseClient } from '../src/lib/supabase-server';

async function initSupabaseDatabase() {
  console.log('🚀 开始初始化Supabase数据库...');

  const supabase = createServerSupabaseClient();

  try {
    // 1. 创建AI工具配置数据
    console.log('📝 创建AI工具配置...');
    
    const toolConfigs = [
      // 阅读教学工具
      {
        tool_type: 'text-analysis',
        tool_name: '阅读文本深度分析',
        description: '输入英语文章，AI将提供详细的语言分析报告，包括词汇、语法、文体等多维度分析',
        category: 'reading',
        standard_cost: 3,
        pro_cost: 2,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'text-generator',
        tool_name: '阅读文本生成神器',
        description: '输入主题和要求，AI将为您生成高质量的英语阅读文章，适合不同难度和学习目标',
        category: 'reading',
        standard_cost: 4,
        pro_cost: 3,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'cd-questions',
        tool_name: 'CD篇改编',
        description: '改编阅读理解文章，生成适合教学的CD篇练习',
        category: 'reading',
        standard_cost: 5,
        pro_cost: 4,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'structure-analysis',
        tool_name: '篇章结构分析',
        description: '分析文章结构，帮助学生理解文本组织方式',
        category: 'reading',
        standard_cost: 4,
        pro_cost: 3,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'cloze-adaptation',
        tool_name: '完形填空改编与命题',
        description: '生成完形填空练习，支持多种难度和题型',
        category: 'reading',
        standard_cost: 6,
        pro_cost: 5,
        is_pro_only: false,
        is_active: true
      },

      // 语法练习工具
      {
        tool_type: 'single-grammar-fill',
        tool_name: '单句语法填空',
        description: '生成单句语法填空练习',
        category: 'grammar',
        standard_cost: 2,
        pro_cost: 1,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'grammar-generator',
        tool_name: '单句语法填空生成器',
        description: 'AI生成语法练习，支持多种语法点',
        category: 'grammar',
        standard_cost: 4,
        pro_cost: 3,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'grammar-questions',
        tool_name: '语法填空命题',
        description: '创建语法测试题目，支持批量生成',
        category: 'grammar',
        standard_cost: 5,
        pro_cost: 4,
        is_pro_only: false,
        is_active: true
      },

      // 写作教学工具
      {
        tool_type: 'application-writing',
        tool_name: '应用文高分范文',
        description: '生成应用文范文，包含评分标准和写作技巧',
        category: 'writing',
        standard_cost: 4,
        pro_cost: 3,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'application-lesson',
        tool_name: '应用文学案',
        description: '创建应用文教学方案，包含教学目标和方法',
        category: 'writing',
        standard_cost: 6,
        pro_cost: 5,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'continuation-writing',
        tool_name: '读后续写范文',
        description: '生成读后续写示例，提供写作指导',
        category: 'writing',
        standard_cost: 5,
        pro_cost: 4,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'continuation-lesson',
        tool_name: '读后续写学案',
        description: '制作读后续写教学材料，包含练习和评估',
        category: 'writing',
        standard_cost: 7,
        pro_cost: 6,
        is_pro_only: false,
        is_active: true
      },

      // 翻译与多媒体工具
      {
        tool_type: 'listening-generator',
        tool_name: '英语听力生成器',
        description: '生成听力材料，支持多种语速和难度',
        category: 'translation',
        standard_cost: 8,
        pro_cost: 6,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'en-to-cn',
        tool_name: '地道英译汉',
        description: '提供地道的中文翻译，保持原文风格',
        category: 'translation',
        standard_cost: 3,
        pro_cost: 2,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'multi-translation',
        tool_name: '一句多译',
        description: '展示多种翻译方式，帮助学生理解语言多样性',
        category: 'translation',
        standard_cost: 4,
        pro_cost: 3,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'cn-to-en',
        tool_name: '地道汉译英',
        description: '提供地道的英文翻译，符合英语表达习惯',
        category: 'translation',
        standard_cost: 3,
        pro_cost: 2,
        is_pro_only: false,
        is_active: true
      },

      // 词汇学习工具
      {
        tool_type: 'vocabulary-practice',
        tool_name: '词汇练习生成',
        description: '创建词汇练习，支持多种题型和难度',
        category: 'vocabulary',
        standard_cost: 3,
        pro_cost: 2,
        is_pro_only: false,
        is_active: true
      },
      {
        tool_type: 'word-analysis',
        tool_name: '词汇分析工具',
        description: '分析词汇使用，提供词汇学习建议',
        category: 'vocabulary',
        standard_cost: 4,
        pro_cost: 3,
        is_pro_only: false,
        is_active: true
      }
    ];

    // 清空现有配置
    await supabase.from('ai_tool_configs').delete().neq('id', '');

    // 批量插入配置
    const { error: configError } = await supabase
      .from('ai_tool_configs')
      .insert(toolConfigs as any);

    if (configError) {
      console.error('创建AI工具配置失败:', configError);
      throw configError;
    }

    console.log(`✅ 成功创建 ${toolConfigs.length} 个AI工具配置`);

    // 2. 创建示例兑换码
    console.log('🎁 创建示例兑换码...');
    
    const redemptionCodes = [
      {
        code: 'WELCOME50',
        type: 'POINTS',
        value: 50,
        description: '新用户欢迎礼包',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30天后过期
      },
      {
        code: 'PRO30',
        type: 'MEMBERSHIP_DAYS',
        value: 30,
        description: '30天Pro会员体验',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天后过期
      },
      {
        code: 'BONUS100',
        type: 'POINTS',
        value: 100,
        description: '节日福利点数',
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15天后过期
      },
      {
        code: 'STUDENT25',
        type: 'POINTS',
        value: 25,
        description: '学生专享福利',
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60天后过期
      }
    ];

    // 清空现有兑换码
    await supabase.from('redemption_codes').delete().neq('id', '');

    // 插入兑换码
    const { error: codeError } = await supabase
      .from('redemption_codes')
      .insert(redemptionCodes as any);

    if (codeError) {
      console.error('创建兑换码失败:', codeError);
      throw codeError;
    }

    console.log(`✅ 成功创建 ${redemptionCodes.length} 个兑换码`);

    // 3. 验证数据创建
    console.log('🔍 验证数据创建...');
    
    const { data: configs, error: configCheckError } = await supabase
      .from('ai_tool_configs')
      .select('count', { count: 'exact', head: true });

    const { data: codes, error: codeCheckError } = await supabase
      .from('redemption_codes')
      .select('count', { count: 'exact', head: true });

    if (configCheckError || codeCheckError) {
      console.error('验证数据创建失败:', configCheckError || codeCheckError);
      throw configCheckError || codeCheckError;
    }

    console.log(`✅ 验证完成：AI工具配置 ${configs} 个，兑换码 ${codes} 个`);

    console.log('🎉 Supabase数据库初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  }
}

// 运行初始化
if (require.main === module) {
  initSupabaseDatabase()
    .then(() => {
      console.log('🎉 初始化完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 初始化失败:', error);
      process.exit(1);
    });
}

export { initSupabaseDatabase };









