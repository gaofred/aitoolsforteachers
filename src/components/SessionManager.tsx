"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SessionManagerProps {
  children: React.ReactNode;
  enabled?: boolean; // 是否启用会话监控
  checkInterval?: number; // 检查间隔（秒）
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  children,
  enabled = false, // 默认不启用，仅在长时间操作时启用
  checkInterval = 300 // 5分钟检查一次
}) => {
  const [sessionStatus, setSessionStatus] = useState<'active' | 'expired' | 'checking'>('active');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      // 如果未启用，清理定时器
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkSession = async () => {
      setSessionStatus('checking');

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('🔍 会话检查失败:', error);
          setSessionStatus('expired');
          return;
        }

        if (session) {
          // 会话有效，检查是否即将过期（提前30分钟刷新）
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;
          const thirtyMinutes = 30 * 60;

          if (timeUntilExpiry < thirtyMinutes) {
            console.log('🔄 会话即将过期，主动刷新token...');
            const { error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
              console.error('❌ token刷新失败:', refreshError);
              setSessionStatus('expired');
            } else {
              console.log('✅ token刷新成功');
              setSessionStatus('active');
            }
          } else {
            setSessionStatus('active');
          }
        } else {
          console.warn('⚠️ 未找到有效会话');
          setSessionStatus('expired');
        }
      } catch (error) {
        console.error('❌ 会话检查异常:', error);
        setSessionStatus('expired');
      }
    };

    // 立即检查一次
    checkSession();

    // 设置定时检查
    intervalRef.current = setInterval(checkSession, checkInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, checkInterval]);

  // 会话过期时的处理
  useEffect(() => {
    if (sessionStatus === 'expired') {
      console.warn('🚨 会话已过期，需要重新登录');
      // 可以在这里触发重新登录提示或跳转到登录页面
      // 也可以调用全局状态管理来通知用户
    }
  }, [sessionStatus]);

  return (
    <>
      {/* 调试信息（仅在开发环境显示） */}
      {process.env.NODE_ENV === 'development' && enabled && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: sessionStatus === 'active' ? '#10b981' :
                          sessionStatus === 'checking' ? '#f59e0b' : '#ef4444',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          opacity: 0.8
        }}>
          会话状态: {sessionStatus}
        </div>
      )}
      {children}
    </>
  );
};

// Hook用于在其他组件中启用会话监控
export const useSessionMonitor = (enabled: boolean = true) => {
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = () => {
    setIsMonitoring(true);
    console.log('🔍 开始会话监控');
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    console.log('⏹️ 停止会话监控');
  };

  return {
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
};