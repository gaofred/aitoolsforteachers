"use client";

import { useState, useEffect } from 'react';

interface MaximData {
  en: string;
  zh: string;
}

interface EnglishMaximProps {
  theme?: 'default' | 'white';
}

export function EnglishMaxim({ theme = 'default' }: EnglishMaximProps = {}) {
  const [maxim, setMaxim] = useState<MaximData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaxim();
  }, []);

  const fetchMaxim = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🎯 开始获取英语格言');
      const response = await fetch('/api/english-maxim');

      if (!response.ok) {
        throw new Error(`获取格言失败: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ 英语格言获取成功:', data);

      if (data.success && data.en && data.zh) {
        setMaxim({
          en: data.en,
          zh: data.zh
        });
      } else {
        throw new Error(data.error || '格言数据格式错误');
      }

    } catch (error) {
      console.error('❌ 获取英语格言失败:', error);
      setError(error instanceof Error ? error.message : '获取格言失败');

      // 设置默认格言
      setMaxim({
        en: "The only way to do great work is to love what you do.",
        zh: "成就伟业的唯一途径是热爱自己的工作。"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchMaxim();
  };

  // 根据主题设置颜色类和字号
  const textSizeClass = theme === 'white' ? 'text-lg' : 'text-sm';
  const textClass = theme === 'white' ? 'text-white/90' : 'text-gray-600';
  const subTextClass = theme === 'white' ? 'text-white/80' : 'text-gray-500';
  const subSubTextClass = theme === 'white' ? 'text-white/70' : 'text-gray-400';
  const hoverClass = theme === 'white' ? 'hover:text-white' : 'hover:text-purple-600';
  const hoverSubClass = theme === 'white' ? 'group-hover:text-white/90' : 'group-hover:text-purple-700';
  const hoverSubSubClass = theme === 'white' ? 'group-hover:text-white/80' : 'group-hover:text-purple-500';

  if (loading) {
    return (
      <div className={`${textSizeClass} ${textClass} animate-pulse`}>
        <span className="hidden lg:inline">加载格言中...</span>
        <span className="lg:hidden">格言...</span>
      </div>
    );
  }

  if (error && !maxim) {
    return (
      <div className={`${textSizeClass} ${subTextClass} italic`}>
        <span className="hidden lg:inline">格言加载失败</span>
        <span className="lg:hidden">格言...</span>
      </div>
    );
  }

  if (!maxim) {
    return null;
  }

  return (
    <div className={`${textSizeClass} ${textClass} group cursor-pointer`} onClick={handleRefresh}>
      {/* 桌面端完整显示 */}
      <div className={`hidden lg:flex items-center gap-2 transition-all duration-200 ${hoverClass}`}>
        <svg
          className={`w-5 h-5 ${subSubTextClass} group-hover:text-white transition-colors duration-200 flex-shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <div className="max-w-2xl">
          <div className={`italic ${subTextClass} ${hoverSubClass} transition-colors duration-200 leading-relaxed`}>
            "{maxim.en}"
          </div>
          <div className={`text-base ${subSubTextClass} ${hoverSubSubClass} transition-colors duration-200 mt-2`}>
            {maxim.zh}
          </div>
        </div>
      </div>

      {/* 移动端简化显示 */}
      <div className="lg:hidden flex items-center gap-1" onClick={(e) => {
        e.stopPropagation();
        handleRefresh();
      }}>
        <svg
          className={`w-4 h-4 ${subSubTextClass} group-hover:text-white transition-colors duration-200 flex-shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <div className="max-w-[120px] sm:max-w-[200px]">
          <div className={`italic ${textClass} text-sm leading-tight line-clamp-1`}>
            {maxim.en.length > 30 ? maxim.en.substring(0, 30) + '...' : maxim.en}
          </div>
        </div>
      </div>
    </div>
  );
}