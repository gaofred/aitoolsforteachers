"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@/lib/user-context";
import { Music, Sparkles, Clock, AlertCircle, BookOpen, ArrowLeft, Home, Play, Download, Volume2 } from "lucide-react";

export default function MusicGeneratorPage() {
  const router = useRouter();
  const { currentUser, userPoints, refreshUser } = useUser();
  const [vocabulary, setVocabulary] = useState("");
  const [topic, setTopic] = useState("");
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicData, setMusicData] = useState<{audioUrl?: string, audioHex?: string} | null>(null);
  const [selectedMusicStyle, setSelectedMusicStyle] = useState("pop_rock");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);

  // 听歌写词相关状态
  const [exercise, setExercise] = useState("");
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [section, setSection] = useState<'first' | 'second' | 'all'>('all');

  // 使用 useEffect 避免水合错误
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 处理音频数据，创建可播放的URL
  useEffect(() => {
    if (musicData?.audioHex && isClient) {
      try {
        // 将hex数据转换为ArrayBuffer
        const audioBuffer = Buffer.from(musicData.audioHex, 'hex');
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });

        // 清理之前的URL
        if (audioObjectUrl) {
          URL.revokeObjectURL(audioObjectUrl);
        }

        // 创建新的object URL
        const newUrl = URL.createObjectURL(blob);
        setAudioObjectUrl(newUrl);

        console.log('🎵 从hex数据创建音频URL成功');
      } catch (error) {
        console.error('处理音频hex数据失败:', error);
        setAudioError('音频数据处理失败');
      }
    } else if (musicData?.audioUrl && isClient) {
      // 如果是普通URL，直接使用
      if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl);
        setAudioObjectUrl(null);
      }
    }

    return () => {
      // 组件卸载时清理URL
      if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl);
      }
    };
  }, [musicData, isClient]);

  const lyricsCost = 3; // 歌词生成消耗3点数
  const musicCost = 10; // 音乐生成消耗10点数（在已有歌词基础上）
  const hasEnoughPointsForLyrics = userPoints >= lyricsCost;
  const hasEnoughPointsForMusic = userPoints >= musicCost;

  // 示例词汇
  const sampleVocabularies = [
    "dream, future, school, friend, happy, memories, grow, together, journey, success",
    "knowledge, study, learn, teacher, classroom, homework, exam, achieve, goal, graduate",
    "challenge, overcome, courage, believe, confidence, strength, persist, improve, progress, win"
  ];

  // 音乐风格选项
  const musicStyles = [
    {
      id: "pop_rock",
      name: "流行摇滚",
      description: "青春活力，适合校园主题",
      icon: "🎸",
      prompt: "这是一首充满青春活力与积极向上的流行摇滚歌曲，完美捕捉了高中生活中的美好时光、友谊深厚和梦想追求，适合在校园活动、毕业季或与朋友聚会时聆听。歌曲由清澈、明亮且充满活力的女声演绎，其自然流畅的唱腔传递出真诚而温暖的情感表达，并通过适度的混响效果增强了空间感。在120 BPM的明快节奏下，编曲以清脆的原声吉他分解和弦开场，随后完整的摇滚乐队编制——包括坚实的鼓点、温暖的贝斯、层次分明的电吉他（兼具清澈的分解和弦与明亮的失真音色）以及渲染情绪的合成器铺底——逐渐进入，将歌曲不断推向高潮。副歌部分加入了层次丰富的和声，带来了青春的活力感。"
    },
    {
      id: "pop_ballad",
      name: "抒情流行",
      description: "温暖情感，适合慢节奏表达",
      icon: "🎤",
      prompt: "这是一首节奏舒缓的流行抒情歌曲，充满了温暖、真挚和自省的情感，是表达内心情感或作为温馨场景配乐的绝佳选择。歌曲由清澈、温暖且富有表现力的女声演绎，其音色在轻柔段落中略带气息感，传递出真诚而充满动态的情感表达，并通过适度的混响效果增强了空间的深度与共鸣。平滑、层叠的和声在副歌、桥段及尾声中适时融入，伴随着温暖的吟唱，构建出丰富且有力的和声层次。在编曲上，钢琴构成了核心骨架，木吉他以不易察觉的分解和弦增添了织体，合成器音色则在关键部分逐渐铺陈，以增强情感的浓度；轻柔的电子鼓点与平滑的贝斯线条共同提供了稳固的节奏与和声基础。"
    },
    {
      id: "folk_acoustic",
      name: "乡村民谣",
      description: "怀旧温柔，原声乐器为主",
      icon: "🎻",
      prompt: "这是一首充满怀旧与温柔情绪的传统民谣，非常适合在宁静沉思、告别聚会或温馨时刻聆听。歌曲由清澈、柔和且略带空气感的纯美女声演绎，她以抒情的民谣唱法，将旋律清晰而流畅地呈现。在副歌和部分段落中，人声通过叠录形成了含蓄而温暖的和声，进一步丰富了歌曲的温馨质感。编曲极为简约，主要由指弹风格的原声吉他提供伴奏，营造出轻柔的氛围；歌曲中巧妙地融入了不易察觉的氛围合成器，增添了一丝空灵感。全曲没有使用任何复杂的打击乐器，以舒缓的节奏缓缓流动，令人沉醉。"
    },
    {
      id: "electronic_pop",
      name: "电子流行",
      description: "活力四射，现代感强烈",
      icon: "🎹",
      prompt: "这是一首充满能量、振奋人心的电子流行舞曲，其宏大的旋律和充满希望的情感非常适合在需要动力时播放。歌曲中的声音清澈明亮，并经过了作为风格元素的现代效果处理。在副歌部分，经过同样处理的和声与主唱层层叠加，营造出极具冲击力的听感。在编曲上，强劲的四四拍电子鼓点与驱动力十足的合成器贝斯构成了坚实的节奏基础，主音合成器则负责带来极具记忆点的旋律，同时还有氛围合成器、丰富的过渡音效以及人声采样，共同构建出层次丰富的电音空间。"
    },
    {
      id: "classical_opera",
      name: "古典歌剧",
      description: "戏剧化，宏大气势",
      icon: "🎭",
      prompt: "这是一首融合了古典与歌剧风格的作品，充满了戏剧张力，仿佛将人带入一场宏大的舞台表演或深刻的情感表达中。在庄重的节奏下，编曲以完整的管弦乐队为核心，弦乐、铜管、木管和打击乐共同营造出饱满而富有戏剧性的音响效果，钢琴则在其中提供和声支持与旋律对位。人声部分，充满力量感的专业声乐以极富情感张力的戏剧化唱腔，将歌曲的情感推向高潮。和声方面，以三度和五度为主的编排带来了丰富而饱满的听感，偶尔出现的七和弦则增添了情感的张力；宽广的混响效果进一步增强了歌剧般的空间感与宏伟气势。"
    },
    {
      id: "retro_disco",
      name: "复古Disco",
      description: "欢快派对，80年代风格",
      icon: "🕺",
      prompt: "这是一首在充满能量的Disco-Funk风格歌曲，散发着欢乐、自信和积极向上的情绪，是舞会派对、俱乐部或复古主题活动歌单的绝佳选择。歌曲由音色明亮、充满活力的主唱，清晰的咬字中带着一丝灵魂乐的粗砺感，自信而富有节奏的演唱风格充满了放克神韵。尤为突出的是，副歌与和声部分由一组顺滑而丰富的和声作为坚实后盾，他们之间巧妙的互动，配以适度的录音室混响效果，不仅增强了声音的空间深度，也让整首歌充满了经典年代的宏大感。在编曲方面，标志性的四四拍迪斯科鼓点与极为活跃的放克贝斯线条共同构筑了歌曲强劲的律动之基。"
    },
    {
      id: "jazz_vocal",
      name: "声乐爵士",
      description: "优雅俏皮，即兴感强",
      icon: "🎷",
      prompt: "这是一首充满欢乐、浪漫与异想天开色彩的声乐爵士。作品由清澈、明亮且略带呼吸感的迷人声音演绎，其唱腔俏皮而富有表现力，带有经典的拟声唱法影响，并通过适度的混响效果增添了温暖的空间感与现场氛围。在舒缓的节奏下，编曲以钢琴的和弦、立式贝斯的行走低音线和鼓刷轻扫的经典摇摆节奏为基础，而贯穿始终的管乐器则作为点睛之笔，演奏着灵动的旋律与独奏。这首单主旋律的歌曲非常适合在轻松愉悦的环境中播放，营造轻松惬意的氛围。"
    }
  ];

  useEffect(() => {
    // 页面加载时的初始化
  }, []);

  const handleGenerateLyrics = async () => {
    if (!vocabulary.trim()) {
      alert("请输入要编排的词汇！");
      return;
    }

    if (!currentUser) {
      alert("请先登录！");
      return;
    }

    if (!hasEnoughPointsForLyrics) {
      alert(`点数不足！当前: ${userPoints}点，需要: ${lyricsCost}点`);
      return;
    }

    setIsGenerating(true);
    setGeneratedLyrics("");
    setMusicData(null);

    try {
      const response = await fetch('/api/ai/music-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify({
          vocabulary: vocabulary.trim(),
          topic: topic.trim(),
          theme: "thematic_contexts",
          userId: currentUser.id,
          generateMusic: false
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedLyrics(data.lyrics);
        await refreshUser();
        alert(`歌词生成完成！消耗 ${data.pointsCost} 个点数，剩余 ${data.remainingPoints} 个点数`);
      } else {
        alert(data.error || '歌词生成失败，请稍后重试');
        await refreshUser();
      }
    } catch (error) {
      console.error('歌词生成失败:', error);
      alert('生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMusicFromLyrics = async () => {
    if (!generatedLyrics.trim()) {
      alert("没有可用的歌词！");
      return;
    }

    if (!currentUser) {
      alert("请先登录！");
      return;
    }

    if (!hasEnoughPointsForMusic) {
      alert(`点数不足！当前: ${userPoints}点，需要: ${musicCost}点`);
      return;
    }

    setIsGeneratingMusic(true);
    setAudioError(null);

    try {
      const response = await fetch('/api/ai/music-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify({
          lyrics: generatedLyrics.trim(),
          userId: currentUser.id,
          generateMusicOnly: true,
          musicStyle: selectedMusicStyle
        })
      });

      const data = await response.json();

      if (data.success) {
        setMusicData(data.musicData);
        await refreshUser();
        // 更好的成功提示
        alert(`🎵 音乐生成完成！\n\n消耗 ${data.pointsCost} 个点数，剩余 ${data.remainingPoints} 个点数\n\n您现在可以播放或下载这首歌了！`);
      } else {
        // 更友好的错误处理
        const errorMessage = data.error || '音乐生成失败，请稍后重试';

        if (errorMessage.includes('超时')) {
          alert('⏰ 音乐生成时间较长，服务器处理超时。\n\n您的10点积分将自动退还，请稍后重试，或者先使用歌词功能。');
        } else if (errorMessage.includes('点数不足')) {
          alert(errorMessage);
        } else {
          alert(`🎵 音乐生成遇到问题：${errorMessage}\n\n您的10点积分将自动退还到账户。\n\n您可以稍后重试，或联系客服获取帮助。`);
        }

        await refreshUser();
      }
    } catch (error) {
      console.error('音乐生成失败:', error);
      alert('🎵 音乐生成失败，请稍后重试\n\n如果已扣除积分，系统将自动退还到您的账户。');
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const loadSampleVocabulary = (sample: string) => {
    setVocabulary(sample);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('歌词已复制到剪贴板！');
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请手动复制');
    }
  };

  // 简化的语音识别功能 - 参考阅读生成器
  const startRecording = () => {
    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'en-US' // 设置为英语
      recognition.continuous = false // 连续识别
      recognition.interimResults = false // 不返回中间结果

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        // 将单词用逗号分隔
        const words = transcript.split(/\s+/).join(', ')
        setVocabulary(prev => prev + (prev ? ', ' : '') + words)
        alert('识别成功！')
      }

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error)
        alert('识别失败，请重试')
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)
    } catch (e) {
      console.error('麦克风访问失败:', e)
      alert('无法访问麦克风，请检查权限设置')
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatLyrics = (lyrics: string) => {
    return lyrics
      .split('\n')
      .map((line, index) => {
        if (line.includes('[Verse') || line.includes('[Chorus') || line.includes('[Bridge') || line.includes('[Outro')) {
          return `<div class="font-bold text-purple-600 mt-4 mb-2">${line}</div>`;
        }
        return line ? `<div class="ml-4 mb-1">${line}</div>` : '<br>';
      })
      .join('');
  };

  const downloadAudio = async () => {
    if (!musicData?.audioUrl && !musicData?.audioHex) return;

    try {
      let blob: Blob;

      if (musicData.audioHex) {
        // 直接从hex数据创建blob
        const audioBuffer = Buffer.from(musicData.audioHex, 'hex');
        blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      } else if (musicData.audioUrl) {
        // 从URL获取blob
        const response = await fetch(musicData.audioUrl);
        blob = await response.blob();
      } else {
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-music-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请稍后重试');
    }
  };

  // 生成练习题
  const generateExercise = async () => {
    if (!generatedLyrics.trim()) {
      alert('请先生成歌词！');
      return;
    }

    if (!currentUser) {
      alert('请先登录！');
      return;
    }

    if (userPoints < 1) {
      alert('点数不足！生成练习题需要1点数');
      return;
    }

    setIsGeneratingExercise(true);
    setExercise('');

    try {
      const response = await fetch('/api/ai/lyric-exercise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lyrics: generatedLyrics.trim(),
          userId: currentUser.id,
          difficulty,
          section
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExercise(data.exercise);
        await refreshUser();
        alert(`练习题生成成功！消耗1点数，剩余${data.remainingPoints}点`);
      } else {
        alert(data.error || '练习题生成失败，请稍后重试');
      }
    } catch (error) {
      console.error('生成练习题失败:', error);
      alert('练习题生成失败，请稍后重试');
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  // 重置练习
  const resetExercise = () => {
    setExercise('');
  };

  // 下载练习题（Word格式）
  const downloadExerciseAsWord = async () => {
    if (!exercise.trim()) return;

    try {
      // 解析练习题和答案
      const lines = exercise.split('\n');
      const exerciseContent = [];
      const answerKey = [];

      let questionNumber = 1;
      lines.forEach(line => {
        if (line.trim()) {
          // 处理练习题行
          const processedLine = line.replace(/____\s*\(([^)]+)\)/g, (match, answer) => {
            const questionWithNumber = `${questionNumber}. ____`;
            questionNumber++;

            // 添加到答案键
            answerKey.push(`Question ${questionNumber - 1}: ${answer}`);

            return questionWithNumber;
          });

          exerciseContent.push(processedLine);
        } else {
          exerciseContent.push(''); // 保留空行
        }
      });

      // 创建Word文档内容
      const wordContent = `
听歌写词练习题
=================

练习难度：${difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}
目标段落：${section === 'first' ? '第一段' : section === 'second' ? '第二段' : '全文'}
生成时间：${new Date().toLocaleString('zh-CN')}

练习题：
--------
${exerciseContent.join('\n')}

参考答案：
--------
${answerKey.join('\n')}

使用说明：
--------
1. 学生根据上下文填写空缺处
2. 教师可根据参考答案进行批改
3. 建议在播放歌曲后进行练习，效果更佳
      `.trim();

      // 创建Blob对象
      const blob = new Blob([wordContent], { type: 'text/plain;charset=utf-8' });

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `听歌写词练习题_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('练习题已下载！');
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请稍后重试');
    }
  };

  // 使用 useEffect 避免水合错误
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // 只有在客户端状态下且确实没有用户时才显示登录提示
  if (isClient && !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">请先登录</h1>
          <Button onClick={() => router.push('/auth/signin')}>
            前往登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* 页面标题和导航 */}
        <div className="text-center mb-6 sm:mb-8">
          {/* 返回首页按钮 */}
          <div className="flex justify-start mb-4 sm:mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50 hover:text-purple-700 text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">返回首页</span>
              <span className="sm:hidden">返回</span>
              <Home className="w-4 h-4 hidden sm:inline" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Music className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">AI音乐生成器</h1>
            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-500" />
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base px-2">
            输入您学习的词汇，AI将为您创作一首涵盖这些词汇的英文歌曲，可选择生成歌词或完整的音乐，主题围绕高中生活，积极向上，使用欧标B1水平词汇
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* 左侧输入区域 */}
          <div className="xl:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  词汇输入
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    输入词汇（用逗号分隔）
                  </label>
                  <div className="relative">
                    <Textarea
                      value={vocabulary}
                      onChange={(e) => setVocabulary(e.target.value)}
                      placeholder="例如: dream, future, school, friend..."
                      className="min-h-[100px] sm:min-h-[120px] resize-none pr-12 text-sm"
                      maxLength={500}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 sm:h-10 sm:w-10 hover:bg-purple-100"
                      onClick={isRecording ? stopRecording : startRecording}
                      title={isRecording ? "停止录音" : "开始语音输入"}
                    >
                      {isRecording ? '🔴' : '🎤'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-gray-500">
                      {vocabulary.length}/500 字符
                    </div>
                    {isRecording && (
                      <div className="text-xs text-red-500 flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        正在录音...
                      </div>
                    )}
                  </div>
                </div>

                {/* 话题输入 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    具体话题（可选）
                  </label>
                  <Textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="例如：友谊的重要性、环保意识、青春梦想、科技发展..."
                    className="min-h-[80px] resize-none"
                    maxLength={200}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {topic.length}/200 字符
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    指定具体话题能让AI生成的歌词更贴合您的需求
                  </p>
                </div>

                {/* 示例词汇 */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">示例词汇：</p>
                  <div className="space-y-2">
                    {sampleVocabularies.map((sample, index) => (
                      <button
                        key={index}
                        onClick={() => loadSampleVocabulary(sample)}
                        className="w-full text-left p-2 text-xs bg-gray-50 hover:bg-purple-50 rounded border border-gray-200 hover:border-purple-300 transition-colors"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 生成按钮 */}
                <Button
                  onClick={handleGenerateLyrics}
                  disabled={!vocabulary.trim() || isGenerating || !hasEnoughPointsForLyrics}
                  className={`w-full ${
                    vocabulary.trim() && !isGenerating && hasEnoughPointsForLyrics
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } text-white`}
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      AI正在创作歌词...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成歌词 ({lyricsCost}点)
                    </>
                  )}
                </Button>

                {/* 点数提示 */}
                {!hasEnoughPointsForLyrics && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      点数不足！当前: {userPoints}点，需要: {lyricsCost}点
                    </AlertDescription>
                  </Alert>
                )}

                {/* 功能说明 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">功能特点：</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 全面涵盖您提供的所有词汇</li>
                    <li>• 支持语音输入词汇（点击🎤麦克风图标）</li>
                    <li>• 主题涵盖人与自我、人与社会、人与自然三大语境</li>
                    <li>• 支持指定具体话题，让歌词更贴合需求</li>
                    <li>• 积极向上的情感表达</li>
                    <li>• 符合欧标B1水平的词汇</li>
                    <li>• 严格押韵的节奏感</li>
                    <li>• 生成歌词后可选择生成音乐</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧结果展示区域 */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* 生成结果 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-purple-600" />
                    生成结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center space-y-3">
                        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-gray-600">
                          AI正在为您创作专属歌词...
                        </p>
                      </div>
                    </div>
                  ) : generatedLyrics ? (
                    <div className="space-y-6">
                      {/* 音频播放器 */}
                      {musicData && musicData.audioUrl && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                          {/* 成功提示 */}
                          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 text-green-800">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="font-medium">🎉 音乐生成成功！</span>
                            </div>
                            <p className="text-sm text-green-700 mt-1">您现在可以播放、下载或分享这首专属歌曲了</p>
                          </div>

                          <div className="flex items-center gap-3 mb-3">
                            <Volume2 className="w-5 h-5 text-green-600" />
                            <h4 className="font-semibold text-green-800">生成的音乐</h4>
                          </div>
                          {audioError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                              <div className="flex items-center gap-2 text-red-700 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{audioError}</span>
                              </div>
                            </div>
                          )}
                          <audio
                            controls
                            className="w-full mb-3"
                            src={audioObjectUrl || musicData.audioUrl}
                            onError={() => {
                              setAudioError('音频文件加载失败，可能是网络问题或文件已过期。请尝试重新生成音乐。');
                            }}
                            onLoadStart={() => setAudioError(null)}
                          >
                            您的浏览器不支持音频播放。
                          </audio>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={downloadAudio}
                              className="flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              下载音频
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(musicData.audioUrl!, '_blank')}
                              className="flex items-center gap-2"
                            >
                              <Music className="w-4 h-4" />
                              在新窗口播放
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 歌词展示 */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Music className="w-5 h-5 text-purple-600" />
                          <h4 className="font-semibold text-purple-800">生成的歌词</h4>
                        </div>
                        <div
                          className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200 max-h-96 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: formatLyrics(generatedLyrics) }}
                        />
                      </div>

                      {/* 音乐生成按钮 */}
                      {!musicData && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-3 mb-4">
                            <Volume2 className="w-5 h-5 text-purple-600" />
                            <h4 className="font-semibold text-purple-800">生成音乐</h4>
                          </div>

                          {/* 音乐风格选择 */}
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">选择音乐风格：</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                              {musicStyles.map((style) => (
                                <button
                                  key={style.id}
                                  onClick={() => setSelectedMusicStyle(style.id)}
                                  className={`p-3 rounded-lg border text-left transition-all ${
                                    selectedMusicStyle === style.id
                                      ? 'border-purple-400 bg-purple-50 shadow-sm'
                                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base sm:text-lg">{style.icon}</span>
                                    <span className="text-sm font-medium">{style.name}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 hidden sm:block">{style.description}</p>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 text-yellow-800 text-sm">
                              <Clock className="w-4 h-4" />
                              <span>音乐生成大约需要3-5分钟，请耐心等待</span>
                            </div>
                            <p className="text-xs text-yellow-700 mt-1">生成失败将自动退还积分</p>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            满意这些歌词吗？选择风格后让AI为您演唱这首歌！
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              消耗 <span className="font-semibold text-purple-600">{musicCost}点</span>
                            </div>
                            <Button
                              onClick={handleGenerateMusicFromLyrics}
                              disabled={isGeneratingMusic || !hasEnoughPointsForMusic}
                              className={`${
                                isGeneratingMusic || !hasEnoughPointsForMusic
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                              } text-white`}
                            >
                              {isGeneratingMusic ? (
                                <>
                                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                                  AI正在演唱中（约3分钟）...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  生成AI演唱
                                </>
                              )}
                            </Button>
                          </div>
                          {!hasEnoughPointsForMusic && (
                            <div className="mt-2 text-xs text-red-600">
                              点数不足！当前: {userPoints}点，需要: {musicCost}点
                            </div>
                          )}
                        </div>
                      )}

                      {/* 听歌写词功能 */}
                      {generatedLyrics && (
                        <div className="border-t pt-6">
                          <div className="flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            <h4 className="font-semibold text-blue-800">听歌写词练习题</h4>
                          </div>

                          {!exercise ? (
                            <div className="space-y-4">
                              <div>
                              <label className="block text-sm font-medium mb-2">
                                难度级别
                              </label>
                              <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                                className="w-full p-2 border rounded-md text-sm"
                              >
                                <option value="easy">简单 - 基础核心词汇</option>
                                <option value="medium">中等 - 平衡教育价值</option>
                                <option value="hard">困难 - 更有挑战性词汇</option>
                              </select>
                            </div>

                              <Button
                                onClick={generateExercise}
                                disabled={isGeneratingExercise || userPoints < 1}
                                className={`w-full ${
                                  !isGeneratingExercise && userPoints >= 1
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                } text-white`}
                              >
                                {isGeneratingExercise ? (
                                  <>
                                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                                    生成练习题中...
                                  </>
                                ) : (
                                  <>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    生成练习题 (消耗1点)
                                  </>
                                )}
                              </Button>

                              {userPoints < 1 && (
                                <div className="text-xs text-red-600">
                                  点数不足！当前: {userPoints}点，需要: 1点
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-blue-800">填空练习题</h5>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={resetExercise}
                                    >
                                      重新生成
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={downloadExerciseAsWord}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      下载练习题
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-3 sm:space-y-4">
                                  {/* 练习题预览 */}
                                  <div className="bg-white p-3 sm:p-4 rounded border">
                                    <h6 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">练习题预览：</h6>
                                    <div className="text-xs sm:text-sm space-y-1 sm:space-y-2 max-h-60 overflow-y-auto">
                                      {exercise.split('\n').map((line, index) => (
                                        <div key={index} className="flex items-start">
                                          <span className="text-gray-400 mr-2 text-xs flex-shrink-0">{line.trim() ? `${index + 1}.` : ''}</span>
                                          <span className="text-gray-700 break-words">
                                            {line.replace(/____\s*\(([^)]+)\)/g, (match, answer) => {
                                              return `____ (${answer})`;
                                            })}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="bg-green-50 p-3 rounded border border-green-200">
                                    <h6 className="font-medium text-green-800 mb-2 text-sm sm:text-base">下载说明：</h6>
                                    <ul className="text-xs sm:text-sm text-green-700 space-y-1">
                                      <li>• 下载的文档包含完整的练习题和参考答案</li>
                                      <li>• 支持直接打印或编辑使用</li>
                                      <li>• 适合课堂练习或作业布置</li>
                                      <li>• 包含详细的使用说明</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedLyrics)}
                        >
                          复制歌词
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-center">
                      <div className="text-gray-500">
                        <Music className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>输入词汇后点击生成，AI将为您创作专属英文歌词</p>
                        <p className="text-sm text-purple-600 mt-2">生成歌词后可选择生成音乐</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}