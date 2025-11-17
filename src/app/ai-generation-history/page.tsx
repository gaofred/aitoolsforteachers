"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  History,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  Image,
  Music,
  BookOpen,
  PenTool,
  Volume2,
  Brain,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink
} from "lucide-react";
import { useUser } from "@/lib/user-context";

interface AIGeneration {
  id: string;
  tool_type: string;
  input_data: any;
  output_data: any;
  final_output: any;
  tokens_used: number;
  points_cost: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  updated_at: string;
}

interface ToolConfig {
  [key: string]: {
    name: string;
    icon: React.ReactNode;
    category: string;
    color: string;
  };
}

const toolConfig: ToolConfig = {
  'academic': {
    name: '学术论文分析',
    icon: <FileText className="w-4 h-4" />,
    category: '阅读教学',
    color: 'bg-purple-100 text-purple-700'
  },
  'reading': {
    name: '阅读理解',
    icon: <BookOpen className="w-4 h-4" />,
    category: '阅读教学',
    color: 'bg-blue-100 text-blue-700'
  },
  'qixuanwu_vocabulary_organise': {
    name: '七选五词汇整理',
    icon: <PenTool className="w-4 h-4" />,
    category: '词汇学习',
    color: 'bg-green-100 text-green-700'
  },
  'bcd_vocabulary_organise': {
    name: 'BCD篇词汇整理',
    icon: <PenTool className="w-4 h-4" />,
    category: '词汇学习',
    color: 'bg-green-100 text-green-700'
  },
  'vocabulary': {
    name: '词汇整理',
    icon: <PenTool className="w-4 h-4" />,
    category: '词汇学习',
    color: 'bg-green-100 text-green-700'
  },
  'music_generator': {
    name: '音乐生成',
    icon: <Music className="w-4 h-4" />,
    category: '创意工具',
    color: 'bg-pink-100 text-pink-700'
  },
  'lyric_exercise': {
    name: '歌词练习',
    icon: <Volume2 className="w-4 h-4" />,
    category: '创意工具',
    color: 'bg-pink-100 text-pink-700'
  },
  'writing': {
    name: '写作辅助',
    icon: <PenTool className="w-4 h-4" />,
    category: '写作教学',
    color: 'bg-orange-100 text-orange-700'
  },
  'simple_explanation': {
    name: '简单解释',
    icon: <Brain className="w-4 h-4" />,
    category: '教学工具',
    color: 'bg-yellow-100 text-yellow-700'
  }
};

export default function AIGenerationHistory() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [generations, setGenerations] = useState<AIGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/signin');
      return;
    }
    fetchGenerations();
  }, [currentUser]);

  const fetchGenerations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/generations/history');

      if (!response.ok) {
        throw new Error('获取历史记录失败');
      }

      const data = await response.json();
      setGenerations(data.generations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 可以添加成功提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'COMPLETED': { color: 'bg-green-100 text-green-700', text: '已完成' },
      'PROCESSING': { color: 'bg-blue-100 text-blue-700', text: '处理中' },
      'PENDING': { color: 'bg-yellow-100 text-yellow-700', text: '等待中' },
      'FAILED': { color: 'bg-red-100 text-red-700', text: '失败' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getToolInfo = (toolType: string) => {
    return toolConfig[toolType] || {
      name: toolType,
      icon: <FileText className="w-4 h-4" />,
      category: '其他',
      color: 'bg-gray-100 text-gray-700'
    };
  };

  const filterGenerations = () => {
    if (activeTab === "all") return generations;

    const categoryMap: { [key: string]: string[] } = {
      'reading': ['academic', 'reading'],
      'vocabulary': ['qixuanwu_vocabulary_organise', 'bcd_vocabulary_organise', 'vocabulary'],
      'creative': ['music_generator', 'lyric_exercise'],
      'writing': ['writing'],
      'teaching': ['simple_explanation']
    };

    const toolTypes = categoryMap[activeTab] || [];
    return generations.filter(gen => toolTypes.includes(gen.tool_type));
  };

  const filteredGenerations = filterGenerations();

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">请先登录后查看历史记录</p>
            <Button onClick={() => router.push('/auth/signin')}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <h1 className="text-xl font-semibold text-foreground">AI生成历史记录</h1>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在加载历史记录...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchGenerations}>重试</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{generations.length}</p>
                      <p className="text-sm text-gray-600">总生成次数</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {generations.filter(g => g.status === 'COMPLETED').length}
                      </p>
                      <p className="text-sm text-gray-600">成功完成</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-xs text-yellow-700">⚡</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {generations.reduce((sum, g) => sum + g.points_cost, 0)}
                      </p>
                      <p className="text-sm text-gray-600">总消耗点数</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {generations.reduce((sum, g) => sum + g.tokens_used, 0)}
                      </p>
                      <p className="text-sm text-gray-600">总使用Token</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 分类标签 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="reading">阅读教学</TabsTrigger>
                <TabsTrigger value="vocabulary">词汇学习</TabsTrigger>
                <TabsTrigger value="creative">创意工具</TabsTrigger>
                <TabsTrigger value="writing">写作辅助</TabsTrigger>
                <TabsTrigger value="teaching">教学工具</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {filteredGenerations.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">暂无{activeTab === "all" ? "" : "此类"}历史记录</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredGenerations.map((generation) => {
                      const toolInfo = getToolInfo(generation.tool_type);
                      const isExpanded = expandedItems.has(generation.id);

                      return (
                        <Card key={generation.id} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${toolInfo.color}`}>
                                  {toolInfo.icon}
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{toolInfo.name}</CardTitle>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {toolInfo.category}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(generation.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(generation.status)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpanded(generation.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* 消耗信息 */}
                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                              <span>消耗: {generation.points_cost} 点数</span>
                              <span>Token: {generation.tokens_used}</span>
                            </div>
                          </CardHeader>

                          {isExpanded && (
                            <CardContent className="pt-0">
                              <Separator className="mb-4" />

                              {/* 输入数据 */}
                              {generation.input_data && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">输入内容:</h4>
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <pre className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                                      {typeof generation.input_data === 'string'
                                        ? generation.input_data
                                        : JSON.stringify(generation.input_data, null, 2)
                                      }
                                    </pre>
                                    <div className="flex gap-2 mt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(
                                          typeof generation.input_data === 'string'
                                            ? generation.input_data
                                            : JSON.stringify(generation.input_data, null, 2)
                                        )}
                                      >
                                        <Copy className="w-3 h-3 mr-1" />
                                        复制
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 输出数据 */}
                              {generation.output_data && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">生成结果:</h4>
                                  <div className="bg-blue-50 rounded-lg p-3">
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                      {typeof generation.output_data === 'string'
                                        ? generation.output_data
                                        : JSON.stringify(generation.output_data, null, 2)
                                      }
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(
                                          typeof generation.output_data === 'string'
                                            ? generation.output_data
                                            : JSON.stringify(generation.output_data, null, 2)
                                        )}
                                      >
                                        <Copy className="w-3 h-3 mr-1" />
                                        复制结果
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 最终输出 */}
                              {generation.final_output && generation.final_output !== generation.output_data && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">最终输出:</h4>
                                  <div className="bg-green-50 rounded-lg p-3">
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                      {typeof generation.final_output === 'string'
                                        ? generation.final_output
                                        : JSON.stringify(generation.final_output, null, 2)
                                      }
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(
                                          typeof generation.final_output === 'string'
                                            ? generation.final_output
                                            : JSON.stringify(generation.final_output, null, 2)
                                        )}
                                      >
                                        <Copy className="w-3 h-3 mr-1" />
                                        复制
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}