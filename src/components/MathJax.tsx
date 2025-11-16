"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

interface MathJaxRendererProps {
  children: React.ReactNode;
  className?: string;
}

// MathJax渲染器组件
export function MathJaxRenderer({ children, className }: MathJaxRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);

  const renderMath = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).MathJax && containerRef.current) {
      console.log('🔧 开始渲染MathJax公式...');

      try {
        const mathjax = (window as any).MathJax;

        // 调试：输出MathJax对象的结构
        console.log('🔍 MathJax对象结构:', {
          hasTypeset: !!mathjax.typeset,
          hasTypesetPromise: !!mathjax.typesetPromise,
          hasStartup: !!mathjax.startup,
          hasDocument: !!mathjax.document,
          keys: Object.keys(mathjax)
        });

        // MathJax 3的正确API
        if (mathjax.document && mathjax.document.findMath) {
          console.log('✅ 使用MathJax 3 document API渲染');

          // 查找元素中的数学公式
          const mathElements = mathjax.document.findMath([containerRef.current]);
          console.log('📊 找到数学元素:', mathElements.length);

          // 编译数学公式
          if (mathElements.length > 0) {
            mathjax.document.compile(mathElements);
            mathjax.document.typeset(mathElements);
            console.log('✅ MathJax公式渲染完成');
            setIsRendered(true);
          } else {
            console.log('📝 未找到LaTeX公式，直接标记为已渲染');
            setIsRendered(true);
          }
        } else if (mathjax.typesetPromise) {
          console.log('✅ 使用typesetPromise渲染');
          mathjax.typesetPromise([containerRef.current]).then(() => {
            console.log('✅ MathJax公式渲染完成');
            setIsRendered(true);
          }).catch((error: any) => {
            console.warn('⚠️ MathJax typesetPromise失败:', error);
            // 即使失败也标记为已渲染，避免无限重试
            setIsRendered(true);
          });
        } else if (mathjax.typeset) {
          console.log('✅ 使用typeset渲染');
          mathjax.typeset([containerRef.current]);
          console.log('✅ MathJax公式渲染完成');
          setIsRendered(true);
        } else {
          console.warn('⚠️ MathJax渲染方法不可用，尝试手动处理LaTeX');

          // 手动处理简单的LaTeX公式作为后备方案
          const container = containerRef.current;
          if (container) {
            let html = container.innerHTML;

            // 简单的LaTeX到HTML转换（仅处理常见公式）
            html = html.replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>');
            html = html.replace(/\$\$([^$]+)\$\$/g, '<div class="math-display">$1</div>');

            container.innerHTML = html;
            console.log('🔄 使用简单的LaTeX替换作为后备方案');
          }

          setIsRendered(true);
        }
      } catch (error) {
        console.warn('⚠️ MathJax渲染错误:', error);
        // 即使出错也标记为已渲染
        setIsRendered(true);
      }
    } else {
      console.log('🔍 MathJax未准备好:', {
        hasWindow: typeof window !== 'undefined',
        hasMathJax: typeof window !== 'undefined' && !!(window as any).MathJax,
        hasContainer: !!containerRef.current
      });
    }
  }, []);

  useEffect(() => {
    // 等待MathJax完全初始化或收到准备事件
    const waitForMathJax = () => {
      if (typeof window !== 'undefined' && (window as any).MathJax) {
        const mathjax = (window as any).MathJax;

        // 检查是否有document方法（表示MathJax 3已准备好）
        if (mathjax.document) {
          console.log('✅ MathJax已准备好，开始渲染公式');
          renderMath();
        } else {
          // 如果没有document，等待事件
          const handleMathJaxReady = () => {
            console.log('🎯 收到MathJax准备事件，开始渲染公式');
            renderMath();
            window.removeEventListener('mathjax-ready', handleMathJaxReady);
          };

          window.addEventListener('mathjax-ready', handleMathJaxReady);

          // 超时检查
          setTimeout(() => {
            window.removeEventListener('mathjax-ready', handleMathJaxReady);
            console.log('⏳ 超时等待MathJax初始化...');
            renderMath();
          }, 3000);
        }
      } else {
        // MathJax还未加载，继续等待
        setTimeout(waitForMathJax, 100);
      }
    };

    waitForMathJax();
  }, [children, renderMath]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// 渲染行内数学公式的组件
export function InlineMath({ formula }: { formula: string }) {
  return <span>{`$${formula}$`}</span>;
}

// 渲染块级数学公式的组件
export function DisplayMath({ formula }: { formula: string }) {
  return <div>{`$$${formula}$$`}</div>;
}

// 处理包含数学公式的文本
export function MathText({ text, className }: { text: string; className?: string }) {
  return (
    <MathJaxRenderer className={className}>
      {text}
    </MathJaxRenderer>
  );
}

// MathJax提供者组件（简单的上下文包装器）
export function MathJaxProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 等待MathJax加载完成
    const checkLoaded = () => {
      if (typeof window !== 'undefined' && (window as any).MathJax) {
        console.log('✅ MathJax已加载并可用');
        setIsLoaded(true);
      } else {
        // 继续检查
        setTimeout(checkLoaded, 100);
      }
    };

    // 延迟开始检查，确保脚本有时间加载
    setTimeout(checkLoaded, 500);
  }, []);

  // 使用一个简单的包装器，不依赖外部库
  return <>{children}</>;
}

// 重新渲染MathJax的hook
export function useRerenderMathJax() {
  const [mathJaxReady, setMathJaxReady] = useState(false);

  useEffect(() => {
    const checkReady = () => {
      if (typeof window !== 'undefined' && (window as any).MathJax) {
        setMathJaxReady(true);

        const timer = setTimeout(() => {
          if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
            try {
              (window as any).MathJax.typesetPromise().catch((error: any) => {
                console.warn('⚠️ MathJax typesetPromise失败:', error);
              });
            } catch (error) {
              console.warn('⚠️ MathJax渲染错误:', error);
            }
          }
        }, 100);

        return () => clearTimeout(timer);
      } else {
        setTimeout(checkReady, 100);
      }
    };

    checkReady();
  }, []);

  return mathJaxReady;
}

export default MathJaxProvider;