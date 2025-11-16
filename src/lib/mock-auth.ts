// 模拟认证系统 - 用于Supabase连接失败时的备用方案
export class MockAuthService {
  private static users = new Map([
    ['admin@example.com', {
      id: '1',
      email: 'admin@example.com',
      password: 'admin123',
      name: '管理员',
      points: 1000
    }],
    ['teacher@example.com', {
      id: '2',
      email: 'teacher@example.com',
      password: 'teacher123',
      name: '教师用户',
      points: 500
    }],
    ['test@example.com', {
      id: '3',
      email: 'test@example.com',
      password: 'test123',
      name: '测试用户',
      points: 25
    }]
  ])

  static async signIn(email: string, password: string) {
    const user = this.users.get(email)
    if (user && user.password === password) {
      const { password: _, ...userWithoutPassword } = user
      return {
        user: userWithoutPassword,
        session: {
          access_token: `mock-token-${Date.now()}`,
          refresh_token: `mock-refresh-${Date.now()}`,
          expires_in: 3600,
          expires_at: Date.now() + 3600 * 1000,
          token_type: 'bearer'
        }
      }
    }
    throw new Error('邮箱或密码错误')
  }

  static async getUser(token: string) {
    if (token.startsWith('mock-token-')) {
      // 从token中提取用户ID或返回第一个用户
      for (const [email, user] of this.users) {
        const { password: _, ...userWithoutPassword } = user
        return userWithoutPassword
      }
    }
    throw new Error('无效的token')
  }
}