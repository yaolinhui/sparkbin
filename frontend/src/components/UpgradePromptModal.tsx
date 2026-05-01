import { useState, useEffect } from 'react';
import { X, Zap, Coins, Loader2 } from 'lucide-react';
import { paymentsApi } from '../services/api';
import { useToast } from '../hooks/useToast';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'ai_calls' | 'analysis' | 'projects';
}

export function UpgradePromptModal({ isOpen, onClose, feature }: UpgradePromptProps) {
  const { showToast } = useToast();
  const [packs, setPacks] = useState<{ price_usd: number; credits: number; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    paymentsApi.getCreditPacks()
      .then(setPacks)
      .catch(() => {
        // 如果后端未启用支付，显示空列表
        setPacks([]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handlePurchase = async (packIndex: number) => {
    setIsPurchasing(true);
    try {
      const successUrl = `${window.location.origin}/payment/success`;
      const cancelUrl = `${window.location.origin}/payment/cancel`;
      const res = await paymentsApi.purchaseCredits({
        pack_index: packIndex,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      if (res.session_url) {
        window.location.href = res.session_url;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '购买失败';
      showToast(msg, 'error');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!isOpen) return null;

  const title = feature === 'ai_calls'
    ? 'AI 额度已用完'
    : feature === 'projects'
    ? '项目数量已达上限'
    : '额度不足';

  const desc = feature === 'ai_calls'
    ? '你的 AI 对话额度已用完。购买额度包即可继续使用 AI 伙伴，额度永久有效，永不过期。'
    : feature === 'projects'
    ? '免费版项目数量已达上限。升级后可创建无限项目，释放你的所有创意。'
    : '当前 AI 额度不足以执行此操作。';

  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-brutal-surface border-2 border-brutal-border w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brutal-accent" />
            <span className="text-sm font-mono font-bold">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-brutal-muted font-mono leading-relaxed mb-6">
            {desc}
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-brutal-accent" />
            </div>
          ) : packs.length === 0 ? (
            <div className="border border-brutal-border p-4 bg-brutal-bg text-center">
              <Coins className="w-6 h-6 text-brutal-muted mx-auto mb-2" />
              <p className="text-xs font-mono text-brutal-muted">
                当前为自托管模式，无需购买额度
              </p>
              <p className="text-[10px] font-mono text-brutal-muted mt-1">
                请联系管理员检查 enable_payments 配置
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {packs.map((pack, index) => (
                <div
                  key={index}
                  className="border border-brutal-border p-3 bg-brutal-bg flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-mono font-bold flex items-center gap-2">
                      <Coins className="w-3.5 h-3.5 text-brutal-accent" />
                      {pack.credits} Credits
                    </div>
                    <div className="text-xs font-mono text-brutal-muted mt-0.5">
                      永久有效 · 永不过期
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase(index)}
                    disabled={isPurchasing}
                    className="px-4 py-2 bg-brutal-accent text-brutal-bg text-xs font-mono font-bold hover:bg-brutal-accent/90 transition-colors disabled:opacity-50"
                  >
                    ${pack.price_usd}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-brutal-border bg-brutal-bg">
          <button onClick={onClose} className="flex-1 btn-brutal h-9 py-3">
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpgradePromptModal;
