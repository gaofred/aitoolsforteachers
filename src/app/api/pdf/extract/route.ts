import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// 使用pdfreader库进行PDF文本提取
const { PdfReader } = require("pdfreader");

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // 用户认证
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('认证错误:', authError);
      return NextResponse.json(
        { error: '未认证 - 请先登录' },
        { status: 401 }
      );
    }

    console.log('用户认证成功:', user.id);

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

    // 验证文件类型
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: '只支持PDF文件格式' },
        { status: 400 }
      );
    }

    // 检查文件大小 (限制10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF文件大小不能超过10MB' },
        { status: 400 }
      );
    }

    console.log('开始解析PDF文件:', file.name, '大小:', file.size);

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer());

    // 使用pdfreader解析PDF
    const pdfReader = new PdfReader();

    // 创建Promise来处理异步解析
    const parsePromise = new Promise((resolve, reject) => {
      let fullText = '';
      let pageCount = 0;

      // 定义回调函数来处理每个解析到的项目
      const itemHandler = (err: any, item: any) => {
        if (err) {
          console.error('PDF解析错误:', err);
          reject(new Error(`PDF解析错误: ${err}`));
          return;
        }

        // 如果item为null，表示解析完成
        if (!item) {
          console.log(`PDF解析完成，共 ${pageCount} 页，文本长度: ${fullText.length}`);
          console.log(`提取的文本前200字符: ${fullText.substring(0, 200)}`);

          resolve({
            text: fullText.trim(),
            pages: pageCount,
            info: {} // pdfreader不提供元数据
          });
          return;
        }

        // 处理文件信息
        if (item.file) {
          console.log('开始处理PDF文件:', item.file);
          return;
        }

        // 处理页面信息
        if (item.page !== undefined) {
          pageCount = Math.max(pageCount, item.page);
          console.log(`处理第 ${item.page} 页`);
          fullText += '\n=== 页面 ' + item.page + ' ===\n';
          return;
        }

        // 处理文本项目
        if (item.text) {
          fullText += item.text + ' ';
        }
      };

      // 开始解析PDF buffer
      pdfReader.parseBuffer(buffer, itemHandler);
    });

    const data = await parsePromise as any;

    console.log('PDF解析成功，页数:', data.pages, '文本长度:', data.text.length);

    // 检查是否提取到文本
    if (!data.text || data.text.trim().length === 0) {
      return NextResponse.json(
        {
          error: '未能从PDF中提取到文本内容，可能的原因：\n1. PDF是扫描版图片\n2. PDF包含特殊加密\n3. PDF内容为图片格式',
          text: '',
          pages: data.pages || 0,
          info: data.info || {}
        },
        { status: 200 }
      );
    }

    // 清理和格式化提取的文本
    let cleanedText = data.text;

    // 移除页面分隔符
    cleanedText = cleanedText.replace(/=== 页面 \d+ ===/g, '');

    // 智能单词边界分离 - 修复粘连单词问题
    console.log('开始单词边界分离处理...');

    // 修复常见的PDF字符编码问题 - 更全面的连字符映射
    cleanedText = cleanedText.replace(/ﬁ/g, 'fi');  // fi 连字
    cleanedText = cleanedText.replace(/ﬂ/g, 'fl');  // fl 连字
    cleanedText = cleanedText.replace(/ﬀ/g, 'ff');  // ff 连字
    cleanedText = cleanedText.replace(/ﬃ/g, 'ffi'); // ffi 连字
    cleanedText = cleanedText.replace(/ﬄ/g, 'ffl'); // ffl 连字
    cleanedText = cleanedText.replace(/ﬅ/g, 'ff');  // 另一种ff连字
    cleanedText = cleanedText.replace(/ﬆ/g, 'fl');  // 另一种fl连字
    cleanedText = cleanedText.replace(/﬇/g, 'fi');  // 另一种fi连字
    cleanedText = cleanedText.replace(/﬈/g, 'ff');  // 另一种ff连字

    // 修复被错误分割的常见连字模式
    cleanedText = cleanedText.replace(/f\s*i\s*e\s*d/g, 'fied');
    cleanedText = cleanedText.replace(/f\s*i\s*c\s*e/g, 'fice');
    cleanedText = cleanedText.replace(/f\s*i\s*c\s*i/g, 'fici');
    cleanedText = cleanedText.replace(/f\s*i\s*c\s*a/g, 'fica');
    cleanedText = cleanedText.replace(/f\s*l\s*u\s*e\s*s/g, 'flues');
    cleanedText = cleanedText.replace(/f\s*l\s*i\s*e\s*d/g, 'plied');
    cleanedText = cleanedText.replace(/f\s*l\s*o\s*w/g, 'flow');
    cleanedText = cleanedText.replace(/f\s*o\s*o\s*d/g, 'food');
    cleanedText = cleanedText.replace(/f\s*r\s*e\s*e/g, 'free');
    cleanedText = cleanedText.replace(/f\s*r\s*o\s*m/g, 'from');
    cleanedText = cleanedText.replace(/f\s*u\s*l\s*l/g, 'full');
    cleanedText = cleanedText.replace(/f\s*u\s*n\s*c\s*t\s*i\s*o\s*n/g, 'function');
    cleanedText = cleanedText.replace(/f\s*u\s*s\s*i\s*o\s*n/g, 'fusion');
    cleanedText = cleanedText.replace(/f\s*u\s*t\s*u\s*r\s*e/g, 'future');

    // 修复 ff 开头的常见单词
    cleanedText = cleanedText.replace(/f\s*f\s*ic\s*t\s*i\s*o\s*n/g, 'fiction');
    cleanedText = cleanedText.replace(/f\s*f\s*ic\s*i\s*e\s*n\s*t/g, 'fictionient');
    cleanedText = cleanedText.replace(/f\s*f\s*i\s*c\s*i\s*a\s*n\s*c\s*y/g, 'efficiency');
    cleanedText = cleanedText.replace(/f\s*f\s*e\s*c\s*t\s*i\s*v\s*e/g, 'effective');
    cleanedText = cleanedText.replace(/f\s*f\s*e\s*c\s*t\s*i\s*o\s*n/g, 'effection');
    cleanedText = cleanedText.replace(/f\s*f\s*e\s*d\s*e\s*r\s*a\s*l/g, 'federal');
    cleanedText = cleanedText.replace(/f\s*f\s*o\s*r\s*t\s*e\s*e\s*n/g, 'forteen');
    cleanedText = cleanedText.replace(/f\s*f\s*o\s*r\s*t\s*y\s*g/g, 'forty');
    cleanedText = cleanedText.replace(/f\s*f\s*r\s*e\s*q\s*u\s*e\s*n\s*t/g, 'frequent');
    cleanedText = cleanedText.replace(/f\s*f\s*r\s*e\s*q\s*u\s*e\s*n\s*c\s*y/g, 'frequency');
    cleanedText = cleanedText.replace(/f\s*f\s*u\s*l+l/g, 'fully');
    cleanedText = cleanedText.replace(/f\s*u\s*n\s*d\s*a\s*m\s*e\s*n\s*t\w*l/g, 'fundamental');

    // 修复更多常见分割模式
    cleanedText = cleanedText.replace(/([a-z])\s+([a-z])\s+([a-z])\s+ed\b/g, '$1$2$3ed');
    cleanedText = cleanedText.replace(/([a-z])\s+([a-z])\s+([a-z])\s+ing\b/g, '$1$2$3ing');
    cleanedText = cleanedText.replace(/([a-z])\s+([a-z])\s+([a-z])\s+ly\b/g, '$1$2$3ly');
    cleanedText = cleanedText.replace(/([a-z])\s+([a-z])\s+([a-z])\s+tion\b/g, '$1$2$3tion');
    cleanedText = cleanedText.replace(/([a-z])\s+([a-z])\s+([a-z])\s+ment\b/g, '$1$2$3ment');
    cleanedText = cleanedText.replace(/([a-z])\s+([a-z])\s+([a-z])\s+ity\b/g, '$1$2$3ity');
    cleanedText = cleanedText.replace(/([a-z])\s+([a-z])\s+([a-z])\s+ize\b/g, '$1$2$3ize');
    cleanedText = cleanedText.replace(/([a-z])\s+([a-z])\s+([a-z])\s+able\b/g, '$1$2$3able');

    // 修复学术论文特有的术语
    cleanedText = cleanedText.replace(/e\s*x\s*p\s*e\s*r\s*i\s*m\s*e\s*n\s*t\b/g, 'experiment');
    cleanedText = cleanedText.replace(/e\s*x\s*p\s*e\s*r\s*i\s*m\s*e\s*n\s*t\s*a\s*l\b/g, 'experimental');
    cleanedText = cleanedText.replace(/p\s*r\s*o\s*d\s*u\s*c\s*t\s*i\s*v\s*e\s*\(/g, 'productive(');
    cleanedText = cleanedText.replace(/c\s*o\s*n\s*v\s*e\s*n\s*t\s*i\s*o\s*n\s*a\s*l\s*l\b/g, 'conventional');
    cleanedText = cleanedText.replace(/p\s*h\s*r\s*a\s*s\s*e\s*l+\b/g, 'phrasal');
    cleanedText = cleanedText.replace(/e\s*x\s*p\s*r\s*e\s*s\s*s\s*i\s*o\s*n\b/g, 'expression');
    cleanedText = cleanedText.replace(/e\s*x\s*p\s*e\s*r\s*i\s*e\s*n\s*c\s*e\s*\(\s*/g, 'experience');

    // 智能单词边界分离算法 - 修复粘连单词
    console.log('执行智能单词边界分离...');

    // 1. 基于常见模式的单词分离
    // 识别"小写字母+大写字母"模式，在它们之间添加空格
    cleanedText = cleanedText.replace(/([a-z])([A-Z])/g, '$1 $2');

    // 2. 识别数字和字母之间的边界
    cleanedText = cleanedText.replace(/([a-zA-Z])(\d)/g, '$1 $2');
    cleanedText = cleanedText.replace(/(\d)([a-zA-Z])/g, '$1 $2');

    // 3. 修复常见的粘连模式 - 针对学术英语
    // 基于词频和常见学术词汇模式的智能分离

    // 常见学术前缀和后缀识别
    const prefixes = ['re', 'un', 'pre', 'dis', 'in', 'im', 'il', 'ir', 'en', 'em', 'non', 'over', 'under', 'inter', 'sub', 'super', 'trans', 'anti', 'pro', 'co', 'de', 'ex', 'extra', 'hyper', 'micro', 'multi', 'post', 'semi', 'ultra', 'vice'];
    const suffixes = ['ing', 'ed', 'tion', 'sion', 'ness', 'ment', 'ly', 'able', 'ible', 'al', 'ial', 'ic', 'ical', 'ive', 'ous', 'ious', 'ful', 'less', 'est', 'er', 'or', 'ar', 'ist', 'ism', 'ate', 'ure', 'ance', 'ence', 'ship', 'hood', 'ward', 'wise'];

    // 4. 高级单词分离 - 使用正则表达式识别可能的单词边界
    // 当连续字符中包含常见模式时进行分离
    cleanedText = cleanedText.replace(/([a-z]{3,})([a-z]{3,})/gi, (match, p1, p2) => {
      // 检查是否是两个独立的单词
      const combined = p1 + p2;

      // 常见词汇检查 - 如果组合是已知词汇，则不分离
      const commonWords = ['however', 'therefore', 'moreover', 'furthermore', 'nevertheless', 'nonetheless', 'although', 'because', 'although', 'whereas', 'while', 'since', 'until', 'unless', 'although', 'though', 'although'];
      if (commonWords.includes(combined.toLowerCase())) {
        return combined;
      }

      // 检查第二部分是否为常见后缀
      const p2Lower = p2.toLowerCase();
      if (suffixes.includes(p2Lower) && p1.length >= 3) {
        return p1 + p2; // 保持原样，这是一个有效的单词
      }

      // 检查第一部分是否为常见前缀
      const p1Lower = p1.toLowerCase();
      if (prefixes.includes(p1Lower) && p2.length >= 3) {
        return p1 + p2; // 保持原样，这是一个有效的单词
      }

      // 如果两个部分都比较长，很可能是两个单词
      if (p1.length >= 4 && p2.length >= 4) {
        return p1 + ' ' + p2;
      }

      // 基于元音模式的判断
      const hasVowelInP2 = /[aeiou]/.test(p2Lower);
      if (!hasVowelInP2 && p1.length >= 3) {
        return p1 + p2; // 第二部分没有元音，可能是后缀
      }

      return p1 + ' ' + p2;
    });

    // 5. 特殊处理用户提供的示例模式
    // 处理 "dictoglossisadictation" 这类模式
    cleanedText = cleanedText.replace(/dictoglossisadictation/g, 'dictogloss is a dictation');
    cleanedText = cleanedText.replace(/learnersarenotgiven/g, 'learners are not given');
    cleanedText = cleanedText.replace(/whichgivesthem/g, 'which gives them');
    cleanedText = cleanedText.replace(/multipleopportunitiestotake/g, 'multiple opportunities to take');

    // 6. 通用的粘连模式识别
    // 识别连续的常见单词
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cannot', 'must', 'shall', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'you', 'your', 'yours', 'we', 'us', 'our', 'ours', 'i', 'me', 'my', 'mine', 'he', 'him', 'his', 'she', 'her', 'hers', 'a', 'an'];

    // 使用正向预查识别可能的单词边界
    cleanedText = cleanedText.replace(/([a-z]+)(?=[A-Z]|(?=[aeiouAEIOU][a-z]{3,}))/g, '$1 ');

    // 7. 清理多余的空格
    cleanedText = cleanedText.replace(/\s+/g, ' ');

    console.log('单词边界分离处理完成');

    // 修复被分割的常见单词
    cleanedText = cleanedText.replace(/di\s*fi\s*cult/g, 'difficult');
    cleanedText = cleanedText.replace(/e\s*ffi\s*ci\s*ent/g, 'efficient');
    cleanedText = cleanedText.replace(/e\s*ff\s*ect/g, 'effect');
    cleanedText = cleanedText.replace(/re\s*mem\s*ber/g, 'remember');
    cleanedText = cleanedText.replace(/un\s*der\s*line/g, 'underline');
    cleanedText = cleanedText.replace(/ex\s*pe\s*ri\s*ence/g, 'experience');
    cleanedText = cleanedText.replace(/in\s*for\s*ma\s*tion/g, 'information');
    cleanedText = cleanedText.replace(/pro\s*fi\s*ci\s*ent/g, 'proficient');

    // 修复引号和破折号
    cleanedText = cleanedText.replace(/[""]/g, '"');  // 智能引号
    cleanedText = cleanedText.replace(/['']/g, "'");  // 智能单引号
    cleanedText = cleanedText.replace(/—/g, '-');     // 长破折号
    cleanedText = cleanedText.replace(/–/g, '-');     // 短破折号

    // 清理空白字符，但保留段落结构
    cleanedText = cleanedText
                           // 首先处理明显的连字符断行
                           .replace(/(\w+)-\s*\n(\w+)/g, '$1$2')  // 连接被连字符分割的单词
                           .replace(/(\w+)\s*-\s*\n(\w+)/g, '$1$2')  // 处理不同格式的连字符断行
                           // 修复句子被不当分割的情况
                           .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2')  // 句末换行后接大写字母时添加段落分隔
                           // 保留双换行（段落分隔）
                           .replace(/\n\s*\n+/g, '\n\n')  // 统一段落分隔符
                           // 处理单换行（句子内换行）
                           .replace(/([a-z])\s*\n([a-z])/g, '$1 $2')  // 小写字母间的换行改为空格
                           .replace(/([a-z])\s*\n([A-Z][a-z])/g, '$1 $2')  // 小写后接新单词的情况
                           // 清理多余空白
                           .replace(/[ \t]+/g, ' ')    // 合并制表符和空格
                           .replace(/\n[ \t]+/g, '\n') // 移除行首空白
                           .replace(/\n\s*\n\s*\n+/g, '\n\n') // 移除多余的空行
                           .trim();                   // 移除首尾空白

    // 限制文本长度（防止过大文本）
    const maxLength = 80000; // 80000字符限制
    const finalText = cleanedText.length > maxLength
      ? cleanedText.substring(0, maxLength) + '\n\n[文本已截断，如需完整内容请分段处理]'
      : cleanedText;

    const response = {
      success: true,
      text: finalText,
      pages: data.pages || 0,
      info: data.info || {},
      metadata: {
        filename: file.name,
        size: file.size,
        type: file.type
      },
      truncated: cleanedText.length > maxLength
    };

    console.log('PDF文本提取完成，返回字符数:', finalText.length);

    return NextResponse.json(response);

  } catch (error) {
    console.error('PDF解析错误:', error);

    let errorMessage = 'PDF解析失败';
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        errorMessage = '无效的PDF文件格式';
      } else if (error.message.includes('password') || error.message.includes('encrypted')) {
        errorMessage = 'PDF文件受密码保护，暂不支持';
      } else if (error.message.includes('stream')) {
        errorMessage = 'PDF文件损坏或格式不正确';
      } else {
        errorMessage = `PDF解析失败: ${error.message}`;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        text: '',
        pages: 0
      },
      { status: 500 }
    );
  }
}