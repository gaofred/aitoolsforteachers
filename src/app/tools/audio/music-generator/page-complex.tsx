"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@/lib/user-context";
import { Music, Sparkles, Clock, AlertCircle, BookOpen, ArrowLeft, Home } from "lucide-react";

export default function MusicGeneratorPage() {
  const router = useRouter();
  const { currentUser, userPoints, refreshUser } = useUser();
  const [vocabulary, setVocabulary] = useState("");
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const toolCost = 3; // 消耗3点数
  const hasEnoughPoints = userPoints >= toolCost;

  // 示例词汇
  const sampleVocabularies = [
    "dream, future, school, friend, happy, memories, grow, together, journey, success",
    "knowledge, study, learn, teacher, classroom, homework, exam, achieve, goal, graduate",
    "challenge, overcome, courage, believe, confidence, strength, persist, improve, progress, win"
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

    if (!hasEnoughPoints) {
      alert("点数不足！请先充值或兑换点数。");
      return;
    }

    setIsGenerating(true);
    setGeneratedLyrics("");

    try {
      const response = await fetch('/api/ai/music-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify({
          vocabulary: vocabulary.trim(),
          theme: "high_school_life",
          userId: currentUser.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedLyrics(data.lyrics);


        await refreshUser();
        alert(`歌词生成完成！消耗 ${data.pointsCost || toolCost} 个点数，剩余 ${data.remainingPoints} 个点数`);
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

  // 语音识别功能 - 使用浏览器原生API
  const startRecording = () => {

    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ 浏览器不支持语音识别');
      alert('您的浏览器不支持语音识别功能。\n\n建议使用以下浏览器:\n- Chrome (推荐)\n- Edge\n- Safari (较新版本)\n\n注意：某些浏览器需要HTTPS环境才能使用语音识别功能。');
      return;
    }

    console.log('✅ 浏览器支持语音识别');

    // 预先测试麦克风权限
    try {
      console.log('🎤 测试麦克风权限...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ 麦克风权限获取成功');
      // 立即关闭流，只是为了测试权限
      stream.getTracks().forEach(track => track.stop());
    } catch (micError: any) {
      console.error('❌ 麦克风权限获取失败:', micError);
      alert(`无法访问麦克风，请检查以下设置:\n\n1. 浏览器麦克风权限\n2. 系统麦克风权限\n3. 确保没有其他应用占用麦克风\n\n错误信息: ${micError.message || '未知错误'}`);
      return;
    }

    // 检测网络连接状态
    const checkNetworkStatus = () => {
      const isOnline = navigator.onLine;
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const effectiveType = connection ? connection.effectiveType : 'unknown';

      console.log(`🌐 网络状态: ${isOnline ? '在线' : '离线'}, 连接类型: ${effectiveType}`);

      if (!isOnline) {
        alert('网络连接已断开！\n\n语音识别需要网络连接，请：\n1. 检查网络连接\n2. 尝试连接其他网络\n3. 或者手动输入词汇');
        return false;
      }

      return true;
    };

    if (!checkNetworkStatus()) {
      return;
    }

    try {
      console.log('🗣️ 初始化语音识别服务...');
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      // 尝试多种语言设置 - 根据重试次数切换语言
      const languages = ['en-US', 'en-GB', 'en-AU', 'zh-CN'];
      recognition.lang = languages[retryIndex % languages.length];
      recognition.continuous = false; // 单次识别，避免无限循环
      recognition.interimResults = false; // 只要最终结果
      recognition.maxAlternatives = 1; // 减个结果只返回一个最佳选择

      console.log(`🎯 语音识别设置: 语言=${recognition.lang}, 持续=${recognition.continuous}, 中间结果=${recognition.interimResults}`);

      recognition.onresult = (event: any) => {
        console.log('🎯 语音识别结果:', event);
        const result = event.results[0][0];
        const transcript = result.transcript;
        const confidence = result.confidence;

        console.log(`📝 识别文本: "${transcript}"`);
        console.log(`📊 置信度: ${confidence}`);

        if (transcript && transcript.trim()) {
          // 清理和格式化识别结果
          const cleanText = transcript.trim();
          // 将单词用逗号分隔，去除多余的空格和标点
          const words = cleanText.split(/\s+/).filter(word => word.length > 0).join(', ');

          console.log(`🔧 格式化后: "${words}"`);

          // 追加到现有词汇
          setVocabulary(prev => {
            const newVocabulary = prev + (prev ? ', ' : '') + words;
            console.log(`✅ 词汇更新: "${newVocabulary}"`);
            return newVocabulary;
          });

          // 显示成功消息，包含置信度信息
          const confidencePercent = Math.round(confidence * 100);
          alert(`语音识别成功！\n\n识别内容: "${transcript}"\n置信度: ${confidencePercent}%\n\n已添加到词汇输入框`);
        } else {
          alert('语音识别完成，但没有识别到有效内容，请重试。');
        }
      };

      recognition.onerror = (event: any) => {
        console.error('❌ 语音识别错误:', event.error);
        let errorMessage = '语音识别失败，请重试。';

        // 根据错误类型提供更具体的错误信息
        switch (event.error) {
          case 'no-speech':
            errorMessage = '没有检测到语音，请确保麦克风工作正常并再次尝试。\n\n建议：\n- 检查麦克风是否正常工作\n- 说话时距离麦克风近一些\n- 确保发音清晰';
            break;
          case 'audio-capture':
            errorMessage = '无法捕获音频，请检查麦克风连接。\n\n建议：\n- 检查麦克风是否正确连接\n- 确保没有其他应用占用麦克风\n- 尝试重新插拔麦克风';
            break;
          case 'not-allowed':
            errorMessage = '没有麦克风权限，请在浏览器设置中允许麦克风访问。\n\n建议：\n- 点击浏览器地址栏左侧的麦克风图标\n- 选择"允许"访问麦克风\n- 刷新页面后重试';
            break;
          case 'network':
            if (retryIndex < maxRetries - 1) {
              console.log(`🔄 网络错误，准备第${retryIndex + 2}次重试...`);
              setTimeout(() => {
                startRecording(retryIndex + 1);
              }, 1000);
              return;
            }
            errorMessage = '网络错误，多次重试后仍无法连接到语音识别服务。\n\n可能的原因：\n- 需要访问Google语音服务\n- 当前网络环境有限制\n- 防火墙或网络策略阻止\n\n建议：\n- 尝试使用VPN或代理\n- 切换到其他网络环境\n- 或者手动输入词汇';
            break;
          default:
            errorMessage = `语音识别失败: ${event.error}。\n\n建议检查网络连接和麦克风设置。`;
        }

        alert(errorMessage);
      };

      recognition.onstart = () => {
        console.log('🎤 语音识别开始...');
      };

      recognition.onend = () => {
        console.log('🏁 语音识别结束');
        setIsRecording(false);
        retryCountRef.current = 0; // 重置重试计数器
      };

      recognitionRef.current = recognition;
      console.log('🚀 启动语音识别...');
      recognition.start();
      setIsRecording(true);

    } catch (e) {
      console.error('❌ 语音识别启动失败:', e);
      alert(`语音识别功能启动失败:\n\n${e instanceof Error ? e.message : '未知错误'}\n\n请尝试刷新页面后重试。`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题和导航 */}
        <div className="text-center mb-8">
          {/* 返回首页按钮 */}
          <div className="flex justify-start mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-purple-600 border-purple-300 hover:bg-purple-50 hover:text-purple-700"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
              <Home className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">所学词汇编排成英文歌曲</h1>
            <Sparkles className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            输入您学习的词汇，AI将为您创作一首涵盖这些词汇的英文歌曲，主题围绕高中生活，积极向上，使用欧标B1水平词汇，通俗易懂且严格押韵
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧输入区域 */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
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
                      placeholder="例如: dream, future, school, friend, happy, memories..."
                      className="min-h-[120px] resize-none pr-12"
                      maxLength={500}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 hover:bg-purple-100"
                      onClick={isRecording ? stopRecording : () => startRecording(0)}
                      title={isRecording ? "停止录音" : "开始语音输入"}
                    >
                      {isRecording ? '🔴' : '🎤'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-gray-500">
                      {vocabulary.length}/500 字符
                    </div>
                    <div className="flex items-center gap-2">
                      {isRecording && (
                        <div className="text-xs text-red-500 flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          正在录音...
                        </div>
                      )}
                      {retryCountRef.current > 0 && !isRecording && (
                        <div className="text-xs text-orange-500 flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          重试中... ({retryCountRef.current}/{maxRetries})
                        </div>
                      )}
                    </div>
                  </div>
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
                  disabled={!vocabulary.trim() || isGenerating || !hasEnoughPoints}
                  className={`w-full ${
                    vocabulary.trim() && !isGenerating && hasEnoughPoints
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  } text-white`}
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      AI正在创作中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成歌词 ({toolCost}点)
                    </>
                  )}
                </Button>

                {/* 点数提示 */}
                {!hasEnoughPoints && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      点数不足！当前: {userPoints}点，需要: {toolCost}点
                    </AlertDescription>
                  </Alert>
                )}

                {/* 功能说明 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">功能特点：</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 全面涵盖您提供的所有词汇</li>
                    <li>• 支持语音输入词汇（点击🎤麦克风图标）</li>
                    <li>• 围绕高中生活崭新篇章主题</li>
                    <li>• 积极向上的情感表达</li>
                    <li>• 符合欧标B1水平的词汇</li>
                    <li>• 严格押韵的节奏感</li>
                    <li>• 通俗易懂易演唱</li>
                  </ul>
                </div>

                {/* 语音识别使用提示 */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-2">🎤 语音识别使用提示：</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• <strong>网络要求：</strong>需要连接到互联网（使用Google语音服务）</li>
                    <li>• <strong>浏览器推荐：</strong>Chrome 或 Edge 浏览器效果最佳</li>
                    <li>• <strong>使用方法：</strong>点击🎤图标 → 允许麦克风权限 → 清晰说出英文词汇</li>
                    <li>• <strong>网络问题：</strong>如遇网络错误，请尝试更换网络环境或手动输入</li>
                    <li>• <strong>权限设置：</strong>确保浏览器地址栏左侧显示麦克风已授权</li>
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
                    生成的歌词
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center space-y-3">
                        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-gray-600">AI正在为您创作专属歌词...</p>
                      </div>
                    </div>
                  ) : generatedLyrics ? (
                    <div className="space-y-4">
                      <div
                        className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200 max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: formatLyrics(generatedLyrics) }}
                      />
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
                        <p>输入词汇后点击生成，AI将为您创作专属英文歌曲</p>
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