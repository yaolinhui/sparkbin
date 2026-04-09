// AI Service - Backend Proxy Mode
// 所有 AI 调用都通过后端代理，前端不接触 API Key

export type AIProvider = 'deepseek' | 'kimi' | 'doubao' | 'openai';

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const AI_PROVIDER_NAMES: Record<AIProvider, string> = {
  deepseek: 'DeepSeek',
  kimi: 'Kimi',
  doubao: '豆包',
  openai: 'OpenAI',
};

// API 交互接口 - 从 api.ts 导入
import { authApi, aiApi as originalAiApi } from './api';

// 合并 authApi 和 aiApi 的方法
export const aiApi = {
  ...originalAiApi,
  getPreferredModel: authApi.getPreferredModel,
  setPreferredModel: authApi.setPreferredModel,
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
if (savedProvider && ['deepseek', 'kimi', 'doubao', 'openai'].includes(savedProvider)) {
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

    // 始终使用最新的 provider（从 localStorage 读取）
    const provider = getCurrentProvider();

    const response = await fetch('http://localhost:8000/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        provider,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedAnyContent = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
            continue;
          }

          const data = trimmedLine.slice(6);
          if (data === '[DONE]') {
            if (!receivedAnyContent) {
              throw new Error('AI 返回空响应，请检查 AI 配置或稍后重试');
            }
            return;
          }

          try {
            const chunk = JSON.parse(data);
            // 检查是否是错误消息
            if (chunk.error) {
              throw new Error(chunk.error);
            }

            // 处理流式响应格式 (delta)
            const delta = chunk.choices?.[0]?.delta;
            if (delta) {
              const content = delta.content || '';
              if (content) {
                receivedAnyContent = true;
                yield content;
              }
            }

            // 处理非流式格式 (message) - 某些提供商可能返回这种格式
            const message = chunk.choices?.[0]?.message;
            if (message?.content) {
              receivedAnyContent = true;
              yield message.content;
            }
          } catch (e) {
            // 如果是我们抛出的错误，重新抛出
            if (e instanceof Error && !e.message.includes('JSON') && !e.message.includes('Unexpected token')) {
              throw e;
            }
            // 忽略 JSON 解析错误，继续处理下一行
          }
        }
      }

      // 处理缓冲区中剩余的内容
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data !== '[DONE]') {
            try {
              const chunk = JSON.parse(data);
              if (chunk.error) {
                throw new Error(chunk.error);
              }
              const content = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || '';
              if (content) {
                receivedAnyContent = true;
                yield content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!receivedAnyContent) {
      throw new Error('AI 返回空响应，请检查 AI 配置或稍后重试');
    }
  }

  // 非流式聊天（兼容性）
  async chatCompletion(messages: KimiMessage[]): Promise<string> {
    let fullContent = '';
    let chunkCount = 0;

    try {
      for await (const chunk of this.chatCompletionStream(messages)) {
        fullContent += chunk;
        chunkCount++;
      }
    } catch (error) {
      // 如果流式处理中已经抛出错误，直接传递
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`AI 请求失败: ${String(error)}`);
    }

    const trimmedContent = fullContent.trim();
    if (!trimmedContent) {
      throw new Error(`AI 返回空响应（收到 ${chunkCount} 个数据块但无内容），请检查: 1) API Key 是否正确 2) 模型是否可用 3) 账户余额是否充足`);
    }
    return trimmedContent;
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
      idea: '请帮助完善这个想法，深入思考核心痛点和可能的产品方向。',
      validate: '请提供快速验证需求的方法，比如问卷设计、落地页测试、用户访谈等。',
      prototype: '请提供MVP开发建议，如何用最快速度做出可用版本，不要追求完美。',
      ship: '请提供发布前的最后检查清单和快速上线策略，克服完美主义。',
      grow: '请提供获取首批用户的方法，包括社区运营、内容营销、SEO等策略。',
      monetize: '请提供定价策略、付费墙设计和变现模式建议，独立开发要赚钱。',
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
