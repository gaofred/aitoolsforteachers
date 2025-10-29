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
          return cookieStore.getAll()
        } catch (error) {
          console.log('Cookie获取错误:', error)
          return []
        }
      },
      setAll(cookiesToSet) {
        try {
          const cookieStore = cookies()
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, { ...options, path: '/' })
          })
        } catch (error) {
          // 在API Route中，cookies已经在response中设置
          // 这里的错误可以忽略
          console.log('Cookie已在Response中设置')
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
      persistSession: true
    }
  })
}