/**
 * 云雾API服务
 * 提供统一的API调用接口，支持通用模型和谷歌模型
 */

export interface CloudMistMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CloudMistRequest {
  model: string;
  messages: CloudMistMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface CloudMistResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: CloudMistMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class CloudMistService {
  private static readonly API_BASE_URL = 'https://yunwu.ai/v1';
  
  /**
   * 根据模型名称选择合适的API Key
   */
  private static getApiKey(model: string): string | null {
    // 谷歌模型使用专用API Key
    if (model.includes('google') || model.includes('gemini') || model.includes('bard')) {
      return process.env.CLOUDMIST_GOOGLE_API_KEY || null;
    }
    
    // 火山引擎模型使用火山引擎API Key
    if (model.includes('doubao') || model.includes('volcengine') || model.includes('volc')) {
      return process.env.VOLCENGINE_API_KEY || null;
    }
    
    // 其他模型使用通用API Key
    return process.env.CLOUDMIST_API_KEY || null;
  }

  /**
   * 调用云雾API进行文本生成
   */
  static async chatCompletions(request: CloudMistRequest): Promise<CloudMistResponse> {
    const apiKey = this.getApiKey(request.model);
    
    if (!apiKey) {
      throw new Error(`API Key not configured for model: ${request.model}`);
    }

    const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        max_tokens: request.max_tokens || 1000,
        temperature: request.temperature || 0.7,
        stream: request.stream || false
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`CloudMist API error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    return await response.json();
  }

  /**
   * 简化的文本生成方法
   */
  static async generateText(
    prompt: string, 
    model: string = 'gpt-3.5-turbo',
    systemPrompt?: string
  ): Promise<string> {
    const messages: CloudMistMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await this.chatCompletions({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * 获取可用的模型列表
   */
  static getAvailableModels(): Array<{ id: string; name: string; description: string; category: string }> {
    return [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: '通用文本生成模型，适合大多数任务',
        category: 'general'
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: '高级文本生成模型，更强的推理能力',
        category: 'general'
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: '最新GPT-4模型，更快响应速度',
        category: 'general'
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Google的先进AI模型',
        category: 'google'
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Google最新的Gemini 2.5 Pro模型，强大的分析和推理能力',
        category: 'google'
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        description: '支持图像理解的Gemini模型',
        category: 'google'
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Anthropic的平衡性能模型',
        category: 'general'
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Anthropic的最强推理模型',
        category: 'general'
      },
      {
        id: 'doubao-pro-32k',
        name: '豆包 Pro 32K',
        description: '字节跳动豆包模型，支持32K上下文',
        category: 'volcengine'
      },
      {
        id: 'doubao-pro-128k',
        name: '豆包 Pro 128K',
        description: '字节跳动豆包模型，支持128K上下文',
        category: 'volcengine'
      },
      {
        id: 'doubao-lite',
        name: '豆包 Lite',
        description: '字节跳动豆包轻量级模型，快速响应',
        category: 'volcengine'
      }
    ];
  }

  /**
   * 根据任务类型推荐模型
   */
  static getRecommendedModel(taskType: string): string {
    const recommendations: Record<string, string> = {
      'text-analysis': 'gpt-4',
      'text-generation': 'gpt-3.5-turbo',
      'translation': 'gpt-4',
      'summarization': 'gpt-3.5-turbo',
      'question-answering': 'gpt-4',
      'creative-writing': 'claude-3-sonnet',
      'code-generation': 'gpt-4',
      'image-analysis': 'gemini-pro-vision',
      'long-context': 'doubao-pro-128k',
      'chinese-text': 'doubao-pro-32k',
      'fast-response': 'doubao-lite'
    };

    return recommendations[taskType] || 'gpt-3.5-turbo';
  }

  /**
   * 检查API配置状态
   */
  static checkConfiguration(): {
    hasGeneralKey: boolean;
    hasGoogleKey: boolean;
    hasVolcengineKey: boolean;
    configuredModels: string[];
  } {
    const hasGeneralKey = !!process.env.CLOUDMIST_API_KEY;
    const hasGoogleKey = !!process.env.CLOUDMIST_GOOGLE_API_KEY;
    const hasVolcengineKey = !!process.env.VOLCENGINE_API_KEY;
    
    const configuredModels: string[] = [];
    
    if (hasGeneralKey) {
      configuredModels.push('gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-sonnet', 'claude-3-opus');
    }
    
    if (hasGoogleKey) {
      configuredModels.push('gemini-pro', 'gemini-2.5-pro', 'gemini-pro-vision');
    }

    if (hasVolcengineKey) {
      configuredModels.push('doubao-pro-32k', 'doubao-pro-128k', 'doubao-lite');
    }

    return {
      hasGeneralKey,
      hasGoogleKey,
      hasVolcengineKey,
      configuredModels
    };
  }
}
