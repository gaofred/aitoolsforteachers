import { NextRequest } from 'next/server';
import { User } from '@supabase/supabase-js';

/**
 * 认证结果接口
 */
interface AuthResult {
  user: User | null;
  method: 'cookie' | 'header' | 'none';
  error?: string;
}

/**
 * 双重认证机制 - 支持Cookie和Header认证
 * 解决移动端和桌面端的401错误问题
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  console.log('🔐 开始双重认证验证...');

  // 获取Supabase客户端
  const { createServerSupabaseClient } = await import('./supabase-server');
  const supabase = createServerSupabaseClient();

  // 方法1: 尝试Cookie认证（主要方式）
  try {
    const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();

    if (cookieUser && !cookieError) {
      console.log('✅ Cookie认证成功', {
        userId: cookieUser.id,
        email: cookieUser.email,
        method: 'cookie'
      });
      return { user: cookieUser, method: 'cookie' };
    }

    if (cookieError) {
      console.log('⚠️ Cookie认证失败:', cookieError.message);
    }
  } catch (cookieAuthError) {
    console.error('❌ Cookie认证异常:', cookieAuthError);
  }

  // 方法2: 尝试Header认证（备用方案）
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    if (token && token.trim()) {
      try {
        console.log('🔄 尝试Header认证...', { hasToken: !!token, tokenLength: token.length });

        // 手动验证JWT token
        const { data: { user: headerUser }, error: headerError } =
          await supabase.auth.getUser(token);

        if (headerUser && !headerError) {
          console.log('✅ Header认证成功', {
            userId: headerUser.id,
            email: headerUser.email,
            method: 'header'
          });
          return { user: headerUser, method: 'header' };
        }

        if (headerError) {
          console.log('⚠️ Header认证失败:', headerError.message);
        }
      } catch (tokenError) {
        console.error('❌ Header认证异常:', tokenError);
      }
    } else {
      console.log('⚠️ Authorization header存在但token为空');
    }
  } else {
    console.log('📋 未找到Authorization header');
  }

  // 两种方式都失败
  const userAgent = request.headers.get('user-agent');
  const isMobile = userAgent ? /Mobile|Android|iPhone|iPad/.test(userAgent) : false;

  console.error('❌ 所有认证方式都失败', {
    hasCookie: !!request.headers.get('cookie'),
    hasAuthorization: !!authHeader,
    userAgent: userAgent?.substring(0, 100),
    isMobile,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });

  return {
    user: null,
    method: 'none',
    error: '认证失败：Cookie和Header认证都失败'
  };
}

/**
 * 创建标准化的认证错误响应
 */
export function createAuthErrorResponse(authResult: AuthResult, apiName: string) {
  const userAgent = authResult.error ? '未知' :
    authResult.error?.includes('Cookie') ? 'Cookie认证失败' :
    authResult.error?.includes('Header') ? 'Header认证失败' : '认证失败';

  console.log(`${apiName} - 认证失败详情:`, {
    error: authResult.error,
    method: authResult.method,
    timestamp: new Date().toISOString()
  });

  return {
    success: false,
    error: '用户认证失败，请重新登录',
    details: {
      authMethod: authResult.method,
      suggestion: authResult.method === 'none' ?
        (userAgent.includes('Mobile') ? '移动端用户请尝试刷新页面重新登录' : '请检查登录状态') :
        '请重新登录后重试'
    }
  };
}

/**
 * 记录认证成功的详细信息
 */
export function logAuthSuccess(authResult: AuthResult, apiName: string) {
  if (authResult.user) {
    console.log(`${apiName} - 认证成功:`, {
      userId: authResult.user.id,
      email: authResult.user.email,
      authMethod: authResult.method,
      lastSignIn: authResult.user.last_sign_in_at,
      createdAt: authResult.user.created_at,
      timestamp: new Date().toISOString()
    });
  }
}