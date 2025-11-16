import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 用户认证
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Word文件提取 - 认证错误:', authError);
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    console.log('Word文件提取 - 用户认证成功:', user.id);

    // 检查Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: '请使用multipart/form-data上传文件' },
        { status: 400 }
      );
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }

    console.log('开始处理Word文件:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];

    if (!validTypes.includes(file.type) &&
        !file.name.toLowerCase().endsWith('.docx') &&
        !file.name.toLowerCase().endsWith('.doc')) {
      return NextResponse.json(
        { error: '只支持Word文件格式(.doc或.docx)' },
        { status: 400 }
      );
    }

    // 检查文件大小 (限制为10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过10MB' },
        { status: 400 }
      );
    }

    console.log('Word文件验证通过，开始提取文本...');

    // 使用mammoth提取Word文档文本
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('文件信息:', {
      fileName: file.name,
      fileSize: file.size,
      arrayBufferLength: arrayBuffer.byteLength,
      bufferLength: buffer.length,
      fileHeaderStart: buffer.subarray(0, 20).toString('hex')
    });

    let result;
    try {
      if (file.name.toLowerCase().endsWith('.docx')) {
        // .docx文件使用mammoth
        console.log('开始解析.docx文件...');
        result = await mammoth.extractRawText({ buffer });
      } else if (file.name.toLowerCase().endsWith('.doc')) {
        // .doc文件使用不同的解析方式
        console.log('开始解析.doc文件...');
        // 对于.doc文件，尝试使用mammoth的raw text提取
        result = await mammoth.extractRawText({ buffer });
      } else {
        throw new Error('不支持的文件格式，请使用.doc或.docx文件');
      }
    } catch (mammothError) {
      console.error('Mammoth解析失败:', mammothError);
      console.error('文件详细信息:', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        isDocx: file.name.toLowerCase().endsWith('.docx'),
        isDoc: file.name.toLowerCase().endsWith('.doc')
      });

      // 如果mammoth失败，尝试直接读取文本内容（作为备用方案）
      try {
        console.log('Mammoth失败，尝试直接读取文本内容...');
        const textContent = buffer.toString('utf8');
        if (textContent && textContent.trim().length > 10) {
          console.log('直接读取文本成功，文本长度:', textContent.length);
          return NextResponse.json({
            success: true,
            text: textContent.trim(),
            fileName: file.name,
            fileSize: file.size,
            warning: '使用备用解析方法，建议使用标准Microsoft Word格式以获得更好效果'
          });
        } else {
          console.log('直接读取的文本内容为空或太短');
        }
      } catch (textError) {
        console.error('直接读取文本也失败:', textError);
      }

      // 提供更具体的错误信息
      let errorMessage = 'Word文件解析失败';
      if (mammothError.message.includes('zip file')) {
        errorMessage = '文件格式错误：这不是有效的.docx文件，请确保文件未损坏且为Microsoft Word格式。您也可以尝试将文件另存为.docx格式。';
      } else if (mammothError.message.includes('Could not find file')) {
        errorMessage = 'Word文件内部结构错误，请尝试重新保存文件';
      } else if (mammothError.message.includes('Could not find file in options')) {
        errorMessage = '文件处理错误：请确保上传的是有效的Word文档';
      } else {
        errorMessage = `Word文件解析失败: ${mammothError.message}`;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    if (!result || !result.value) {
      return NextResponse.json(
        { error: '未能从Word文件中提取到文本内容' },
        { status: 400 }
      );
    }

    const extractedText = result.value.trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: 'Word文件为空或未包含有效文本' },
        { status: 400 }
      );
    }

    console.log('Word文件文本提取成功:', {
      textLength: extractedText.length,
      linesCount: extractedText.split('\n').length
    });

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: file.name,
      fileSize: file.size
    });

  } catch (error) {
    console.error('Word文件处理错误:', error);
    return NextResponse.json(
      { error: 'Word文件处理失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}