/**
 * 智能文本排版工具
 * 用于英语作文的自然分段和格式化
 */

export interface TextFormattingOptions {
  preserveOriginalContent?: boolean; // 保持原文内容不变
  addParagraphSpacing?: boolean; // 添加段落间距
  naturalParagraphs?: boolean; // 自然分段
  fixCommonIssues?: boolean; // 修复常见问题
}

/**
 * 智能格式化英语作文文本
 * @param text 原始文本
 * @param options 格式化选项
 * @returns 格式化后的文本
 */
export function formatEssayText(text: string, options: TextFormattingOptions = {}): string {
  const {
    preserveOriginalContent = true,
    addParagraphSpacing = true,
    naturalParagraphs = true,
    fixCommonIssues = true
  } = options;

  let formattedText = text;

  // 1. 修复常见问题
  if (fixCommonIssues) {
    formattedText = fixCommonFormattingIssues(formattedText);
  }

  // 2. 自然分段
  if (naturalParagraphs) {
    formattedText = applyNaturalParagraphs(formattedText);
  }

  // 3. 添加段落间距
  if (addParagraphSpacing) {
    formattedText = addParagraphSpacingToText(formattedText);
  }

  return formattedText;
}

/**
 * 修复常见的格式问题
 */
function fixCommonFormattingIssues(text: string): string {
  let fixedText = text;

  // 修复多余空格
  fixedText = fixedText.replace(/\s+/g, ' ').trim();

  // 修复标点符号后的空格问题
  fixedText = fixedText.replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2'); // 句号+大写字母换行
  fixedText = fixedText.replace(/([,;])\s*([a-z])/g, '$1 $2'); // 逗号/分号后保持单空格

  // 修复引号问题
  fixedText = fixedText.replace(/"(\w)/g, '"$1'); // 开引号
  fixedText = fixedText.replace(/(\w)"/g, '$1"'); // 闭引号
  fixedText = fixedText.replace(/'/g, "'"); // 单引号统一

  // 修复括号空格问题
  fixedText = fixedText.replace(/\s*\(\s*/g, ' ('); // 左括号前加空格
  fixedText = fixedText.replace(/\s*\)\s*/g, ') '); // 右括号前加空格

  return fixedText;
}

/**
 * 应用自然分段规则
 */
function applyNaturalParagraphs(text: string): string {
  // 将文本按句子分割
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

  if (sentences.length === 0) return text;

  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();

    // 如果当前段落为空，开始新段落
    if (currentParagraph.length === 0) {
      currentParagraph.push(sentence);
      continue;
    }

    const lastSentence = currentParagraph[currentParagraph.length - 1];
    const currentSentenceLength = sentence.length;
    const paragraphLength = currentParagraph.join(' ').length;

    // 分段规则：
    // 1. 段落长度超过60个字符
    // 2. 当前句子以句号结尾且下个句子以大写开头
    // 3. 当前句子较短（少于10个词）且下个句子较长
    const shouldStartNewParagraph =
      paragraphLength > 60 ||
      (lastSentence.endsWith('.') && i < sentences.length - 1 &&
       sentences[i + 1].trim()[0] === sentences[i + 1].trim()[0].toUpperCase()) ||
      (lastSentence.split(' ').length < 10 && currentSentenceLength > 30);

    if (shouldStartNewParagraph) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [sentence];
    } else {
      currentParagraph.push(sentence);
    }
  }

  // 添加最后一个段落
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }

  return paragraphs.join('\n\n');
}

/**
 * 添加段落间距和格式化
 */
function addParagraphSpacingToText(text: string): string {
  // 确保段落之间有两个换行
  let spacedText = text.replace(/\n{1,2}/g, '\n\n');

  // 修复段落首行缩进（可选）
  // 这里选择不添加缩进，保持原格式
  // const paragraphs = spacedText.split('\n\n');
  // return paragraphs.map(p => p.trim()).join('\n\n');

  return spacedText;
}

/**
 * 智能检测和分段文本
 * 专门针对英语作文的智能分段
 */
export function intelligentParagraphFormatting(text: string): string {
  if (!text || text.trim().length === 0) return text;

  // 清理文本
  let cleanedText = text.trim();

  // 1. 处理已有明显分段的情况
  const existingParagraphs = cleanedText.split(/\n{2,}/);
  if (existingParagraphs.length > 1) {
    // 每个段落内部再次处理
    return existingParagraphs.map(paragraph => formatEssayText(paragraph)).join('\n\n');
  }

  // 2. 没有明显分段的情况，智能分段
  return formatEssayText(cleanedText);
}

/**
 * 检查文本是否需要格式化
 */
export function needsFormatting(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // 如果文本已经格式化良好（包含合理的换行和段落），则不需要格式化
  const lines = text.split('\n');
  const hasReasonableLineBreaks = lines.some(line => line.trim().length > 0);

  // 如果文本很短且已经合理分段，则不需要格式化
  if (text.length < 100 && hasReasonableLineBreaks) {
    return false;
  }

  // 检查OCR常见的格式问题
  const formattingIssues = [
    // 明显的OCR换行问题
    text.length > 50 && /\n.{1,10}\n/.test(text), // 过短的行（断开的单词）
    /[a-zA-Z]\n[a-zA-Z]/.test(text), // 单词中间换行
    /\n\s{2,}/.test(text), // 连续空行过多
    /\s*[\w.,!?;:]\s*\n/.test(text), // 标点后直接换行（通常不应该）

    // 明显需要格式化的情况
    text.length > 200 && lines.length < 3, // 长文本但分段过少
    /\n\s*\n\s*\n/.test(text), // 多个连续空行
    text.replace(/\s/g, '').length > 100 && !text.includes('\n'), // 长文本无任何换行

    // OCR导致的断开单词情况
    /\b[a-z]+\n[a-z]+\b/i.test(text), // 小写单词断开
    /\b[A-Z]+\n[A-Z]+\b/.test(text), // 大写单词断开
    /ing\n.*ing/i.test(text), // -ing词断开

    // 需要处理的多余空格
    /  +/.test(text), // 连续多个空格
    /^ +/.test(text), // 行首空格
    / +$/.test(text), // 行尾空格

    // 明显的格式错误
    text.includes(',,') || text.includes('..') || text.includes(';;'), // 重复标点
  ];

  return formattingIssues.some(Boolean);
}

/**
 * 智能格式化建议
 */
export function getFormattingSuggestions(text: string): string[] {
  const suggestions: string[] = [];

  if (!text || text.trim().length === 0) {
    return ['文本为空'];
  }

  // 检查各种问题并提供建议
  if (text.includes('  ')) {
    suggestions.push('发现多余空格，建议进行清理');
  }

  if (/[.!?][a-z]/.test(text)) {
    suggestions.push('发现标点符号后无大写字母，建议添加分段');
  }

  if (text.length > 200 && !text.includes('\n')) {
    suggestions.push('长文本无分段，建议进行自然分段');
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 10) {
    suggestions.push('发现多个句子，建议分段以提高可读性');
  }

  return suggestions;
}

/**
 * 预览格式化效果
 */
export function previewFormatting(text: string): {
  original: string;
  formatted: string;
  suggestions: string[];
  improvements: string[];
} {
  const suggestions = getFormattingSuggestions(text);
  const formatted = intelligentParagraphFormatting(text);

  const improvements: string[] = [];

  // 计算改进效果
  const originalParagraphs = text.split(/\n+/).filter(p => p.trim()).length;
  const formattedParagraphs = formatted.split('\n\n').filter(p => p.trim()).length;

  if (formattedParagraphs > originalParagraphs) {
    improvements.push(`分段数量: ${originalParagraphs} → ${formattedParagraphs}`);
  }

  return {
    original: text,
    formatted,
    suggestions,
    improvements
  };
}