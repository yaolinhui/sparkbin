import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../i18n';
import { aiService } from '../services/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  stage: string;
  projectTitle?: string;
  onGenerateContent?: (content: string) => void;
}

const WELCOME_MESSAGES: Record<string, { zh: string; en: string }> = {
  idea: {
    zh: '> 初始化创意模块...\n\n准备帮助您完善这个想法。\n\n可以尝试询问：\n• 目标用户是谁？\n• 解决什么问题？\n• 生成价值主张',
    en: '> INITIALIZING_CREATIVE_MODULE...\n\nReady to help you refine this idea.\n\nTry asking:\n• Who is the target user?\n• What problem does this solve?\n• Generate a value proposition',
  },
  research: {
    zh: '> 初始化调研模块...\n\n准备帮助您进行调研。\n\n可以尝试询问：\n• 生成调研框架\n• 竞品分析模板\n• 市场规模评估',
    en: '> INITIALIZING_RESEARCH_MODULE...\n\nReady to help with your research.\n\nTry asking:\n• Generate a research framework\n• Competitor analysis template\n• Market sizing approach',
  },
  dev: {
    zh: '> 初始化开发模块...\n\n准备帮助您进行开发。\n\n可以尝试询问：\n• 分解任务清单\n• 技术选型建议\n• 代码审查',
    en: '> INITIALIZING_DEV_MODULE...\n\nReady to help with development.\n\nTry asking:\n• Break down tasks\n• Tech stack recommendations\n• Code review this approach',
  },
  complete: {
    zh: '> 初始化完成模块...\n\n准备帮助您收尾项目。\n\n可以尝试询问：\n• 生成上线清单\n• 需要测试什么？\n• 文档模板',
    en: '> INITIALIZING_COMPLETION_MODULE...\n\nReady to help wrap up the project.\n\nTry asking:\n• Generate a launch checklist\n• What should I test?\n• Documentation template',
  },
  launch: {
    zh: '> 初始化上线模块...\n\n准备帮助您部署上线。\n\n可以尝试询问：\n• 上线前检查清单\n• 监控设置指南\n• 回滚策略',
    en: '> INITIALIZING_LAUNCH_MODULE...\n\nReady to help with deployment.\n\nTry asking:\n• Pre-launch checklist\n• Monitoring setup guide\n• Rollback strategy',
  },
  promote: {
    zh: '> 初始化宣传模块...\n\n准备帮助您推广宣传。\n\n可以尝试询问：\n• 生成社交媒体文案\n• 推荐推广渠道\n• 创建发布时间线',
    en: '> INITIALIZING_PROMOTION_MODULE...\n\nReady to help with marketing.\n\nTry asking:\n• Generate social copy\n• Recommend channels\n• Create launch timeline',
  },
};

const QUICK_ACTIONS: Record<string, { zh: string; en: string }[]> = {
  idea: [
    { zh: '目标用户', en: 'target_user' },
    { zh: '价值主张', en: 'value_prop' },
  ],
  research: [
    { zh: '调研框架', en: 'framework' },
    { zh: '竞品分析', en: 'competitors' },
  ],
  dev: [
    { zh: '任务分解', en: 'tasks' },
    { zh: '技术选型', en: 'tech_stack' },
  ],
  promote: [
    { zh: '宣传文案', en: 'social_copy' },
    { zh: '推广渠道', en: 'channels' },
  ],
};

// Markdown styles for AI responses
const markdownStyles = `
  prose-headings:text-brutal-text prose-headings:font-mono prose-headings:text-base
  prose-p:text-brutal-text prose-p:text-sm
  prose-strong:text-brutal-accent prose-strong:font-bold
  prose-em:text-brutal-muted
  prose-code:text-brutal-accent prose-code:bg-brutal-surface prose-code:px-1 prose-code:text-xs
  prose-pre:bg-brutal-surface prose-pre:border prose-pre:border-brutal-border
  prose-ul:text-brutal-text prose-ul:text-sm
  prose-ol:text-brutal-text prose-ol:text-sm
  prose-li:marker:text-brutal-accent
  prose-blockquote:border-l-2 prose-blockquote:border-brutal-accent prose-blockquote:text-brutal-muted
`;

export function AIChat({ stage, projectTitle, onGenerateContent }: AIChatProps) {
  const { t, language } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messages.length === 0) {
      const welcome = WELCOME_MESSAGES[stage] || {
        zh: '> 准备就绪',
        en: '> Ready to assist.',
      };
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcome[language],
        },
      ]);
    }
  }, [stage, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildMessages = (userInput: string) => {
    const stageLabel = WELCOME_MESSAGES[stage]?.zh?.split('\n')[0]?.replace('> ', '') || stage;
    const systemPrompt = language === 'zh'
      ? `你是专业的项目顾问，擅长帮助创业者完善产品和项目。当前阶段：${stageLabel}`
      : `You are a professional project consultant. Current stage: ${stageLabel}`;
    const contextPrompt = projectTitle ? `Project: ${projectTitle}` : '';

    const msgs: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n${contextPrompt}`,
      },
    ];

    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      if (msg.id !== 'welcome') {
        msgs.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    msgs.push({
      role: 'user',
      content: userInput,
    });

    return msgs;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);
    setError(null);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const kimiMessages = buildMessages(input);
      abortControllerRef.current = new AbortController();

      let fullContent = '';
      for await (const chunk of aiService.chatCompletionStream(kimiMessages)) {
        fullContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessage.id ? { ...msg, content: fullContent } : msg
          )
        );
      }

      // 检查是否需要触发内容生成
      const generateKeywords = ['generate', 'create', 'write', 'draft', 'template', '生成', '创建', '写', '模板'];
      if (generateKeywords.some((kw) => input.toLowerCase().includes(kw))) {
        onGenerateContent?.(fullContent);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`${t('ai.api_error')}: ${errorMessage}`);
      // 移除空的 AI 消息
      setMessages((prev) => prev.filter((msg) => msg.id !== aiMessage.id));
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  const actions = QUICK_ACTIONS[stage] || [];

  return (
    <div className="flex flex-col h-full bg-brutal-surface border-l border-brutal-border">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-brutal-border bg-brutal-bg">
        <div className="w-8 h-8 border border-brutal-accent flex items-center justify-center bg-brutal-accent">
          <Bot className="w-4 h-4 text-brutal-bg" />
        </div>
        <div>
          <div className="font-mono text-sm">{t('ai.assistant')}</div>
          <div className="text-xs text-brutal-muted font-mono">backend-proxy-mode</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border ${
                message.role === 'user'
                  ? 'border-brutal-text bg-brutal-text'
                  : 'border-brutal-accent bg-brutal-accent'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-brutal-bg" />
              ) : (
                <Bot className="w-4 h-4 text-brutal-bg" />
              )}
            </div>
            <div
              className={`max-w-[85%] p-3 text-sm ${
                message.role === 'user'
                  ? 'bg-brutal-text text-brutal-bg border border-brutal-text'
                  : 'bg-brutal-bg text-brutal-text border border-brutal-border'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className={markdownStyles}>
                  <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 border border-brutal-accent bg-brutal-accent flex items-center justify-center">
              <Bot className="w-4 h-4 text-brutal-bg" />
            </div>
            <div className="bg-brutal-bg border border-brutal-border p-3 flex items-center gap-2">
              <span className="text-brutal-accent animate-blink">{'>'}</span>
              <span className="text-brutal-muted">{t('ai.thinking')}</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-brutal-accent animate-pulse" />
                <span className="w-1.5 h-1.5 bg-brutal-accent animate-pulse delay-75" />
                <span className="w-1.5 h-1.5 bg-brutal-accent animate-pulse delay-150" />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 p-2 border border-brutal-warning text-brutal-warning text-xs font-mono">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      {actions.length > 0 && (
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg">
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.en}
                onClick={() => handleQuickAction(action[language])}
                className="text-xs px-2 py-1 border border-brutal-border hover:border-brutal-accent transition-colors"
              >
                {language === 'zh' ? action.zh : action.en}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-brutal-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`>>> ${t('placeholder.type_message')}`}
            className="flex-1 p-2 bg-brutal-bg border border-brutal-border resize-none
                       focus:border-brutal-accent transition-colors min-h-[60px] text-sm font-mono"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="px-4 bg-brutal-accent text-brutal-bg border border-brutal-accent
                       hover:bg-brutal-text hover:border-brutal-text
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
