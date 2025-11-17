"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Calendar, Clock, Eye, EyeOff, Users, Search, History, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase-client";
import { useUser } from "@/lib/user-context";

interface GenerationRecord {
  id: string;
  tool_type: string;
  input_data: any;
  output_data: any;
  final_output?: any;
  tokens_used: number;
  points_cost: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AIGenerationHistory() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(7);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGenerations();
  }, []);

  const fetchGenerations = async () => {
    try {
      const response = await fetch('/api/ai/generations/history');
      const data = await response.json();

      if (!data.success) {
        setError(data.error || '获取历史记录失败');
        return;
      }

      console.log('✅ 成功获取历史记录，数量:', data.generations?.length || 0);
      setGenerations(data.generations || []);
      setError(null);
    } catch (error) {
      console.error('❌ 获取历史记录过程中发生错误:', error);
      setError('服务器内部错误');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getToolIcon = (toolType: string) => {
    switch (toolType) {
      case 'reading': return '📖';
      case 'vocabulary': return '📚';
      case 'writing': return '✍️';
      case 'creative': return '🎨';
      case 'teaching': return '👨‍🏫';
      default: '🔧';
    }
  };

  const getToolName = (toolType: string) => {
    switch (toolType) {
      case 'reading': return '阅读教学';
      case 'vocabulary': return '词汇学习';
      case 'writing': return '写作辅助';
      case 'creative': return '创意工具';
      case 'teaching': return '教学工具';
      default: '其他工具';
    }
  };

  const formatInputData = (data: any): string => {
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object' && data !== null) {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return '[复杂数据]';
      }
    }
    return String(data);
  };

  const formatOutputData = (data: any): string => {
    if (typeof data === 'string') {
      return data
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,6}\s+/g, '')
        .replace(/```[\s\S]*?```/g, (match) => {
          const codeContent = match.replace(/```[\s\S]*?```/g, '').slice(3, -3);
          return `[代码块]\n${codeContent}`;
        })
        .trim();
    }

    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return data.map(item => formatOutputData(item)).join('\n');
      } else {
        const formatted = Object.entries(data)
          .filter(([key, value]) => value !== null && value !== undefined)
          .map(([key, value]) => {
            const formattedValue = formatOutputData(value);
            return `${key}: ${formattedValue}`;
          })
          .join('\n');
        return formatted;
      }
    }

    return String(data);
  };

  const getToolCategory = (toolType: string) => {
    switch (toolType) {
      case 'reading': return 'reading';
      case 'vocabulary': return 'vocabulary';
      case 'writing': return 'writing';
      case 'creative': return 'creative';
      case 'teaching': return 'teaching';
      default: 'other';
    }
  };

  const filterGenerations = () => {
    if (activeTab === 'all') return generations;
    return generations.filter(gen => getToolCategory(gen.tool_type) === activeTab);
  };

  const totalPages = Math.ceil(filterGenerations().length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filterGenerations().slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载用户信息...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
                    <div className="text-2xl font-bold text-blue-600">{generations.length}</div>
                    <div className="text-sm text-gray-600">总生成次数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {generations.filter(g => g.status === 'COMPLETED').length}
                    </div>
                    <div className="text-sm text-gray-600">成功完成</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                      {generations.reduce((sum, g) => sum + g.points_cost, 0)}
                    </div>
                    <div className="text-sm text-gray-600">总消耗点数</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {generations.reduce((sum, g) => sum + g.tokens_used, 0)}
                    </div>
                    <div className="text-sm text-gray-600">总使用Token</div>
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
                  {filterGenerations().length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">暂无{activeTab === "all" ? "" : "此类"}历史记录</p>
                    </div>
                  ) : (
                    <>
                      {/* 页码信息 */}
                      <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                        <span>
                          显示第 {startIndex + 1} - {Math.min(endIndex, filterGenerations().length)} 条，共 {filterGenerations().length} 条记录
                        </span>
                        {totalPages > 1 && (
                          <span>第 {currentPage} / {totalPages} 页</span>
                        )}
                      </div>

                      <div className="space-y-4">
                        {currentItems.map((generation) => {
                          const isExpanded = expandedItems.has(generation.id);
                          const toolIcon = getToolIcon(generation.tool_type);
                          const toolName = getToolName(generation.tool_type);

                          return (
                            <Card key={generation.id} className="overflow-hidden">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="text-2xl">{toolIcon}</div>
                                    <div>
                                      <CardTitle className="text-lg">{toolName}</CardTitle>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {toolName}
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                          {formatDate(generation.created_at)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={generation.status === 'COMPLETED' ? 'default' : 'secondary'}
                                      className={
                                        generation.status === 'COMPLETED'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }
                                    >
                                      {generation.status === 'COMPLETED' ? '成功' : '处理中'}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleExpanded(generation.id)}
                                    >
                                      {isExpanded ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                  <span>消耗: {generation.points_cost} 点数</span>
                                  <span>Token: {generation.tokens_used}</span>
                                </div>

                                {isExpanded && (
                                  <div className="space-y-4">
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
                                  </div>
                                )}
                              </CardContent>
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