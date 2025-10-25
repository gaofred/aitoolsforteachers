'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  currentUser: any;
  userPoints: number;
  isLoadingUser: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(25);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        setUserPoints(userData.user_points?.points || 25);
        console.log('用户登录成功:', userData);
      } else {
        console.log('用户未登录或认证失败');
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('检查用户状态失败:', error);
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <UserContext.Provider value={{
      currentUser,
      userPoints,
      isLoadingUser,
      refreshUser
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





