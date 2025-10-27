"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Progress } from "@/components/ui/progress"; // 暂时移除
import { Badge } from "@/components/ui/badge";
// import { Alert, AlertDescription } from "@/components/ui/alert"; // 暂时移除
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // 暂时移除
import { Loader2, Wand2, CheckCircle, AlertCircle, Eye, RefreshCw } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { SupabasePointsService } from "@/lib/supabase-points-service";
import type { StudentAssignment, Requirement, PolishedSentence, ProcessingStats } from "../types";

interface SentencePolisherProps {
  assignments: StudentAssignment[];
  requirements: Requirement[];
  onPolishComplete: (assignments: StudentAssignment[]) => void;
  onStatsUpdate: (stats: ProcessingStats) => void;
}

export const SentencePolisher: React.FC<SentencePolisherProps> = ({
  assignments,
  requirements,
  onPolishComplete,
  onStatsUpdate
}) => {
  const { currentUser } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessing, setCurrentProcessing] = useState<string>("");
  const [processedAssignments, setProcessedAssignments] = useState<StudentAssignment[]>(assignments);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null);

  // 监听assignments变化，更新processedAssignments
  useEffect(() => {
    console.log('SentencePolisher - assignments props变化:', assignments.length, '个作业');
    console.log('SentencePolisher - assignments详情:', assignments);

    // 检查assignments中是否包含润色数据
    const hasPolishedData = assignments.some(assignment =>
      assignment.polishedSentences && assignment.polishedSentences.length > 0
    );

    console.log('SentencePolisher - 是否包含润色数据:', hasPolishedData);

    setProcessedAssignments(assignments);

    // 如果有润色数据且没有选中作业，自动选择第一个
    if (hasPolishedData && assignments.length > 0 && !selectedAssignment) {
      console.log('自动选择第一个作业查看详情');
      setSelectedAssignment(assignments[0]);
    }
  }, [assignments]);

  // 计算积分消耗
  const calculatePoints = (sentenceCount: number): number => {
    if (sentenceCount >= 10) {
      return Math.ceil(sentenceCount * 0.8); // 批量处理8折优惠
    }
    return sentenceCount;
  };

  // 获取总句子数
  const getTotalSentences = (): number => {
    return assignments.reduce((total, assignment) =>
      total + assignment.ocrResult.sentences.length, 0
    );
  };

  // 构建润色提示词
  const buildPolishPrompt = (sentence: string, index: number, allRequirements: Requirement[]): string => {
    // 获取通用要求
    const generalRequirements = allRequirements.filter(req => req.sentenceIndex === 0);
    // 获取特定句子要求
    const specificRequirements = allRequirements.filter(req => req.sentenceIndex === index + 1);
    // 合并要求
    const applicableRequirements = [...generalRequirements, ...specificRequirements];

    let prompt = `请润色以下英文句子，保持原意的同时提升表达质量：

原句：${sentence}

润色要求：`;

    if (applicableRequirements.length === 0) {
      prompt += `
- 修正语法错误
- 提升词汇表达
- 优化句式结构
- 保持原意不变`;
    } else {
      applicableRequirements.forEach(req => {
        if (req.requiredWords.length > 0) {
          prompt += `\n- 必须使用词汇：${req.requiredWords.join(', ')}`;
        }
        if (req.requiredStructures.length > 0) {
          const structures = req.requiredStructures.map(struct => {
            const structMap: { [key: string]: string } = {
              'relative_clause': '定语从句(which/that/who等)',
              'adverbial_clause': '状语从句(when/because等)',
              'noun_clause': '名词性从句(that/what等)',
              'participle': '分词结构(V-ing/V-ed)',
              'infinitive': '不定式(to do)',
              'passive_voice': '被动语态',
              'present_perfect': '现在完成时',
              'past_perfect': '过去完成时',
              'modal_verbs': '情态动词',
              'subjunctive': '虚拟语气'
            };
            return structMap[struct] || struct;
          });
          prompt += `\n- 必须使用语法结构：${structures.join(', ')}`;
        }
        if (req.notes) {
          prompt += `\n- 其他要求：${req.notes}`;
        }
      });
    }

    prompt += `

请直接输出润色后的句子，不要解释。如果原句已经符合要求且表达优秀，可以保持原句。`;

    return prompt;
  };

  // 调用AI润色单个句子
  const polishSentence = async (sentence: string, index: number, allRequirements: Requirement[]): Promise<PolishedSentence> => {
    const prompt = buildPolishPrompt(sentence, index, allRequirements);

    try {
      // 使用智谱GLM-4.6进行润色
      const response = await fetch('/api/ai/cd-adaptation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: prompt,
          difficulty: 'intermediate' // 使用标准版模型
        })
      });

      if (!response.ok) {
        throw new Error(`润色API错误: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '润色失败');
      }

      const polishedText = data.result;

      // 分析变化
      const changes = analyzeChanges(sentence, polishedText);
      const explanation = generateExplanation(changes);

      return {
        original: sentence,
        polished: polishedText,
        changes,
        explanation,
        confidence: 0.9
      };

    } catch (error) {
      console.error('句子润色失败:', error);
      throw error;
    }
  };

  // 分析句子变化
  const analyzeChanges = (original: string, polished: string): any[] => {
    const changes = [];

    // 简单的变化检测（实际应用中可以使用更复杂的算法）
    if (original.toLowerCase() !== polished.toLowerCase()) {
      // 检测词汇变化
      const originalWords = original.toLowerCase().split(/\s+/);
      const polishedWords = polished.toLowerCase().split(/\s+/);

      const addedWords = polishedWords.filter(word => !originalWords.includes(word));
      const removedWords = originalWords.filter(word => !polishedWords.includes(word));

      if (addedWords.length > 0) {
        changes.push({
          type: 'word',
          original: removedWords.join(', '),
          changed: addedWords.join(', '),
          reason: '词汇优化'
        });
      }

      // 检测长度变化
      if (Math.abs(original.length - polished.length) > original.length * 0.2) {
        changes.push({
          type: 'structure',
          original: original,
          changed: polished,
          reason: polished.length > original.length ? '扩展内容' : '精简表达'
        });
      }

      // 如果没有检测到具体变化，标记为整体优化
      if (changes.length === 0) {
        changes.push({
          type: 'style',
          original: original,
          changed: polished,
          reason: '整体表达优化'
        });
      }
    }

    return changes;
  };

  // 生成解释
  const generateExplanation = (changes: any[]): string => {
    if (changes.length === 0) {
      return '原句表达优秀，无需修改';
    }

    const explanations = changes.map(change => {
      switch (change.type) {
        case 'word':
          return '优化了词汇表达，使用更准确的词汇';
        case 'structure':
          return '调整了句式结构，使表达更流畅';
        case 'grammar':
          return '修正了语法错误';
        case 'style':
          return '提升了整体表达效果';
        default:
          return '优化了语言表达';
      }
    });

    return [...new Set(explanations)].join('；');
  };

  // 处理单个作业
  const processAssignment = async (assignment: StudentAssignment, allRequirements: Requirement[]): Promise<StudentAssignment> => {
    const polishedSentences: PolishedSentence[] = [];

    for (let i = 0; i < assignment.ocrResult.sentences.length; i++) {
      const sentence = assignment.ocrResult.sentences[i];
      setCurrentProcessing(`${assignment.student.name} - 句子 ${i + 1}`);

      try {
        const polished = await polishSentence(sentence, i, allRequirements);
        polishedSentences.push(polished);
      } catch (error) {
        console.error(`润色句子失败: ${sentence}`, error);
        // 添加错误标记的润色结果
        polishedSentences.push({
          original: sentence,
          polished: sentence,
          changes: [],
          explanation: '润色失败，保持原句',
          confidence: 0
        });
        setErrors(prev => [...prev, `${assignment.student.name} 句子${i + 1} 润色失败`]);
      }

      // 更新进度
      const totalProcessed = processedAssignments.reduce((total, a) =>
        total + a.polishedSentences.length, 0) + polishedSentences.length;
      const totalSentences = getTotalSentences();
      setProcessingProgress((totalProcessed / totalSentences) * 100);
    }

    return {
      ...assignment,
      polishedSentences
    };
  };

  // 开始批量润色
  const startBatchPolishing = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    const totalSentences = getTotalSentences();
    const pointsNeeded = calculatePoints(totalSentences);

    // 检查积分是否足够
    try {
      const userPoints = await SupabasePointsService.getUserPoints(currentUser.id);
      if (userPoints < pointsNeeded) {
        alert(`积分不足！需要 ${pointsNeeded} 积分，当前积分：${userPoints}`);
        return;
      }
    } catch (error) {
      console.error('获取用户积分失败:', error);
      alert('无法获取积分信息，请稍后重试');
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    setProcessedAssignments([]);
    setCurrentProcessing("");
    setProcessingProgress(0);

    const startTime = Date.now();

    try {
      const updatedAssignments: StudentAssignment[] = [];

      // 逐个处理作业
      for (let i = 0; i < assignments.length; i++) {
        const assignment = assignments[i];
        setCurrentProcessing(`处理 ${assignment.student.name} 的作业...`);

        try {
          const processedAssignment = await processAssignment(assignment, requirements);
          updatedAssignments.push(processedAssignment);
          setProcessedAssignments(prev => [...prev, processedAssignment]);
        } catch (error) {
          console.error(`处理作业失败: ${assignment.student.name}`, error);
          setErrors(prev => [...prev, `${assignment.student.name} 作业处理失败`]);
          // 添加未处理的作业
          updatedAssignments.push({
            ...assignment,
            polishedSentences: assignment.ocrResult.sentences.map(sentence => ({
              original: sentence,
              polished: sentence,
              changes: [],
              explanation: '处理失败，保持原句',
              confidence: 0
            }))
          });
        }
      }

      // 扣除积分
      try {
        await SupabasePointsService.addPoints(
          currentUser.id,
          -pointsNeeded,
          'PURCHASE',
          `批量润色作业 - ${totalSentences}个句子`
        );
      } catch (error) {
        console.error('扣除积分失败:', error);
      }

      // 更新统计信息
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const successfulSentences = updatedAssignments.reduce((total, assignment) =>
        total + assignment.polishedSentences.filter(s => s.confidence > 0).length, 0
      );

      const stats: ProcessingStats = {
        totalImages: assignments.length,
        processedImages: updatedAssignments.length,
        totalSentences,
        polishedSentences: successfulSentences,
        errors,
        processingTime
      };

      onStatsUpdate(stats);
      onPolishComplete(updatedAssignments);

    } catch (error) {
      console.error('批量润色失败:', error);
      setErrors(prev => [...prev, '批量润色过程发生错误']);
    } finally {
      setIsProcessing(false);
      setCurrentProcessing("");
      setProcessingProgress(100);
    }
  };

  // 重试失败的句子
  const retryFailedSentences = async () => {
    // 实现重试逻辑
    await startBatchPolishing();
  };

  const totalSentences = getTotalSentences();
  const pointsNeeded = calculatePoints(totalSentences);
  const processedCount = processedAssignments.reduce((total, assignment) =>
    total + assignment.polishedSentences.length, 0
  );

  return (
    <div className="space-y-6">
      {/* 处理状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>AI润色处理</span>
            <Badge variant="secondary">
              {processedCount} / {totalSentences} 句子
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 进度条 */}
            {isProcessing && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">处理进度</span>
                  <span className="text-sm text-gray-600">
                    {Math.round(processingProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                {currentProcessing && (
                  <p className="text-sm text-gray-600 mt-2">{currentProcessing}</p>
                )}
              </div>
            )}

            {/* 统计信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{assignments.length}</div>
                <div className="text-sm text-gray-600">学生作业</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalSentences}</div>
                <div className="text-sm text-gray-600">总句子数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{pointsNeeded}</div>
                <div className="text-sm text-gray-600">消耗积分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{errors.length === 0 ? '✓' : errors.length}</div>
                <div className="text-sm text-gray-600">错误数量</div>
              </div>
            </div>

            {/* 开始按钮 */}
            <Button
              onClick={startBatchPolishing}
              disabled={isProcessing || assignments.length === 0}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  润色处理中...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  开始AI润色 (消耗 {pointsNeeded} 积分)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 处理结果 */}
      {processedAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">润色结果预览</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 简化的标签页实现 */}
            <div className="border-b border-gray-200 mb-4">
              <div className="flex space-x-8">
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedAssignment === null
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAssignment(null)}
                >
                  总览
                </button>
                <button
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedAssignment !== null
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={!selectedAssignment}
                >
                  详细对比
                </button>
              </div>
            </div>

            {/* 总览内容 */}
            {selectedAssignment === null && (
                <div className="grid gap-4">
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    <div>调试: processedAssignments 长度: {processedAssignments.length}</div>
                    <div>调试: selectedAssignment存在: {selectedAssignment ? 'true' : 'false'}</div>
                    <div>调试: polishedSentences总数: {processedAssignments.reduce((total, a) => total + (a.polishedSentences?.length || 0), 0)}</div>
                  </div>
                  {processedAssignments.map((assignment, index) => (
                    <div
                      key={assignment.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        console.log('点击查看作业详情:', assignment);
                        setSelectedAssignment(assignment);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{assignment.student.name}</h4>
                        <Badge variant="outline">
                          {assignment.polishedSentences.length} 句
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        成功润色: {assignment.polishedSentences.filter(s => s.confidence > 0).length} / {assignment.polishedSentences.length}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        调试: polishedSentences数组长度: {assignment.polishedSentences.length}
                      </div>
                    </div>
                  ))}
                </div>
            )}

            {/* 详细对比内容 */}
            {selectedAssignment !== null ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{selectedAssignment.student.name}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAssignment(null)}
                  >
                    返回列表
                  </Button>
                </div>

                {/* 调试信息 */}
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <div>调试: selectedAssignment.student.name: {selectedAssignment.student?.name || '未知'}</div>
                  <div>调试: selectedAssignment.polishedSentences 长度: {selectedAssignment.polishedSentences?.length || 0}</div>
                  <div>调试: selectedAssignment.ocrResult.sentences 长度: {selectedAssignment.ocrResult?.sentences?.length || 0}</div>
                  <div>调试: selectedAssignment完整数据: {JSON.stringify(selectedAssignment, null, 2).substring(0, 200)}...</div>
                </div>

                {selectedAssignment.polishedSentences.map((polishedSentence, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">句子 {index + 1}</span>
                        {polishedSentence.confidence > 0 ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">原句:</div>
                          <div className="p-2 bg-gray-50 rounded text-sm">
                            {polishedSentence.original || '原句数据缺失'}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">润色后:</div>
                          <div className="p-2 bg-green-50 rounded text-sm">
                            {polishedSentence.polished || '润色结果缺失'}
                          </div>
                        </div>
                      </div>

                      {polishedSentence.explanation && (
                        <div className="text-sm text-blue-600">
                          <strong>说明:</strong> {polishedSentence.explanation}
                        </div>
                      )}

                      {/* 额外的调试信息 */}
                      <div className="text-xs text-gray-400 border-t pt-2">
                        调试数据: original={polishedSentence.original?.length || 0}, polished={polishedSentence.polished?.length || 0}, confidence={polishedSentence.confidence}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>请从总览中选择一个作业查看详细对比</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 错误信息 */}
      {errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-700">处理错误</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-red-800">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={retryFailedSentences}
              className="mt-4"
              disabled={isProcessing}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重试失败项
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2">AI润色说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>智能润色</strong>：基于您设置的要求进行智能句子优化</li>
            <li>• <strong>保持原意</strong>：在优化表达的同时保持句子的原意不变</li>
            <li>• <strong>批量处理</strong>：支持同时处理多个学生的多个句子</li>
            <li>• <strong>积分消耗</strong>：每句1个积分，10句以上享受8折优惠</li>
            <li>• <strong>质量保证</strong>：使用专业AI模型确保润色质量</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};