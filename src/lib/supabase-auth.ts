import { createServerSupabaseClient } from './supabase-server'
import { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserPoints = Database['public']['Tables']['user_points']['Insert']
type Membership = Database['public']['Tables']['memberships']['Insert']

export class SupabaseAuthService {
  private supabase = createServerSupabaseClient()

  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/callback/google`
      }
    })

    if (error) {
      throw new Error(`Google登录失败: ${error.message}`)
    }

    return data
  }

  async handleAuthCallback(code: string) {
    const { data, error } = await this.supabase.auth.exchangeCodeForSession(code)

    if (error) {
      throw new Error(`认证回调处理失败: ${error.message}`)
    }

    if (data.user && data.session) {
      await this.createOrUpdateUser(data.user)
      return { user: data.user, session: data.session }
    }

    throw new Error('认证回调处理失败：无效的用户数据')
  }

  async createOrUpdateUser(authUser: any) {
    const { data: existingUser, error: fetchError } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email!)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`查询用户失败: ${fetchError.message}`)
    }

    const userData: UserInsert = {
      id: authUser.id,
      email: authUser.email!,
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
      avatar_url: authUser.user_metadata?.avatar_url,
      provider: 'google',
      role: existingUser?.role || 'USER'
    }

    if (existingUser) {
      const { error: updateError } = await this.supabase
        .from('users')
        .update(userData)
        .eq('id', authUser.id)

      if (updateError) {
        throw new Error(`更新用户失败: ${updateError.message}`)
      }
    } else {
      const { error: insertError } = await this.supabase
        .from('users')
        .insert(userData)

      if (insertError) {
        throw new Error(`创建用户失败: ${insertError.message}`)
      }

      await this.createUserInitialData(authUser.id)
    }

    return userData
  }

  private async createUserInitialData(userId: string) {
    const pointsData: UserPoints = {
      user_id: userId,
      points: 25
    }

    const membershipData: Membership = {
      user_id: userId,
      membership_type: 'FREE',
      is_active: true
    }

    const { error: pointsError } = await this.supabase
      .from('user_points')
      .insert(pointsData)

    if (pointsError) {
      throw new Error(`创建用户积分失败: ${pointsError.message}`)
    }

    const { error: membershipError } = await this.supabase
      .from('memberships')
      .insert(membershipData)

    if (membershipError) {
      throw new Error(`创建用户会员失败: ${membershipError.message}`)
    }
  }

  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()

    if (error) {
      throw new Error(`获取当前用户失败: ${error.message}`)
    }

    if (user) {
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select(`
          *,
          user_points (*),
          memberships (*)
        `)
        .eq('id', user.id)
        .single()

      if (userError) {
        throw new Error(`获取用户详细信息失败: ${userError.message}`)
      }

      return userData
    }

    return null
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()

    if (error) {
      throw new Error(`登出失败: ${error.message}`)
    }

    return true
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    const { error } = await this.supabase
      .from('users')
      .update({ role })
      .eq('id', userId)

    if (error) {
      throw new Error(`更新用户角色失败: ${error.message}`)
    }

    return true
  }
}

export const supabaseAuth = new SupabaseAuthService()