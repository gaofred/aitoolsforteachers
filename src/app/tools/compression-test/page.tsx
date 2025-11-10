"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, X, Loader2, BarChart3 } from "lucide-react";
import {
  compressImageForOCR,
  adaptiveCompressImage,
  compressImagesForOCR,
  getCompressionInfo
} from "@/lib/image-compressor";
import { compressImageWithCanvas } from "@/lib/canvas-compressor";

interface CompressionTest {
  id: string;
  originalFile: File;
  compressedFile?: File;
  preview: string;
  method: string;
  status: 'pending' | 'compressing' | 'completed' | 'failed';
  result?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    duration: number;
  };
  error?: string;
}

export default function CompressionTestPage() {
  const [tests, setTests] = useState<CompressionTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newTests: CompressionTest[] = Array.from(files).map(file => ({
      id: `test_${Date.now()}_${Math.random()}`,
      originalFile: file,
      preview: URL.createObjectURL(file),
      method: 'pending',
      status: 'pending'
    }));

    setTests(prev => [...prev, ...newTests]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 运行所有压缩测试
  const runAllTests = async () => {
    setIsRunning(true);

    const compressionMethods = [
      {
        name: 'Canvas压缩',
        fn: (file: File) => compressImageWithCanvas(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          quality: 0.5
        })
      },
      {
        name: 'CompressorJS',
        fn: (file: File) => compressImageForOCR(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          quality: 0.5,
          preferCanvas: false
        })
      },
      {
        name: '自适应压缩',
        fn: (file: File) => adaptiveCompressImage(file, 0.5, 3)
      },
      {
        name: '智能混合压缩',
        fn: (file: File) => compressImageForOCR(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          quality: 0.5,
          preferCanvas: true
        })
      }
    ];

    // 为每个文件创建测试用例
    const allTests: CompressionTest[] = [];
    tests.forEach(test => {
      compressionMethods.forEach(method => {
        allTests.push({
          ...test,
          id: `${test.id}_${method.name}`,
          method: method.name,
          status: 'pending'
        });
      });
    });

    setTests(allTests);

    // 串行执行所有测试
    for (let i = 0; i < allTests.length; i++) {
      const test = allTests[i];
      const method = compressionMethods.find(m => test.method.includes(m.name));

      if (!method) continue;

      // 更新状态为压缩中
      setTests(prev => prev.map(t =>
        t.id === test.id ? { ...t, status: 'compressing' } : t
      ));

      try {
        const startTime = Date.now();
        const compressedFile = await method.fn(test.originalFile);
        const duration = Date.now() - startTime;

        const result = {
          originalSize: test.originalFile.size,
          compressedSize: compressedFile.size,
          compressionRatio: Math.round((1 - compressedFile.size / test.originalFile.size) * 100),
          duration
        };

        setTests(prev => prev.map(t =>
          t.id === test.id ? {
            ...t,
            status: 'completed',
            compressedFile,
            result
          } : t
        ));

        console.log(`✅ ${test.method} 测试完成:`, {
          文件: test.originalFile.name,
          ...result
        });

      } catch (error) {
        console.error(`❌ ${test.method} 测试失败:`, error);
        setTests(prev => prev.map(t =>
          t.id === test.id ? {
            ...t,
            status: 'failed',
            error: error instanceof Error ? error.message : '未知错误'
          } : t
        ));
      }
    }

    setIsRunning(false);
  };

  // 删除测试
  const removeTest = (testId: string) => {
    setTests(prev => prev.filter(t => t.id !== testId));
  };

  // 清空所有测试
  const clearAll = () => {
    setTests([]);
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  // 获取压缩方案信息
  const compressionInfo = getCompressionInfo();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            图片压缩方案测试
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 压缩方案状态 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(compressionInfo).map(([key, info]) => (
              <Card key={key} className={info.available ? 'bg-green-50' : 'bg-red-50'}>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">{key}</h3>
                  <Badge variant={info.available ? 'default' : 'destructive'}>
                    {info.available ? '可用' : '不可用'}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-2">{info.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 文件上传区域 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="compression-test-upload"
            />
            <label htmlFor="compression-test-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">上传图片进行压缩测试</p>
              <p className="text-sm text-gray-500">支持 JPG, PNG, GIF 格式</p>
              <Button variant="outline" className="mt-4">选择图片</Button>
            </label>
          </div>

          {/* 控制按钮 */}
          {tests.length > 0 && (
            <div className="flex gap-4 justify-center">
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    测试中...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    运行所有测试
                  </>
                )}
              </Button>
              <Button onClick={clearAll} variant="outline" disabled={isRunning}>
                清空测试
              </Button>
            </div>
          )}

          {/* 测试结果 */}
          {tests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">测试结果</h3>

              {/* 按原始文件分组显示结果 */}
              {Array.from(new Set(tests.map(t => t.originalFile.name))).map(fileName => {
                const fileTests = tests.filter(t => t.originalFile.name === fileName);
                const originalFile = fileTests[0]?.originalFile;

                if (!originalFile) return null;

                return (
                  <Card key={fileName} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium truncate">{fileName}</h4>
                        <Badge variant="outline">
                          原始大小: {formatSize(originalFile.size)}
                        </Badge>
                      </div>

                      {/* 图片预览和测试结果 */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 原图预览 */}
                        <div>
                          <p className="text-sm font-medium mb-2">原图预览</p>
                          <div className="relative border rounded overflow-hidden">
                            <img
                              src={URL.createObjectURL(originalFile)}
                              alt="原图"
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        </div>

                        {/* 测试结果表格 */}
                        <div>
                          <p className="text-sm font-medium mb-2">压缩结果对比</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {fileTests.map(test => (
                              <div key={test.id} className="flex items-center justify-between p-2 border rounded text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      test.status === 'completed' ? 'default' :
                                      test.status === 'failed' ? 'destructive' :
                                      test.status === 'compressing' ? 'secondary' :
                                      'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {test.method}
                                  </Badge>
                                  {test.status === 'compressing' && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                </div>

                                {test.result && (
                                  <div className="text-right">
                                    <div>{formatSize(test.result.compressedSize)}</div>
                                    <div className="text-xs text-gray-500">
                                      {test.result.compressionRatio}% ({test.result.duration}ms)
                                    </div>
                                  </div>
                                )}

                                {test.error && (
                                  <div className="text-xs text-red-600 truncate max-w-32" title={test.error}>
                                    {test.error}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}