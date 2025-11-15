'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface UserContextType {
  currentUser: any;
  userPoints: number;
  isLoadingUser: boolean;
  refreshUser: () => Promise<void>;
  retryCount: number;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// 本地存储键名
const USER_STORAGE_KEY = 'english_teaching_user';
const USER_POINTS_KEY = 'english_teaching_user_points';


export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(25);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false); // 防止并发刷新

  // 检查是否有正在进行的OCR任务
  const checkForActiveOCRTasks = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    try {
      // 检查localStorage中是否有正在进行的OCR任务
      const keys = Object.keys(localStorage).filter(key =>
        key.startsWith('batch_ocr_') && key.includes('task_')
      );

      for (const key of keys) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');

          // 检查是否是正在进行的任务
          if (data.isProcessing === true) {
            console.log('🔍 检测到正在进行的OCR任务:', key);
            return true;
          }

          // 检查是否有待处理的图片
          if (data.uploadedImages && Array.isArray(data.uploadedImages)) {
            const pendingImages = data.uploadedImages.filter((img: any) =>
              img.status === 'pending' || img.status === 'processing' || img.status === 'compressing'
            );

            if (pendingImages.length > 0) {
              console.log('🔍 检测到待处理的OCR图片:', key, pendingImages.length, '张');
              return true;
            }
          }

          // 检查任务时间戳，如果是最近5分钟的任务，可能还在进行中
          if (data.timestamp && (Date.now() - data.timestamp) < 5 * 60 * 1000) {
            console.log('🔍 检测到最近5分钟的OCR任务:', key);
            return true;
          }

        } catch (error) {
          // 忽略单个key的解析错误，继续检查其他key
          continue;
        }
      }

      return false;
    } catch (error) {
      console.warn('🔍 检查OCR任务状态时出错:', error);
      return false;
    }
  }, []);

  // 从本地存储恢复用户数据
  const restoreFromLocalStorage = () => {
    try {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedPoints = localStorage.getItem(USER_POINTS_KEY);

        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setCurrentUser(userData);
            console.log('📱 从本地存储恢复用户数据:', userData.name);
          } catch (parseError) {
            console.warn('⚠️ 用户数据解析失败，清除损坏的数据:', parseError);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        }

        if (storedPoints) {
          const points = parseInt(storedPoints, 10);
          if (!isNaN(points)) {
            setUserPoints(points);
            console.log('📱 从本地存储恢复用户积分:', points);
          } else {
            console.warn('⚠️ 积分数据格式错误，清除损坏的数据');
            localStorage.removeItem(USER_POINTS_KEY);
          }
        }
      }
    } catch (error) {
      console.error('❌ 从本地存储恢复数据失败:', error);
      // 如果localStorage访问完全失败，清除可能的损坏数据
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(USER_POINTS_KEY);
        } catch (clearError) {
          console.warn('⚠️ 清除localStorage数据也失败:', clearError);
        }
      }
    }
  };

  // 保存用户数据到本地存储
  const saveToLocalStorage = (userData: any, points: number) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        localStorage.setItem(USER_POINTS_KEY, points.toString());
        console.log('💾 用户数据已保存到本地存储');
      }
    } catch (error) {
      console.error('❌ 保存到本地存储失败:', error);
    }
  };

  const refreshUser = async (isRetry: boolean = false) => {
    // 防止并发刷新
    if (isRefreshing && !isRetry) {
      console.log('⏸️ 已有刷新请求在进行中，跳过重复请求');
      return;
    }

    console.log('🔄 refreshUser 开始执行', isRetry ? '(重试)' : '');

    if (!isRetry) {
      setRetryCount(0);
      setIsRefreshing(true);
      // 先尝试从本地存储恢复
      if (!currentUser) {
        restoreFromLocalStorage();
      }
    }

    try {
      // 添加更长的超时控制，考虑OCR等重负载时的网络延迟
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加到15秒超时

      const response = await fetch('/api/auth/user', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Retry-Count': retryCount.toString(),
          'X-Request-Priority': 'high' // 标记为高优先级请求
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        setUserPoints(userData.user_points?.points || 25);

        // 保存到本地存储作为备份
        saveToLocalStorage(userData, userData.user_points?.points || 25);

        console.log('✅ 用户上下文认证成功:', userData.name);
        setRetryCount(0); // 重置重试次数
      } else {
        console.log('❌ 用户上下文认证失败，状态码:', response.status);

        // 401 = 未认证，立即清理本地存储和状态
        if (response.status === 401) {
          console.log('🧹 清理本地存储和用户状态 (401认证失败)');
          if (typeof window !== 'undefined') {
            localStorage.removeItem(USER_STORAGE_KEY);
            localStorage.removeItem(USER_POINTS_KEY);
          }
          setCurrentUser(null);
          setUserPoints(25); // 重置为默认值
          setIsLoadingUser(false);
          setRetryCount(0);
          return;
        }

        // 如果是网络相关错误（5xx），尝试使用本地存储
        if (response.status >= 500 && retryCount < 2) {
          console.log(`🔄 网络错误，准备重试... (${retryCount + 1}/2)`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => refreshUser(true), 2000 * (retryCount + 1));
          return;
        }

        // 如果有本地存储数据，使用它而不是清空（仅限网络错误）
        if (retryCount === 0 && typeof window !== 'undefined') {
          const storedUser = localStorage.getItem(USER_STORAGE_KEY);
          const storedPoints = localStorage.getItem(USER_POINTS_KEY);

          if (storedUser) {
            console.log('📱 网络错误，使用本地存储的用户数据');
            setCurrentUser(JSON.parse(storedUser));
            setUserPoints(parseInt(storedPoints) || 25);
            setIsLoadingUser(false);
            return;
          }
        }

        setCurrentUser(null);
        setUserPoints(25); // 重置为默认值
      }
    } catch (error) {
      console.error('❌ 检查用户状态失败:', error);

      // 检查是否是AbortError（超时或操作导致的中止）
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏹️ 请求被中止（可能是超时或页面操作）');

        // 如果是超时导致的AbortError，且有本地存储，使用本地存储
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem(USER_STORAGE_KEY);
          const storedPoints = localStorage.getItem(USER_POINTS_KEY);

          if (storedUser && retryCount === 0) {
            console.log('📱 AbortError，使用本地存储数据作为备选');
            try {
              const userData = JSON.parse(storedUser);
              setCurrentUser(userData);
              setUserPoints(parseInt(storedPoints) || 25);
              console.log('✅ 从本地存储恢复登录状态:', userData.name);
              setIsLoadingUser(false);
              if (!isRetry) {
                setIsRefreshing(false);
              }
              return;
            } catch (parseError) {
              console.error('❌ 本地存储数据解析失败:', parseError);
            }
          }
        }

        // AbortError也进行有限重试（最多1次）
        if (retryCount < 1) {
          console.log(`🔄 AbortError，准备重试... (${retryCount + 1}/1)`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => refreshUser(true), 5000); // 5秒后重试
          return;
        }

        console.log('❌ AbortError重试次数用尽，清空登录状态');
        setCurrentUser(null);
        setIsLoadingUser(false);
        if (!isRetry) {
          setIsRefreshing(false);
        }
        return;
      }

      // 检查是否是网络连接错误
      const isNetworkError =
        error instanceof TypeError &&
        (error.message.includes('fetch') ||
         error.message.includes('Network'));

      if (isNetworkError && retryCount < 2) {
        console.log(`🔄 网络连接错误，准备重试... (${retryCount + 1}/2)`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => refreshUser(true), 3000 * (retryCount + 1)); // 更长的延迟
        return;
      }

      // 如果是网络错误且有本地存储，使用本地存储
      if (isNetworkError && typeof window !== 'undefined') {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedPoints = localStorage.getItem(USER_POINTS_KEY);

        if (storedUser) {
          console.log('📱 网络错误，使用本地存储数据作为备选');
          try {
            const userData = JSON.parse(storedUser);
            setCurrentUser(userData);
            setUserPoints(parseInt(storedPoints) || 25);
            console.log('✅ 从本地存储恢复登录状态:', userData.name);
          } catch (parseError) {
            console.error('❌ 本地存储数据解析失败:', parseError);
            setCurrentUser(null);
          }
        } else {
          console.log('⚠️ 无本地存储数据，清空登录状态');
          setCurrentUser(null);
        }
      } else {
        // 其他错误，清空用户状态
        console.log('❌ 其他错误，清空登录状态:', error);
        setCurrentUser(null);
      }
    } finally {
      setIsLoadingUser(false);
      if (!isRetry) {
        setIsRefreshing(false);
      }
    }
  };

  // 移除定期刷新，改为事件驱动机制
  // 页面可见性变化时刷新（智能判断）
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      // 清除之前的定时器
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }

      // 页面重新可见时，智能判断是否需要刷新
      if (!document.hidden && currentUser) {
        console.log('👁️ 页面重新可见，智能判断刷新需求');

        // 延迟3秒后刷新，给OCR等重负载操作缓冲时间
        visibilityTimeout = setTimeout(() => {
          // 检查是否有正在进行的OCR任务
          const hasActiveOCRTasks = checkForActiveOCRTasks();

          // 检查页面是否有大量活动请求（避免在OCR处理时刷新）
          const hasActiveRequests = navigator.onLine &&
            !isLoadingUser &&
            retryCount === 0 && // 只有在没有重试时才刷新
            !hasActiveOCRTasks; // 确保没有正在进行的OCR任务

          if (hasActiveOCRTasks) {
            console.log('👁️ 检测到OCR任务正在进行，跳过用户状态刷新');
            return;
          }

          if (hasActiveRequests) {
            console.log('👁️ 智能条件满足，检查用户状态');
            refreshUser();
          } else {
            console.log('👁️ 智能条件不满足，跳过本次刷新');
          }
        }, 3000); // 增加到3秒延迟
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [currentUser, isLoadingUser, retryCount, checkForActiveOCRTasks]);

  // 网络连接状态变化时刷新（添加防抖）
  useEffect(() => {
    let onlineTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      // 清除之前的定时器
      if (onlineTimeout) {
        clearTimeout(onlineTimeout);
      }

      if (currentUser) {
        console.log('🌐 网络连接恢复，准备刷新用户状态');
        onlineTimeout = setTimeout(() => {
          // 检查是否有正在进行的OCR任务
          const hasActiveOCRTasks = checkForActiveOCRTasks();

          if (hasActiveOCRTasks) {
            console.log('🌐 检测到OCR任务正在进行，跳过网络恢复时的用户状态刷新');
            return;
          }

          console.log('🌐 延迟刷新用户状态');
          refreshUser();
        }, 2000); // 网络恢复后等待2秒
      }
    };

    const handleOffline = () => {
      console.log('📶 网络连接断开，将使用本地存储数据');
      if (onlineTimeout) {
        clearTimeout(onlineTimeout);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (onlineTimeout) {
        clearTimeout(onlineTimeout);
      }
    };
  }, [currentUser, checkForActiveOCRTasks]);

  // 移除用户空闲刷新机制，减少不必要的网络请求
  // 现在只在关键事件时刷新，避免过度刷新

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{
      currentUser,
      userPoints,
      isLoadingUser,
      refreshUser,
      retryCount
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}





