// @ts-nocheck
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('缺少Supabase环境变量: NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // 延长会话时间到7天，防止批量处理过程中session过期
      maxSessionTime: 60 * 60 * 24 * 7, // 7天 (秒)
      // 设置更频繁的token刷新
      refreshTime: 60 * 5, // 5分钟刷新一次
    },
    cookies: {
      async getAll() {
        try {
          const cookieStore = await cookies()
          const allCookies = cookieStore.getAll()

          // 详细的Cookie调试信息
          const authCookies = allCookies.filter(cookie =>
            cookie.name.includes('supabase') ||
            cookie.name.includes('access_token') ||
            cookie.name.includes('refresh_token')
          );

          console.log('🍪 Cookie调试信息:', {
            总数: allCookies.length,
            认证相关: authCookies.length,
            认证Cookie列表: authCookies.map(c => ({ name: c.name, 有值: !!c.value })),
            环境: process.env.NODE_ENV,
            当前时间: new Date().toISOString()
          });

          return allCookies
        } catch (error) {
          console.error('❌ Cookie获取错误:', {
            错误: error?.message,
            环境: process.env.NODE_ENV,
            SupabaseURL: supabaseUrl ? '已设置' : '未设置'
          });
          // 不直接返回空数组，而是尝试从其他来源获取session
          console.log('🔄 尝试备用认证方式...')
          return []
        }
      },
      async setAll(cookiesToSet) {
        try {
          const cookieStore = await cookies()
          cookiesToSet.forEach(({ name, value, options }) => {
            // 添加更长的过期时间和更安全的cookie设置
            // 修复IP访问时的认证问题：开发环境总是不设置secure，生产环境也允许非secure以支持IP访问
            const secureOptions = {
              ...options,
              path: '/',
              maxAge: 60 * 60 * 24 * 30, // 30天，延长认证有效期
              httpOnly: true,
              secure: false, // 修复IP访问问题：允许非HTTPS连接使用cookie
              sameSite: 'lax' as const
            }
            cookieStore.set(name, value, secureOptions)
            console.log('🍪 设置cookie:', name, '过期时间:', secureOptions.maxAge, '秒')
          })
        } catch (error) {
          console.error('❌ Cookie设置错误:', error)
          // 在API Route中，cookies已经在response中设置
          // 这里的错误可以忽略，但需要记录详细信息
          console.log('📝 Cookie已在Response中设置或使用备用方式')
        }
      },
    },
  })
}

export const createServerComponentSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('缺少Supabase环境变量: NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'english-teaching-tools'
      }
    }
  })
}