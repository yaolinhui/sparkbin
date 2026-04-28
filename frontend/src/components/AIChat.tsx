import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronRight, ChevronLeft, Maximize2, X, Heart, BarChart3, Coffee, Zap } from 'lucide-react';
import { SafeMarkdown } from './SafeMarkdown';
import { useI18n } from '../i18n/hooks';
import { aiService, aiApi, type StageStreamMeta } from '../services/ai';
import { getUserId, authApi, isAuthenticated } from '../services/api';
import { PET_OPTIONS } from './AIPetConfig.constants';
import { PixelPet } from './PixelPet';
import { PIXEL_PET_CATALOG } from './PixelPet.frames';
import { UpgradePromptModal } from './UpgradePromptModal';
import type { AIPetConfig } from '../types';
import type { StageSnapshot } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  syncPayload?: string;
  nextQuestion?: string;
}

interface AIChatProps {
  stage: string;
  projectId?: string;
  projectTitle?: string;
  onGenerateContent?: (content: string) => void;
  onSyncRequest?: (content: string) => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const WELCOME_MESSAGES: Record<string, Record<string, string>> = {
  idea: {
    zh: '喵～我是你的创意小助手！\n\n让我帮你完善想法吧～',
    en: 'Meow~ I\'m your creative assistant!\n\nLet me help refine your idea~',
    ja: 'にゃ～アイデアアシスタントだよ！\n\n一緒にアイデアを磨こう～',
    ko: '야옹~ 창의적 어시스턴트야!\n\n함께 아이디어를 다듬어보자~',
    es: '¡Miau~ Soy tu asistente creativo!\n\nDéjame ayudarte a perfeccionar tu idea~',
    fr: 'Miaou~ Je suis ton assistant créatif !\n\nLaisse-moi t\'aider à affiner ton idée~',
    de: 'Miau~ Ich bin dein kreativer Assistent!\n\nLass mich dir helfen, deine Idee zu verfeinern~',
  },
  validate: {
    zh: '准备帮你验证想法！\n\n我们一起确认方向对不对～',
    en: 'Ready to validate your idea!\n\nLet\'s confirm the direction together~',
    ja: 'アイデアを検証しよう！\n\n一緒に方向性を確認しよう～',
    ko: '아이디어를 검증하자!\n\n함께 방향성을 확인해보자~',
    es: '¡Listo para validar tu idea!\n\nConfirmemos la dirección juntos~',
    fr: 'Prêt à valider ton idée !\n\nConfirmons la direction ensemble~',
    de: 'Bereit, deine Idee zu validieren!\n\nLass uns zusammen die Richtung bestätigen~',
  },
  prototype: {
    zh: '来构建原型吧！\n\n我可以帮你拆分功能、选技术栈～',
    en: 'Let\'s build the prototype!\n\nI can help with features and tech stack~',
    ja: 'プロトタイプを作ろう！\n\n機能分割や技術選定を手伝うよ～',
    ko: '프로토타입을 만들자!\n\n기능 분할이나 기술 스택 선택을 도와줄게~',
    es: '¡Construyamos el prototipo!\n\nPuedo ayudarte con funciones y stack tecnológico~',
    fr: 'Construisons le prototype !\n\nJe peux t\'aider avec les fonctionnalités et la stack technique~',
    de: 'Lass uns den Prototypen bauen!\n\nIch kann bei Features und Tech-Stack helfen~',
  },
  ship: {
    zh: '发布倒计时！\n\n检查一下清单，准备启航～',
    en: 'Launch countdown!\n\nCheck the list, ready to sail~',
    ja: 'リリースカウントダウン！\n\nチェックリストを確認して、出航準備～',
    ko: '출시 카운트다운!\n\n체크리스트를 확인하고 출항 준비를 하자~',
    es: '¡Cuenta regresiva para el lanzamiento!\n\nRevisa la lista, listos para zarpar~',
    fr: 'Compte à rebours pour le lancement !\n\nVérifie la liste, prêt à appareiller~',
    de: 'Start-Countdown!\n\nPrüfe die Liste, bereit zum Ablegen~',
  },
  grow: {
    zh: '增长时间到！\n\n让我们获取更多用户～',
    en: 'Growth time!\n\nLet\'s acquire more users~',
    ja: '成長の時間だ！\n\nもっとユーザーを獲得しよう～',
    ko: '성장 시간!\n\n더 많은 사용자를 확보하자~',
    es: '¡Hora de crecer!\n\nAdquiramos más usuarios~',
    fr: 'C\'est l\'heure de croître !\n\nAcquérons plus d\'utilisateurs~',
    de: 'Wachstumszeit!\n\nLass uns mehr Nutzer gewinnen~',
  },
  monetize: {
    zh: '变现模式开启！\n\n帮你设计定价策略～',
    en: 'Monetization mode on!\n\nHelp you design pricing strategy~',
    ja: '収益化モード開始！\n\n価格戦略の設計を手伝うよ～',
    ko: '수익화 모드 시작!\n\n가격 전략 설계를 도와줄게~',
    es: '¡Modo monetización activado!\n\nTe ayudo a diseñar la estrategia de precios~',
    fr: 'Mode monétisation activé !\n\nJe t\'aide à concevoir la stratégie de prix~',
    de: 'Monetarisierungsmodus aktiviert!\n\nIch helfe dir bei der Preisstrategie~',
  },
};

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

const markdownStyles = `
  prose-headings:text-brutal-text prose-headings:font-mono prose-headings:text-base
  prose-p:text-brutal-text prose-p:text-sm prose-p:break-words
  prose-strong:text-brutal-accent prose-strong:font-bold
  prose-em:text-brutal-muted
  prose-code:text-brutal-accent prose-code:bg-brutal-surface prose-code:px-1 prose-code:text-xs prose-code:break-all
  prose-pre:bg-brutal-surface prose-pre:border prose-pre:border-brutal-border prose-pre:overflow-x-auto prose-pre:max-w-full
  prose-ul:text-brutal-text prose-ul:text-sm
  prose-ol:text-brutal-text prose-ol:text-sm
  prose-li:marker:text-brutal-accent
  prose-blockquote:border-l-2 prose-blockquote:border-brutal-accent prose-blockquote:text-brutal-muted
  max-w-full break-words
`;

function buildSyncTextFromStructured(payload: StageStreamMeta['sync_payload_structured']): string {
  if (!payload) return '';
  const summary = (payload.summary || '').trim();
  const items = Array.isArray(payload.items)
    ? payload.items.map((item) => item.trim()).filter(Boolean)
    : [];

  const lines: string[] = [];
  if (summary) lines.push(summary);
  lines.push(...items.map((item) => `- ${item}`));

  if (lines.length > 0) return lines.join('\n');
  if (payload.raw && Object.keys(payload.raw).length > 0) {
    return JSON.stringify(payload.raw, null, 2);
  }
  return '';
}

function extractNextQuestionFromContent(content: string): string {
  const marker = '【下一轮问题】';
  const index = content.indexOf(marker);
  if (index === -1) return '';

  const tail = content.slice(index + marker.length).trim();
  if (!tail) return '';
  const firstLine = tail.split('\n')[0]?.trim() || '';
  return firstLine.replace(/^[-*\d.\s]+/, '').trim();
}

export function AIChat({
  stage,
  projectId,
  projectTitle,
  onGenerateContent,
  onSyncRequest,
  isCollapsed = false,
  onCollapsedChange,
}: AIChatProps) {
  const { t, language } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petConfig, setPetConfig] = useState<AIPetConfig | null>(null);
  const [stageSnapshot, setStageSnapshot] = useState<StageSnapshot | null>(null);
  const [retryUsed, setRetryUsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [aiQuota, setAiQuota] = useState<{ used: number; limit: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fullscreenInputRef = useRef<HTMLTextAreaElement>(null);

  const petConfigKey = `sparkbin_pet_config_${getUserId() || 'guest'}`;

  // 加载宠物配置和配额（已登录用户从后端获取，游客从 localStorage 获取）
  useEffect(() => {
    if (isAuthenticated()) {
      authApi.getMe()
        .then((data) => {
          if (data.pet_config) {
            const config: AIPetConfig = {
              type: data.pet_config.type as AIPetConfig['type'],
              name: data.pet_config.name,
              personality: data.pet_config.personality as AIPetConfig['personality'],
              verbosity: data.pet_config.verbosity as AIPetConfig['verbosity'],
            };
            setPetConfig(config);
            localStorage.setItem(petConfigKey, JSON.stringify(config));
          }
          if (data.quota) {
            setAiQuota({
              used: data.quota.ai_calls_used_this_month,
              limit: data.quota.ai_calls_limit,
            });
          }
        })
        .catch(() => {
          // 后端失败时静默处理，不回落到 localStorage
        });
    } else {
      const saved = localStorage.getItem(petConfigKey);
      if (saved) {
        setPetConfig(JSON.parse(saved));
      }
    }
  }, [petConfigKey]);

  // ESC 退出全屏
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  const handleToggleCollapse = () => {
    onCollapsedChange?.(!isCollapsed);
  };

  const selectedPet = PET_OPTIONS.find((p) => p.id === petConfig?.type) || PET_OPTIONS[0];
  const petName = petConfig?.name || selectedPet.name;
  const petColor = selectedPet.color;
  const petFrames = PIXEL_PET_CATALOG[petConfig?.type || 'cat'] || PIXEL_PET_CATALOG['cat'];
  const personalityIcon =
    petConfig?.personality === 'gentle' ? Heart :
    petConfig?.personality === 'rational' ? BarChart3 :
    petConfig?.personality === 'zen' ? Coffee : Zap;
  const personalityColor =
    petConfig?.personality === 'gentle' ? '#f472b6' :
    petConfig?.personality === 'rational' ? '#60a5fa' :
    petConfig?.personality === 'zen' ? '#a78bfa' : '#fbbf24';

  // 阶段切换时清空消息历史，重新载入当前阶段的欢迎语
  useEffect(() => {
    setMessages([]);
  }, [stage]);

  useEffect(() => {
    if (messages.length === 0) {
      const welcome = WELCOME_MESSAGES[stage] || {
        zh: `嗨～我是${petName}，你的AI小伙伴！`,
        en: `Hi~ I'm ${petName}, your AI buddy!`,
        ja: `こんにちは～${petName}だよ、あなたのAI友達！`,
      };
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcome[language] || welcome['zh'],
        },
      ]);
    }
  }, [stage, language, petName, messages.length]);

  useEffect(() => {
    if (!projectId) {
      setStageSnapshot(null);
      return;
    }
    let cancelled = false;
    aiApi.getStageContext(projectId, stage as StageSnapshot['stage_key'])
      .then((snapshot) => {
        if (!cancelled) {
          setStageSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStageSnapshot(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, stage]);

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

  const sendMessage = async (messageText?: string) => {
    const textToSend = (messageText ?? input).trim();
    if (!textToSend || isThinking) return;

    // AI 配额检查
    if (aiQuota && aiQuota.limit > 0 && aiQuota.used >= aiQuota.limit) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);
    setError(null);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      syncPayload: '',
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const kimiMessages = buildMessages(textToSend);
      abortControllerRef.current = new AbortController();

      let fullContent = '';
      for await (const chunk of aiService.chatCompletionStream(kimiMessages, {
        projectId,
        stageKey: stage,
        enableStageLoop: true,
      }, {
        onMeta: (meta: StageStreamMeta) => {
          if (meta.stage_snapshot) {
            setStageSnapshot(meta.stage_snapshot);
          }
          setRetryUsed(Boolean(meta.retry_used));
          const structuredSyncText = buildSyncTextFromStructured(meta.sync_payload_structured);
          const resolvedSyncText = structuredSyncText || meta.sync_payload || '';
          if (resolvedSyncText) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessage.id ? { ...msg, syncPayload: resolvedSyncText } : msg
              )
            );
          }
          if (meta.next_question) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessage.id ? { ...msg, nextQuestion: meta.next_question } : msg
              )
            );
          }
        },
      })) {
        fullContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessage.id ? { ...msg, content: fullContent } : msg
          )
        );
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessage.id && !msg.nextQuestion
            ? { ...msg, nextQuestion: extractNextQuestionFromContent(fullContent) }
            : msg
        )
      );

      const generateKeywords = ['generate', 'create', 'write', 'draft', 'template', '生成', '创建', '写', '模板'];
      if (generateKeywords.some((kw) => textToSend.toLowerCase().includes(kw))) {
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

  const handleSend = async () => {
    await sendMessage();
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

  const handleSyncMessage = (content: string) => {
    if (!content.trim()) return;
    onSyncRequest?.(content);
  };

  const handleUseNextQuestion = async (question: string) => {
    if (!question.trim()) return;
    await sendMessage(question);
  };

  const quickActions = QUICK_ACTIONS[stage] || [];

  // 获取最后一条 AI 消息的上下文信息（用于全屏右侧面板）
  const lastAiMessage = [...messages].reverse().find((m) => m.role === 'assistant' && m.id !== 'welcome');

  // 折叠状态
  if (isCollapsed) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={handleToggleCollapse}
          className="flex flex-col items-center gap-2 px-2 py-4 bg-brutal-surface border border-brutal-border
                     hover:border-brutal-accent transition-all duration-300 h-full max-h-40"
          title={`展开${petName}`}
        >
          <ChevronLeft className="w-4 h-4" />
          <div className="flex flex-col items-center gap-1">
            <PixelPet frames={petFrames} scale={1} animation="idle" />
            <span className="text-xs font-mono [writing-mode:vertical-lr]">{petName}</span>
          </div>
        </button>
      </div>
    );
  }

  // ========== 全屏模式 ==========
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-brutal-bg/80 backdrop-blur-sm flex">
        {/* 左侧：对话区域 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 全屏头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brutal-border bg-brutal-surface flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center border-2"
                style={{
                  backgroundColor: petColor + '20',
                  borderColor: petColor,
                }}
              >
                <PixelPet frames={petFrames} scale={1} animation="idle" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm font-bold">{petName}</div>
                  {aiQuota && aiQuota.limit > 0 && (
                    <span className={`text-[10px] font-mono px-1 py-0.5 border ${aiQuota.used >= aiQuota.limit ? 'text-brutal-warning border-brutal-warning/30' : 'text-brutal-muted border-brutal-border'}`}>
                      AI: {aiQuota.used}/{aiQuota.limit}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-brutal-muted font-mono">{projectTitle || '未命名项目'} · {stage}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stageSnapshot && (
                <div className="flex items-center gap-2 mr-4">
                  <div className="w-24 h-1.5 bg-brutal-border">
                    <div
                      className="h-full bg-brutal-accent transition-all"
                      style={{ width: `${stageSnapshot.completion.score}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-brutal-accent font-mono">{stageSnapshot.completion.score}%</span>
                </div>
              )}
              <button
                onClick={() => setIsFullscreen(false)}
                className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-accent hover:text-brutal-bg transition-colors"
                title="退出全屏 (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-sm min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: petColor + '30' }}
                  >
                    <PixelPet frames={petFrames} scale={1} animation="idle" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] p-4 text-sm rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-brutal-text text-brutal-bg rounded-br-none'
                      : 'bg-brutal-surface border border-brutal-border rounded-bl-none'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-2 min-w-0">
                      {!message.content.trim() && message.id !== 'welcome' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-brutal-accent">{petName}正在思考</span>
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce delay-75" />
                            <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce delay-150" />
                          </span>
                        </div>
                      ) : (
                        <div className={`${markdownStyles} min-w-0`}>
                          <SafeMarkdown content={message.content} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mx-6 mb-2 p-2 border border-brutal-warning text-brutal-warning text-xs font-mono flex-shrink-0">
              {error}
            </div>
          )}

          {/* 输入区域 */}
          <div className="p-4 border-t border-brutal-border flex-shrink-0 bg-brutal-surface">
            <div className="flex gap-3 max-w-4xl mx-auto">
              <textarea
                ref={fullscreenInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`和${petName}聊天...`}
                className="flex-1 p-3 bg-brutal-bg border border-brutal-border resize-none
                           focus:border-brutal-accent transition-colors min-h-[60px] text-sm font-mono rounded"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                className="px-4 flex items-center justify-center rounded transition-colors"
                style={{
                  backgroundColor: petColor,
                  opacity: !input.trim() || isThinking ? 0.5 : 1,
                }}
              >
                <Send className="w-4 h-4 text-brutal-bg" />
              </button>
            </div>
          </div>
        </div>

        {/* 右侧：上下文面板 */}
        <div className="w-80 border-l border-brutal-border bg-brutal-surface flex flex-col flex-shrink-0">
          {/* 面板头部 */}
          <div className="px-4 py-3 border-b border-brutal-border">
            <span className="text-xs font-mono font-bold">对话上下文</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 阶段快照 */}
            {stageSnapshot && (
              <div className="border border-brutal-border bg-brutal-bg p-3">
                <div className="text-[10px] text-brutal-muted font-mono uppercase mb-2">阶段完成度</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono">{stageSnapshot.project_title}</span>
                  <span className="text-xs font-mono text-brutal-accent">{stageSnapshot.completion.score}%</span>
                </div>
                <div className="w-full h-2 bg-brutal-border">
                  <div
                    className="h-full bg-brutal-accent transition-all"
                    style={{ width: `${stageSnapshot.completion.score}%` }}
                  />
                </div>
                {stageSnapshot.completion.missing_items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {stageSnapshot.completion.missing_items.map((item, i) => (
                      <div key={i} className="text-[10px] text-brutal-warning font-mono">• {item}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 最新可同步内容 */}
            {lastAiMessage?.syncPayload && (
              <div className="border border-brutal-border bg-brutal-bg p-3">
                <div className="text-[10px] text-brutal-muted font-mono uppercase mb-2">可同步内容</div>
                <pre className="text-[10px] font-mono text-brutal-text whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {lastAiMessage.syncPayload}
                </pre>
                <button
                  onClick={() => handleSyncMessage(lastAiMessage.syncPayload || lastAiMessage.content)}
                  className="mt-2 w-full text-xs px-2 py-1.5 border border-brutal-accent text-brutal-accent hover:bg-brutal-accent/10 transition-colors"
                >
                  同步到项目
                </button>
              </div>
            )}

            {/* 下一轮问题 */}
            {lastAiMessage?.nextQuestion && (
              <div className="border border-brutal-border bg-brutal-bg p-3">
                <div className="text-[10px] text-brutal-muted font-mono uppercase mb-2">下一轮问题</div>
                <p className="text-xs font-mono text-brutal-text mb-2">{lastAiMessage.nextQuestion}</p>
                <button
                  onClick={() => void handleUseNextQuestion(lastAiMessage.nextQuestion || '')}
                  disabled={isThinking}
                  className="w-full text-xs px-2 py-1.5 bg-brutal-accent text-brutal-bg hover:bg-brutal-accent/90 transition-colors disabled:opacity-50"
                >
                  采用并发送
                </button>
              </div>
            )}

            {/* 快捷操作 */}
            {quickActions.length > 0 && (
              <div>
                <div className="text-[10px] text-brutal-muted font-mono uppercase mb-2">快捷提问</div>
                <div className="space-y-1.5">
                  {quickActions.map((action) => (
                    <button
                      key={action.zh}
                      onClick={() => {
                        setInput(action.zh);
                        fullscreenInputRef.current?.focus();
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 border border-brutal-border hover:border-brutal-accent hover:bg-brutal-accent/10 transition-colors"
                    >
                      <span className="mr-1">{action.emoji}</span>
                      <span>{action.zh}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== 侧边栏模式 ==========
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-brutal-surface border-l border-brutal-border relative">
      {/* Collapse Button */}
      <button
        onClick={handleToggleCollapse}
        className="absolute -left-6 top-4 w-6 h-10 bg-brutal-surface border border-r-0 border-brutal-border
                   flex items-center justify-center hover:bg-brutal-accent hover:text-brutal-bg transition-colors z-10"
        title={`收起${petName}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Header - 宠物形象（水平紧凑布局） */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-brutal-border bg-brutal-bg flex-shrink-0">
        <div className="relative flex-shrink-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center border-2"
            style={{
              backgroundColor: petColor + '20',
              borderColor: petColor,
            }}
          >
            <PixelPet frames={petFrames} scale={1} animation="idle" />
          </div>
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-brutal-bg border border-brutal-border rounded-full">
            {React.createElement(personalityIcon, { className: 'w-3 h-3', style: { color: personalityColor } })}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-bold">{petName}</span>
            {projectId && (
              <span className="text-[10px] text-brutal-accent font-mono px-1 py-0.5 border border-brutal-accent/30">
                NATIVE
              </span>
            )}
            {aiQuota && aiQuota.limit > 0 && (
              <span className={`text-[10px] font-mono px-1 py-0.5 border ${aiQuota.used >= aiQuota.limit ? 'text-brutal-warning border-brutal-warning/30' : 'text-brutal-muted border-brutal-border'}`}>
                AI: {aiQuota.used}/{aiQuota.limit}
              </span>
            )}
          </div>
          {stageSnapshot && (
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1 bg-brutal-border">
                <div
                  className="h-full bg-brutal-accent transition-all"
                  style={{ width: `${stageSnapshot.completion.score}%` }}
                />
              </div>
              <span className="text-[10px] text-brutal-accent font-mono">{stageSnapshot.completion.score}%</span>
            </div>
          )}
        </div>
        {/* 全屏按钮 */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="w-7 h-7 border border-brutal-border flex items-center justify-center hover:bg-brutal-accent hover:text-brutal-bg transition-colors flex-shrink-0"
          title="全屏对话"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {stageSnapshot && stageSnapshot.completion.missing_items.length > 0 && (
        <div className="px-3 py-1 border-b border-brutal-border bg-brutal-surface flex-shrink-0">
          <div className="text-[10px] text-brutal-muted font-mono truncate">
            缺口: {stageSnapshot.completion.missing_items.slice(0, 2).join(' / ')}
          </div>
          {retryUsed && (
            <div className="text-[10px] text-brutal-warning font-mono">
              本轮已执行格式修复重试
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {message.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: petColor + '30' }}
              >
                <PixelPet frames={petFrames} scale={1} animation="idle" />
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
                <div className="space-y-2 min-w-0">
                  {!message.content.trim() && message.id !== 'welcome' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-brutal-accent">{petName}正在思考</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce delay-75" />
                        <span className="w-1.5 h-1.5 bg-brutal-accent rounded-full animate-bounce delay-150" />
                      </span>
                    </div>
                  ) : (
                    <div className={`${markdownStyles} min-w-0`}>
                      <SafeMarkdown content={message.content} />
                    </div>
                  )}
                  {message.id !== 'welcome' && message.content.trim() && (
                    <div className="pt-1 border-t border-brutal-border/60 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleSyncMessage(message.syncPayload || message.content)}
                        className="text-xs px-2 py-1 border border-brutal-border hover:border-brutal-accent hover:text-brutal-accent transition-colors rounded"
                      >
                        同步到左侧
                      </button>
                      {message.nextQuestion && (
                        <button
                          onClick={() => void handleUseNextQuestion(message.nextQuestion || '')}
                          disabled={isThinking}
                          className="text-xs px-2 py-1 border border-brutal-accent text-brutal-accent hover:bg-brutal-accent/10 transition-colors rounded disabled:opacity-50"
                        >
                          采用下一轮问题
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
              )}
            </div>
          </div>
        ))}
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

      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="ai_calls"
      />

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
            <Send className="w-4 h-4 text-brutal-bg" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIChat;
