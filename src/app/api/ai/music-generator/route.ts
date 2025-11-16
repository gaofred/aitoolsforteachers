import { NextRequest, NextResponse } from 'next/server';
import { CloudMistService } from '@/lib/cloudmist-api';
import { SupabasePointsService } from '@/lib/supabase-points-service';

// 欧标B1水平核心词汇列表
const B1_VOCABULARY = new Set([
  // 常用动词
  'agree', 'arrive', 'ask', 'believe', 'bring', 'buy', 'call', 'can', 'come', 'decide', 'do', 'enjoy', 'explain', 'find', 'get', 'give', 'go', 'have', 'hear', 'help', 'hope', 'join', 'know', 'learn', 'leave', 'like', 'live', 'look', 'love', 'make', 'mean', 'meet', 'need', 'offer', 'pay', 'play', 'prefer', 'promise', 'read', 'remember', 'say', 'see', 'sell', 'send', 'sing', 'sleep', 'speak', 'spend', 'start', 'study', 'take', 'talk', 'teach', 'tell', 'think', 'try', 'understand', 'use', 'want', 'wait', 'work', 'write',

  // 常用名词
  'answer', 'book', 'car', 'chair', 'class', 'day', 'door', 'family', 'friend', 'game', 'home', 'house', 'job', 'life', 'man', 'money', 'morning', 'music', 'name', 'night', 'paper', 'party', 'people', 'place', 'problem', 'question', 'room', 'school', 'student', 'table', 'teacher', 'time', 'water', 'way', 'week', 'woman', 'word', 'work', 'year',

  // 常用形容词
  'bad', 'big', 'busy', 'clean', 'cold', 'dark', 'difficult', 'easy', 'expensive', 'fast', 'good', 'happy', 'hard', 'hot', 'important', 'interesting', 'large', 'long', 'new', 'nice', 'old', 'quiet', 'right', 'sad', 'short', 'small', 'sure', 'tired', 'warm', 'white', 'young',

  // 常用副词
  'always', 'also', 'back', 'better', 'early', 'enough', 'even', 'ever', 'finally', 'first', 'here', 'just', 'last', 'later', 'long', 'loud', 'more', 'never', 'next', 'now', 'often', 'only', 'quickly', 'quite', 'really', 'slowly', 'sometimes', 'soon', 'still', 'then', 'there', 'today', 'together', 'tomorrow', 'very', 'well',

  // 其他常用词
  'about', 'after', 'again', 'against', 'all', 'almost', 'along', 'already', 'also', 'although', 'always', 'among', 'and', 'another', 'any', 'anyone', 'anything', 'around', 'as', 'at', 'because', 'before', 'behind', 'between', 'both', 'but', 'by', 'during', 'each', 'either', 'else', 'even', 'every', 'everyone', 'everything', 'except', 'for', 'from', 'front', 'good', 'great', 'hard', 'her', 'hers', 'here', 'herself', 'him', 'himself', 'his', 'how', 'however', 'if', 'in', 'inside', 'into', 'it', 'its', 'itself', 'like', 'little', 'lot', 'lots', 'me', 'most', 'much', 'must', 'my', 'myself', 'never', 'no', 'nor', 'not', 'nothing', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'outside', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'somebody', 'someone', 'something', 'somewhere', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'though', 'through', 'thus', 'to', 'too', 'under', 'until', 'up', 'us', 'very', 'was', 'we', 'went', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'whose', 'why', 'will', 'with', 'without', 'yet', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

// 检查词汇是否在B1水平范围内
function isB1Vocabulary(word: string): boolean {
  // 清理词汇：去除标点符号，转换为小写
  const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
  return B1_VOCABULARY.has(cleanWord);
}

// 生成歌词的系统提示词
const MUSIC_GENERATION_PROMPT = `你是一位专业的英文歌曲创作专家，擅长为高中生创作积极向上、通俗易懂的英文歌曲。

任务要求：
1. 根据用户提供的词汇列表，创作一首完整的英文歌曲
2. 歌曲主题涉及人与自我、人与社会、人与自然三大主题语境
3. 如果用户提供了具体话题，请围绕该话题创作；如果没有，请从三大主题语境中选择合适的主题
4. 歌词必须全面涵盖用户提供的所有词汇
5. 歌词需通俗易懂，主要使用欧标B1水平的词汇，确保高中生容易理解
6. 歌曲必须严格押韵，有良好的节奏感和音乐性
7. 歌曲结构应包含：Verse 1, Chorus, Verse 2, Chorus, Bridge, Chorus, Outro

主题语境说明：
- 人与自我：个人成长、自我认知、情感体验、理想追求、学习生活
- 人与社会：人际关系、社会现象、文化传承、责任担当、时代发展
- 人与自然：自然环境、生态保护、和谐共生、探索发现、感悟自然

歌词特点：
- 主题：积极向上，体现青春活力和正能量
- 情感：真诚、温暖、充满希望和力量
- 语言：简单易懂，符合B1英语水平，适合高中生演唱
- 押韵：每段都要有明确的押韵规律
- 长度：控制在200-300词之间
- 用词：主要使用常见动词、名词、形容词和副词

请严格按照以上要求创作歌曲，确保每句都押韵，所有用户提供的词汇都要自然地融入歌词中。`;

// MiniMax音乐生成服务
class MiniMaxMusicService {
  private static readonly API_BASE_URL = 'https://api.minimax.chat/v1';
  private static readonly API_KEY = process.env.MINIMAX_APIKEY;

  // 音乐风格配置
  private static readonly MUSIC_STYLES = {
    pop_rock: "这是一首充满青春活力与积极向上的流行摇滚歌曲，完美捕捉了高中生活中的美好时光、友谊深厚和梦想追求，适合在校园活动、毕业季或与朋友聚会时聆听。歌曲由清澈、明亮且充满活力的女声演绎，其自然流畅的唱腔传递出真诚而温暖的情感表达，并通过适度的混响效果增强了空间感。在120 BPM的明快节奏下，编曲以清脆的原声吉他分解和弦开场，随后完整的摇滚乐队编制——包括坚实的鼓点、温暖的贝斯、层次分明的电吉他（兼具清澈的分解和弦与明亮的失真音色）以及渲染情绪的合成器铺底——逐渐进入，将歌曲不断推向高潮。副歌部分加入了层次丰富的和声，带来了青春的活力感。",
    pop_ballad: "这是一首节奏舒缓的流行抒情歌曲，充满了温暖、真挚和自省的情感，是表达内心情感或作为温馨场景配乐的绝佳选择。歌曲由清澈、温暖且富有表现力的女声演绎，其音色在轻柔段落中略带气息感，传递出真诚而充满动态的情感表达，并通过适度的混响效果增强了空间的深度与共鸣。平滑、层叠的和声在副歌、桥段及尾声中适时融入，伴随着温暖的吟唱，构建出丰富且有力的和声层次。在编曲上，钢琴构成了核心骨架，木吉他以不易察觉的分解和弦增添了织体，合成器音色则在关键部分逐渐铺陈，以增强情感的浓度；轻柔的电子鼓点与平滑的贝斯线条共同提供了稳固的节奏与和声基础。",
    folk_acoustic: "这是一首充满怀旧与温柔情绪的传统民谣，非常适合在宁静沉思、告别聚会或温馨时刻聆听。歌曲由清澈、柔和且略带空气感的纯美女声演绎，她以抒情的民谣唱法，将旋律清晰而流畅地呈现。在副歌和部分段落中，人声通过叠录形成了含蓄而温暖的和声，进一步丰富了歌曲的温馨质感。编曲极为简约，主要由指弹风格的原声吉他提供伴奏，营造出轻柔的氛围；歌曲中巧妙地融入了不易察觉的氛围合成器，增添了一丝空灵感。全曲没有使用任何复杂的打击乐器，以舒缓的节奏缓缓流动，令人沉醉。",
    electronic_pop: "这是一首充满能量、振奋人心的电子流行舞曲，其宏大的旋律和充满希望的情感非常适合在需要动力时播放。歌曲中的声音清澈明亮，并经过了作为风格元素的现代效果处理。在副歌部分，经过同样处理的和声与主唱层层叠加，营造出极具冲击力的听感。在编曲上，强劲的四四拍电子鼓点与驱动力十足的合成器贝斯构成了坚实的节奏基础，主音合成器则负责带来极具记忆点的旋律，同时还有氛围合成器、丰富的过渡音效以及人声采样，共同构建出层次丰富的电音空间。",
    classical_opera: "这是一首融合了古典与歌剧风格的作品，充满了戏剧张力，仿佛将人带入一场宏大的舞台表演或深刻的情感表达中。在庄重的节奏下，编曲以完整的管弦乐队为核心，弦乐、铜管、木管和打击乐共同营造出饱满而富有戏剧性的音响效果，钢琴则在其中提供和声支持与旋律对位。人声部分，充满力量感的专业声乐以极富情感张力的戏剧化唱腔，将歌曲的情感推向高潮。和声方面，以三度和五度为主的编排带来了丰富而饱满的听感，偶尔出现的七和弦则增添了情感的张力；宽广的混响效果进一步增强了歌剧般的空间感与宏伟气势。",
    retro_disco: "这是一首在充满能量的Disco-Funk风格歌曲，散发着欢乐、自信和积极向上的情绪，是舞会派对、俱乐部或复古主题活动歌单的绝佳选择。歌曲由音色明亮、充满活力的主唱，清晰的咬字中带着一丝灵魂乐的粗砺感，自信而富有节奏的演唱风格充满了放克神韵。尤为突出的是，副歌与和声部分由一组顺滑而丰富的和声作为坚实后盾，他们之间巧妙的互动，配以适度的录音室混响效果，不仅增强了声音的空间深度，也让整首歌充满了经典年代的宏大感。在编曲方面，标志性的四四拍迪斯科鼓点与极为活跃的放克贝斯线条共同构筑了歌曲强劲的律动之基。",
    jazz_vocal: "这是一首充满欢乐、浪漫与异想天开色彩的声乐爵士。作品由清澈、明亮且略带呼吸感的迷人声音演绎，其唱腔俏皮而富有表现力，带有经典的拟声唱法影响，并通过适度的混响效果增添了温暖的空间感与现场氛围。在舒缓的节奏下，编曲以钢琴的和弦、立式贝斯的行走低音线和鼓刷轻扫的经典摇摆节奏为基础，而贯穿始终的管乐器则作为点睛之笔，演奏着灵动的旋律与独奏。这首单主旋律的歌曲非常适合在轻松愉悦的环境中播放，营造轻松惬意的氛围。"
  };

  static async generateMusic(styleId: string, lyrics: string): Promise<{audioUrl?: string, audioHex?: string}> {
    if (!this.API_KEY) {
      throw new Error('MiniMax API密钥未配置');
    }

    // 获取音乐风格的prompt，如果不存在则使用默认风格
    const prompt = this.MUSIC_STYLES[styleId as keyof typeof this.MUSIC_STYLES] || this.MUSIC_STYLES.pop_rock;

    const requestBody = {
      model: 'music-2.0',
      prompt: prompt,
      lyrics: lyrics,
      audio_setting: {
        sample_rate: 44100,
        bitrate: 256000,
        format: 'mp3'
      }
    };

    console.log('🎵 MiniMax音乐生成请求:', {
      styleId: styleId,
      prompt: prompt.substring(0, 100) + '...',
      lyrics: lyrics.substring(0, 100) + '...'
    });

    try {
      // 添加超时控制的AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 300秒超时（5分钟）

      const response = await fetch(`${this.API_BASE_URL}/music_generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('MiniMax API错误:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`MiniMax API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🎵 MiniMax音乐生成响应:', JSON.stringify(data, null, 2));

      // 检查响应结构并处理audio_hex（官方示例格式）
      let audioHex = null;

      if (data.data && data.data.audio) {
        audioHex = data.data.audio;  // 官方示例中audio字段包含hex数据
      } else if (data.audio) {
        audioHex = data.audio;
      } else if (data.data && data.data.audio_hex) {
        audioHex = data.data.audio_hex;
      } else if (data.audio_hex) {
        audioHex = data.audio_hex;
      }

      if (audioHex) {
        console.log('🎵 获取到音频hex数据，长度:', audioHex.length);
        return { audioHex: audioHex };
      } else {
        console.error('MiniMax API响应结构不匹配，完整响应:', data);
        throw new Error('MiniMax API未返回音频数据');
      }
    } catch (error) {
      console.error('MiniMax音乐生成失败:', error);

      if (error.name === 'AbortError') {
        throw new Error('MiniMax音乐生成超时，请稍后重试');
      }

      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { vocabulary, topic, theme, userId, generateMusic = false, generateMusicOnly = false, lyrics: providedLyrics, musicStyle } = await request.json();

    console.log('🎵 API接收到的参数:', {
      vocabulary: vocabulary?.substring(0, 50) + '...',
      generateMusicOnly,
      providedLyrics: providedLyrics?.substring(0, 50) + '...',
      musicStyle,
      userId: userId?.substring(0, 10) + '...'
    });

    // 处理仅生成音乐的情况
    if (generateMusicOnly) {
      console.log('🎵 仅生成音乐模式，歌词检查:', {
        hasLyrics: !!providedLyrics,
        lyricsLength: providedLyrics?.length || 0,
        isTrimmedEmpty: !providedLyrics?.trim()
      });

      if (!providedLyrics || !providedLyrics.trim()) {
        return NextResponse.json({
          success: false,
          error: '请提供要生成音乐的歌词'
        }, { status: 400 });
      }

      // 验证用户登录
      if (!userId) {
        return NextResponse.json({
          success: false,
          error: '用户未登录，请先登录'
        }, { status: 401 });
      }

      // 检查用户点数
      const userPoints = await SupabasePointsService.getUserPoints(userId);
      const pointsCost = 10; // 音乐生成消耗10点数

      if (userPoints < pointsCost) {
        return NextResponse.json({
          success: false,
          error: `点数不足，当前: ${userPoints}点，需要: ${pointsCost}点`
        }, { status: 400 });
      }

      let musicData: {audioUrl?: string, audioHex?: string} | null = null;

      try {
        console.log('🎵 开始生成音乐，歌词长度:', providedLyrics.length);
        console.log('🎵 选择的音乐风格:', musicStyle || 'pop_rock');
        console.log('🎵 歌词内容预览:', providedLyrics.substring(0, 200) + '...');

        const selectedStyle = musicStyle || 'pop_rock';
        musicData = await MiniMaxMusicService.generateMusic(selectedStyle, providedLyrics);
        console.log('🎵 音乐生成成功:', musicData);

        // 如果有hex数据，创建访问URL
        if (musicData?.audioHex) {
          const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL_INTERNAL || 'http://localhost:3000';
          const audioUrl = `${baseUrl}/api/audio-hex`;

          // 保存hex数据到musicData中，同时设置访问URL
          musicData.audioUrl = audioUrl;

          console.log('🎵 创建音频hex访问URL:', audioUrl);
        }

        // 只有音乐生成成功才扣除点数
        const deductSuccess = await SupabasePointsService.deductPoints(
          userId,
          pointsCost,
          '音乐生成',
          null,
          { lyricsLength: providedLyrics.length }
        );

        if (!deductSuccess) {
          return NextResponse.json({
            success: false,
            error: '点数扣除失败，请稍后重试'
          }, { status: 500 });
        }
      } catch (musicError) {
        console.error('音乐生成失败，详细错误:', musicError);
        console.error('错误类型:', musicError.constructor.name);
        console.error('错误消息:', musicError.message);

        // 音乐生成失败，不扣除点数
        return NextResponse.json({
          success: false,
          error: `音乐生成失败: ${musicError.message}。请稍后重试，或联系客服。`
        }, { status: 500 });
      }

      // 只有音乐生成成功才记录到数据库
      if (musicData) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          await supabase.from('ai_generations').insert({
            user_id: userId,
            tool_type: 'music_generator',
            input_data: { lyrics: providedLyrics, generateMusicOnly: true },
            output_data: {
              hasMusic: !!musicData,
              audioUrl: musicData?.audioUrl || null
            },
            points_cost: pointsCost,
            model_used: 'minimax-music-2.0',
            created_at: new Date().toISOString()
          });
        } catch (dbError) {
          console.error('保存生成记录失败:', dbError);
        }
      }

      // 获取用户剩余点数
      const remainingPoints = await SupabasePointsService.getUserPoints(userId);

      return NextResponse.json({
        success: true,
        musicData: musicData,
        hasMusic: !!musicData,
        pointsCost: pointsCost,
        remainingPoints: remainingPoints,
        modelUsed: 'minimax-music-2.0'
      });
    }

    // 原有的歌词生成逻辑
    if (!vocabulary || !vocabulary.trim()) {
      return NextResponse.json({
        success: false,
        error: '请提供要编排的词汇'
      }, { status: 400 });
    }

    // 解析词汇列表
    const wordList = vocabulary.split(',').map(word => word.trim()).filter(word => word.length > 0);

    if (wordList.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请提供有效的词汇列表'
      }, { status: 400 });
    }

    // 验证用户登录
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户未登录，请先登录'
      }, { status: 401 });
    }

    // 检查用户点数
    const userPoints = await SupabasePointsService.getUserPoints(userId);
    const pointsCost = generateMusic ? 10 : 3; // 生成音乐消耗更多点数

    if (userPoints < pointsCost) {
      return NextResponse.json({
        success: false,
        error: `点数不足，当前: ${userPoints}点，需要: ${pointsCost}点`
      }, { status: 400 });
    }

    // 构建用户提示词
    let topicGuidance = '';
    if (topic && topic.trim()) {
      topicGuidance = `- 具体话题：${topic.trim()}`;
    } else {
      topicGuidance = `- 主题选择：请从人与自我、人与社会、人与自然三大主题语境中选择一个合适的主题`;
    }

    const userPrompt = `请根据以下词汇列表创作一首英文歌曲：${vocabulary}

要求：
${topicGuidance}
- 必须包含所有这些词汇：${wordList.join(', ')}
- 通俗易懂，主要使用欧标B1水平的词汇
- 严格押韵，有良好节奏感
- 结构：Verse 1, Chorus, Verse 2, Chorus, Bridge, Chorus, Outro
- 长度：200-300词
- 情感：积极、乐观、充满活力

请创作完整的歌曲，包含所有段落。`;

    // 使用GPT-4模型生成歌词
    const lyrics = await CloudMistService.generateText(
      userPrompt,
      'gpt-4',
      MUSIC_GENERATION_PROMPT
    );

    if (!lyrics || lyrics.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: '歌词生成失败，请稍后重试'
      }, { status: 500 });
    }

    // 验证生成结果是否包含所有要求的词汇
    const generatedText = lyrics.toLowerCase();
    const missingWords = wordList.filter(word =>
      !generatedText.includes(word.toLowerCase())
    );

    let musicData: {audioUrl?: string, audioHex?: string} | null = null;

    // 如果用户选择生成音乐，调用MiniMax API
    if (generateMusic) {
      try {
        // 构建音乐描述prompt
        const musicPrompt = `流行音乐, 积极, 充满活力, 适合高中生活, 英文歌曲, 抒情流行, 青春, 希望, 友谊, 成长, 欢快, 励志`;

        musicData = await MiniMaxMusicService.generateMusic(musicPrompt, lyrics);
        console.log('🎵 音乐生成成功:', musicData);
      } catch (musicError) {
        console.error('音乐生成失败:', musicError);
        // 音乐生成失败不影响歌词返回，但记录错误
        // 退还部分点数（音乐部分）
        await SupabasePointsService.addPoints(userId, 10, 'BONUS', '音乐生成失败退回');
      }
    }

    // 扣除点数
    const deductSuccess = await SupabasePointsService.deductPoints(
      userId,
      pointsCost,
      generateMusic ? '音乐生成（含歌词）' : '歌词生成',
      null,
      { vocabulary, wordCount: wordList.length, generateMusic }
    );

    if (!deductSuccess) {
      return NextResponse.json({
        success: false,
        error: '点数扣除失败，请稍后重试'
      }, { status: 500 });
    }

    // 记录AI生成结果到数据库
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from('ai_generations').insert({
        user_id: userId,
        tool_type: 'music_generator',
        input_data: { vocabulary, theme, wordCount: wordList.length, generateMusic },
        output_data: {
          lyrics,
          wordCount: lyrics.split(/\s+/).length,
          hasMusic: !!musicData,
          audioUrl: musicData?.audioUrl || null
        },
        points_cost: pointsCost,
        model_used: generateMusic ? 'minimax-music-2.0+gpt-4' : 'gpt-4',
        created_at: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('保存生成记录失败:', dbError);
    }

    // 获取用户剩余点数
    const remainingPoints = await SupabasePointsService.getUserPoints(userId);

    return NextResponse.json({
      success: true,
      lyrics: lyrics.trim(),
      wordCount: wordList.length,
      pointsCost: pointsCost,
      remainingPoints: remainingPoints,
      modelUsed: generateMusic ? 'minimax-music-2.0+gpt-4' : 'gpt-4',
      missingWords: missingWords.length > 0 ? missingWords : undefined,
      musicData: musicData,
      hasMusic: !!musicData
    });

  } catch (error) {
    console.error('音乐生成器API错误:', error);

    return NextResponse.json({
      success: false,
      error: '服务器内部错误，请稍后重试'
    }, { status: 500 });
  }
}// 强制重新编译
