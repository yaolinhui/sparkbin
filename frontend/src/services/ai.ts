// AI Service - Backend Proxy Mode
// 所有 AI 调用都通过后端代理，前端不接触 API Key

export type AIProvider = 'deepseek' | 'kimi' | 'doubao';

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const AI_PROVIDER_NAMES: Record<AIProvider, string> = {
  deepseek: 'DeepSeek',
  kimi: 'Kimi',
  doubao: '豆包',
};

// 当前选中的提供商（仅用于选择，不存储 API Key）
let currentProvider: AIProvider = 'deepseek';

export function getCurrentProvider(): AIProvider {
  return currentProvider;
}

export function setCurrentProvider(provider: AIProvider) {
  currentProvider = provider;
  localStorage.setItem('sparkbin_ai_provider', provider);
}

// 初始化时读取保存的 provider
const savedProvider = localStorage.getItem('sparkbin_ai_provider') as AIProvider | null;
if (savedProvider && ['deepseek', 'kimi', 'doubao'].includes(savedProvider)) {
  currentProvider = savedProvider;
}

class AIService {
  private provider: AIProvider;

  constructor() {
    this.provider = currentProvider;
  }

  updateProvider(provider: AIProvider) {
    this.provider = provider;
    setCurrentProvider(provider);
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  // 流式聊天 - 通过 SSE 连接到后端
  async *chatCompletionStream(
    messages: KimiMessage[],
  ): AsyncGenerator<string, void, unknown> {
    const { getAuthToken } = await import('./api');
    const token = getAuthToken();

    const response = await fetch('http://localhost:8000/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        provider: this.provider,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`AI API error: ${error.message || response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const chunk = JSON.parse(data);
              const content = chunk.choices?.[0]?.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // 非流式聊天（兼容性）
  async chatCompletion(messages: KimiMessage[]): Promise<string> {
    let fullContent = '';
    for await (const chunk of this.chatCompletionStream(messages)) {
      fullContent += chunk;
    }
    return fullContent;
  }

  // 优化痛点描述
  async optimizePainPoint(painPoint: string): Promise<string> {
    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: '你是一个产品命名和描述优化专家。请将用户的痛点描述优化为简洁、有吸引力的产品标题和精炼的痛点描述。返回格式：\n标题：[优化后的标题]\n痛点：[优化后的描述]',
      },
      {
        role: 'user',
        content: `请优化以下痛点描述：\n${painPoint}`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 生成阶段建议
  async generateStageAdvice(stage: string, context: string): Promise<string> {
    const stagePrompts: Record<string, string> = {
      idea: '请帮助完善这个想法，提供深入思考的角度和可能的方向。',
      research: '请提供调研框架和建议，包括市场分析、竞品对比等方面。',
      dev: '请提供技术实现建议、任务分解方案或代码建议。',
      complete: '请提供项目收尾检查清单和测试建议。',
      launch: '请提供上线部署检查清单和注意事项。',
      promote: '请提供宣传渠道建议和文案模板。',
    };

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的项目顾问，擅长帮助创业者完善产品和项目。${stagePrompts[stage] || '请提供专业的建议。'}`,
      },
      {
        role: 'user',
        content: context || '请给我一些建议。',
      },
    ];

    return this.chatCompletion(messages);
  }
}

export const aiService = new AIService();
export default AIService;
