"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Download,
  Copy,
  FileText,
  CheckCircle,
  TrendingUp,
  Clock,
  Users
} from "lucide-react";
import type { BatchTask, ProcessingStats, ExportOptions } from "../types";

interface ResultTableProps {
  task: BatchTask | null;
  stats: ProcessingStats;
}

export const ResultTable: React.FC<ResultTableProps> = ({ task, stats }) => {
  const [searchTerm, setSearchTerm] = useState("");

  // 过滤作业数据
  const filteredAssignments = task?.assignments.filter(assignment =>
    assignment.student.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // 计算统计数据
  const calculateStats = () => {
    if (!task) return null;

    const totalSentences = task.assignments.reduce((total, assignment) =>
      total + assignment.polishedSentences.length, 0
    );

    const improvedSentences = task.assignments.reduce((total, assignment) =>
      total + assignment.polishedSentences.filter(s =>
        s.polished !== s.original && s.confidence > 0
      ).length, 0
    );

    return {
      totalStudents: task.assignments.length,
      totalSentences,
      improvedSentences,
      improvementRate: totalSentences > 0 ? (improvedSentences / totalSentences * 100) : 0,
      processingTime: stats.processingTime / 1000,
      pointsUsed: task.pointsCost
    };
  };

  const calculatedStats = calculateStats();

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('内容已复制到剪贴板！');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('内容已复制到剪贴板！');
    }
  };

  // 复制所有结果
  const copyAllResults = () => {
    if (!task) return;

    let content = `批量润色结果报告\n`;
    content += `生成时间: ${new Date().toLocaleString()}\n`;
    content += `处理学生: ${task.assignments.length} 名\n`;
    content += `处理句子: ${calculatedStats?.totalSentences || 0} 句\n`;
    content += `消耗积分: ${task.pointsCost} 点\n\n`;

    task.assignments.forEach(assignment => {
      content += `【${assignment.student.name}】\n`;
      assignment.polishedSentences.forEach((sentence, index) => {
        content += `${index + 1}. 原句: ${sentence.original}\n`;
        content += `   润色: ${sentence.polished}\n`;
        if (sentence.explanation) {
          content += `   说明: ${sentence.explanation}\n`;
        }
        content += '\n';
      });
      content += '\n';
    });

    copyToClipboard(content);
  };

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      {calculatedStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">处理结果概览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-lg mb-2">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{calculatedStats.totalStudents}</div>
                <div className="text-sm text-gray-600">处理学生</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-lg mb-2">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{calculatedStats.totalSentences}</div>
                <div className="text-sm text-gray-600">处理句子</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-purple-100 rounded-lg mb-2">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{calculatedStats.improvedSentences}</div>
                <div className="text-sm text-gray-600">优化句子</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-orange-100 rounded-lg mb-2">
                  <CheckCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{calculatedStats.improvementRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">优化率</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-cyan-100 rounded-lg mb-2">
                  <Clock className="w-6 h-6 text-cyan-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{calculatedStats.processingTime.toFixed(1)}s</div>
                <div className="text-sm text-gray-600">处理时间</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-lg mb-2">
                  <span className="text-lg font-bold text-red-600">{calculatedStats.pointsUsed}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{calculatedStats.pointsUsed}</div>
                <div className="text-sm text-gray-600">消耗积分</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">结果筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索学生姓名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 结果表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>润色结果详情</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copyAllResults}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                复制全部
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无匹配的结果</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{assignment.student.name}</span>
                      <Badge variant="outline">
                        {assignment.polishedSentences.length} 句
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assignment.polishedSentences.map((sentence, index) => (
                        <div key={index} className="border-l-4 border-blue-400 pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">句子 {index + 1}</span>
                            {sentence.confidence > 0 ? (
                              <Badge variant="default" className="bg-green-500 text-xs">
                                优化完成
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                保持原句
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">原句:</span>
                              <p className="mt-1 p-2 bg-gray-50 rounded">{sentence.original}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">润色后:</span>
                              <p className="mt-1 p-2 bg-green-50 rounded text-green-800">{sentence.polished}</p>
                            </div>
                          </div>

                          {sentence.explanation && (
                            <div className="text-sm text-blue-600 mt-2">
                              <span className="font-medium">说明:</span> {sentence.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2">结果说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>优化率</strong>：显示被成功润色的句子比例</li>
            <li>• <strong>质量评分</strong>：AI对润色质量的自信度评分</li>
            <li>• <strong>复制功能</strong>：支持一键复制所有结果到剪贴板</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};