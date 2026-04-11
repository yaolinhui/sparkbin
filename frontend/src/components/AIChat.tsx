import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronRight, ChevronLeft } from 'lucide-react';
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
  validate: {
    zh: '> 初始化验证模块...\n\n准备帮助您验证想法。\n\n可以尝试询问：\n• 生成调研问卷\n• 用户访谈提纲\n• 竞品对比分析',
    en: '> INITIALIZING_VALIDATION_MODULE...\n\nReady to help validate your idea.\n\nTry asking:\n• Generate survey questions\n• Interview outline\n• Competitor analysis',
  },
  prototype: {
    zh: '> 初始化原型模块...\n\n准备帮助您构建原型。\n\n可以尝试询问：\n• 功能清单拆分\n• 技术选型建议\n• MVP优先级',
    en: '> INITIALIZING_PROTOTYPE_MODULE...\n\nReady to help build your prototype.\n\nTry asking:\n• Feature breakdown\n• Tech stack recommendations\n• MVP priorities',
  },
  ship: {
    zh: '> 初始化发布模块...\n\n准备帮助您发布产品。\n\n可以尝试询问：\n• 发布检查清单\n• 多平台文案生成\n• 用户反馈收集',
    en: '> INITIALIZING_SHIP_MODULE...\n\nReady to help launch your product.\n\nTry asking:\n• Launch checklist\n• Multi-platform copy\n• User feedback collection',
  },
  grow: {
    zh: '> 初始化增长模块...\n\n准备帮助您获取用户。\n\n可以尝试询问：\n• 内容日历规划\n• 渠道策略建议\n• 增长实验设计',
    en: '> INITIALIZING_GROWTH_MODULE...\n\nReady to help you acquire users.\n\nTry asking:\n• Content calendar\n• Channel strategy\n• Growth experiments',
  },
  monetize: {
    zh: '> 初始化变现模块...\n\n准备帮助您实现收入。\n\n可以尝试询问：\n• 定价策略建议\n• 转化漏斗分析\n• 收入优化方案',
    en: '> INITIALIZING_MONETIZE_MODULE...\n\nReady to help you generate revenue.\n\nTry asking:\n• Pricing strategy\n• Conversion funnel analysis\n• Revenue optimization',
  },
};

const QUICK_ACTIONS: Record<string, { zh: string; en: string }[]> = {
  idea: [
    { zh: '目标用户', en: 'target_user' },
    { zh: '价值主张', en: 'value_prop' },
  ],
  validate: [
    { zh: '调研问卷', en: 'survey' },
    { zh: '竞品分析', en: 'competitors' },
  ],
  prototype: [
    { zh: '功能拆分', en: 'features' },
    { zh: '技术选型', en: 'tech_stack' },
  ],
  ship: [
    { zh: '发布清单', en: 'checklist' },
    { zh: '推广文案', en: 'copy' },
  ],
  grow: [
    { zh: '内容日历', en: 'calendar' },
    { zh: '渠道策略', en: 'channels' },
  ],
  monetize: [
    { zh: '定价建议', en: 'pricing' },
    { zh: '转化分析', en: 'funnel' },
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
  const [isCollapsed, setIsCollapsed] = useState(false);
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
      // 识别配置错误并给出友好提示
      const isConfigError = errorMessage.includes('not configured') ||
                           errorMessage.includes('inactive') ||
                           errorMessage.includes('未配置') ||
                           errorMessage.includes('未激活');
      if (isConfigError) {
        setError(`${t('ai.error_prefix')} ${t('ai.config_required')}`);
      } else {
        setError(`${t('ai.error_prefix')} ${errorMessage}`);
      }
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

  // 折叠状态 - 吸附右边
  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-4 bg-brutal-surface border border-r-0 border-brutal-border
                     hover:bg-brutal-accent hover:text-brutal-bg transition-colors shadow-lg"
          title={t('ai.expand_assistant')}
        >
          <ChevronLeft className="w-4 h-4" />
          <div className="flex flex-col items-center gap-1">
            <Bot className="w-5 h-5" />
            <span className="text-xs font-mono writing-mode-vertical">AI</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-brutal-surface border-l border-brutal-border relative">
      {/* Collapse Button */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="absolute -left-6 top-4 w-6 h-10 bg-brutal-surface border border-r-0 border-brutal-border
                   flex items-center justify-center hover:bg-brutal-accent hover:text-brutal-bg transition-colors z-10"
        title={t('ai.collapse_assistant')}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-brutal-border bg-brutal-bg flex-shrink-0">
        <div className="w-8 h-8 border border-brutal-accent flex items-center justify-center bg-brutal-accent">
          <Bot className="w-4 h-4 text-brutal-bg" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm truncate">{t('ai.assistant')}</div>
          <div className="text-xs text-brutal-muted font-mono">backend-proxy-mode</div>
        </div>
      </div>

      {/* Messages - 限制最大高度确保输入框可见 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm min-h-0 max-h-[calc(100vh-280px)]">
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
        <div className="mx-4 mb-2 p-2 border border-brutal-warning text-brutal-warning text-xs font-mono flex-shrink-0">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      {actions.length > 0 && (
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg flex-shrink-0">
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

      {/* Input - 固定在底部 */}
      <div className="p-3 border-t border-brutal-border flex-shrink-0 bg-brutal-surface">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`>>> ${t('placeholder.type_message')}`}
            className="flex-1 p-2 bg-brutal-bg border border-brutal-border resize-none
                       focus:border-brutal-accent transition-colors h-[60px] text-sm font-mono"
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
