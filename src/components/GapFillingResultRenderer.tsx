import React from 'react';

interface Question {
  number: number;
  position: string;
  answer: string;
  grammarPoint: string;
  solution: string;
  knowledgeExtension: string;
  commonErrors: string;
}

interface ParsedResult {
  questions: Question[];
  summary?: string;
}

interface GapFillingResultRendererProps {
  content: string;
}

export const GapFillingResultRenderer: React.FC<GapFillingResultRendererProps> = ({ content }) => {
  const parseResult = (text: string): ParsedResult => {
    const questions: Question[] = [];

    // 首先清理文本，移除所有Markdown格式
    const cleanText = text
      .replace(/^#{1,6}\s+/gm, '') // 移除所有#标题
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除**加粗**
      .replace(/\*([^*]+)\*/g, '$1') // 移除*斜体*
      .replace(/`([^`]+)`/g, '$1') // 移除`代码`
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接
      .replace(/^\s*[-*+]\s+/gm, '') // 移除列表符号
      .replace(/^\s*\d+\.\s+/gm, '') // 移除数字列表
      .replace(/\n{3,}/g, '\n\n') // 合并多个换行
      .trim();

    // 尝试解析标准格式（清理后）
    const questionMatches = cleanText.match(/第(\d+)题[\s\S]*?(?=第\d+题|$)/g);

    if (questionMatches && questionMatches.length > 0) {
      questionMatches.forEach((match, index) => {
        const questionNumber = index + 1;

        // 提取各个部分
        const positionMatch = match.match(/空格位置[：:]\s*([^\n]+)/);
        const answerMatch = match.match(/正确答案[：:]\s*([^\n]+)/);
        const grammarMatch = match.match(/语法考点[：:]\s*([^\n]+)/);
        const solutionMatch = match.match(/解题思路[：:]\s*([^\n]+)/);
        const knowledgeMatch = match.match(/知识点扩展[：:]\s*([^\n]+)/);
        const errorMatch = match.match(/易错点提醒[：:]\s*([^\n]+)/);

        questions.push({
          number: questionNumber,
          position: positionMatch?.[1]?.trim() || `第${questionNumber}个空格`,
          answer: answerMatch?.[1]?.trim() || '待解析',
          grammarPoint: grammarMatch?.[1]?.trim() || '待解析',
          solution: solutionMatch?.[1]?.trim() || '待解析',
          knowledgeExtension: knowledgeMatch?.[1]?.trim() || '待解析',
          commonErrors: errorMatch?.[1]?.trim() || '待解析'
        });
      });
    } else {
      // 如果没有标准格式，尝试简单分割
      const sections = cleanText.split(/\n\s*\n+/).filter(section => section.trim());
      sections.forEach((section, index) => {
        questions.push({
          number: index + 1,
          position: `第${index + 1}个空格`,
          answer: extractContent(section, ['正确答案', '答案', 'Answer']),
          grammarPoint: extractContent(section, ['语法考点', '考点', '考点分析']),
          solution: extractContent(section, ['解题思路', '解题', '思路']),
          knowledgeExtension: extractContent(section, ['知识点扩展', '知识点', '扩展']),
          commonErrors: extractContent(section, ['易错点', '错误', '注意事项'])
        });
      });
    }

    return { questions };
  };

  const extractContent = (section: string, keywords: string[]): string => {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:：]?\\s*([^\n]+)`, 'i');
      const match = section.match(regex);
      if (match) {
        return match[1].replace(/\*\*/g, '').trim();
      }
    }
    return '待解析';
  };

  const { questions } = parseResult(content);

  if (questions.length === 0) {
    // 如果无法解析，清理后显示内容
    const cleanContent = content
      .replace(/^#{1,6}\s+/gm, '') // 移除所有#标题
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除**加粗**
      .replace(/\*([^*]+)\*/g, '$1') // 移除*斜体*
      .replace(/`([^`]+)`/g, '$1') // 移除`代码`
      .replace(/\n{3,}/g, '\n\n') // 合并多个换行
      .trim();

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800 mb-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">解析内容</span>
        </div>
        <div className="text-gray-700 leading-relaxed space-y-2">
          {cleanContent.split('\n').map((paragraph, index) => (
            paragraph.trim() && (
              <p key={index} className="mb-2">
                {paragraph}
              </p>
            )
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 总览信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-blue-800">解析总览</h3>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            共 {questions.length} 题
          </span>
        </div>
        <p className="text-sm text-blue-700 mt-2">
          使用 Gemini 2.5 Pro 模型深度分析，包含语法考点、解题思路、知识点扩展和易错点提醒
        </p>
      </div>

      {/* 题目解析 */}
      {questions.map((question) => (
        <div key={question.number} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {/* 题目标题 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                  {question.number}
                </span>
                第 {question.number} 题
              </h3>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                  答案: {question.answer}
                </span>
              </div>
            </div>
            {question.position && question.position !== `第${question.number}个空格` && (
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">位置:</span> {question.position}
              </p>
            )}
          </div>

          {/* 详细解析 */}
          <div className="p-4 space-y-4">
            {/* 语法考点 */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-1a1 1 0 100-2h1a4 4 0 014 4v6a4 4 0 01-4 4H6a4 4 0 01-4-4V7a4 4 0 014-4z" clipRule="evenodd" />
                </svg>
                语法考点
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {question.grammarPoint}
              </p>
            </div>

            {/* 解题思路 */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                解题思路
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {question.solution}
              </p>
            </div>

            {/* 知识点扩展 */}
            <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
                知识点扩展
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {question.knowledgeExtension}
              </p>
            </div>

            {/* 易错点提醒 */}
            <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                易错点提醒
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                {question.commonErrors}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* 使用建议 */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
        <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          使用建议
        </h3>
        <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
          <li>仔细阅读每个语法考点的详细解释，理解其应用场景</li>
          <li>重点关注解题思路部分，掌握语法填空的解题方法</li>
          <li>通过知识点扩展学习更多相关的语法规则</li>
          <li>特别注意易错点提醒，避免在类似题目中犯错</li>
          <li>建议将这些解析内容整理成笔记，便于复习和查阅</li>
        </ul>
      </div>
    </div>
  );
};