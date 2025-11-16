/**
 * 精确统计英文单词数量的工具函数
 * 使用代码统计而不是AI统计，确保准确性
 */

/**
 * 统计英文文本的单词数量
 * @param text 要统计的英文文本
 * @returns 单词数量
 */
export function countEnglishWords(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // 清理文本：移除多余的空白字符
  const cleanedText = text.trim();
  if (!cleanedText) {
    return 0;
  }

  // 使用正则表达式匹配英文单词
  // 匹配规则：连续的字母字符（可能包含连字符和撇号）
  const words = cleanedText.match(/\b[a-zA-Z]+(?:['-][a-zA-Z]+)*\b/g);

  if (!words) {
    return 0;
  }

  // 过滤掉可能的非单词内容
  const validWords = words.filter(word => {
    // 至少包含2个字母的单词才被认为是有效单词
    return word.length >= 2 && /[a-zA-Z]{2,}/.test(word);
  });

  return validWords.length;
}

/**
 * 获取单词统计的详细信息
 * @param text 要分析的文本
 * @returns 详细统计信息
 */
export function getWordCountStats(text: string) {
  const wordCount = countEnglishWords(text);

  // 判断字数等级
  let level: 'excellent' | 'good' | 'insufficient' = 'insufficient';
  let status = '';
  let statusColor = '';

  if (wordCount >= 180) {
    level = 'excellent';
    status = '优秀';
    statusColor = 'text-green-600';
  } else if (wordCount >= 150) {
    level = 'good';
    status = '达标';
    statusColor = 'text-blue-600';
  } else {
    level = 'insufficient';
    status = '不达标';
    statusColor = 'text-red-600';
  }

  return {
    wordCount,
    level,
    status,
    statusColor,
    isSufficient: wordCount >= 150,
    needsPenalty: wordCount < 150,
    penaltyAmount: wordCount < 150 ? 5 : 0
  };
}

/**
 * 更新OCR结果中的词数统计
 * @param ocrResult OCR结果对象
 * @returns 更新后的OCR结果
 */
export function updateOCRResultWordCount(ocrResult: any) {
  const effectiveContent = ocrResult.editedText || ocrResult.content;
  const wordCountStats = getWordCountStats(effectiveContent);

  return {
    ...ocrResult,
    wordCount: wordCountStats.wordCount,
    wordCountStats
  };
}