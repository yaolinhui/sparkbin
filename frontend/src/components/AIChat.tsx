import { useState, useRef, useEffect } from 'react';
import { Send, ChevronRight, ChevronLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../i18n/hooks';
import { aiService } from '../services/ai';
import { getUserId } from '../services/api';
import { PET_OPTIONS } from './AIPetConfig.constants';
import type { AIPetConfig } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  stage: string;
  projectTitle?: string;
  onGenerateContent?: (content: string) => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const WELCOME_MESSAGES: Record<string, { zh: string; en: string }> = {
  idea: {
    zh: '喵～我是你的创意小助手！\n\n让我帮你完善想法吧～',
    en: 'Meow~ I\'m your creative assistant!\n\nLet me help refine your idea~',
  },
  validate: {
    zh: '准备帮你验证想法！\n\n我们一起确认方向对不对～',
    en: 'Ready to validate your idea!\n\nLet\'s confirm the direction together~',
  },
  prototype: {
    zh: '来构建原型吧！\n\n我可以帮你拆分功能、选技术栈～',
    en: 'Let\'s build the prototype!\n\nI can help with features and tech stack~',
  },
  ship: {
    zh: '发布倒计时！\n\n检查一下清单，准备启航～',
    en: 'Launch countdown!\n\nCheck the list, ready to sail~',
  },
  grow: {
    zh: '增长时间到！\n\n让我们获取更多用户～',
    en: 'Growth time!\n\nLet\'s acquire more users~',
  },
  monetize: {
    zh: '变现模式开启！\n\n帮你设计定价策略～',
    en: 'Monetization mode on!\n\nHelp you design pricing strategy~',
  },
};

// 快速操作按钮 - 宠物风格推荐
const QUICK_ACTIONS: Record<string, { zh: string; emoji: string }[]> = {
  idea: [
    { zh: '目标用户是谁？', emoji: '👥' },
    { zh: '价值主张', emoji: '💎' },
    { zh: '痛点分析', emoji: '🎯' },
  ],
  validate: [
    { zh: '调研问卷', emoji: '📋' },
    { zh: '竞品分析', emoji: '🔍' },
    { zh: '用户访谈', emoji: '🎤' },
  ],
  prototype: [
    { zh: '功能拆分', emoji: '📦' },
    { zh: '技术选型', emoji: '⚙️' },
    { zh: 'MVP规划', emoji: '🚀' },
  ],
  ship: [
    { zh: '发布清单', emoji: '✅' },
    { zh: '推广文案', emoji: '📢' },
    { zh: '反馈收集', emoji: '💬' },
  ],
  grow: [
    { zh: '内容日历', emoji: '📅' },
    { zh: '渠道策略', emoji: '📣' },
    { zh: '增长实验', emoji: '🧪' },
  ],
  monetize: [
    { zh: '定价建议', emoji: '💰' },
    { zh: '转化分析', emoji: '📊' },
    { zh: '收入优化', emoji: '📈' },
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

export function AIChat({
  stage,
  projectTitle,
  onGenerateContent,
  isCollapsed = false,
  onCollapsedChange,
}: AIChatProps) {
  const { t, language } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petConfig, setPetConfig] = useState<AIPetConfig | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const petConfigKey = `sparkbin_pet_config_${getUserId() || 'guest'}`;

  // 加载宠物配置
  useEffect(() => {
    const saved = localStorage.getItem(petConfigKey);
    if (saved) {
      setPetConfig(JSON.parse(saved));
    }
  }, [petConfigKey]);

  const handleToggleCollapse = () => {
    onCollapsedChange?.(!isCollapsed);
  };

  // 宠物外观 - 从常量配置中查找，避免硬编码遗漏
  const selectedPet = PET_OPTIONS.find((p) => p.id === petConfig?.type) || PET_OPTIONS[0];
  const petEmoji = selectedPet.emoji;
  const petName = petConfig?.name || selectedPet.name;
  const petColor = selectedPet.color;
  const personalityEmoji = petConfig?.personality === 'gentle' ? '🌸' :
                           petConfig?.personality === 'rational' ? '📊' :
                           petConfig?.personality === 'zen' ? '🧘' : '⚡';

  useEffect(() => {
    if (messages.length === 0) {
      const welcome = WELCOME_MESSAGES[stage] || {
        zh: `嗨～我是${petName}，你的AI小伙伴！`,
        en: `Hi~ I'm ${petName}, your AI buddy!`,
      };
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcome[language],
        },
      ]);
    }
  }, [stage, language, petName, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildMessages = (userInput: string) => {
    const personality = petConfig?.personality || 'gentle';
    const verbosity = petConfig?.verbosity || 'moderate';

    const personalityPrompts: Record<string, string> = {
      gentle: '你是一位温柔鼓励的助手，总是用温暖的语气回应，善于发现用户的优点并给予肯定。',
      rational: '你是一位理性分析的助手，擅长逻辑思考和数据分析，给出清晰、有条理的建议。',
      zen: '你是一位佛系平和的助手，说话慢条斯理，善于让人放松心情，不焦虑。',
      sharp: '你是一位犀利直接的助手，善于发现问题本质，敢于挑战和质疑，推动用户思考。',
    };

    const systemPrompt = `${personalityPrompts[personality]}
当前阶段：${stage}
项目名称：${projectTitle || '未命名'}
回复风格：${verbosity === 'quiet' ? '简洁' : verbosity === 'chatty' ? '详细活泼' : '适中'}
请以${petName}的身份回复，语气要符合性格设定。`;

    const msgs: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      if (msg.id !== 'welcome') {
        msgs.push({ role: msg.role, content: msg.content });
      }
    }

    msgs.push({ role: 'user', content: userInput });
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

      const generateKeywords = ['generate', 'create', 'write', 'draft', 'template', '生成', '创建', '写', '模板'];
      if (generateKeywords.some((kw) => input.toLowerCase().includes(kw))) {
        onGenerateContent?.(fullContent);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const isConfigError = errorMessage.includes('not configured') ||
                           errorMessage.includes('inactive') ||
                           errorMessage.includes('未配置') ||
                           errorMessage.includes('未激活');
      if (isConfigError) {
        setError(`${t('ai.error_prefix')} ${t('ai.config_required')}`);
      } else {
        setError(`${t('ai.error_prefix')} ${errorMessage}`);
      }
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

  const quickActions = QUICK_ACTIONS[stage] || [];

  // 折叠状态 - 显示宠物图标
  if (isCollapsed) {
    return (
      <div className="h-full flex items-center justify-center">
        <button
          onClick={handleToggleCollapse}
          className="flex flex-col items-center gap-2 px-2 py-4 bg-brutal-surface border border-brutal-border
                     hover:border-brutal-accent transition-all duration-300 h-full max-h-40"
          title={`展开${petName}`}
        >
          <ChevronLeft className="w-4 h-4" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">{petEmoji}</span>
            <span className="text-xs font-mono [writing-mode:vertical-lr]">{petName}</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-brutal-surface border-l border-brutal-border relative">
      {/* Collapse Button */}
      <button
        onClick={handleToggleCollapse}
        className="absolute -left-6 top-4 w-6 h-10 bg-brutal-surface border border-r-0 border-brutal-border
                   flex items-center justify-center hover:bg-brutal-accent hover:text-brutal-bg transition-colors z-10"
        title={`收起${petName}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Header - 宠物形象 */}
      <div className="flex flex-col items-center p-4 border-b border-brutal-border bg-brutal-bg flex-shrink-0">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-5xl border-4"
            style={{
              backgroundColor: petColor + '20',
              borderColor: petColor,
              boxShadow: `0 4px 0 ${petColor}`,
            }}
          >
            {petEmoji}
          </div>
          <span className="absolute -top-1 -right-1 text-xl">{personalityEmoji}</span>
        </div>
        <div className="mt-2 text-center">
          <div className="font-mono text-sm font-bold">{petName}</div>
          <div className="text-xs text-brutal-muted font-mono">你的AI小伙伴</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {message.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                style={{ backgroundColor: petColor + '30' }}
              >
                {petEmoji}
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 text-sm rounded-2xl ${
                message.role === 'user'
                  ? 'bg-brutal-text text-brutal-bg rounded-br-none'
                  : 'bg-brutal-bg border border-brutal-border rounded-bl-none'
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
          <div className="flex gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
              style={{ backgroundColor: petColor + '30' }}
            >
              {petEmoji}
            </div>
            <div className="bg-brutal-bg border border-brutal-border p-3 rounded-2xl rounded-bl-none flex items-center gap-2">
              <span className="text-brutal-accent">{petName}正在思考</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce delay-75" />
                <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce delay-150" />
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

      {/* Quick Actions - 宠物推荐按钮 */}
      {quickActions.length > 0 && (
        <div className="px-4 py-2 border-t border-brutal-border bg-brutal-bg flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-brutal-muted font-mono">💡 {petName}推荐问：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.zh}
                onClick={() => handleQuickAction(action.zh)}
                className="text-xs px-3 py-1.5 border border-brutal-border hover:border-brutal-accent hover:bg-brutal-accent/10 transition-colors rounded-full flex items-center gap-1"
              >
                <span>{action.emoji}</span>
                <span>{action.zh}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-brutal-border flex-shrink-0 bg-brutal-surface">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`和${petName}聊天...`}
            className="flex-1 p-2 bg-brutal-bg border border-brutal-border resize-none
                       focus:border-brutal-accent transition-colors min-h-[60px] text-sm font-mono rounded"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="px-3 flex items-center justify-center rounded transition-colors"
            style={{
              backgroundColor: petColor,
              opacity: !input.trim() || isThinking ? 0.5 : 1,
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIChat;
