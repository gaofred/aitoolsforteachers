import { NextResponse } from "next/server";

export async function GET() {
  console.log('🔍 环境变量检查API被调用');

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    VOLCENGINE_API_KEY: process.env.VOLCENGINE_API_KEY ? {
      exists: true,
      length: process.env.VOLCENGINE_API_KEY.length,
      prefix: process.env.VOLCENGINE_API_KEY.substring(0, 10) + '...',
      suffix: '...' + process.env.VOLCENGINE_API_KEY.substring(process.env.VOLCENGINE_API_KEY.length - 10)
    } : {
      exists: false,
      length: 0,
      error: '环境变量未配置'
    },
    SiliconFlow_KEY: process.env.SiliconFlow_KEY ? {
      exists: true,
      length: process.env.SiliconFlow_KEY.length,
      prefix: process.env.SiliconFlow_KEY.substring(0, 10) + '...',
      suffix: '...' + process.env.SiliconFlow_KEY.substring(process.env.SiliconFlow_KEY.length - 10)
    } : {
      exists: false,
      length: 0,
      error: '环境变量未配置'
    },
    ZEABUR_API_KEY: process.env.ZEABUR_API_KEY ? {
      exists: true,
      length: process.env.ZEABUR_API_KEY.length,
      prefix: process.env.ZEABUR_API_KEY.substring(0, 10) + '...',
      suffix: '...' + process.env.ZEABUR_API_KEY.substring(process.env.ZEABUR_API_KEY.length - 10)
    } : {
      exists: false,
      length: 0,
      error: '环境变量未配置'
    },
    GEEKAI_API_KEY: process.env.GEEKAI_API_KEY ? {
      exists: true,
      length: process.env.GEEKAI_API_KEY.length,
      prefix: process.env.GEEKAI_API_KEY.substring(0, 10) + '...',
      suffix: '...' + process.env.GEEKAI_API_KEY.substring(process.env.GEEKAI_API_KEY.length - 10)
    } : {
      exists: false,
      length: 0,
      error: '环境变量未配置'
    },
    // 检查其他相关环境变量
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ 已配置' : '❌ 未配置',
    DATABASE_URL: process.env.DATABASE_URL ? '✅ 已配置' : '❌ 未配置',
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ 已配置' : '❌ 未配置',
  };

  console.log('📊 环境变量检查结果:', envVars);

  return NextResponse.json({
    success: true,
    data: envVars,
    timestamp: new Date().toISOString()
  });
}