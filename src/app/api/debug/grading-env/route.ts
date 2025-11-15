import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 检查批改API环境变量配置');

    // 检查所有可能的环境变量
    const envVars = {
      'ALiYunSingapore_APIKEY': {
        exists: !!process.env.ALiYunSingapore_APIKEY,
        length: process.env.ALiYunSingapore_APIKEY?.length || 0,
        prefix: process.env.ALiYunSingapore_APIKEY?.substring(0, 10) || ''
      },
      'DASHSCOPE_API_KEY': {
        exists: !!process.env.DASHSCOPE_API_KEY,
        length: process.env.DASHSCOPE_API_KEY?.length || 0,
        prefix: process.env.DASHSCOPE_API_KEY?.substring(0, 10) || ''
      },
      'AliYun_APIKEY': {
        exists: !!process.env.AliYun_APIKEY,
        length: process.env.AliYun_APIKEY?.length || 0,
        prefix: process.env.AliYun_APIKEY?.substring(0, 10) || ''
      }
    };

    // 确定最终使用的API密钥
    const ALIYUN_API_KEY = process.env.ALiYunSingapore_APIKEY ||
                            process.env.DASHSCOPE_API_KEY ||
                            process.env.AliYun_APIKEY;

    const finalConfig = {
      finalKeyExists: !!ALIYUN_API_KEY,
      finalKeyLength: ALIYUN_API_KEY?.length || 0,
      finalKeyPrefix: ALIYUN_API_KEY?.substring(0, 10) || '',
      apiURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen3-max'
    };

    console.log('🔍 环境变量检查结果:', {
      envVars,
      finalConfig,
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      envVars,
      finalConfig,
      recommendations: {
        shouldConfigure: !ALIYUN_API_KEY,
        preferredEnvVar: 'ALiYunSingapore_APIKEY'
      }
    });

  } catch (error) {
    console.error('❌ 环境变量检查失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}