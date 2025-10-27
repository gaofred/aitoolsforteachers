"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { Label } from "@/components/ui/label"; // 暂时移除
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Copy, Lightbulb } from "lucide-react";
import type { Requirement } from "../types";

interface RequirementInputProps {
  requirements: Requirement[];
  onRequirementsChange: (requirements: Requirement[]) => void;
}

// 常用语法结构模板
const GRAMMAR_TEMPLATES = [
  { value: "relative_clause", label: "定语从句", example: "which/that/who/whom/whose" },
  { value: "adverbial_clause", label: "状语从句", example: "when/while/because/if" },
  { value: "noun_clause", label: "名词性从句", example: "that/what/whether/how" },
  { value: "participle", label: "分词结构", example: "V-ing/V-ed2" },
  { value: "infinitive", label: "不定式", example: "to do" },
  { value: "passive_voice", label: "被动语态", example: "be done" },
  { value: "present_perfect", label: "现在完成时", example: "have/has done" },
  { value: "past_perfect", label: "过去完成时", example: "had done" },
  { value: "modal_verbs", label: "情态动词", example: "can/may/must/should" },
  { value: "subjunctive", label: "虚拟语气", example: "wish/if only" }
];

// 常用词汇类型
const WORD_TEMPLATES = [
  { value: "transition", label: "过渡词", examples: "however, therefore, moreover, in addition" },
  { value: "academic", label: "学术词汇", examples: "analyze, demonstrate, establish, significant" },
  { value: "descriptive", label: "描述性词汇", examples: "magnificent, spectacular, remarkable, extraordinary" },
  { value: "connective", label: "连接词", examples: "furthermore, consequently, nevertheless, meanwhile" },
  { value: "advanced", label: "高级词汇", examples: "accomplish, acquire, comprehend, substantial" }
];

export const RequirementInput: React.FC<RequirementInputProps> = ({
  requirements,
  onRequirementsChange
}) => {
  const [newRequirement, setNewRequirement] = useState({
    sentenceIndex: 1,
    requiredWords: [] as string[],
    requiredStructures: [] as string[],
    notes: ""
  });
  const [newWord, setNewWord] = useState("");
  const [newStructure, setNewStructure] = useState("");

  // 添加要求
  const addRequirement = () => {
    if (!newRequirement.requiredWords.length && !newRequirement.requiredStructures.length && !newRequirement.notes.trim()) {
      return;
    }

    const requirement: Requirement = {
      id: `requirement_${Date.now()}_${Math.random()}`,
      sentenceIndex: newRequirement.sentenceIndex,
      requiredWords: [...newRequirement.requiredWords],
      requiredStructures: [...newRequirement.requiredStructures],
      notes: newRequirement.notes.trim()
    };

    // 检查是否已存在相同句子索引的要求
    const existingIndex = requirements.findIndex(r => r.sentenceIndex === requirement.sentenceIndex);
    let updatedRequirements;

    if (existingIndex >= 0) {
      // 替换现有要求
      updatedRequirements = [...requirements];
      updatedRequirements[existingIndex] = requirement;
    } else {
      // 添加新要求
      updatedRequirements = [...requirements, requirement].sort((a, b) => a.sentenceIndex - b.sentenceIndex);
    }

    onRequirementsChange(updatedRequirements);

    // 重置表单
    setNewRequirement({
      sentenceIndex: newRequirement.sentenceIndex + 1,
      requiredWords: [],
      requiredStructures: [],
      notes: ""
    });
  };

  // 删除要求
  const removeRequirement = (requirementId: string) => {
    onRequirementsChange(requirements.filter(r => r.id !== requirementId));
  };

  // 添加词汇
  const addWord = () => {
    if (!newWord.trim()) return;
    setNewRequirement({
      ...newRequirement,
      requiredWords: [...newRequirement.requiredWords, newWord.trim()]
    });
    setNewWord("");
  };

  // 删除词汇
  const removeWord = (word: string) => {
    setNewRequirement({
      ...newRequirement,
      requiredWords: newRequirement.requiredWords.filter(w => w !== word)
    });
  };

  // 添加结构
  const addStructure = (value: string) => {
    if (!value) return;
    const template = GRAMMAR_TEMPLATES.find(t => t.value === value);
    if (template && !newRequirement.requiredStructures.includes(value)) {
      setNewRequirement({
        ...newRequirement,
        requiredStructures: [...newRequirement.requiredStructures, value]
      });
    }
  };

  // 删除结构
  const removeStructure = (structure: string) => {
    setNewRequirement({
      ...newRequirement,
      requiredStructures: newRequirement.requiredStructures.filter(s => s !== structure)
    });
  };

  // 添加模板词汇
  const addTemplateWords = (template: typeof WORD_TEMPLATES[0]) => {
    const words = template.examples.split(',').map(w => w.trim());
    setNewRequirement({
      ...newRequirement,
      requiredWords: [...new Set([...newRequirement.requiredWords, ...words])]
    });
  };

  // 复制要求
  const duplicateRequirement = (requirement: Requirement) => {
    const newReq: Requirement = {
      ...requirement,
      id: `requirement_${Date.now()}_${Math.random()}`,
      sentenceIndex: Math.max(...requirements.map(r => r.sentenceIndex), 0) + 1
    };
    onRequirementsChange([...requirements, newReq].sort((a, b) => a.sentenceIndex - b.sentenceIndex));
  };

  // 添加通用要求（应用到所有句子）
  const addGeneralRequirement = () => {
    const generalReq: Requirement = {
      id: `requirement_general_${Date.now()}`,
      sentenceIndex: 0, // 0表示通用要求
      requiredWords: ["however", "therefore", "moreover"],
      requiredStructures: ["relative_clause", "adverbial_clause"],
      notes: "通用要求：使用连接词，包含定语从句和状语从句"
    };
    onRequirementsChange([...requirements, generalReq]);
  };

  return (
    <div className="space-y-6">
      {/* 添加要求表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>设置润色要求</span>
            <Button
              variant="outline"
              size="sm"
              onClick={addGeneralRequirement}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              添加通用要求
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 句子索引 */}
            <div>
              <label htmlFor="sentenceIndex" className="text-sm font-medium text-gray-700">句子位置</label>
              <Select
                value={newRequirement.sentenceIndex.toString()}
                onValueChange={(value) => setNewRequirement({
                  ...newRequirement,
                  sentenceIndex: parseInt(value)
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择句子位置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">通用要求（所有句子）</SelectItem>
                  <SelectItem value="1">第1句</SelectItem>
                  <SelectItem value="2">第2句</SelectItem>
                  <SelectItem value="3">第3句</SelectItem>
                  <SelectItem value="4">第4句</SelectItem>
                  <SelectItem value="5">第5句</SelectItem>
                  <SelectItem value="6">第6句</SelectItem>
                  <SelectItem value="7">第7句</SelectItem>
                  <SelectItem value="8">第8句</SelectItem>
                  <SelectItem value="9">第9句</SelectItem>
                  <SelectItem value="10">第10句</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 必须使用的词汇 */}
            <div>
              <span className="text-sm font-medium text-gray-700">必须使用的词汇</span>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="输入词汇"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWord()}
                  className="flex-1"
                />
                <Button onClick={addWord} disabled={!newWord.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* 已添加的词汇 */}
              {newRequirement.requiredWords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newRequirement.requiredWords.map((word, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {word}
                      <button
                        onClick={() => removeWord(word)}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* 词汇模板 */}
              <div className="mt-2">
                <span className="text-xs text-gray-600">快速添加：</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {WORD_TEMPLATES.map((template) => (
                    <Button
                      key={template.value}
                      variant="outline"
                      size="sm"
                      onClick={() => addTemplateWords(template)}
                      className="text-xs h-6 px-2"
                      title={template.examples}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 必须使用的语法结构 */}
          <div>
            <span className="text-sm font-medium text-gray-700">必须使用的语法结构</span>
            <Select onValueChange={addStructure} value="">
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择语法结构" />
              </SelectTrigger>
              <SelectContent>
                {GRAMMAR_TEMPLATES.map((template) => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label} ({template.example})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 已添加的结构 */}
            {newRequirement.requiredStructures.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {newRequirement.requiredStructures.map((structure, index) => {
                  const template = GRAMMAR_TEMPLATES.find(t => t.value === structure);
                  return (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {template?.label || structure}
                      <button
                        onClick={() => removeStructure(structure)}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* 额外要求 */}
          <div>
            <label htmlFor="notes" className="text-sm font-medium text-gray-700">额外要求说明</label>
            <Textarea
              id="notes"
              placeholder="例如：保持原意，使用更高级的词汇，确保语法正确等..."
              value={newRequirement.notes}
              onChange={(e) => setNewRequirement({
                ...newRequirement,
                notes: e.target.value
              })}
              className="mt-1"
              rows={3}
            />
          </div>

          <Button onClick={addRequirement} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            添加润色要求
          </Button>
        </CardContent>
      </Card>

      {/* 已添加的要求列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>润色要求列表</span>
            <Badge variant="secondary">
              {requirements.length} 个要求
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requirements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>暂无润色要求</p>
              <p className="text-sm mt-2">请添加词汇、语法结构或特定要求</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {requirements.map((requirement) => (
                <div
                  key={requirement.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {requirement.sentenceIndex === 0 ? "通用" : `第${requirement.sentenceIndex}句`}
                      </Badge>
                      <h4 className="font-medium">润色要求</h4>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateRequirement(requirement)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRequirement(requirement.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {requirement.requiredWords.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">必须词汇：</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {requirement.requiredWords.map((word, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {requirement.requiredStructures.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">语法结构：</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {requirement.requiredStructures.map((structure, index) => {
                            const template = GRAMMAR_TEMPLATES.find(t => t.value === structure);
                            return (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {template?.label || structure}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {requirement.notes && (
                      <div>
                        <span className="font-medium text-gray-700">额外要求：</span>
                        <p className="text-gray-600 mt-1">{requirement.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2">使用说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>句子位置</strong>：可以针对特定句子设置要求，或设置通用要求</li>
            <li>• <strong>必须词汇</strong>：AI润色时必须包含的单词或短语</li>
            <li>• <strong>语法结构</strong>：必须使用的语法结构（如定语从句、状语从句等）</li>
            <li>• <strong>额外要求</strong>：其他具体的润色要求和限制</li>
            <li>• <strong>通用要求</strong>：应用于所有句子的润色规则</li>
            <li>• <strong>模板功能</strong>：快速添加常用的词汇和语法结构</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};