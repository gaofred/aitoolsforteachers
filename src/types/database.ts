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
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          points?: number
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          last_updated?: string
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
      user_points: {
        Row: {
          id: string
          user_id: string
          points: number
          last_updated: string
          daily_points: number
          last_reset_date: string
          is_member: boolean
          membership_expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          points?: number
          last_updated?: string
          daily_points?: number
          last_reset_date?: string
          is_member?: boolean
          membership_expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          points?: number
          last_updated?: string
          daily_points?: number
          last_reset_date?: string
          is_member?: boolean
          membership_expires_at?: string | null
        }
      }
      membership_plans: {
        Row: {
          id: string
          plan_type: 'PREMIUM' | 'PRO'
          name: string
          daily_points: number
          points_cost: number
          duration_days: number
          description: string
          features: Record<string, any>
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_type: 'PREMIUM' | 'PRO'
          name: string
          daily_points: number
          points_cost: number
          duration_days: number
          description: string
          features?: Record<string, any>
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_type?: 'PREMIUM' | 'PRO'
          name?: string
          daily_points?: number
          points_cost?: number
          duration_days?: number
          description?: string
          features?: Record<string, any>
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      membership_purchases: {
        Row: {
          id: string
          user_id: string
          plan_type: 'PREMIUM' | 'PRO'
          points_cost: number
          start_date: string
          end_date: string
          transaction_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_type: 'PREMIUM' | 'PRO'
          points_cost: number
          start_date?: string
          end_date: string
          transaction_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: 'PREMIUM' | 'PRO'
          points_cost?: number
          start_date?: string
          end_date?: string
          transaction_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      daily_reset_logs: {
        Row: {
          id: string
          user_id: string
          reset_date: string
          previous_points: number
          new_points: number
          plan_type: string
          reset_type: 'DAILY' | 'MANUAL' | 'MEMBERSHIP_UPGRADE'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reset_date: string
          previous_points: number
          new_points: number
          plan_type: string
          reset_type?: 'DAILY' | 'MANUAL' | 'MEMBERSHIP_UPGRADE'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reset_date?: string
          previous_points?: number
          new_points?: number
          plan_type?: string
          reset_type?: 'DAILY' | 'MANUAL' | 'MEMBERSHIP_UPGRADE'
          created_at?: string
        }
      }
      membership_redemptions: {
        Row: {
          id: string
          redemption_code_id: string
          user_id: string
          membership_type: 'PREMIUM' | 'PRO'
          days_awarded: number
          start_date: string
          end_date: string
          transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          redemption_code_id: string
          user_id: string
          membership_type: 'PREMIUM' | 'PRO'
          days_awarded: number
          start_date?: string
          end_date: string
          transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          redemption_code_id?: string
          user_id?: string
          membership_type?: 'PREMIUM' | 'PRO'
          days_awarded?: number
          start_date?: string
          end_date?: string
          transaction_id?: string | null
          created_at?: string
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