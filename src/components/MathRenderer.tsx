"use client";

import { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// 将 katex 添加到全局作用域，方便调试
if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

interface MathRendererProps {
  children: React.ReactNode;
  className?: string;
}

// 验证是否真的是数学公式
function isValidMathFormula(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const trimmed = text.trim();

  // 明显排除的情况：
  // 1. 单个字母（如 A, B, C, x, y）
  if (/^[a-zA-Z]$/.test(trimmed)) return false;

  // 2. 两个字母（如 AA, BB, AB, CD）
  if (/^[a-zA-Z]{2}$/.test(trimmed)) return false;

  // 3. 单个数字
  if (/^\d$/.test(trimmed)) return false;

  // 4. 常见缩写和非数学词汇
  const nonMathWords = ['AA', 'BB', 'CC', 'DD', 'AB', 'AD', 'BC', 'CD', 'ABC', 'BCD', 'ACD', 'ABD'];
  if (nonMathWords.includes(trimmed)) return false;

  // 明确包含的数学元素（这些直接认为是数学公式）
  const strongMathPatterns = [
    /\\[a-zA-Z]+/,           // LaTeX 命令, 如 \sqrt, \frac, \alpha
    /\^/,                    // 指数
    /_/,                     // 下标
    /{[^}]*}/,               // 大括号内容
    /\d+\/\d+/,              // 分数
    /√/,                     // 根号
    /[∑∏∫]/,                // 求和/积分
    /[πθαβγδλμσφω]/,         // 希腊字母
    /[=≠≈≤≥<>≤≥]/,          // 比较符号
    /[±×÷]/,                // 运算符号
    /\(\s*[^)]+\s*[=+\-*/]\s*[^)]+\s*\)/, // 括号内的运算
  ];

  // 如果包含强数学模式，直接认为是有效公式
  if (strongMathPatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }

  // 数字和字母的混合模式（包含运算符的）
  const mixedWithOperators = /\d+[a-zA-Z]|[a-zA-Z]+\d|[a-zA-Z]+[+\-*/][a-zA-Z0-9]+/.test(trimmed);
  if (mixedWithOperators) {
    return true;
  }

  // 多个字母的组合（可能是变量名）
  const multiLetterVars = /^[a-zA-Z]{3,}(\s*[+\-*/]\s*[a-zA-Z0-9]+)+/.test(trimmed);
  if (multiLetterVars) {
    return true;
  }

  // 如果包含等号且等号两边都有内容，可能是等式
  if (/=.+=/.test(trimmed) && trimmed.length > 3) {
    return true;
  }

  // 如果是长字符串（超过5个字符）且包含字母和数字，可能是复杂表达式
  if (trimmed.length > 5 && /[a-zA-Z]/.test(trimmed) && /\d/.test(trimmed)) {
    return true;
  }

  // 其他情况都认为是普通文本
  return false;
}

// React专用的数学公式渲染器 - 使用原生KaTeX
export function MathRenderer({ children, className }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const container = containerRef.current;

    // 清空容器
    container.innerHTML = '';

    // 获取内容
    const content = typeof children === 'string' ? children : String(children);

    // 首先处理跨多行的块级公式 $$...$$
    let processedContent = content.replace(/\$\$\s*\n([\s\S]*?)\n\$\$/g, (match, mathContent) => {
      // 清理数学公式内容，移除多余的空格和换行
      const cleanedMath = mathContent.replace(/\s+/g, ' ').trim();
      return `$$${cleanedMath}$$`;
    });

    // 处理另一种格式：$$ 开头换行 + 内容 + $$ 换行
    processedContent = processedContent.replace(/\$\$\s*\n([^$]*?)\s*\$\$/g, (match, mathContent) => {
      const cleanedMath = mathContent.replace(/\s+/g, ' ').trim();
      return `$$${cleanedMath}$$`;
    });

    // 处理 $$ 内容 $$ 之间的多余换行
    processedContent = processedContent.replace(/\$\$([^$]*?)\$\$/g, (match, mathContent) => {
      const cleanedMath = mathContent.replace(/\s+/g, ' ').trim();
      return `$$${cleanedMath}$$`;
    });

    // 分割内容为行，保持换行
    const lines = processedContent.split('\n');

    lines.forEach((line, lineIndex) => {
      if (!line.trim()) {
        // 空行
        const br = document.createElement('br');
        container.appendChild(br);
        return;
      }

      // 处理每一行中的数学公式
      const parts = line.split(/(\$\$[^$]+\$\$|\$[^$]+\$|\\\([^\\\n]+\\\))/g);

      const lineContainer = document.createElement('div');
      lineContainer.className = 'mb-2';

      parts.forEach((part) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // 块级公式
          const math = part.slice(2, -2).trim();

          // 验证是否真的包含数学内容
          if (isValidMathFormula(math)) {
            const div = document.createElement('div');
            div.className = 'my-2 flex justify-center';

            try {
              div.innerHTML = katex.renderToString(math, {
                displayMode: true,
                throwOnError: false
              });
              console.log('✅ 块级公式渲染成功:', math);
            } catch (error) {
              console.error('❌ 块级公式渲染失败:', math, error);
              div.innerHTML = `<span class="text-red-500">数学公式错误: ${math}</span>`;
            }

            container.appendChild(div);
          } else {
            // 不是有效的数学公式，当作普通文本处理
            console.log('🚫 块级公式被过滤:', math);
            const span = document.createElement('span');
            span.textContent = `$$${math}$$`;
            lineContainer.appendChild(span);
          }
        } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          // 行内公式
          const math = part.slice(1, -1).trim();

          // 验证是否真的包含数学内容
          if (isValidMathFormula(math)) {
            const span = document.createElement('span');

            try {
              span.innerHTML = katex.renderToString(math, {
                displayMode: false,
                throwOnError: false
              });
              console.log('✅ 行内公式渲染成功:', math);
            } catch (error) {
              console.error('❌ 行内公式渲染失败:', math, error);
              span.innerHTML = `<span class="text-red-500">数学公式错误: ${math}</span>`;
            }

            lineContainer.appendChild(span);
          } else {
            // 不是有效的数学公式，当作普通文本处理
            console.log('🚫 行内公式被过滤:', math);
            const span = document.createElement('span');
            span.textContent = `$${math}$`;
            lineContainer.appendChild(span);
          }
        } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
          // LaTeX 行内公式
          const math = part.slice(2, -2).trim();

          console.log('🔍 发现LaTeX公式:', math, '有效:', isValidMathFormula(math));

          // 验证是否真的包含数学内容
          if (isValidMathFormula(math)) {
            const span = document.createElement('span');

            try {
              span.innerHTML = katex.renderToString(math, {
                displayMode: false,
                throwOnError: false
              });
              console.log('✅ LaTeX公式渲染成功:', math);
            } catch (error) {
              console.error('❌ LaTeX公式渲染失败:', math, error);
              span.innerHTML = `<span class="text-red-500">数学公式错误: ${math}</span>`;
            }

            lineContainer.appendChild(span);
          } else {
            // 不是有效的数学公式，当作普通文本处理
            console.log('🚫 LaTeX公式被过滤:', math);
            const span = document.createElement('span');
            span.textContent = `\\(${math}\\)`;
            lineContainer.appendChild(span);
          }
        } else if (part.trim()) {
          // 普通文本
          const span = document.createElement('span');
          span.textContent = part;
          lineContainer.appendChild(span);
        }
      });

      if (lineContainer.children.length > 0) {
        container.appendChild(lineContainer);
      }
    });

  }, [children, isClient]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: '20px' }}
    />
  );
}

// 简化的行内数学公式组件
export function InlineMathComponent({ formula, className }: { formula: string; className?: string }) {
  try {
    const renderedMath = katex.renderToString(formula, {
      displayMode: false,
      throwOnError: false,
      errorColor: '#ff0000'
    });
    return <span className={className} dangerouslySetInnerHTML={{ __html: renderedMath }} />;
  } catch (error) {
    return <span className={`text-red-500 ${className || ''}`}>数学公式错误: {formula}</span>;
  }
}

// 简化的块级数学公式组件
export function BlockMathComponent({ formula, className }: { formula: string; className?: string }) {
  try {
    const renderedMath = katex.renderToString(formula, {
      displayMode: true,
      throwOnError: false,
      errorColor: '#ff0000'
    });
    return (
      <div className={`my-4 flex justify-center ${className || ''}`} dangerouslySetInnerHTML={{ __html: renderedMath }} />
    );
  } catch (error) {
    return <div className={`my-4 text-red-500 ${className || ''}`}>数学公式错误: {formula}</div>;
  }
}

// 处理混合文本和数学公式的组件
export function MathText({ text, className }: { text: string; className?: string }) {
  return <MathRenderer className={className}>{text}</MathRenderer>;
}

export default MathRenderer;