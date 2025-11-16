// 测试生产环境OCR功能的脚本
const fetch = require('node-fetch');

// 这里需要设置你的生产环境URL
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://your-domain.com';

async function testOCR() {
    try {
        console.log('🔍 开始测试生产环境OCR功能...');

        // 使用一个简单的测试图片base64 (1x1像素的透明图片)
        const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        console.log(`📡 发送请求到: ${PRODUCTION_URL}/api/ai/essay-ocr`);

        const response = await fetch(`${PRODUCTION_URL}/api/ai/essay-ocr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageBase64: testImageBase64
            }),
            timeout: 150000 // 150秒超时
        });

        console.log(`📊 响应状态: ${response.status}`);
        console.log(`📊 响应头:`, response.headers.raw());

        const responseText = await response.text();
        console.log(`📝 响应内容 (前500字符):`, responseText.substring(0, 500));

        try {
            const data = JSON.parse(responseText);
            console.log('✅ JSON解析成功:', {
                success: data.success,
                error: data.error,
                message: data.message
            });
        } catch (parseError) {
            console.error('❌ JSON解析失败:', parseError.message);
            console.error('原始响应:', responseText);
        }

    } catch (error) {
        console.error('❌ 请求失败:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('🚫 连接被拒绝，请检查生产环境URL是否正确');
        } else if (error.code === 'ENOTFOUND') {
            console.error('🚫 域名解析失败，请检查域名是否正确');
        }
    }
}

// 运行测试
testOCR();