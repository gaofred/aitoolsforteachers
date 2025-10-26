"use client";

import { useState, useEffect } from 'react';

interface MaximData {
  en: string;
  zh: string;
}

export function EnglishMaxim() {
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

  if (loading) {
    return (
      <div className="hidden lg:block text-sm text-gray-600 animate-pulse">
        <span>加载格言中...</span>
      </div>
    );
  }

  if (error && !maxim) {
    return (
      <div className="hidden lg:block text-sm text-gray-500 italic">
        格言加载失败
      </div>
    );
  }

  if (!maxim) {
    return null;
  }

  return (
    <div className="hidden lg:block text-sm text-gray-600 group cursor-pointer" onClick={handleRefresh}>
      <div className="flex items-center gap-2 transition-all duration-200 hover:text-purple-600">
        <svg
          className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors duration-200 flex-shrink-0"
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
          <div className="italic text-gray-700 group-hover:text-purple-700 transition-colors duration-200">
            "{maxim.en}"
          </div>
          <div className="text-xs text-gray-500 group-hover:text-purple-500 transition-colors duration-200 mt-1">
            {maxim.zh}
          </div>
        </div>
      </div>
    </div>
  );
}