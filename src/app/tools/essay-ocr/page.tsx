"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EssayOCRUploader from "@/components/EssayOCRUploader";
import { Eye, Copy, Clock, FileText, Zap } from "lucide-react";

interface EssayOCRResult {
  text: string;
  englishOnly: string;
  metadata: {
    hasChinese: boolean;
    originalLength: number;
    englishOnlyLength: number;
    processingTime: number;
    model: string;
  };
}

export default function EssayOCRPage() {
  const [ocrResults, setOcrResults] = useState<EssayOCRResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<EssayOCRResult | null>(null);

  const handleOCRComplete = (result: EssayOCRResult) => {
    setOcrResults(prev => [...prev, result]);
    // 自动选中最新的结果
    setSelectedResult(result);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // 可以添加toast提示
  };

  const clearResults = () => {
    setOcrResults([]);
    setSelectedResult(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">作文OCR识别工具</h1>
        <p className="text-gray-600">
          专门用于作文批改的OCR识别功能，使用火山引擎 doubao-seed-1-6-lite 模型
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：上传区域 */}
        <div className="lg:col-span-1">
          <EssayOCRUploader
            onOCRComplete={handleOCRComplete}
            maxImages={5}
          />

          {/* 快速统计 */}
          {ocrResults.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">识别统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">总识别数</span>
                  <Badge variant="default">{ocrResults.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">包含中文</span>
                  <Badge variant={ocrResults.some(r => r.metadata.hasChinese) ? "default" : "secondary"}>
                    {ocrResults.filter(r => r.metadata.hasChinese).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">纯英文</span>
                  <Badge variant="outline">
                    {ocrResults.filter(r => !r.metadata.hasChinese).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">平均处理时间</span>
                  <span className="text-sm font-mono">
                    {Math.round(ocrResults.reduce((sum, r) => sum + r.metadata.processingTime, 0) / ocrResults.length)}ms
                  </span>
                </div>
                <Separator />
                <button
                  onClick={clearResults}
                  className="w-full text-sm text-red-600 hover:text-red-700"
                >
                  清除所有结果
                </button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：结果展示区域 */}
        <div className="lg:col-span-2">
          {ocrResults.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">还没有识别结果</p>
                  <p className="text-sm text-gray-400 mt-2">
                    请先上传作文图片进行识别
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="results" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="results">识别结果</TabsTrigger>
                <TabsTrigger value="details">详细信息</TabsTrigger>
                <TabsTrigger value="english-only">纯英文</TabsTrigger>
              </TabsList>

              {/* 识别结果 */}
              <TabsContent value="results" className="space-y-4">
                {/* 结果选择器 */}
                <div className="flex gap-2 flex-wrap">
                  {ocrResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedResult(result)}
                      className={`px-3 py-1 rounded-lg border text-sm transition-colors ${
                        selectedResult === result
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      作文 #{index + 1}
                      {result.metadata.hasChinese && (
                        <span className="ml-1 text-xs">🇨🇳</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* 当前结果展示 */}
                {selectedResult && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">识别结果</CardTitle>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(selectedResult.text)}
                          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                        >
                          <Copy className="w-3 h-3 inline mr-1" />
                          复制
                        </button>
                        <button
                          onClick={() => copyToClipboard(selectedResult.englishOnly)}
                          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                        >
                          <Copy className="w-3 h-3 inline mr-1" />
                          复制英文
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={selectedResult.text}
                        readOnly
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="识别结果将显示在这里..."
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 详细信息 */}
              <TabsContent value="details" className="space-y-4">
                {selectedResult && (
                  <div className="grid gap-4">
                    {/* 元数据卡片 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          识别信息
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">使用模型</p>
                          <p className="font-mono">{selectedResult.metadata.model}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">处理时间</p>
                          <p className="font-mono">{selectedResult.metadata.processingTime}ms</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">原文长度</p>
                          <p className="font-mono">{selectedResult.metadata.originalLength} 字符</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">英文长度</p>
                          <p className="font-mono">{selectedResult.metadata.englishOnlyLength} 字符</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">语言类型</p>
                          <Badge variant={selectedResult.metadata.hasChinese ? "default" : "secondary"}>
                            {selectedResult.metadata.hasChinese ? "中英混合" : "纯英文"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">识别时间</p>
                          <p className="font-mono">
                            {new Date().toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 原文预览 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">原文预览</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-96 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded">
                            {selectedResult.text}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* 纯英文内容 */}
              <TabsContent value="english-only" className="space-y-4">
                {selectedResult && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">纯英文内容</CardTitle>
                      <button
                        onClick={() => copyToClipboard(selectedResult.englishOnly)}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                      >
                        <Copy className="w-3 h-3 inline mr-1" />
                        复制
                      </button>
                    </CardHeader>
                    <CardContent>
                      {selectedResult.metadata.englishOnlyLength > 0 ? (
                        <Textarea
                          value={selectedResult.englishOnly}
                          readOnly
                          className="min-h-[400px] font-mono text-sm"
                          placeholder="纯英文内容将显示在这里..."
                        />
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>没有检测到英文内容</p>
                          <p className="text-sm text-gray-400 mt-2">
                            或者识别结果全部为中文内容
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}