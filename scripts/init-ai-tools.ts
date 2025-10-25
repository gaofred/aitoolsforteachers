import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initAITools() {
  console.log('🚀 开始初始化AI工具配置...');

  try {
    // 检查表是否存在，如果不存在则跳过
    try {
      // 清空现有配置
      await (prisma as any).aiToolConfig.deleteMany({});

    // 插入AI工具配置数据
    const toolConfigs = [
      // 阅读教学工具
      {
        toolType: 'text-analysis',
        toolName: '阅读文本深度分析',
        description: '输入英语文章，AI将提供详细的语言分析报告，包括词汇、语法、文体等多维度分析',
        category: 'reading',
        standardCost: 3,
        proCost: 2,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'text-generator',
        toolName: '阅读文本生成神器',
        description: '输入主题和要求，AI将为您生成高质量的英语阅读文章，适合不同难度和学习目标',
        category: 'reading',
        standardCost: 4,
        proCost: 3,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'cd-questions',
        toolName: 'CD篇改编',
        description: '改编阅读理解文章，生成适合教学的CD篇练习',
        category: 'reading',
        standardCost: 5,
        proCost: 4,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'structure-analysis',
        toolName: '篇章结构分析',
        description: '分析文章结构，帮助学生理解文本组织方式',
        category: 'reading',
        standardCost: 4,
        proCost: 3,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'cloze-adaptation',
        toolName: '完形填空改编与命题',
        description: '生成完形填空练习，支持多种难度和题型',
        category: 'reading',
        standardCost: 6,
        proCost: 5,
        isProOnly: false,
        isActive: true
      },

      // 语法练习工具
      {
        toolType: 'single-grammar-fill',
        toolName: '单句语法填空',
        description: '生成单句语法填空练习',
        category: 'grammar',
        standardCost: 2,
        proCost: 1,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'grammar-generator',
        toolName: '单句语法填空生成器',
        description: 'AI生成语法练习，支持多种语法点',
        category: 'grammar',
        standardCost: 4,
        proCost: 3,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'grammar-questions',
        toolName: '语法填空命题',
        description: '创建语法测试题目，支持批量生成',
        category: 'grammar',
        standardCost: 5,
        proCost: 4,
        isProOnly: false,
        isActive: true
      },

      // 写作教学工具
      {
        toolType: 'application-writing',
        toolName: '应用文高分范文',
        description: '生成应用文范文，包含评分标准和写作技巧',
        category: 'writing',
        standardCost: 4,
        proCost: 3,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'application-lesson',
        toolName: '应用文学案',
        description: '创建应用文教学方案，包含教学目标和方法',
        category: 'writing',
        standardCost: 6,
        proCost: 5,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'continuation-writing',
        toolName: '读后续写范文',
        description: '生成读后续写示例，提供写作指导',
        category: 'writing',
        standardCost: 5,
        proCost: 4,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'continuation-lesson',
        toolName: '读后续写学案',
        description: '制作读后续写教学材料，包含练习和评估',
        category: 'writing',
        standardCost: 7,
        proCost: 6,
        isProOnly: false,
        isActive: true
      },

      // 翻译与多媒体工具
      {
        toolType: 'listening-generator',
        toolName: '英语听力生成器',
        description: '生成听力材料，支持多种语速和难度',
        category: 'translation',
        standardCost: 8,
        proCost: 6,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'en-to-cn',
        toolName: '地道英译汉',
        description: '提供地道的中文翻译，保持原文风格',
        category: 'translation',
        standardCost: 3,
        proCost: 2,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'multi-translation',
        toolName: '一句多译',
        description: '展示多种翻译方式，帮助学生理解语言多样性',
        category: 'translation',
        standardCost: 4,
        proCost: 3,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'cn-to-en',
        toolName: '地道汉译英',
        description: '提供地道的英文翻译，符合英语表达习惯',
        category: 'translation',
        standardCost: 3,
        proCost: 2,
        isProOnly: false,
        isActive: true
      },

      // 词汇学习工具
      {
        toolType: 'vocabulary-practice',
        toolName: '词汇练习生成',
        description: '创建词汇练习，支持多种题型和难度',
        category: 'vocabulary',
        standardCost: 3,
        proCost: 2,
        isProOnly: false,
        isActive: true
      },
      {
        toolType: 'word-analysis',
        toolName: '词汇分析工具',
        description: '分析词汇使用，提供词汇学习建议',
        category: 'vocabulary',
        standardCost: 4,
        proCost: 3,
        isProOnly: false,
        isActive: true
      }
    ];

    // 批量插入配置
    for (const config of toolConfigs) {
      await (prisma as any).aiToolConfig.create({
        data: config
      });
    }

    console.log(`✅ 成功初始化 ${toolConfigs.length} 个AI工具配置`);

    } catch (error) {
      console.log('⚠️ AI工具配置表不存在，跳过初始化');
      console.log('提示：如果需要AI工具配置，请先创建ai_tool_configs表');
    }

    // 创建一些示例兑换码
    const redemptionCodes = [
      {
        code: 'WELCOME50',
        type: 'POINTS' as const,
        value: 50,
        description: '新用户欢迎礼包',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后过期
      },
      {
        code: 'PRO30',
        type: 'MEMBERSHIP_DAYS' as const,
        value: 30,
        description: '30天Pro会员体验',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
      },
      {
        code: 'BONUS100',
        type: 'POINTS' as const,
        value: 100,
        description: '节日福利点数',
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15天后过期
      }
    ];

    // 清空现有兑换码
    await prisma.redemptionCode.deleteMany({});

    // 插入兑换码
    for (const redemptionCode of redemptionCodes) {
      await prisma.redemptionCode.create({
        data: redemptionCode
      });
    }

    console.log(`✅ 成功创建 ${redemptionCodes.length} 个兑换码`);

  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行初始化
if (require.main === module) {
  initAITools()
    .then(() => {
      console.log('🎉 初始化完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 初始化失败:', error);
      process.exit(1);
    });
}

export { initAITools };









