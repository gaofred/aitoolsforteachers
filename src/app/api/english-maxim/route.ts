import { NextRequest, NextResponse } from 'next/server';

// 天聚数行英语格言API配置
const TIANJU_API_KEY = process.env.tianjuapi;
const TIANJU_API_URL = 'https://apis.tianapi.com/enmaxim/index';

export async function GET() {
  try {
    if (!TIANJU_API_KEY) {
      return NextResponse.json({
        error: '天聚数行API密钥未配置'
      }, { status: 500 });
    }

    console.log('🎯 开始获取英语格言');

    // 调用天聚数行API
    const apiUrl = `${TIANJU_API_URL}?key=${TIANJU_API_KEY}`;
    console.log('📤 请求URL:', apiUrl.replace(/\?.*$/, '?key=***'));

    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ 天聚数行API错误:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        errorText: errorText
      });

      return NextResponse.json({
        error: `天聚数行API调用失败: ${apiResponse.statusText}`
      }, { status: 500 });
    }

    const apiData = await apiResponse.json();
    console.log('✅ 天聚数行API响应成功:', {
      code: apiData.code,
      msg: apiData.msg
    });

    if (apiData.code !== 200) {
      console.error('❌ 天聚数行API返回错误:', apiData);
      return NextResponse.json({
        error: `天聚数行API返回错误: ${apiData.msg || '未知错误'}`
      }, { status: 500 });
    }

    if (!apiData.result) {
      console.error('❌ 天聚数行API返回结果为空');
      return NextResponse.json({
        error: '天聚数行API返回结果为空'
      }, { status: 500 });
    }

    const { en, zh } = apiData.result;
    console.log('🎉 英语格言获取成功');

    return NextResponse.json({
      success: true,
      en: en,
      zh: zh
    });

  } catch (error) {
    console.error('❌ 英语格言获取失败:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}