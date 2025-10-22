// AI 工具类型定义
export interface AIToolConfig {
  id: string
  title: string
  description: string
  cost: number
  category: string
  icon: React.ReactNode
}

// 用户数据类型
export interface UserProfile {
  id: string
  email: string
  name?: string
  role: 'USER' | 'ADMIN'
  points: number
  membershipType: 'FREE' | 'PREMIUM' | 'PRO'
  membershipExpiresAt?: Date
}

// AI生成请求类型
export interface AIGenerationRequest {
  toolType: string
  inputData: Record<string, unknown>
  options?: {
    analysisLevel?: 'beginner' | 'intermediate' | 'advanced'
    analysisType?: string
  }
}

// AI生成响应类型
export interface AIGenerationResponse {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  outputData?: Record<string, unknown>
  tokensUsed?: number
  pointsCost?: number
  error?: string
}

// 对话消息类型
export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// 兑换码类型
export interface RedemptionCodeInfo {
  code: string
  type: 'MEMBERSHIP_DAYS' | 'POINTS'
  value: number
  description?: string
  expiresAt?: Date
  isUsed: boolean
}

// WebSocket消息类型
export interface WebSocketMessage {
  type: 'generation_status' | 'conversation_update' | 'error'
  data: unknown
  timestamp: Date
}

// 历史记录筛选类型
export interface HistoryFilter {
  toolType?: string
  dateFrom?: Date
  dateTo?: Date
  isFavorited?: boolean
}