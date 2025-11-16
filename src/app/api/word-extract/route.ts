import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 });
    }

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支持的文件类型，请上传Word文档' }, { status: 400 });
    }

    // 检查文件大小 (10MB限制)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 400 });
    }

    // 将文件转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    try {
      // 使用第三方API服务提取Word文档文本
      // 这里使用了一个通用的文档提取API
      const extractResponse = await fetch('https://api.docparser.com/v1/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DOCPARSER_API_KEY || 'demo-key'}`,
        },
        body: JSON.stringify({
          file: base64,
          filename: file.name,
          extract_text: true,
          preserve_formatting: false
        }),
      });

      if (!extractResponse.ok) {
        console.error('Word文档API调用失败:', extractResponse.status, extractResponse.statusText);

        // 备用方案：返回一个简单的提示信息
        return NextResponse.json({
          error: null,
          text: `[Word文档上传成功]\n\n文件名: ${file.name}\n\n注意：Word文档文本提取功能需要配置API密钥，请手动输入题目内容。`
        });
      }

      const result = await extractResponse.json();

      // 清理提取的文本
      let extractedText = '';
      if (result.text) {
        extractedText = result.text.trim();
      } else if (result.content) {
        extractedText = result.content.trim();
      } else if (result.extracted_text) {
        extractedText = result.extracted_text.trim();
      }

      if (!extractedText) {
        return NextResponse.json({ error: '未能从Word文档中提取文本内容' }, { status: 400 });
      }

      // 清理文本，移除多余的空白字符
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      return NextResponse.json({
        success: true,
        text: extractedText,
        filename: file.name,
        size: file.size
      });

    } catch (apiError) {
      console.error('Word文档提取API错误:', apiError);

      // 备用方案：返回文件信息，提示用户手动输入
      return NextResponse.json({
        error: null,
        text: `[Word文档信息]\n文件名: ${file.name}\n文件大小: ${(file.size / 1024).toFixed(1)}KB\n\n请根据Word文档内容手动输入题目文本。`
      });
    }

  } catch (error) {
    console.error('Word文档处理错误:', error);
    return NextResponse.json(
      { error: 'Word文档处理失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}