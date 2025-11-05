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
    console.log('SentencePolisher - assignments props变化:', assignments?.length || 0, '个作业');
    console.log('SentencePolisher - assignments详情:', assignments);

    // 检查assignments中是否包含润色数据
    const hasPolishedData = assignments?.some(assignment =>
      assignment.polishedSentences && assignment.polishedSentences.length > 0
    );

    console.log('SentencePolisher - 是否包含润色数据:', hasPolishedData);

    setProcessedAssignments(assignments);

    // 如果有润色数据且没有选中作业，自动选择第一个
    if (hasPolishedData && assignments?.length > 0 && !selectedAssignment) {
      console.log('自动选择第一个作业查看详情');
      setSelectedAssignment(assignments[0]);
    }
  }, [assignments]);

  // 计算点数消耗（按学生数计算）
  const calculatePoints = (studentCount: number): number => {
    // 每个学生1.5点数，向上取整
    return Math.ceil(studentCount * 1.5);
  };

  // 获取总句子数
  const getTotalSentences = (): number => {
    return assignments?.reduce((total, assignment) => {
      // 优先使用提取后的句子，如果没有则使用OCR原始句子
      const sentenceCount = assignment.extractedSentences && assignment.extractedSentences.length > 0
        ? assignment.extractedSentences.length
        : assignment.ocrResult.sentences.length;
      return total + sentenceCount;
    }, 0) || 0;
  };

  // 获取学生数量
  const getStudentCount = (): number => {
    return assignments?.length || 0;
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
    try {
      // 获取适用要求
      const generalRequirements = allRequirements.filter(req => req.sentenceIndex === 0);
      const specificRequirements = allRequirements.filter(req => req.sentenceIndex === index + 1);
      const applicableRequirements = [...generalRequirements, ...specificRequirements];

      // 调用专用的句子润色API（移除超时控制，依赖批量处理的延迟机制）
      const response = await fetch('/api/ai/sentence-polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sentence: sentence,
          requirements: applicableRequirements
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(`润色API错误: ${errorData.error || response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '润色失败');
      }

      const polishedText = data.result?.trim() || sentence;

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
      
      // 处理错误
      let errorMessage = '未知错误';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // 如果是API错误，返回原句作为备选方案
      return {
        original: sentence,
        polished: sentence, // 使用原句
        changes: [],
        explanation: `润色失败：${errorMessage}，保持原句`,
        confidence: 0
      };
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

  // 批量处理函数：限制并发数量
  const processInBatches = async <T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    batchSize: number = 3,
    delayMs: number = 1000
  ): Promise<R[]> => {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item, batchIndex) => processor(item, i + batchIndex))
      );
      results.push(...batchResults);
      
      // 批次间延迟，避免API限制
      if (i + batchSize < items.length) {
        console.log(`批次完成，等待 ${delayMs}ms 后继续...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return results;
  };

  // 处理单个作业（限制并发数量）
  const processAssignment = async (assignment: StudentAssignment, allRequirements: Requirement[], processedCountRef: { current: number }, totalSentences: number): Promise<StudentAssignment> => {
    // 优先使用提取后的句子，如果没有则使用OCR原始句子
    const sentencesToPolish = assignment.extractedSentences && assignment.extractedSentences.length > 0
      ? assignment.extractedSentences
      : assignment.ocrResult.sentences;

    console.log(`处理学生 ${assignment.student.name} 的作业:`, {
      使用提取句子: !!assignment.extractedSentences,
      提取句子数量: assignment.extractedSentences?.length || 0,
      OCR句子数量: assignment.ocrResult.sentences.length,
      实际处理句子数: sentencesToPolish.length
    });

    // 使用批量处理限制并发
    const polishedSentences = await processInBatches(
      sentencesToPolish,
      async (sentence, i) => {
      try {
        const polished = await polishSentence(sentence, i, allRequirements);
          console.log(`✅ 学生 ${assignment.student.name} 句子 ${i + 1} 润色完成`);
          
          // 更新进度
          processedCountRef.current += 1;
          setProcessingProgress((processedCountRef.current / totalSentences) * 100);
          
          return polished;
      } catch (error) {
          console.error(`❌ 润色句子失败: ${sentence}`, error);
          setErrors(prev => [...prev, `${assignment.student.name} 句子${i + 1} 润色失败`]);
          
          // 更新进度（即使失败也计入）
          processedCountRef.current += 1;
          setProcessingProgress((processedCountRef.current / totalSentences) * 100);
          
          // 返回错误标记的润色结果
          return {
          original: sentence,
          polished: sentence,
          changes: [],
          explanation: '润色失败，保持原句',
          confidence: 0
          };
        }
      },
      3, // 并发数量限制为3
      1000 // 批次间延迟1秒
    );

    const result = {
      ...assignment,
      polishedSentences
    };

    console.log(`学生 ${assignment.student.name} 处理完成:`, {
      polishedSentences数量: result.polishedSentences.length,
      第一个句子: result.polishedSentences[0]?.polished || '无'
    });

    return result;
  };

  // 开始批量润色（并行处理所有作业和句子）
  const startBatchPolishing = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    const totalSentences = getTotalSentences();
    const studentCount = getStudentCount();
    const pointsNeeded = calculatePoints(studentCount);

    // 检查点数是否足够
    try {
      const userPoints = await SupabasePointsService.getUserPoints(currentUser.id);
      if (userPoints < pointsNeeded) {
        alert(`点数不足！需要 ${pointsNeeded} 点数，当前点数：${userPoints}`);
        return;
      }
    } catch (error) {
      console.error('获取用户点数失败:', error);
      alert('无法获取点数信息，请稍后重试');
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    setProcessedAssignments([]);
    setCurrentProcessing("并行处理中...");
    setProcessingProgress(0);

    const startTime = Date.now();

    try {
      // 用于跟踪处理进度的引用
      const processedCountRef = { current: 0 };

      // 并行处理所有作业
      const assignmentPromises = assignments?.map(async (assignment) => {
        try {
          const processedAssignment = await processAssignment(
            assignment,
            requirements,
            processedCountRef,
            totalSentences
          );
          
          // 更新已处理的作业列表
          setProcessedAssignments(prev => {
            const newList = [...prev, processedAssignment];
            // 保持按原始顺序排序
            return assignments
              .map(a => newList.find(pa => pa.id === a.id))
              .filter(Boolean) as StudentAssignment[];
          });
          
          return processedAssignment;
        } catch (error) {
          console.error(`处理作业失败: ${assignment.student.name}`, error);
          setErrors(prev => [...prev, `${assignment.student.name} 作业处理失败`]);
          
          // 返回未处理的作业
          return {
            ...assignment,
            polishedSentences: (assignment.extractedSentences && assignment.extractedSentences.length > 0
              ? assignment.extractedSentences
              : assignment.ocrResult.sentences).map(sentence => ({
              original: sentence,
              polished: sentence,
              changes: [],
              explanation: '处理失败，保持原句',
              confidence: 0
            }))
          };
        }
      });

      // 等待所有作业处理完成
      const updatedAssignments = await Promise.all(assignmentPromises);

      // 扣除点数
      try {
        await SupabasePointsService.addPoints(
          currentUser.id,
          -pointsNeeded,
          'PURCHASE',
          `批量润色作业 - ${studentCount}个学生`
        );
      } catch (error) {
        console.error('扣除点数失败:', error);
      }

      // 计算失败的学生数量并退还点数
      const failedStudents = updatedAssignments.filter(assignment => {
        // 检查该学生的所有句子是否都失败了（confidence为0表示失败）
        const allSentencesFailed = assignment.polishedSentences.every(s => s.confidence === 0);
        return allSentencesFailed;
      });

      const failedStudentCount = failedStudents.length;
      
      if (failedStudentCount > 0) {
        const refundPoints = Math.ceil(failedStudentCount * 1.5); // 每个失败学生退还1.5点数，向上取整
        
        try {
               await SupabasePointsService.addPoints(
                 currentUser.id,
                 refundPoints,
                 'BONUS',
                 `批量润色失败退款 - ${failedStudentCount}个学生失败，退还${refundPoints}点数`
               );
          
          console.log(`退还点数成功: ${failedStudentCount}个学生失败，退还${refundPoints}点数`);
          
          // 显示退款通知
          if (failedStudentCount < studentCount) {
            alert(`部分学生润色失败，已退还${refundPoints}点数。失败学生：${failedStudents.map(s => s.student.name).join(', ')}`);
          } else {
            alert(`所有学生润色失败，已退还${refundPoints}点数`);
          }
        } catch (error) {
          console.error('退还点数失败:', error);
          alert(`润色失败但退款失败，请联系客服。失败学生数：${failedStudentCount}`);
        }
      }

      // 更新统计信息
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const successfulSentences = updatedAssignments.reduce((total, assignment) =>
        total + assignment.polishedSentences.filter(s => s.confidence > 0).length, 0
      );

      const stats: ProcessingStats = {
        totalImages: assignments?.length || 0,
        processedImages: updatedAssignments?.length || 0,
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
      
      // 如果整个过程失败，退还所有点数
      try {
           await SupabasePointsService.addPoints(
             currentUser.id,
             pointsNeeded,
             'BONUS',
             `批量润色系统错误退款 - 退还${pointsNeeded}点数`
           );
        
        console.log(`系统错误，退还所有点数: ${pointsNeeded}`);
        alert(`润色过程发生系统错误，已退还${pointsNeeded}点数`);
      } catch (refundError) {
        console.error('系统错误退款失败:', refundError);
        alert(`润色失败且退款失败，请联系客服。应退还点数：${pointsNeeded}`);
      }
    } finally {
      setIsProcessing(false);
      setCurrentProcessing("");
      setProcessingProgress(100);
    }
  };

  // 重试失败的句子
  const retryFailedSentences = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    // 找出所有失败的句子
    const failedAssignments = processedAssignments?.filter(assignment =>
      assignment.polishedSentences.some(s => s.confidence === 0)
    ) || [];

    if (failedAssignments.length === 0) {
      alert('没有失败的句子需要重试');
      return;
    }

    // 计算重试需要的点数（只计算失败的学生）
    const failedStudentCount = failedAssignments?.filter(assignment =>
      assignment.polishedSentences.every(s => s.confidence === 0)
    ).length || 0;
    
    const retryPointsNeeded = Math.ceil(failedStudentCount * 1.5);

    // 检查点数是否足够
    try {
      const userPoints = await SupabasePointsService.getUserPoints(currentUser.id);
      if (userPoints < retryPointsNeeded) {
        alert(`点数不足！重试需要 ${retryPointsNeeded} 点数，当前点数：${userPoints}`);
        return;
      }
    } catch (error) {
      console.error('获取用户点数失败:', error);
      alert('无法获取点数信息，请稍后重试');
      return;
    }

    setIsProcessing(true);
    setCurrentProcessing("重试失败的句子...");
    setProcessingProgress(0);

    const startTime = Date.now();

    try {
      // 只处理有失败句子的作业
      const retryPromises = failedAssignments.map(async (assignment) => {
        const failedSentences = assignment.polishedSentences
          .map((sentence, index) => ({ sentence, index }))
          .filter(({ sentence }) => sentence.confidence === 0);

        if (failedSentences.length === 0) {
          return assignment; // 没有失败的句子，直接返回
        }

        console.log(`重试学生 ${assignment.student.name} 的 ${failedSentences.length} 个失败句子`);

        // 使用批量处理重新润色失败的句子
        const retryResults = await processInBatches(
          failedSentences,
          async ({ sentence, index }) => {
            try {
              const polished = await polishSentence(sentence.original, index, requirements);
              console.log(`✅ 重试成功: 学生 ${assignment.student.name} 句子 ${index + 1}`);
              return { index, result: polished };
            } catch (error) {
              console.error(`❌ 重试失败: ${sentence.original}`, error);
              return { index, result: sentence }; // 保持原来的失败状态
            }
          },
          2, // 重试时使用更保守的并发数量
          1500 // 重试时使用更长的延迟
        );

        // 更新作业的润色结果
        const updatedPolishedSentences = [...assignment.polishedSentences];
        retryResults.forEach(({ index, result }) => {
          updatedPolishedSentences[index] = result;
        });

        return {
          ...assignment,
          polishedSentences: updatedPolishedSentences
        };
      });

      const retryResults = await Promise.all(retryPromises);

      // 扣除重试点数
      if (retryPointsNeeded > 0) {
        try {
          await SupabasePointsService.addPoints(
            currentUser.id,
            -retryPointsNeeded,
            'PURCHASE',
            `批量润色重试 - ${failedStudentCount}个学生重试`
          );
        } catch (error) {
          console.error('扣除重试点数失败:', error);
        }
      }

      // 更新处理结果
      const updatedAssignments = processedAssignments?.map(assignment => {
        const retryResult = retryResults.find(r => r.id === assignment.id);
        return retryResult || assignment;
      });

      setProcessedAssignments(updatedAssignments);

      // 计算重试后的成功率
      const totalRetried = failedAssignments.reduce((total, assignment) => 
        total + assignment.polishedSentences.filter(s => s.confidence === 0).length, 0
      );
      
      const nowSuccessful = retryResults.reduce((total, assignment) => 
        total + assignment.polishedSentences.filter(s => s.confidence > 0).length, 0
      );

      alert(`重试完成！重试了 ${totalRetried} 个句子，成功 ${nowSuccessful} 个`);

    } catch (error) {
      console.error('重试失败:', error);
      alert('重试过程发生错误，请稍后再试');
    } finally {
      setIsProcessing(false);
      setCurrentProcessing("");
      setProcessingProgress(100);
    }
  };

  const totalSentences = getTotalSentences();
  const studentCount = getStudentCount();
  const pointsNeeded = calculatePoints(studentCount);
  const processedCount = processedAssignments?.reduce((total, assignment) =>
    total + assignment.polishedSentences.length, 0
  ) || 0;

  // 计算失败的句子数量
  const failedSentencesCount = processedAssignments?.reduce((total, assignment) =>
    total + assignment.polishedSentences.filter(s => s.confidence === 0).length, 0
  ) || 0;
  
  // 计算完全失败的学生数量（用于重试点数计算）
  const failedStudentCount = processedAssignments?.filter(assignment =>
    assignment.polishedSentences.every(s => s.confidence === 0)
  ).length || 0;
  
  const retryPointsNeeded = Math.ceil(failedStudentCount * 1.5);

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
                <div className="text-2xl font-bold text-gray-900">{assignments?.length || 0}</div>
                <div className="text-sm text-gray-600">学生作业</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalSentences}</div>
                <div className="text-sm text-gray-600">总句子数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{pointsNeeded}</div>
                <div className="text-sm text-gray-600">消耗点数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{errors.length === 0 ? '✓' : errors.length}</div>
                <div className="text-sm text-gray-600">错误数量</div>
              </div>
            </div>

            {/* 处理模式提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">🔧 处理模式：</span>
                <span>稳定批量处理</span>
              </div>
              <div className="text-xs text-blue-600">
                • AI模型：极客智坊Qwen-Plus（高质量润色）
                <br />
                • 并发限制：每批3个句子，批次间延迟1秒
                <br />
                • 稳定优先：移除超时控制，确保处理稳定性
                <br />
                • 重试机制：失败句子可单独重试
              </div>
            </div>

            {/* 按钮区域 */}
            <div className="space-y-3">
              {/* 开始润色按钮 */}
            <Button
              onClick={startBatchPolishing}
              disabled={isProcessing || !assignments?.length}
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
                    开始AI润色 (消耗 {pointsNeeded} 点数)
                </>
              )}
            </Button>

              {/* 重试按钮 - 只有在有失败句子时才显示 */}
              {failedSentencesCount > 0 && processedAssignments?.length > 0 && (
                <Button
                  onClick={retryFailedSentences}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      重试中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2" />
                      重试失败句子 ({failedSentencesCount}个) - 消耗 {retryPointsNeeded} 点数
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 处理结果 */}
      {processedAssignments?.length > 0 && (
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
                  {processedAssignments?.map((assignment, index) => (
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


                {selectedAssignment.polishedSentences.map((polishedSentence, index) => (
                  <Card key={index} className={`p-4 ${polishedSentence.confidence === 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">句子 {index + 1}</span>
                        <div className="flex items-center gap-2">
                          {polishedSentence.confidence === 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              润色失败
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              润色成功
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            置信度: {Math.round((polishedSentence.confidence || 0) * 100)}%
                          </Badge>
                        </div>
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
            <li>• <strong>点数消耗</strong>：每个学生1.5点数，向上取整</li>
            <li>• <strong>质量保证</strong>：使用专业AI模型确保润色质量</li>
          </ul>
        </CardContent>
      </Card>

      {/* 示例效果展示 */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>示例效果</span>
            <Badge variant="outline" className="text-sm">5句</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 示例句子1 */}
            <div className="border-l-4 border-blue-400 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">句子 1</span>
                <Badge variant="default" className="bg-green-500 text-xs">优化完成</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">原句:</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded text-xs">
                    When she finished her passionate speech and bowed deeply on the stage, thunderous applause broke out and echoed in the auditorium for a long time.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">润色后:</span>
                  <p className="mt-1 p-2 bg-green-50 rounded text-green-800 text-xs">
                    After delivering her passionate speech and bowing deeply on the stage, thunderous applause erupted and echoed through the auditorium for minutes on end.
                  </p>
                </div>
              </div>
              <div className="text-xs text-blue-600 mt-2">
                <span className="font-medium">说明:</span> 优化了词汇表达，使用更准确的词汇
              </div>
            </div>

            {/* 示例句子2 */}
            <div className="border-l-4 border-blue-400 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">句子 2</span>
                <Badge variant="default" className="bg-green-500 text-xs">优化完成</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">原句:</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded text-xs">
                    With tears in my eyes, I lingered in the airport, because I knew that I didn't know when to see you again this time.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">润色后:</span>
                  <p className="mt-1 p-2 bg-green-50 rounded text-green-800 text-xs">
                    Eyes brimming with tears, I lingered at the airport, for I had no idea when I would see you again this time.
                  </p>
                </div>
              </div>
              <div className="text-xs text-blue-600 mt-2">
                <span className="font-medium">说明:</span> 优化了词汇表达，使用更准确的词汇
              </div>
            </div>

            {/* 示例句子3 */}
            <div className="border-l-4 border-blue-400 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">句子 3</span>
                <Badge variant="default" className="bg-green-500 text-xs">优化完成</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">原句:</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded text-xs">
                    At the thought of the final exam next week, I started to organize the study notes right away.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">润色后:</span>
                  <p className="mt-1 p-2 bg-green-50 rounded text-green-800 text-xs">
                    The moment I thought about next week's final exam, I immediately began organizing my study notes.
                  </p>
                </div>
              </div>
              <div className="text-xs text-blue-600 mt-2">
                <span className="font-medium">说明:</span> 优化了词汇表达，使用更准确的词汇
              </div>
            </div>

            {/* 示例句子4 */}
            <div className="border-l-4 border-blue-400 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">句子 4</span>
                <Badge variant="default" className="bg-green-500 text-xs">优化完成</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">原句:</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded text-xs">
                    Winning the first place in the competition, my heart filled with pride as I listened to the thunderous applause.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">润色后:</span>
                  <p className="mt-1 p-2 bg-green-50 rounded text-green-800 text-xs">
                    Having won first place in the competition, I felt my heart fill with pride as I listened to the thunderous applause.
                  </p>
                </div>
              </div>
              <div className="text-xs text-blue-600 mt-2">
                <span className="font-medium">说明:</span> 优化了词汇表达，使用更准确的词汇
              </div>
            </div>

            {/* 示例句子5 */}
            <div className="border-l-4 border-blue-400 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">句子 5</span>
                <Badge variant="default" className="bg-green-500 text-xs">优化完成</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">原句:</span>
                  <p className="mt-1 p-2 bg-gray-50 rounded text-xs">
                    The World - famous Golden Gate Bridge springs to mind when people talk about San Francisco.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">润色后:</span>
                  <p className="mt-1 p-2 bg-green-50 rounded text-green-800 text-xs">
                    When people talk about San Francisco, the world-famous Golden Gate Bridge immediately springs to mind.
                  </p>
                </div>
              </div>
              <div className="text-xs text-blue-600 mt-2">
                <span className="font-medium">说明:</span> 优化了词汇表达，使用更准确的词汇
              </div>
            </div>

            {/* 提示文字 */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              💡 以上为示例效果，实际润色结果会根据您的具体要求和句子内容进行调整
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};