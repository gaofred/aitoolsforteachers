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
import Head from 'next/head';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);

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
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 格式化输出数据，使其更易读
  const formatOutputData = (data: any): string => {
    if (typeof data === 'string') {
      // 清理可能的Markdown标记
      return data
        .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
        .replace(/\*(.*?)\*/g, '$1')   // 移除斜体标记
        .replace(/#{1,6}\s+/g, '')   // 移除标题标记
        .replace(/```[\s\S]*?```/g, (match) => {
          // 处理代码块
          const codeContent = match.replace(/```[\s\S]*?```/g, '').slice(3, -3);
          return `[代码块]\n${codeContent}`;
        })
        .trim();
    }

    if (typeof data === 'object' && data !== null) {
      // 如果是复杂对象，尝试提取主要内容
      if (data.result) {
        return formatOutputData(data.result);
      }
      if (data.content) {
        return formatOutputData(data.content);
      }
      if (data.text) {
        return formatOutputData(data.text);
      }
      if (data.output) {
        return formatOutputData(data.output);
      }
      if (data.generated_text) {
        return formatOutputData(data.generated_text);
      }
      if (data.response) {
        return formatOutputData(data.response);
      }

      // 如果是数组，取第一个有效项
      if (Array.isArray(data) && data.length > 0) {
        return formatOutputData(data[0]);
      }

      // 智能格式化复杂对象
      const formatted = Object.entries(data)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key}: ${value}`;
          } else if (typeof value === 'object') {
            return `${key}: ${JSON.stringify(value, null, 2)}`;
          } else {
            return `${key}: ${String(value)}`;
          }
        })
        .join('\n\n');

      return formatted;
    }

    return String(data);
  };

  // 格式化输入数据
  const formatInputData = (data: any): string => {
    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      // 提取常见的输入字段
      if (data.text || data.prompt || data.content) {
        return formatOutputData(data.text || data.prompt || data.content);
      }

      // 如果有其他字段，格式化为易读格式
      const entries = Object.entries(data);
      if (entries.length > 0) {
        return entries.map(([key, value]) => {
          if (typeof value === 'string' && value.length > 100) {
            return `${key}: ${value.substring(0, 100)}...`;
          }
          return `${key}: ${JSON.stringify(value)}`;
        }).join('\n');
      }
    }

    return String(data);
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

  // 分页逻辑
  const totalPages = Math.ceil(filteredGenerations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredGenerations.slice(startIndex, endIndex);

  // 重置页码当标签切换时
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // 分页组件
  const PaginationComponent = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          上一页
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="w-8 h-8 p-0"
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          下一页
        </Button>
      </div>
    );
  };

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
    <>
      <Head>
        <title>AI生成历史记录 - 英语教学工具</title>
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
        `}</style>
      </Head>
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
          {/* 功能说明 */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-amber-900 mb-1">功能说明</h4>
                <p className="text-sm text-amber-800">
                  目前功能不完善，部分AI工具生成的结果不会出现在这里。历史记录功能仅显示通过 ai_generations 数据表记录的生成结果。
                  如果您使用的某些工具生成的结果没有显示，说明该工具尚未接入统一的历史记录系统。
                </p>
              </div>
            </div>
          </div>

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
                    <>
                      {/* 页码信息 */}
                      <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                        <span>
                          显示第 {startIndex + 1} - {Math.min(endIndex, filteredGenerations.length)} 条，共 {filteredGenerations.length} 条记录
                        </span>
                        {totalPages > 1 && (
                          <span>第 {currentPage} / {totalPages} 页</span>
                        )}
                      </div>

                      <div className="space-y-4">
                        {currentItems.map((generation) => {
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
                                        <div className="max-h-40 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap break-words custom-scrollbar">
                                          {formatInputData(generation.input_data)}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyToClipboard(formatInputData(generation.input_data))}
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
                                        <div className="max-h-60 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap break-words custom-scrollbar">
                                          {formatOutputData(generation.output_data)}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyToClipboard(formatOutputData(generation.output_data))}
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
                                        <div className="max-h-60 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap break-words custom-scrollbar">
                                          {formatOutputData(generation.final_output)}
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyToClipboard(formatOutputData(generation.final_output))}
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

                        {/* 分页组件 */}
                        <PaginationComponent />
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </>
  );
}