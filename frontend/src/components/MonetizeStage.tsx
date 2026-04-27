import { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  ArrowRight,
  Plus,
  X,
  Check,
  RefreshCw,
  Edit3,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '../i18n/hooks';
import { aiService } from '../services/ai';
import type { Project, MonetizeData, MonetizeStrategy, PricingTier, FunnelMetrics } from '../types';
import { PricingPreview } from './PricingPreview';
import { PaymentResultModal } from './PaymentResultModal';
import { paymentsApi } from '../services/api';

interface MonetizeStageProps {
  project: Project;
  onUpdateContent: (content: string) => Promise<void>;
  isLocked: boolean;
  onToggleLock?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

// AI 宠物 ASCII 形象
const AI_PET_ROBOT = `
    [o_o]
    /| |\\
     d b
`;

const STRATEGIES: { key: MonetizeStrategy; label: string; description: string }[] = [
  { key: 'freemium', label: '免费+付费墙', description: '基础功能免费，高级功能付费' },
  { key: 'subscription', label: '订阅制', description: '月费/年费订阅模式' },
  { key: 'onetime', label: '一次性购买', description: '买断制，一次付费终身使用' },
  { key: 'ads', label: '广告', description: '免费使用，靠广告盈利' },
  { key: 'donation', label: '打赏/捐赠', description: '自愿付费，开源常用' },
];

const DEFAULT_TIERS: PricingTier[] = [
  { id: 'free', name: '免费版', price: 0, period: 'month', features: ['基础功能', '社区支持'] },
  { id: 'pro', name: 'Pro版', price: 9, period: 'month', features: ['无限使用', '优先支持', '高级功能'], highlighted: true },
  { id: 'team', name: '团队版', price: 29, period: 'month', features: ['团队协作', 'API访问', '专属客服'] },
];

// 测试卡号数据
const TEST_CARDS = [
  { number: '4242 4242 4242 4242', brand: 'Visa', result: '成功支付' },
  { number: '4000 0025 0000 3155', brand: 'Visa', result: '需要 3D Secure 验证' },
  { number: '4000 0000 0000 9995', brand: 'Visa', result: '卡余额不足（失败测试）' },
  { number: '5555 5555 5555 4444', brand: 'Mastercard', result: '成功支付' },
];

export function MonetizeStage({ project, onUpdateContent, isLocked, onToggleLock, onDirtyChange }: MonetizeStageProps) {
  const { t } = useI18n();
  const [data, setData] = useState<MonetizeData>({
    strategy: 'freemium',
    pricingTiers: DEFAULT_TIERS,
    mrr: 0,
    totalRevenue: 0,
    paidUsers: 0,
    funnel: { visitors: 0, signups: 0, trials: 0, paid: 0 },
    testMode: false,
  });
  const [showAddTier, setShowAddTier] = useState(false);

  useEffect(() => {
    onDirtyChange?.(showAddTier);
  }, [showAddTier, onDirtyChange]);

  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [paymentResult, setPaymentResult] = useState<'success' | 'cancel' | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  // 防抖保存定时器
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 表单状态
  const [newTier, setNewTier] = useState<Partial<PricingTier>>({
    name: '',
    price: 0,
    period: 'month',
    features: [''],
  });

  // 解析 URL 参数中的支付结果
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success' || payment === 'cancel') {
      setPaymentResult(payment);
      // 清理 URL 参数
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // 加载阶段数据
  useEffect(() => {
    const monetizeStage = project.stages?.monetize;
    if (monetizeStage?.content) {
      try {
        const parsed = JSON.parse(monetizeStage.content);
        if (parsed && typeof parsed === 'object') {
          setData({
            strategy: parsed.strategy || 'freemium',
            pricingTiers: parsed.pricingTiers || DEFAULT_TIERS,
            mrr: parsed.mrr || 0,
            totalRevenue: parsed.totalRevenue || 0,
            paidUsers: parsed.paidUsers || 0,
            funnel: parsed.funnel || { visitors: 0, signups: 0, trials: 0, paid: 0 },
            testMode: parsed.testMode ?? false,
          });
        }
      } catch {
        // 使用默认值
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // 加载用户订阅状态（当测试模式开启时）
  useEffect(() => {
    if (data.testMode) {
      paymentsApi.getSubscriptionStatus()
        .then((res) => setSubscriptionStatus(res.status))
        .catch(() => setSubscriptionStatus(null));
    }
  }, [data.testMode]);

  // 保存数据（立即保存，用于非高频操作）
  const saveData = async (newData: MonetizeData) => {
    const content = JSON.stringify(newData);
    await onUpdateContent(content);
  };

  // 防抖保存（用于数值输入等高频操作）
  const saveDataDebounced = (newData: MonetizeData) => {
    setData(newData);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onUpdateContent(JSON.stringify(newData));
    }, 600);
  };

  // 更新变现策略
  const updateStrategy = async (strategy: MonetizeStrategy) => {
    const newData = { ...data, strategy };
    setData(newData);
    await saveData(newData);
  };

  // 切换测试模式
  const toggleTestMode = async () => {
    const newData = { ...data, testMode: !data.testMode };
    setData(newData);
    await saveData(newData);
  };

  // 添加定价档位
  const addTier = async () => {
    if (!newTier.name?.trim()) return;

    const tier: PricingTier = {
      id: Date.now().toString(),
      name: newTier.name,
      price: newTier.price || 0,
      period: newTier.period || 'month',
      features: newTier.features?.filter(f => f.trim()) || [],
      highlighted: newTier.highlighted,
    };

    const newData = { ...data, pricingTiers: [...data.pricingTiers, tier] };
    setData(newData);
    await saveData(newData);

    setNewTier({ name: '', price: 0, period: 'month', features: [''] });
    setShowAddTier(false);
  };

  // 删除定价档位
  const deleteTier = async (id: string) => {
    const newData = { ...data, pricingTiers: data.pricingTiers.filter(t => t.id !== id) };
    setData(newData);
    await saveData(newData);
  };

  // 更新漏斗数据（防抖保存）
  const updateFunnel = (updates: Partial<FunnelMetrics>) => {
    const newFunnel = { ...data.funnel, ...updates };
    const newData = { ...data, funnel: newFunnel };
    saveDataDebounced(newData);
  };

  // AI 分析
  const getAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await aiService.analyzeMonetization(project.title, data);
      setAiSuggestion(analysis);
    } catch (error) {
      console.error('Failed to get analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 计算转化率
  const calculateConversion = (from: number, to: number) => {
    if (from === 0) return '0.0';
    return ((to / from) * 100).toFixed(1);
  };

  const paidTiers = data.pricingTiers.filter(t => t.price > 0);

  return (
    <div className="h-full flex flex-col bg-brutal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <DollarSign className="w-4 h-4 text-brutal-accent" />
          <span className="font-mono text-sm">{t('stage.monetize')}</span>
          <span className="text-xs text-brutal-muted">
            MRR: ${data.mrr}/月
          </span>
          {data.testMode && (
            <span className="px-1.5 py-0.5 bg-brutal-accent/10 border border-brutal-accent text-[10px] font-mono text-brutal-accent uppercase">
              Test Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTestMode}
            disabled={isLocked}
            className={`btn-brutal h-9 flex items-center gap-2 text-xs transition-colors ${
              data.testMode ? 'border-brutal-accent text-brutal-accent' : ''
            } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={data.testMode ? '关闭测试模式' : '开启支付测试模式'}
          >
            {data.testMode ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            测试模式
          </button>
          <button
            onClick={getAIAnalysis}
            disabled={isAnalyzing}
            className="btn-brutal h-9 flex items-center gap-2 text-xs"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <span className="text-brutal-accent">✨</span>
            )}
            AI 分析
          </button>
          {isLocked && (
            <button
              onClick={onToggleLock}
              className="btn-brutal h-9 flex items-center gap-2 text-xs text-brutal-warning border-brutal-warning"
            >
              <Edit3 className="w-3 h-3" />
              重新打开编辑
            </button>
          )}
        </div>
      </div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div className="p-4 border-b border-brutal-border bg-brutal-surface/50">
          <div className="flex items-start gap-4">
            <pre className="text-xs text-brutal-accent font-mono leading-none flex-shrink-0">
              {AI_PET_ROBOT}
            </pre>
            <div className="flex-1">
              <p className="text-sm font-mono text-brutal-text whitespace-pre-line">{aiSuggestion}</p>
              <button onClick={() => setAiSuggestion(null)} className="text-xs text-brutal-muted hover:text-brutal-text mt-2">
                [关闭]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full overflow-y-auto p-6 space-y-6">
          {/* Test Mode Banner */}
          {data.testMode && (
            <div className="border-2 border-brutal-accent bg-brutal-accent/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-brutal-accent" />
                  <div>
                    <h3 className="text-sm font-mono font-bold">支付测试环境已激活</h3>
                    <p className="text-xs text-brutal-muted font-mono">
                      所有交易均通过 Stripe Test Mode 处理，不会扣取真实费用
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-brutal-muted font-mono uppercase">Subscription</div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${subscriptionStatus === 'active' ? 'bg-brutal-success' : 'bg-brutal-border'}`} />
                    <span className="text-sm font-mono font-bold uppercase">{subscriptionStatus || 'inactive'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={paidTiers.length === 0}
                  className="btn-brutal-primary h-9 flex items-center gap-2 text-xs disabled:opacity-50"
                >
                  <ExternalLink className="w-3 h-3" />
                  打开 Pricing Page 预览
                </button>
                <a
                  href="https://dashboard.stripe.com/test/payments"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-brutal h-9 flex items-center gap-2 text-xs"
                >
                  <CreditCard className="w-3 h-3" />
                  Stripe 测试控制台
                </a>
              </div>

              {paidTiers.length === 0 && (
                <div className="text-xs text-brutal-warning font-mono">
                  ⚠ 当前没有付费档位，请先在下方定价方案中添加一个 price &gt; 0 的档位。
                </div>
              )}

              {/* Test Card Guide */}
              <div className="border border-brutal-border bg-brutal-bg">
                <div className="px-3 py-2 border-b border-brutal-border bg-brutal-surface/50">
                  <span className="text-xs font-mono font-bold">测试卡号指南</span>
                </div>
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {TEST_CARDS.map((card) => (
                    <div key={card.number} className="flex items-center justify-between p-2 border border-brutal-border">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border border-brutal-border">{card.brand === 'Visa' ? 'VISA' : 'MC'}</span>
                        <div>
                          <div className="text-xs font-mono font-bold">{card.number}</div>
                          <div className="text-[10px] text-brutal-muted font-mono">{card.result}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(card.number.replace(/\s/g, ''))}
                        className="text-[10px] px-2 py-1 border border-brutal-border hover:border-brutal-accent hover:text-brutal-accent font-mono"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-brutal-border text-[10px] text-brutal-muted font-mono">
                  使用任意未来的过期日期（如 12/30）和任意 3 位 CVC（如 123）即可通过验证。
                </div>
              </div>
            </div>
          )}

          {/* Revenue Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-brutal-border bg-brutal-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-brutal-accent" />
                <span className="text-xs font-mono text-brutal-muted">月经常性收入 (MRR)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-brutal-accent">${data.mrr}</span>
                <input
                  type="number"
                  defaultValue={data.mrr}
                  onBlur={(e) => {
                    const newData = { ...data, mrr: parseInt(e.target.value) || 0 };
                    saveData(newData);
                  }}
                  disabled={isLocked}
                  className="w-20 p-1 border border-brutal-border bg-brutal-bg font-mono text-sm"
                />
              </div>
            </div>

            <div className="border border-brutal-border bg-brutal-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-brutal-success" />
                <span className="text-xs font-mono text-brutal-muted">累计收入</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-brutal-success">${data.totalRevenue}</span>
                <input
                  type="number"
                  defaultValue={data.totalRevenue}
                  onBlur={(e) => {
                    const newData = { ...data, totalRevenue: parseInt(e.target.value) || 0 };
                    saveData(newData);
                  }}
                  disabled={isLocked}
                  className="w-20 p-1 border border-brutal-border bg-brutal-bg font-mono text-sm"
                />
              </div>
            </div>

            <div className="border border-brutal-border bg-brutal-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-brutal-warning" />
                <span className="text-xs font-mono text-brutal-muted">付费用户</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-brutal-warning">{data.paidUsers}</span>
                <input
                  type="number"
                  defaultValue={data.paidUsers}
                  onBlur={(e) => {
                    const newData = { ...data, paidUsers: parseInt(e.target.value) || 0 };
                    saveData(newData);
                  }}
                  disabled={isLocked}
                  className="w-20 p-1 border border-brutal-border bg-brutal-bg font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="border border-brutal-border bg-brutal-surface">
            <div className="px-4 py-3 border-b border-brutal-border">
              <span className="font-mono text-sm">变现策略</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
              {STRATEGIES.map(strategy => (
                <button
                  key={strategy.key}
                  onClick={() => updateStrategy(strategy.key)}
                  disabled={isLocked}
                  className={`p-3 border-2 text-left transition-all ${
                    data.strategy === strategy.key
                      ? 'border-brutal-accent bg-brutal-accent/10'
                      : 'border-brutal-border hover:border-brutal-accent/50'
                  } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <p className="font-mono font-bold text-sm mb-1">{strategy.label}</p>
                  <p className="text-xs font-mono text-brutal-muted">{strategy.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="border border-brutal-border bg-brutal-surface">
            <div className="px-4 py-3 border-b border-brutal-border flex items-center justify-between">
              <span className="font-mono text-sm">定价方案</span>
              {!isLocked && (
                <button onClick={() => setShowAddTier(true)} className="btn-brutal h-9 flex items-center gap-2 text-xs">
                  <Plus className="w-3 h-3" />
                  添加档位
                </button>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.pricingTiers.map(tier => (
                <div
                  key={tier.id}
                  className={`border-2 p-4 relative ${
                    tier.highlighted
                      ? 'border-brutal-accent bg-brutal-accent/5'
                      : 'border-brutal-border bg-brutal-bg'
                  }`}
                >
                  {tier.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-brutal-accent text-brutal-bg text-xs font-mono">
                      推荐
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-mono font-bold">{tier.name}</h4>
                    {!isLocked && (
                      <button onClick={() => deleteTier(tier.id)} className="text-brutal-muted hover:text-brutal-warning">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-mono font-bold">${tier.price}</span>
                    <span className="text-xs text-brutal-muted">/{tier.period === 'month' ? '月' : tier.period === 'year' ? '年' : '终身'}</span>
                  </div>
                  <ul className="space-y-2">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-mono">
                        <Check className="w-3 h-3 text-brutal-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="border border-brutal-border bg-brutal-surface">
            <div className="px-4 py-3 border-b border-brutal-border">
              <span className="font-mono text-sm">转化漏斗</span>
            </div>
            <div className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <FunnelStage
                  label="访客"
                  value={data.funnel.visitors}
                  onChange={(v) => updateFunnel({ visitors: v })}
                  disabled={isLocked}
                />
                <ArrowRight className="w-5 h-5 text-brutal-muted" />
                <div className="text-xs text-brutal-muted text-center">
                  {calculateConversion(data.funnel.visitors, data.funnel.signups)}%
                </div>
                <FunnelStage
                  label="注册"
                  value={data.funnel.signups}
                  onChange={(v) => updateFunnel({ signups: v })}
                  disabled={isLocked}
                />
                <ArrowRight className="w-5 h-5 text-brutal-muted" />
                <div className="text-xs text-brutal-muted text-center">
                  {calculateConversion(data.funnel.signups, data.funnel.trials)}%
                </div>
                <FunnelStage
                  label="试用"
                  value={data.funnel.trials}
                  onChange={(v) => updateFunnel({ trials: v })}
                  disabled={isLocked}
                />
                <ArrowRight className="w-5 h-5 text-brutal-muted" />
                <div className="text-xs text-brutal-muted text-center">
                  {calculateConversion(data.funnel.trials, data.funnel.paid)}%
                </div>
                <FunnelStage
                  label="付费"
                  value={data.funnel.paid}
                  onChange={(v) => updateFunnel({ paid: v })}
                  disabled={isLocked}
                  highlight
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Tier Modal */}
      {showAddTier && (
        <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
              <span className="text-sm font-mono font-bold">添加定价档位</span>
              <button onClick={() => setShowAddTier(false)} className="w-8 h-8 border border-brutal-border flex items-center justify-center">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">档位名称</label>
                <input
                  type="text"
                  value={newTier.name}
                  onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                  className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                  placeholder="例如：Pro版"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-brutal-muted mb-2">价格 ($)</label>
                  <input
                    type="number"
                    value={newTier.price}
                    onChange={(e) => setNewTier({ ...newTier, price: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-brutal-muted mb-2">周期</label>
                  <select
                    value={newTier.period}
                    onChange={(e) => setNewTier({ ...newTier, period: e.target.value as PricingTier['period'] })}
                    className="w-full p-3 border border-brutal-border bg-brutal-bg font-mono text-sm"
                  >
                    <option value="month">月付</option>
                    <option value="year">年付</option>
                    <option value="lifetime">终身</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-brutal-muted mb-2">功能列表</label>
                {newTier.features?.map((feature, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => {
                        const features = [...(newTier.features || [])];
                        features[i] = e.target.value;
                        setNewTier({ ...newTier, features });
                      }}
                      className="flex-1 p-2 border border-brutal-border bg-brutal-bg font-mono text-xs"
                      placeholder={`功能 ${i + 1}`}
                    />
                    <button
                      onClick={() => {
                        const features = newTier.features?.filter((_, idx) => idx !== i);
                        setNewTier({ ...newTier, features });
                      }}
                      className="text-brutal-muted hover:text-brutal-warning"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setNewTier({ ...newTier, features: [...(newTier.features || []), ''] })}
                  className="text-xs text-brutal-accent hover:underline"
                >
                  + 添加功能
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddTier(false)} className="flex-1 btn-brutal h-9 py-2">取消</button>
                <button
                  onClick={addTier}
                  disabled={!newTier.name?.trim()}
                  className="flex-1 btn-brutal-primary h-9 py-2"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Preview */}
      <PricingPreview
        projectId={project.id}
        projectTitle={project.title}
        tiers={data.pricingTiers}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Payment Result Modal */}
      <PaymentResultModal
        result={paymentResult}
        onClose={async () => {
          // 如果支付成功，刷新 MonetizeStage 中的订阅状态
          if (paymentResult === 'success') {
            try {
              const res = await paymentsApi.getSubscriptionStatus();
              setSubscriptionStatus(res.status);
            } catch {
              // 忽略错误
            }
          }
          setPaymentResult(null);
        }}
      />
    </div>
  );
}

function FunnelStage({
  label,
  value,
  onChange,
  disabled,
  highlight,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`flex-1 p-4 border-2 text-center ${highlight ? 'border-brutal-accent bg-brutal-accent/10' : 'border-brutal-border bg-brutal-bg'}`}>
      <p className="text-xs font-mono text-brutal-muted mb-1">{label}</p>
      <input
        type="number"
        defaultValue={value}
        onBlur={(e) => onChange(parseInt(e.target.value) || 0)}
        disabled={disabled}
        className="w-full text-center text-xl font-mono font-bold bg-transparent border-none focus:ring-0 p-0"
      />
    </div>
  );
}
