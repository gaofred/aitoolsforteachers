export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          provider: 'google' | 'email'
          role: 'USER' | 'ADMIN'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar_url?: string | null
          provider: 'google' | 'email'
          role?: 'USER' | 'ADMIN'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          provider?: 'google' | 'email'
          role?: 'USER' | 'ADMIN'
          created_at?: string
          updated_at?: string
        }
      }
      user_points: {
        Row: {
          id: string
          user_id: string
          points: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          points?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          updated_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          membership_type: 'FREE' | 'PREMIUM' | 'PRO'
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          membership_type?: 'FREE' | 'PREMIUM' | 'PRO'
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          membership_type?: 'FREE' | 'PREMIUM' | 'PRO'
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}