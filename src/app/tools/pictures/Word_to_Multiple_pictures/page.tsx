"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/lib/user-context";
import { AlertCircle, Image as ImageIcon, Download, Camera, Upload } from "lucide-react";
import { ImageRecognition } from "@/components/ImageRecognition";

interface GeneratedImage {
  url: string;
  index: number;
  stage?: string;
  description?: string;
}

export default function ImageGeneratorPage() {
  const router = useRouter();
  const { currentUser, userPoints } = useUser();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const actualImageCount = 5; // 固定生成5张图片，对应故事5个阶段

  // 新增步骤相关状态
  const [story, setStory] = useState(""); // 用户输入的完整故事
  const [decomposedStages, setDecomposedStages] = useState<any[]>([]); // 拆解后的阶段
  const [editableStages, setEditableStages] = useState<any[]>([]); // 可编辑的阶段副本
  const [currentStep, setCurrentStep] = useState(1); // 当前步骤：1-故事输入，2-阶段确认，3-生成图片
  const [isDecomposing, setIsDecomposing] = useState(false); // 故事拆解中状态
  const [selectedStyle, setSelectedStyle] = useState("realistic"); // 选中的绘图风格

  // AI绘图风格配置
  const IMAGE_STYLES = [
    {
      id: "realistic",
      name: "写实风",
      description: "适配现实向、校园、家庭类英文故事",
      icon: "📷",
      prompt: "Seedream 4.0 Generate image based on this specific story stage description with consistent realism style. Requirements: Extract characters' appearance/actions/emotions, setting (time/place/environment), key objects from the stage description. Technical parameters: Size 1920×1080, Resolution 300dpi, Rendering: Photo-realistic details, natural lighting, clear focus on core scene, no redundant elements. [STAGE_DESCRIPTION]",
      size: "1024×1024"
    },
    {
      id: "anime",
      name: "动漫风",
      description: "适配青春、奇幻、冒险类英文故事",
      icon: "🎌",
      prompt: "Seedream 4.0 Generate image based on this specific story stage description with consistent anime style. Requirements: Extract characters' anime-style features (big eyes, distinct hairstyle), actions/emotions, setting (fantasy or daily scenes), key objects from the stage description. Technical parameters: Size 1920×1080, Resolution 300dpi, Rendering: Bold line art, vibrant colors, soft shading, dynamic poses for action scenes. [STAGE_DESCRIPTION]",
      size: "1024×1024"
    },
    {
      id: "watercolor",
      name: "水彩风",
      description: "适配温情、治愈、文艺类英文故事",
      icon: "🎨",
      prompt: "Seedream 4.0 Generate image based on this specific story stage description with consistent watercolor style. Requirements: Extract soft-toned setting (sunset, countryside, cozy rooms), characters' gentle actions/emotions, key objects from the stage description. Technical parameters: Size 1920×1080, Resolution 300dpi, Rendering: Transparent watercolor layers, muted color scheme, blurred background, focus on emotional atmosphere. [STAGE_DESCRIPTION]",
      size: "1024×1024"
    },
    {
      id: "cyberpunk",
      name: "赛博朋克风",
      description: "适配科幻、悬疑、未来类英文故事",
      icon: "🌃",
      prompt: "Seedream 4.0 Generate image based on this specific story stage description with consistent cyberpunk style. Requirements: Extract futuristic setting (neon-lit cities, high-tech devices, rain-soaked streets), characters' cyber-style outfits/actions, key tech objects from the stage description. Technical parameters: Size 1920×1080, Resolution 300dpi, Rendering: Neon color accents (cyan/magenta), dark background, glowing elements, mechanical details. [STAGE_DESCRIPTION]",
      size: "1024×1024"
    }
  ];

  const storyDecomposeCost = 2; // 故事拆解消耗2个点数
  const imageGenerateCost = 12; // 图片生成消耗12个点数
  const totalCost = storyDecomposeCost + imageGenerateCost; // 总消耗14个点数

  // 处理故事拆解
  const handleDecomposeStory = async () => {
    if (!story.trim()) {
      setError("请输入英语故事内容");
      return;
    }

    if (!currentUser) {
      setError("请先登录后再使用故事拆解功能");
      return;
    }

    setIsDecomposing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/story-decomposer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 添加认证头，确保 Edge 浏览器能正确传递认证信息
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({
          story: story.trim(),
          style: selectedStyle,
          styleConfig: IMAGE_STYLES.find(s => s.id === selectedStyle)
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('故事拆解成功:', data.stages);
        setDecomposedStages(data.stages);
        setEditableStages([...data.stages]); // 初始化可编辑状态
        setCurrentStep(2); // 进入步骤2：阶段确认
      } else {
        console.error('故事拆解API错误:', data);
        setError(data.error || '故事拆解失败，请稍后重试');
      }
    } catch (err) {
      console.error('故事拆解请求错误:', err);
      setError('故事拆解请求失败，请检查网络连接');
    } finally {
      setIsDecomposing(false);
    }
  };

  // 处理阶段描述修改
  const handleStageEdit = (index: number, newDescription: string) => {
    const updatedStages = [...editableStages];
    updatedStages[index] = {
      ...updatedStages[index],
      description: newDescription
    };
    setEditableStages(updatedStages);
  };

  // 重置到原始阶段描述
  const handleResetStages = () => {
    setEditableStages([...decomposedStages]);
  };

  // 确认阶段并开始生成图片
  const handleConfirmStages = () => {
    setDecomposedStages(editableStages); // 使用编辑后的阶段
    setCurrentStep(3); // 进入步骤3：生成图片
    handleGenerateImages();
  };

  // 生成图片
  const handleGenerateImages = async () => {
    if (!decomposedStages || decomposedStages.length === 0) {
      setError("没有可用的故事阶段，请重新拆解故事");
      return;
    }

    if (!currentUser) {
      setError("请先登录后再使用AI图片生成功能");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const response = await fetch('/api/ai/image-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 添加认证头，确保 Edge 浏览器能正确传递认证信息
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token') || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({
          stages: decomposedStages,
          originalStory: story,
          style: selectedStyle,
          styleConfig: IMAGE_STYLES.find(s => s.id === selectedStyle)
        })
      });

      const data = await response.json();

      if (data.success) {
        const receivedImages = data.images || [];
        console.log('英语故事图片生成成功，收到图片数据:', {
          expectedCount: actualImageCount,
          receivedCount: receivedImages.length,
          images: data.images,
          fullResponse: data
        });
        setGeneratedImages(receivedImages);

        // 检查是否成功生成了4张图片
        if (receivedImages.length < actualImageCount) {
          console.warn(`图片数量不足：期望 ${actualImageCount} 张，实际生成 ${receivedImages.length} 张`);
        }
      } else {
        console.error('连环画生成API错误:', data);

        // 检查是否有退款信息
        if (data.pointsRefunded) {
          // 退还点数的错误，需要特殊显示
          const refundMessage = `${data.error}\n\n💰 退还${data.pointsAmount}点数已到账，您可以重新尝试生成。`;
          setError(refundMessage);

          // 刷新用户点数
          if (typeof window !== 'undefined') {
            // 触发用户数据重新获取
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } else {
          setError(data.error || '连环画生成失败，请稍后重试');
        }
      }
    } catch (err) {
      console.error('连环画生成请求错误:', err);
      setError('连环画生成请求失败，请检查网络连接');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setStory("");
    setPrompt("");
    setDecomposedStages([]);
    setGeneratedImages([]);
    setCurrentStep(1);
    setError(null);
  };

  // 重置到第一步
  const handleReset = () => {
    setStory("");
    setDecomposedStages([]);
    setEditableStages([]);
    setCurrentStep(1);
    setError(null);
  };

  const downloadImage = async (imageUrl: string, index: number, timestamp?: string) => {
    const timeString = timestamp || new Date().toISOString().split('T')[0];
    console.log(`开始下载第 ${index + 1} 张图片，文件名: 故事第${index + 1}张图片_${timeString}.jpg`);

    try {
      // 优先使用fetch方法（更可靠）
      try {
        const response = await fetch(imageUrl, {
          mode: 'no-cors',
          cache: 'no-cache'
        });

        if (response.ok) {
          console.log(`fetch成功，第 ${index + 1} 张图片`);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `故事第${index + 1}张图片_${timeString}.jpg`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          return;
        }
      } catch (fetchError) {
        console.warn(`fetch方法失败（第${index + 1}张），使用直接下载:`, fetchError);
      }

      // 备用方法：直接下载
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `故事第${index + 1}张图片_${timeString}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`第 ${index + 1} 张图片已尝试直接下载`);

      // 延迟备用下载方法
      setTimeout(async () => {
        try {
          const response = await fetch(imageUrl, {
            mode: 'cors',
            headers: {
              'Accept': 'image/*'
            }
          });

          if (response.ok) {
            console.log(`备用fetch成功，第 ${index + 1} 张图片`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const fallbackLink = document.createElement('a');
            fallbackLink.href = url;
            fallbackLink.download = `故事第${index + 1}张图片_${timeString}.jpg`;
            fallbackLink.style.display = 'none';
            document.body.appendChild(fallbackLink);
            fallbackLink.click();
            document.body.removeChild(fallbackLink);
            URL.revokeObjectURL(url);
          }
        } catch (fallbackError) {
          console.warn(`备用下载方法也失败（第${index + 1}张）:`, fallbackError);
          // 最后在新窗口打开图片，让用户手动保存
          window.open(imageUrl, '_blank');
        }
      }, 2000);

    } catch (err) {
      console.error(`第 ${index + 1} 张图片下载失败:`, err);
      setError(`下载第${index + 1}张图片失败，请右键图片另存为`);
      // 作为最后手段，在新窗口打开图片
      window.open(imageUrl, '_blank');
    }
  };

  const downloadAllImages = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    console.log(`开始下载全部 ${generatedImages.length} 张图片，时间戳: ${timestamp}`);

    // 使用Promise队列确保按顺序下载，避免浏览器阻止
    for (let i = 0; i < generatedImages.length; i++) {
      try {
        console.log(`准备下载第 ${i + 1} 张图片`);
        await downloadImage(generatedImages[i].url, i, timestamp);

        // 在每张图片下载之间添加延迟，避免浏览器阻止
        if (i < generatedImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`第 ${i + 1} 张图片下载失败:`, error);
      }
    }

    console.log('全部图片下载流程完成');

    // 显示下载提示
    if (generatedImages.length > 1) {
      // 创建临时提示
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = `已尝试下载 ${generatedImages.length} 张图片，请检查浏览器下载文件夹`;
      document.body.appendChild(toast);

      // 3秒后移除提示
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">英语故事图片生成</h1>
                <p className="text-sm text-gray-500">输入英语叙事文章，AI将为您生成故事5个关键阶段的图片。如果是高中英语读后续写，要包含完整的故事。</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="text-sm text-gray-600">
                  点数余额: <span className="font-semibold text-purple-600">{userPoints}</span>
                  <span className="text-xs text-gray-500 ml-1">(拆解2点数+生成12点数)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">输入故事</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">确认阶段</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 3 ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">生成图片</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧输入区域 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  {currentStep === 1 && "故事输入"}
                  {currentStep === 2 && "阶段确认"}
                  {currentStep === 3 && "生成图片"}
                </h2>
                {currentStep === 3 && (
                  <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    消耗12点数
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* 步骤1：故事输入 */}
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        英语叙事文章
                      </label>
                      <Textarea
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                        placeholder="请输入英语叙事文章内容，AI将自动分析文章的故事结构（开端、发展、高潮、结局），并为每个阶段生成对应的图片..."
                        className="min-h-[375px] border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        disabled={isDecomposing}
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        💡 AI会自动识别故事的5个关键阶段：Exposition（开端）、Conflict（发展）、Climax（高潮）、Resolution（结局）、Ending（尾声），并生成风格一致的5张图片
                      </div>
                      <div className="mt-1 text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                        <strong>特别提醒：</strong>输入英语叙事文章，AI将为您生成故事5个关键阶段的图片。如果是高中英语读后续写，要包含完整的故事（原文+续写部分）。
                      </div>
                    </div>

                    {/* OCR识图功能 */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Camera className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">或使用OCR识图功能</span>
                      </div>
                      <ImageRecognition
                        onResultChange={(result) => {
                          if (result.trim()) {
                            setStory(result);
                          }
                        }}
                      />
                      <div className="mt-2 text-xs text-gray-500">
                        💡 支持拍照或上传图片，AI将自动识别图片中的文字内容并填充到上方输入框
                      </div>
                      <div className="mt-1 text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                        <strong>特别提醒：</strong>如果是高中英语读后续写题目，请确保拍照内容包含完整的故事（原文部分+续写部分），以便AI准确分析故事结构。
                      </div>
                    </div>

                    {/* AI绘图风格选择 */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">选择AI绘图风格</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {IMAGE_STYLES.map((style) => (
                          <div
                            key={style.id}
                            onClick={() => setSelectedStyle(style.id)}
                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedStyle === style.id
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{style.icon}</span>
                              <span className="text-sm font-medium text-gray-900">{style.name}</span>
                            </div>
                            <div className="text-xs text-gray-500">{style.description}</div>
                            <div className="text-xs text-gray-400 mt-1">{style.size}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        💡 根据您的英语故事类型选择最适合的绘画风格，AI将生成相应风格的5张连贯图片
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleDecomposeStory}
                        disabled={!story.trim() || isDecomposing}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isDecomposing ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI正在分析故事结构...
                          </span>
                        ) : (
                          "分析故事结构!(消耗2点数)"
                        )}
                      </Button>
                      {story && (
                        <Button
                          onClick={handleClear}
                          variant="outline"
                          disabled={isDecomposing}
                          className="border-gray-300"
                        >
                          清除
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {/* 步骤2：阶段确认 */}
                {currentStep === 2 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        故事阶段分析结果
                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          ✏️ 可直接编辑描述内容
                        </span>
                      </label>
                      <div className="space-y-3">
                        {editableStages.map((stage, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-md border">
                            <div className="font-medium text-gray-900 mb-2">
                              {stage.stage}
                            </div>
                            <Textarea
                              value={stage.description}
                              onChange={(e) => handleStageEdit(index, e.target.value)}
                              className="min-h-[80px] text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              placeholder="请输入此阶段的英文描述..."
                            />
                            <div className="mt-1 text-xs text-gray-500">
                              💡 建议包含场景、人物、氛围等视觉元素，便于AI生成图片
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        📝 编辑提示：修改描述将直接影响生成的图片内容，建议使用简洁明确的英文描述
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleConfirmStages}
                        disabled={isGenerating}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isGenerating ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            正在生成图片...
                          </span>
                        ) : (
                          "确认并生成图片!"
                        )}
                      </Button>
                      <Button
                        onClick={handleResetStages}
                        variant="outline"
                        disabled={isGenerating}
                        className="border-gray-300"
                      >
                        重置描述
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        disabled={isGenerating}
                        className="border-gray-300"
                      >
                        重新分析
                      </Button>
                    </div>
                  </>
                )}

                {/* 步骤3：生成中/完成 */}
                {currentStep === 3 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        原始故事
                      </label>
                      <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-600 max-h-32 overflow-y-auto">
                        {story}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex space-x-3">
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        disabled={isGenerating}
                        className="border-gray-300"
                      >
                        开始新故事
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* 错误提示 */}
              {error && (
                <div className={`mt-4 flex items-start gap-2 p-3 rounded-md border ${
                  error.includes('退还')
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="text-sm whitespace-pre-line">{error}</div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧结果显示区域 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  {currentStep === 1 && "使用说明"}
                  {currentStep === 2 && "阶段说明"}
                  {currentStep === 3 && "故事图片生成结果"}
                </h2>
                {generatedImages.length > 0 && (
                  <Button
                    onClick={downloadAllImages}
                    variant="outline"
                    size="sm"
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    一键下载全部
                  </Button>
                )}
              </div>

              {/* 步骤1：使用说明 */}
              {currentStep === 1 && (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-700 mb-4">使用步骤说明</h3>
                  <div className="text-left max-w-md mx-auto space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">1</div>
                      <div>
                        <div className="font-medium text-gray-700">输入英语故事</div>
                        <div className="text-sm text-gray-500">请输入完整的英语叙事文章</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">2</div>
                      <div>
                        <div className="font-medium text-gray-700">确认故事阶段</div>
                        <div className="text-sm text-gray-500">AI将分析出5个故事阶段供您确认</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">3</div>
                      <div>
                        <div className="font-medium text-gray-700">生成图片</div>
                        <div className="text-sm text-gray-500">AI将为每个阶段生成对应的图片</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 步骤2：阶段说明 */}
              {currentStep === 2 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-4">故事阶段分析完成</h3>
                  <p className="text-sm text-gray-600 mb-4">AI已成功分析出故事的5个关键阶段</p>
                  <div className="text-left max-w-md mx-auto bg-blue-50 p-4 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>下一步：</strong>请检查左侧的阶段分析结果，确认无误后点击"确认并生成图片"按钮。
                    </p>
                  </div>
                </div>
              )}

              {/* 步骤3：生成中/完成 */}
              {currentStep === 3 && (
                <>
                  {/* 生成中的提示 */}
                  {isGenerating && (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                        <svg className="animate-spin h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">AI正在生成图片中...</p>
                      <p className="text-sm text-gray-500 mt-2">正在为每个故事阶段生成对应的图片，请耐心等待</p>
                    </div>
                  )}

                  {/* 生成完成但没有图片的提示 */}
                  {!isGenerating && generatedImages.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">图片生成失败</p>
                      <p className="text-sm text-gray-500 mt-2">请检查错误提示或重新尝试</p>
                    </div>
                  )}
                </>
              )}

              {/* 生成的图片展示 */}
              {currentStep === 3 && generatedImages.length > 0 && (
                <div className="space-y-4">
                  {/* 图片数量状态提示 */}
                  <div className={`${generatedImages.length < actualImageCount ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border rounded-md p-3 text-sm`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`font-medium ${generatedImages.length < actualImageCount ? 'text-amber-700' : 'text-blue-700'}`}>
                          生成了 {generatedImages.length} 张故事阶段图片
                          {generatedImages.length < actualImageCount && (
                            <span className="text-amber-600 ml-1">
                              ⚠️ 数量不足（期望 5 张）
                            </span>
                          )}
                        </div>
                        {generatedImages.length < actualImageCount && (
                          <div className="text-xs text-amber-600 mt-1">
                            AI可能未完全识别故事结构。您可以：
                            <button
                              onClick={handleGenerateImages}
                              disabled={isGenerating}
                              className="ml-1 underline hover:text-amber-700 disabled:opacity-50"
                            >
                              重新生成
                            </button>
                            来获得完整的5张阶段图片
                          </div>
                        )}
                      </div>
                      {generatedImages.length > 0 && (
                        <span className="text-xs text-blue-600">
                          💡 下载失败请右键图片另存为
                        </span>
                      )}
                    </div>
                  </div>

                  {generatedImages.map((image, index) => {
                    const stageName = image.stage || `阶段 ${index + 1}`;
                    const description = image.description || '';

                    return (
                    <div key={index} className="border rounded-lg overflow-hidden bg-gray-50">
                      <div className="bg-white px-3 py-2 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-700">
                              {stageName}
                            </span>
                            {description && (
                              <div className="text-xs text-gray-500 mt-1">
                                {description}
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => downloadImage(image.url, index)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            下载
                          </Button>
                        </div>
                      </div>
                      <div className="p-2">
                        <img
                          src={image.url}
                          alt={`${stageName} - 故事第${index + 1}阶段`}
                          className="w-full h-auto rounded-md shadow-sm"
                          style={{ maxHeight: '300px', objectFit: 'contain' }}
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}