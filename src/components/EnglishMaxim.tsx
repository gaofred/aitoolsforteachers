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
      <div className="h-full">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg p-4 border border-amber-500 shadow-md h-full flex flex-col justify-between relative overflow-hidden">
          {/* 标题区域 */}
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-amber-200 rounded-full animate-ping"></div>
            </div>
            <span className="text-sm font-semibold text-white">💡 智慧名言</span>
          </div>

          {/* 加载内容 */}
          <div className="flex-1 flex items-center justify-center relative z-10 min-h-[120px]">
            <div className="text-center">
              <div className="text-white/95 text-sm lg:text-base mb-2 animate-pulse">
                <div className="w-20 h-4 bg-white/30 rounded mx-auto mb-2"></div>
                <div className="w-16 h-3 bg-white/20 rounded mx-auto"></div>
              </div>
              <div className="text-white/70 text-xs animate-pulse">
                加载格言中...
              </div>
            </div>
          </div>

          {/* 底部装饰 */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20 relative z-10">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-amber-200 rounded-full animate-pulse delay-75"></div>
              <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !maxim) {
    return (
      <div className="h-full">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg p-4 border border-amber-500 shadow-md h-full flex flex-col justify-between relative overflow-hidden opacity-75">
          {/* 标题区域 */}
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white/50 rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-amber-200/50 rounded-full"></div>
            </div>
            <span className="text-sm font-semibold text-white/90">💡 智慧名言</span>
          </div>

          {/* 错误内容 */}
          <div className="flex-1 flex items-center justify-center relative z-10 min-h-[120px]">
            <div className="text-center">
              <div className="text-white/80 text-sm lg:text-base mb-2">
                ⚠️ 格言加载失败
              </div>
              <div className="text-white/60 text-xs italic">
                请稍后重试
              </div>
            </div>
          </div>

          {/* 底部装饰 */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20 relative z-10">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-white/50 rounded-full"></div>
              <div className="w-1 h-1 bg-amber-200/50 rounded-full"></div>
              <div className="w-1 h-1 bg-white/50 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!maxim) {
    return null;
  }

  return (
    <div className="h-full group cursor-pointer" onClick={handleRefresh}>
      {/* 统一的卡片样式，适配桌面端和移动端 */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg p-4 border border-amber-500 shadow-md h-full flex flex-col justify-between relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">

        {/* 背景装饰 */}
        <div className="absolute top-2 right-2 opacity-20">
          <div className="w-16 h-16 bg-white rounded-full blur-xl"></div>
        </div>
        <div className="absolute bottom-1 left-1 opacity-10">
          <div className="w-8 h-8 bg-white rounded-full blur-md"></div>
        </div>

        {/* 标题区域 */}
        <div className="flex items-center gap-2 mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-amber-200 rounded-full animate-ping"></div>
          </div>
          <span className="text-sm font-semibold text-white">💡 智慧名言</span>
          <div className="ml-auto">
            <svg
              className="w-4 h-4 text-white/80 group-hover:text-white transition-colors duration-200 animate-spin-slow"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ animation: 'spin 8s linear infinite' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex flex-col justify-center relative z-10 min-h-[120px]">
          {/* 桌面端和移动端通用显示 */}
          <div className="text-center lg:text-left">
            {/* 英文名言 */}
            <div className="text-white/95 font-medium text-sm lg:text-base leading-relaxed mb-3 italic drop-shadow-sm">
              "{maxim.en}"
            </div>

            {/* 中文翻译 */}
            <div className="text-white/85 text-xs lg:text-sm leading-tight drop-shadow-sm">
              {maxim.zh}
            </div>
          </div>
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20 relative z-10">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-amber-200 rounded-full animate-pulse delay-75"></div>
            <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-150"></div>
          </div>
          <span className="text-xs text-white/70 group-hover:text-white/90 transition-colors duration-200">
            点击刷新
          </span>
        </div>
      </div>
    </div>
  );
}