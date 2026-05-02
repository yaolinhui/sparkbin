// AI Service - Backend Proxy Mode
// 所有 AI 调用都通过后端代理，前端不接触 API Key

export type AIProvider = 'deepseek' | 'kimi' | 'doubao' | 'openai' | 'ollama';

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StageChatContext {
  projectId?: string;
  stageKey?: string;
  enableStageLoop?: boolean;
}

export interface StageStreamMeta {
  stage_snapshot?: StageSnapshot | null;
  sync_payload?: string;
  sync_payload_structured?: {
    summary?: string;
    items?: string[];
    stage_key?: string;
    sync_mode?: 'append' | 'replace' | string;
    raw?: Record<string, unknown>;
  };
  next_question?: string;
  retry_used?: boolean;
}

export interface StageChatHandlers {
  onMeta?: (meta: StageStreamMeta) => void;
}

export const AI_PROVIDER_NAMES: Record<AIProvider, string> = {
  deepseek: 'DeepSeek',
  kimi: 'Kimi',
  doubao: '豆包',
  openai: 'OpenAI',
  ollama: 'Ollama (本地)',
};

// API 交互接口 - 从 api.ts 导入
import { authApi, aiApi as originalAiApi, getAuthToken, type StageSnapshot } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  localStorage.setItem('sparkbin_ai_provider_v2', provider);
}

// 初始化时读取保存的 provider
const savedProvider = localStorage.getItem('sparkbin_ai_provider_v2') as AIProvider | null;
if (savedProvider && ['deepseek', 'kimi', 'doubao', 'openai', 'ollama'].includes(savedProvider)) {
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
    context?: StageChatContext,
    handlers?: StageChatHandlers,
  ): AsyncGenerator<string, void, unknown> {
    const token = getAuthToken();

    // 始终使用最新的 provider（从 localStorage 读取）
    const provider = getCurrentProvider();

    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`,
      },
      body: JSON.stringify({
        provider,
        messages,
        stream: true,
        project_id: context?.projectId || null,
        stage_key: context?.stageKey || null,
        enable_stage_loop: context?.enableStageLoop ?? true,
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

            if (!chunk.meta) {
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
            } else {
              handlers?.onMeta?.(chunk.meta as StageStreamMeta);
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
              if (chunk.meta) {
                handlers?.onMeta?.(chunk.meta as StageStreamMeta);
              } else {
                const content = chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || '';
                if (content) {
                  receivedAnyContent = true;
                  yield content;
                }
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

  // 分析用户想法，生成理解维度
  async analyzeIdea(idea: string): Promise<string> {
    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的产品分析师，擅长从模糊的想法中提取核心要素。
请分析用户的想法，生成 2-5 个理解维度，每个维度包含标题和简要描述。

输出格式要求：
① 核心痛点: [一句话描述用户遇到的主要问题]
② 目标用户: [描述主要服务的人群]
③ 使用场景: [描述用户在什么情况下会使用这个产品]
④ 解决方案: [描述产品如何解决问题]
⑤ 差异化价值: [与现有方案相比的优势]

根据想法的复杂度，生成 2-5 个维度即可，不需要全部填满。`,
      },
      {
        role: 'user',
        content: `请分析这个想法：\n${idea}`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 根据确认的维度生成优化后的标题和描述
  async generateFromDimensions(
    originalIdea: string,
    dimensions: { title: string; content: string }[]
  ): Promise<string> {
    const dimensionsText = dimensions
      .map((d, i) => `${i + 1}. ${d.title}: ${d.content}`)
      .join('\n');

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的产品命名和描述优化专家。
请根据用户确认的理解维度，生成一个简洁有力的产品标题和精炼的痛点描述。

输出格式：
标题：[15字以内的产品名称]
痛点：[2-3句话描述核心痛点和解决方案]`,
      },
      {
        role: 'user',
        content: `原始想法：${originalIdea}\n\n确认的维度：\n${dimensionsText}\n\n请生成优化的标题和描述。`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 流式分析项目想法：同时生成理解维度 + 标题 + 痛点描述
  // 返回 AsyncGenerator，前端可实时接收 chunk 显示打字机效果
  async *streamAnalyzeProject(idea: string): AsyncGenerator<string, void, unknown> {
    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的产品分析师，擅长从模糊的想法中提取核心要素并优化表达。
请分析用户的想法，生成理解维度、产品标题和精炼的痛点描述。

输出格式（严格遵循以下标记）：
【维度】
① 核心痛点: [一句话描述]
② 目标用户: [描述主要服务的人群]
③ 使用场景: [描述用户在什么情况下会使用]
（根据复杂度生成 2-5 个维度）

【标题】
[15字以内的产品名称]

【痛点】
[2-3句话描述核心痛点和解决方案]

请确保三个标记【维度】【标题】【痛点】都存在。`,
      },
      {
        role: 'user',
        content: `请分析这个想法：\n${idea}`,
      },
    ];

    for await (const chunk of this.chatCompletionStream(messages)) {
      yield chunk;
    }
  }

  // 解析流式分析结果：从完整文本中提取维度、标题、痛点
  parseProjectAnalysis(result: string): {
    dimensions: { title: string; content: string }[];
    title: string;
    painPoint: string;
  } {
    // 提取维度部分
    const dimMatch = result.match(/【维度】([\s\S]*?)(?=【标题】)/);
    const titleMatch = result.match(/【标题】\s*\n?\s*([\s\S]*?)(?=【痛点】)/);
    const painMatch = result.match(/【痛点】\s*\n?\s*([\s\S]*)/);

    // 解析维度
    const dimensions: { title: string; content: string }[] = [];
    if (dimMatch) {
      const dimText = dimMatch[1];
      const lines = dimText.split('\n');
      let id = 1;
      for (const line of lines) {
        if (id > 5) break;
        const match = line.match(/^\s*(?:[①②③④⑤]|\d+[.．]|[-•])\s*([^:：]+)[:：]\s*(.+)$/);
        if (match) {
          dimensions.push({
            title: match[1].trim(),
            content: match[2].trim(),
          });
          id++;
        }
      }
    }

    // 如果没解析到维度，使用默认维度
    if (dimensions.length === 0) {
      dimensions.push(
        { title: '核心痛点', content: '用户遇到的主要问题' },
        { title: '目标用户', content: '主要服务对象' },
        { title: '使用场景', content: '什么时候会使用' },
      );
    }

    // 提取标题
    let title = '';
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/^标题[:：]\s*/, '').split('\n')[0] || '';
    }

    // 提取痛点
    let painPoint = '';
    if (painMatch) {
      painPoint = painMatch[1].trim().replace(/^痛点[:：]\s*/, '');
    }

    return { dimensions, title, painPoint };
  }

  // 为想法阶段生成建议（走后端代理）
  async generateIdeaSuggestion(
    projectId: string,
    title: string,
    painPoint: string,
    originalIdea: string,
    notes: { title: string; content: string }[]
  ): Promise<{ title: string; content: string }[]> {
    const response = await originalAiApi.suggestIdeaNotes({
      project_id: projectId,
      title,
      pain_point: painPoint,
      original_idea: originalIdea,
      current_notes: notes.map((n) => ({ title: n.title, content: n.content })),
    });
    return response.notes;
  }

  // 流式生成想法阶段建议（使用通用 chat 接口）
  async *streamIdeaSuggestion(
    projectId: string,
    title: string,
    painPoint: string,
    originalIdea: string,
    notes: { title: string; content: string }[]
  ): AsyncGenerator<string, void, unknown> {
    const notesText = notes.map((n, i) => `${i + 1}. ${n.title}：${n.content}`).join('\n');

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个资深产品顾问，擅长帮助独立开发者梳理和打磨产品思路。

请根据用户提供的项目信息，为每个维度提供具体、可执行的改进建议。

输出格式要求：
- 每个维度用 ### 开头，后跟维度标题
- 标题下方直接写建议内容，不要编号
- 内容要具体、 actionable，避免空话
- 如果某个维度内容已经很好，可以说"当前内容已经比较清晰，建议补充..."

例如：
### 核心痛点
建议补充用户遇到这个痛点的具体频率和场景...

### 目标用户
可以更精确地描述用户画像，比如年龄、职业、使用习惯...`,
      },
      {
        role: 'user',
        content: `项目标题：${title}
痛点描述：${painPoint}
原始想法：${originalIdea || painPoint}

当前各维度内容：
${notesText}

请为每个维度提供改进建议。`,
      },
    ];

    yield* this.chatCompletionStream(messages, {
      projectId,
      stageKey: 'idea',
    });
  }

  // 分析验证数据并给出 GO/NO-GO 决策建议
  async analyzeDecision(
    _projectId: string,
    title: string,
    painPoint: string,
    items: {
      title: string;
      description: string;
      status: string;
      result?: {
        sampleSize: number;
        keyFindings: string[];
        conclusion: string;
        notes: string;
      };
    }[]
  ): Promise<string> {
    const itemsText = items
      .map((item, i) => {
        let statusText = '';
        switch (item.status) {
          case 'validated':
            statusText = '已验证通过';
            break;
          case 'failed':
            statusText = '验证失败';
            break;
          case 'in_progress':
            statusText = '进行中';
            break;
          default:
            statusText = '待验证';
        }
        let resultText = '';
        if (item.result) {
          const findings = item.result.keyFindings.filter((f) => f.trim()).join('；') || '无';
          resultText = `\n  - 样本量：${item.result.sampleSize}人\n  - 关键发现：${findings}\n  - 验证结论：${item.result.conclusion === 'passed' ? '通过' : item.result.conclusion === 'failed' ? '失败' : '需更多数据'}\n  - 验证笔记：${item.result.notes || '无'}`;
        }
        return `${i + 1}. ${item.title}（${statusText}）\n   描述：${item.description}${resultText}`;
      })
      .join('\n\n');

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个资深产品决策顾问，擅长根据验证数据给出客观的 Go/No-Go 建议。

你的分析必须基于验证项的具体内容，而不是简单的数量统计。

分析框架（必须全部覆盖）：

1. **核心假设覆盖度**
   - 验证项是否覆盖了产品的所有关键假设？
   - 是否有遗漏的致命假设（如付费意愿、痛点真实性）？

2. **验证质量评估**
   - 每个验证项的样本量是否足够（N≥5 为最低标准）？
   - 验证方法是否可靠（访谈 > 问卷 > 猜测）？
   - 是否有明显的验证偏差（如只问了朋友）？

3. **致命假设风险评估**
   - 识别哪些假设是"致命假设"（如果失败项目必须终止）
   - 这些致命假设的验证结果如何？
   - 如果致命假设验证失败，必须建议 NO-GO

4. **数据一致性分析**
   - 不同验证项的结果是否互相支持？
   - 是否有矛盾的数据需要解释？

5. **综合决策建议**
   - 基于以上分析，给出 GO / NO-GO / MAYBE 建议
   - 必须说明理由，不能简单基于通过/失败数量
   - 如果是 MAYBE，说明还需要验证什么

语气要求：
- 专业、客观、有理有据
- 不要给模糊的安慰，也不要过度悲观
- 如果数据不足以支持任何结论，明确指出`,
      },
      {
        role: 'user',
        content: `产品名称：${title}
痛点描述：${painPoint}

验证项详情：
${itemsText}

请按照上述框架进行深度分析，给出综合决策建议。`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 生成验证工具（问卷、访谈提纲等）
  async generateValidationTools(
    title: string,
    painPoint: string,
    ideaContent: string,
    type: 'survey' | 'interview' | 'community' | 'competitor'
  ): Promise<{ title: string; content: string }> {
    const typePrompts: Record<typeof type, string> = {
      survey: `生成一份简短的用户调研问卷，包含 5-8 个问题。
目的是验证用户是否真的有这个痛点，以及他们的付费意愿。
问卷应该简洁明了，适合在线发放（如腾讯问卷、问卷星）。`,

      interview: `生成一份用户访谈提纲，包含 8-10 个开放式问题。
目的是深入了解用户的真实需求和使用场景。
问题应该循序渐进，从背景问题过渡到具体痛点。`,

      community: `生成一份适合发布到技术社区的讨论文案。
目的是引发社区讨论，收集潜在用户的反馈。
文案应该友好、开放，避免过度宣传。`,

      competitor: `生成一份竞品分析模板，列出 3-5 个主要竞品进行对比。
对比维度包括：功能、价格、用户体验、差异化机会。
目的是找到市场空白和竞争优势。`,
    };

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个用户研究专家，擅长设计验证实验和收集用户反馈。
${typePrompts[type]}

请直接输出工具内容，不要添加额外说明。`,
      },
      {
        role: 'user',
        content: `产品名称：${title}
痛点描述：${painPoint}
想法阶段内容：${ideaContent || '暂无详细内容'}

请生成${type === 'survey' ? '问卷' : type === 'interview' ? '访谈提纲' : type === 'community' ? '社区文案' : '竞品分析模板'}。`,
      },
    ];

    const response = await this.chatCompletion(messages);

    // 提取标题（第一行或前20字）
    const lines = response.trim().split('\n');
    const toolTitle = lines[0].slice(0, 30) || (type === 'survey' ? '用户调研问卷' : type === 'interview' ? '用户访谈提纲' : type === 'community' ? '社区讨论文案' : '竞品分析');

    return {
      title: toolTitle,
      content: response,
    };
  }

  // 分析验证数据
  async analyzeValidation(
    title: string,
    items: { title: string; status: string; result?: { sampleSize: number; conclusion: string } }[]
  ): Promise<string> {
    const itemsText = items
      .map((item, i) => {
        let statusText = '';
        switch (item.status) {
          case 'validated':
            statusText = '已验证通过';
            break;
          case 'failed':
            statusText = '验证失败';
            break;
          case 'in_progress':
            statusText = '进行中';
            break;
          default:
            statusText = '待验证';
        }
        let resultText = '';
        if (item.result) {
          resultText = ` (样本${item.result.sampleSize}人，结论：${item.result.conclusion === 'passed' ? '通过' : item.result.conclusion === 'failed' ? '失败' : '需更多数据'})`;
        }
        return `${i + 1}. ${item.title}: ${statusText}${resultText}`;
      })
      .join('\n');

    const validatedCount = items.filter((i) => i.status === 'validated').length;
    const failedCount = items.filter((i) => i.status === 'failed').length;

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个产品决策顾问，擅长根据验证数据给出客观的 Go/No-Go 建议。
请基于当前的验证进度，给出：
1. 当前验证进度总结
2. 发现的风险或机会
3. 下一步建议

语气要专业但友好，符合 Vibe/独立开发理念。`,
      },
      {
        role: 'user',
        content: `产品：${title}

验证进度：
${itemsText}

统计：${validatedCount}项通过，${failedCount}项失败，共${items.length}项

请给出分析和建议。`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 生成设计提示词
  async generateDesignPrompt(
    title: string,
    painPoint: string,
    platform: string,
    templateName: string
  ): Promise<string> {
    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的 UI/UX 设计师，擅长将产品概念转化为具体的实现提示词。
请生成一个详细的设计提示词，用于指导开发者实现界面。

提示词应该包含：
1. 整体布局和结构
2. 配色方案建议
3. 组件和交互细节
4. 响应式考虑（如果是 Web）
5. 技术实现建议

语气要具体、可操作，适合直接用于 Vibe Coding。`,
      },
      {
        role: 'user',
        content: `产品：${title}
痛点：${painPoint}
平台：${platform}
模板风格：${templateName}

请生成详细的设计提示词。`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 基于风格生成设计样板
  async generateStyleSample(
    styleName: string,
    styleTraits: string[],
    title: string,
    painPoint: string,
    platform: string
  ): Promise<{ name: string; description: string; prompt: string }> {
    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的 UI/UX 设计师，擅长将产品概念转化为具体的设计方案。
请根据指定的设计风格，为这个产品生成一份设计样板方案。

输出格式（严格遵循）：
【名称】
[5-10字的设计方案名称]

【描述】
[2-3句话描述这个设计方案如何解决问题，包含视觉风格特点]

【提示词】
[详细的设计提示词，包含：
1. 整体视觉风格和氛围
2. 配色方案（具体色值或色系）
3. 布局结构建议
4. 字体和排版风格
5. 关键组件设计
6. 动效和交互建议
7. 响应式适配（如适用）
8. 技术实现建议]

语气要具体、可操作，适合直接用于 Vibe Coding。`,
      },
      {
        role: 'user',
        content: `产品：${title}
痛点：${painPoint}
平台：${platform}
设计风格：${styleName}
风格特征：${styleTraits.join('、')}

请生成设计样板方案。`,
      },
    ];

    const response = await this.chatCompletion(messages);

    const nameMatch = response.match(/【名称】\s*\n?\s*([\s\S]*?)(?=【描述】)/);
    const descMatch = response.match(/【描述】\s*\n?\s*([\s\S]*?)(?=【提示词】)/);
    const promptMatch = response.match(/【提示词】\s*\n?\s*([\s\S]*)/);

    return {
      name: nameMatch?.[1]?.trim() || `${styleName}方案`,
      description: descMatch?.[1]?.trim() || `基于${styleName}的设计方案`,
      prompt: promptMatch?.[1]?.trim() || response,
    };
  }

  // 基于参考项目生成设计提示词
  async generatePromptFromReference(
    referenceName: string,
    referenceFeatures: string[],
    referenceUrl: string,
    title: string,
    painPoint: string,
    platform: string
  ): Promise<string> {
    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的 UI/UX 设计师，擅长从优秀的设计参考中提取核心设计语言，并转化为具体的实现提示词。
请分析参考项目的设计特点，然后为当前产品生成一份定制化的设计提示词。

提示词应该包含：
1. 整体视觉风格和氛围（借鉴参考项目的哪些设计元素）
2. 配色方案建议（具体色值）
3. 布局和排版结构
4. 关键组件设计细节
5. 动效和交互建议
6. 响应式考虑
7. 技术栈和实现建议

语气要具体、可操作，适合直接复制到 Claude Code、Cursor 等 AI 编程工具中使用。`,
      },
      {
        role: 'user',
        content: `参考项目：${referenceName}
参考项目 URL：${referenceUrl}
参考项目设计特征：
${referenceFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

目标产品：${title}
痛点：${painPoint}
平台：${platform}

请生成详细的设计提示词，要求：
- 借鉴参考项目的优秀设计语言
- 但要适配当前产品的具体需求
- 包含具体可执行的配色、布局、组件建议`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 分析功能清单
  async analyzeFeatures(
    title: string,
    features: { name: string; priority: string; status: string }[]
  ): Promise<string> {
    const p0Features = features.filter((f) => f.priority === 'P0');
    const p0Done = p0Features.filter((f) => f.status === 'done').length;
    const p0Total = p0Features.length;

    const featuresText = features
      .map((f, i) => {
        let statusIcon = '';
        switch (f.status) {
          case 'done':
            statusIcon = '✓';
            break;
          case 'doing':
            statusIcon = '▶';
            break;
          default:
            statusIcon = '○';
        }
        return `${i + 1}. ${statusIcon} [${f.priority}] ${f.name}`;
      })
      .join('\n');

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个技术顾问，擅长帮助开发者规划 MVP 开发。
请基于当前的功能清单，给出：
1. 进度总结
2. 开发顺序建议
3. 功能裁剪建议（如果有太多 P0）
4. 发布准备度评估

语气要务实，强调"不完美也要发"的 Vibe 开发理念。`,
      },
      {
        role: 'user',
        content: `产品：${title}

功能清单：
${featuresText}

进度：${p0Done}/${p0Total} P0 功能完成

请给出分析和建议。`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 生成平台文案
  async generatePlatformContent(
    title: string,
    painPoint: string,
    platform: 'xiaohongshu' | 'twitter' | 'producthunt' | 'jike' | 'v2ex' | 'wechat'
  ): Promise<{ title: string; content: string; tags?: string[] }> {
    const platformPrompts: Record<typeof platform, string> = {
      xiaohongshu: `为小红书生成发布文案。
风格：emoji 多、口语化、真实分享感、带话题标签
结构：封面标题 + 正文 + 话题标签`,

      twitter: `为 Twitter/X 生成发布文案。
风格：简洁有力、直接、带链接
限制：280 字符以内`,

      producthunt: `为 ProductHunt 生成发布文案。
风格：英文、专业、突出功能和价值主张
结构：Tagline + Description + Key Features`,

      jike: `为即刻生成发布文案。
风格：轻松讨论风、适合圈子分享、不那么正式`,

      v2ex: `为 V2EX 生成发布文案。
风格：技术社区风、分享开发经历、寻求反馈`,

      wechat: `为微信公众号生成发布文案。
风格：详细、有深度、适合长文
结构：标题 + 引言 + 正文 + 结尾`,
    };

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的内容运营专家，擅长为不同平台生成适配的文案。
${platformPrompts[platform]}

请直接输出文案内容，格式：
标题：[标题]
内容：[正文]
标签：[标签1,标签2,标签3]`,
      },
      {
        role: 'user',
        content: `产品名称：${title}
产品痛点/价值：${painPoint}

请生成 ${platform} 平台的发布文案。`,
      },
    ];

    const response = await this.chatCompletion(messages);

    // 解析响应
    const titleMatch = response.match(/标题：(.+)/);
    const contentMatch = response.match(/内容：([\s\S]+?)(?=标签：|$)/);
    const tagsMatch = response.match(/标签：(.+)/);

    return {
      title: titleMatch?.[1]?.trim() || title,
      content: contentMatch?.[1]?.trim() || response,
      tags: tagsMatch?.[1]?.split(/[,，]/).map(t => t.trim()).filter(Boolean),
    };
  }

  // 生成内容创意
  async generateContentIdea(title: string, painPoint: string): Promise<string> {
    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个内容营销专家，擅长为产品生成吸引人的内容标题。
请生成一个简短、有吸引力的内容标题，用于社交媒体发布。
标题应该：
1. 引起目标用户兴趣
2. 突出产品价值
3. 适合社交媒体传播
4. 15-30字以内`,
      },
      {
        role: 'user',
        content: `产品：${title}
痛点：${painPoint}

请生成一个内容标题。`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 分析增长数据
  async analyzeGrowth(
    title: string,
    metrics: { channel: string; newUsers: number; conversionRate: number }[]
  ): Promise<string> {
    const metricsText = metrics
      .filter(m => m.newUsers > 0)
      .map(m => `${m.channel}: ${m.newUsers} 新增用户, ${m.conversionRate}% 转化率`)
      .join('\n');

    const totalNewUsers = metrics.reduce((sum, m) => sum + m.newUsers, 0);
    const bestChannel = metrics.reduce((best, m) =>
      m.conversionRate > best.conversionRate ? m : best, metrics[0]);

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个增长专家，擅长分析渠道效果和制定增长策略。
请基于当前数据给出：
1. 渠道效果分析
2. 哪个渠道最值得投入
3. 下一步增长建议
4. 内容策略建议

语气要 actionable，符合 Vibe/独立开发理念。`,
      },
      {
        role: 'user',
        content: `产品：${title}

渠道数据：
${metricsText || '暂无数据'}

总计：${totalNewUsers} 新增用户
最佳渠道：${bestChannel?.channel || 'N/A'} (${bestChannel?.conversionRate || 0}% 转化)

请给出分析和建议。`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 生成问卷配置（AI 直接输出 JSON）
  async generateSurveyConfig(
    projectTitle: string,
    painPoint: string,
    originalIdea: string,
    topic: string,
    targetUsers: string,
    questionCount: number = 8
  ): Promise<string> {
    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的用户研究问卷设计专家。
请根据用户提供的项目信息，设计一份结构化的验证问卷。

要求：
1. 输出必须是合法的 JSON，不要任何 Markdown 代码块标记，不要任何解释文字
2. 问卷包含 ${questionCount} 题
3. 前 2 题为筛选/画像题（single_choice），中间为验证题（混合 single_choice、multi_choice、rating），最后 1 题为开放题（text）
4. 每题必须包含 id、type、title、required、options（如适用）
5. 单选/多选选项不超过 5 个，措辞中立
6. rating 题为 5 分制
7. 总填写时间控制在 3 分钟内
8. id 使用 q1, q2, q3... 格式

JSON 结构：
{
  "title": "问卷标题",
  "description": "简短说明",
  "questions": [
    {
      "id": "q1",
      "type": "single_choice",
      "title": "问题内容",
      "required": true,
      "options": ["选项1", "选项2"]
    }
  ]
}`,
      },
      {
        role: 'user',
        content: `产品名称：${projectTitle}
痛点描述：${painPoint || '暂无'}
想法阶段内容：${originalIdea || '暂无'}
调研主题：${topic}
目标用户：${targetUsers || '未指定'}
题目数量：${questionCount}

请生成问卷 JSON。`,
      },
    ];

    return this.chatCompletion(messages);
  }

  // 分析变现数据
  async analyzeMonetization(
    title: string,
    data: {
      strategy: string;
      mrr: number;
      paidUsers: number;
      funnel: { visitors: number; signups: number; trials: number; paid: number };
    }
  ): Promise<string> {
    const conversionRate = data.funnel.visitors > 0
      ? ((data.funnel.paid / data.funnel.visitors) * 100).toFixed(2)
      : 0;

    const arpu = data.paidUsers > 0 ? (data.mrr / data.paidUsers).toFixed(2) : 0;

    const messages: KimiMessage[] = [
      {
        role: 'system',
        content: `你是一个变现专家，擅长 SaaS 定价和转化优化。
请基于当前数据给出：
1. 变现健康度评估
2. 转化漏斗分析
3. 定价优化建议
4. 增长建议

语气要务实，适合独立开发者。`,
      },
      {
        role: 'user',
        content: `产品：${title}
变现模式：${data.strategy}
MRR：$${data.mrr}
付费用户：${data.paidUsers}
ARPU：$${arpu}

转化漏斗：
- 访客：${data.funnel.visitors}
- 注册：${data.funnel.signups}
- 试用：${data.funnel.trials}
- 付费：${data.funnel.paid}
整体转化率：${conversionRate}%

请给出分析和建议。`,
      },
    ];

    return this.chatCompletion(messages);
  }
}

export const aiService = new AIService();
export default AIService;
