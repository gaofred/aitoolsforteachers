"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { ContinuationWritingBatchTask } from "../types";

interface PlotAnalysisInputProps {
  task: ContinuationWritingBatchTask | null;
  setTask: (task: ContinuationWritingBatchTask | null) => void;
  onNext: () => void;
  onPrev: () => void;
}

const PlotAnalysisInput: React.FC<PlotAnalysisInputProps> = ({
  task,
  setTask,
  onNext,
  onPrev,
}) => {
  const [plotAnalysis, setPlotAnalysis] = useState(task?.plotAnalysis || '');
  const [isConfirmed, setIsConfirmed] = useState(!!task?.plotAnalysis);

  // 处理确认
  const handleConfirm = () => {
    if (!plotAnalysis.trim()) {
      alert('请输入情节走向分析内容');
      return;
    }

    if (task) {
      setTask({
        ...task,
        plotAnalysis: plotAnalysis.trim()
      });
    }
    setIsConfirmed(true);
  };

  // 处理重新编辑
  const handleEdit = () => {
    setIsConfirmed(false);
  };

  // 处理跳过
  const handleSkip = () => {
    if (task) {
      setTask({
        ...task,
        plotAnalysis: ''
      });
    }
    setIsConfirmed(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">情节走向分析输入</h2>
        <p className="text-gray-600 text-sm">
          请输入本次读后续写作业的情节走向分析，这将帮助AI更准确地批改学生的续写内容。
          <br />
          <span className="text-blue-600 font-medium">
            提示：可以描述故事的主要情节线、人物关系、情感走向、可能的结局方向等。
          </span>
        </p>
      </div>

      {!isConfirmed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              情节走向分析内容
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                情节走向分析内容
              </label>
              <Textarea
                value={plotAnalysis}
                onChange={(e) => setPlotAnalysis(e.target.value)}
                placeholder="⚠️ 默认不用填写！AI通常能正确判断情节走向。
如果确实需要填写，请简洁描述关键情节，不要太详细：

参考示例：
第一段：作者接受邀请，开始听孩子们讲故事
第二段：作者与孩子们互动愉快，度过了一段愉快旅程

重要提醒：写得太细容易导致学生被判偏题！"
                className="min-h-[300px] text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                maxLength={2000}
              />
              <div className="text-xs text-gray-500 text-right">
                {plotAnalysis.length}/2000
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h4 className="text-sm font-medium text-red-800">⚠️ 重要提醒</h4>
              </div>
              <p className="text-sm text-red-700 leading-relaxed">
                <strong>注意，默认不要写！</strong>AI一般可以正确判断情节走向。
              </p>
              <p className="text-sm text-red-700 leading-relaxed mt-2">
                <strong>这里的逻辑是：</strong>如果不按照"情节走向分析内容"来写，就视为偏题。
              </p>
              <p className="text-sm text-red-700 leading-relaxed mt-2">
                <strong>所以默认不用写，如果写，也不要写的太细。</strong>如果写的太细，很容易会判为偏题处理。
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-800 mb-2">📝 参考示例：</h4>
              <div className="bg-white rounded border border-amber-300 p-3 text-sm text-amber-900">
                <p className="font-medium mb-2">比较合适的写法（不要太细）：</p>
                <ul className="space-y-1">
                  <li>第一段：作者接受邀请，开始听孩子们讲故事</li>
                  <li>第二段：作者与孩子们互动愉快，度过了一段愉快旅程</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">填写建议：</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 如果确实需要填写，请确保情节走向合理且不过于详细</li>
                <li>• 重点描述关键的情节转折点，不要涵盖过多细节</li>
                <li>• 给学生留出合理的创作空间</li>
                <li>• 内容建议简洁明了，控制在50-200字之间</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleConfirm}
                disabled={!plotAnalysis.trim()}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                确认并继续
              </Button>
              <Button
                variant="outline"
                onClick={handleSkip}
              >
                跳过此步骤
              </Button>
              <Button
                variant="outline"
                onClick={onPrev}
              >
                上一步
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              情节走向分析已确认
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task?.plotAnalysis ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">情节走向分析内容：</h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {task.plotAnalysis}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  您选择跳过此步骤，AI将基于作文内容进行批改，可能影响批改的准确性。
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={onNext} className="px-8">
                下一步：AI批改
              </Button>
              <Button
                variant="outline"
                onClick={handleEdit}
              >
                重新编辑
              </Button>
              <Button
                variant="outline"
                onClick={onPrev}
              >
                上一步
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlotAnalysisInput;