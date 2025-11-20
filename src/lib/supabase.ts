import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少Supabase环境变量: NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // 延长会话时间到7天，防止批量处理过程中session过期
    maxSessionTime: 60 * 60 * 24 * 7, // 7天 (秒)
    // 设置更频繁的token刷新，确保长时间操作的认证
    refreshTime: 60 * 5, // 5分钟刷新一次
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

// 导出createClient函数供其他组件使用
export { createClient }