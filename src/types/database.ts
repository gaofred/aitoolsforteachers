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
          membership_type?: 'FREE' | 'PREMIUM_I' | 'PREMIUM_II' | 'PRO'
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          membership_type?: 'FREE' | 'PREMIUM_I' | 'PREMIUM_II' | 'PRO'
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ip_registration_logs: {
        Row: {
          id: string
          ip_address: string
          attempt_date: string
          count: number
          last_attempt_date: string
        }
        Insert: {
          id?: string
          ip_address: string
          attempt_date: string
          count?: number
          last_attempt_date?: string
        }
        Update: {
          id?: string
          ip_address?: string
          attempt_date?: string
          count?: number
          last_attempt_date?: string
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
          plan_type?: 'PREMIUM_I' | 'PREMIUM_II' | 'PRO'
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
          membership_type: 'PREMIUM_I' | 'PREMIUM_II' | 'PRO'
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
          membership_type: 'PREMIUM_I' | 'PREMIUM_II' | 'PRO'
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
      redemption_codes: {
        Row: {
          id: string
          code: string
          type: 'POINTS' | 'MEMBERSHIP_DAYS'
          value: number
          description: string | null
          expires_at: string | null
          is_used: boolean
          used_by: string | null
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          type: 'POINTS' | 'MEMBERSHIP_DAYS'
          value: number
          description?: string | null
          expires_at?: string | null
          is_used?: boolean
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          type?: 'POINTS' | 'MEMBERSHIP_DAYS'
          value?: number
          description?: string | null
          expires_at?: string | null
          is_used?: boolean
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
      }
      invite_codes: {
        Row: {
          id: string
          code: string
          inviter_id: string
          is_active: boolean
          expires_at: string | null
          max_uses: number | null
          current_uses: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          inviter_id: string
          is_active?: boolean
          expires_at?: string | null
          max_uses?: number | null
          current_uses?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          inviter_id?: string
          is_active?: boolean
          expires_at?: string | null
          max_uses?: number | null
          current_uses?: number
          created_at?: string
          updated_at?: string
        }
      }
      invite_rewards: {
        Row: {
          id: string
          inviter_id: string
          invited_user_id: string
          invite_code_id: string
          points_awarded: number
          reward_type: 'INVITE_SIGNUP' | 'INVITE_MILESTONE'
          milestone_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inviter_id: string
          invited_user_id: string
          invite_code_id: string
          points_awarded?: number
          reward_type?: 'INVITE_SIGNUP' | 'INVITE_MILESTONE'
          milestone_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inviter_id?: string
          inviter_user_id?: string
          invite_code_id?: string
          points_awarded?: number
          reward_type?: 'INVITE_SIGNUP' | 'INVITE_MILESTONE'
          milestone_id?: string | null
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