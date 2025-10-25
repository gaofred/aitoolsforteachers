/**
 * 检查云雾API配置脚本
 * 验证环境变量是否正确配置
 */

import { CloudMistService } from '../src/lib/cloudmist-api';

async function checkCloudMistConfiguration() {
  console.log('🔍 检查云雾API配置...\n');

  try {
    // 检查配置状态
    const config = CloudMistService.checkConfiguration();
    
    console.log('📋 配置状态:');
    console.log(`   通用API Key: ${config.hasGeneralKey ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   谷歌模型API Key: ${config.hasGoogleKey ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`   火山引擎API Key: ${config.hasVolcengineKey ? '✅ 已配置' : '❌ 未配置'}`);
    
    if (config.configuredModels.length > 0) {
      console.log(`\n🎯 可用模型 (${config.configuredModels.length}个):`);
      config.configuredModels.forEach(model => {
        console.log(`   - ${model}`);
      });
    } else {
      console.log('\n❌ 没有可用的模型配置');
    }

    // 测试API连接（如果有配置的话）
    if (config.hasGeneralKey || config.hasGoogleKey) {
      console.log('\n🧪 测试API连接...');
      
      try {
        const testModel = config.configuredModels[0];
        const response = await CloudMistService.generateText(
          'Hello, this is a test message from the English Teaching Platform configuration checker!',
          testModel
        );
        
        console.log(`✅ API连接成功！`);
        console.log(`   测试模型: ${testModel}`);
        console.log(`   响应长度: ${response.length} 字符`);
        console.log(`   响应预览: ${response.substring(0, 100)}...`);
        
      } catch (error) {
        console.log(`❌ API连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    console.log('\n📝 配置建议:');
    if (!config.hasGeneralKey) {
      console.log('   - 请在 .env.local 文件中添加 CLOUDMIST_API_KEY');
    }
    if (!config.hasGoogleKey) {
      console.log('   - 请在 .env.local 文件中添加 CLOUDMIST_GOOGLE_API_KEY');
    }
    if (!config.hasVolcengineKey) {
      console.log('   - 请在 .env.local 文件中添加 VOLCENGINE_API_KEY');
    }
    if (config.hasGeneralKey && config.hasGoogleKey && config.hasVolcengineKey) {
      console.log('   - ✅ 所有API Key都已正确配置！');
    }

  } catch (error) {
    console.error('❌ 检查配置时发生错误:', error);
  }
}

// 运行检查
if (require.main === module) {
  checkCloudMistConfiguration()
    .then(() => {
      console.log('\n🎉 配置检查完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 检查失败:', error);
      process.exit(1);
    });
}

export { checkCloudMistConfiguration };
