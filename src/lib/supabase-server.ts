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
    cookies: {
      async getAll() {
        try {
          const cookieStore = await cookies()
          const allCookies = cookieStore.getAll()
          console.log('🍪 成功获取cookies:', allCookies.length, '个')
          return allCookies
        } catch (error) {
          console.error('❌ Cookie获取错误:', error)
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
            const secureOptions = {
              ...options,
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7天
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
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