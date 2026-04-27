import { useState, useEffect } from 'react';
import { Check, CreditCard, Loader2, X, Zap } from 'lucide-react';
import type { PricingTier, CheckoutItem } from '../types';
import { paymentsApi } from '../services/api';

interface PricingPreviewProps {
  projectId: string;
  projectTitle: string;
  tiers: PricingTier[];
  isOpen: boolean;
  onClose: () => void;
}

type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function createCheckout(
  items: CheckoutItem[],
  successUrl: string,
  cancelUrl: string
): Promise<Result<string>> {
  try {
    const res = await paymentsApi.createCheckoutSession({
      items: items.map(i => ({
        name: i.name,
        price: i.price,
        period: i.period,
        tier_id: i.tierId,
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return { ok: true, value: res.session_url };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '支付请求失败' };
  }
}

export function PricingPreview({ projectId, projectTitle, tiers, isOpen, onClose }: PricingPreviewProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 弹窗打开时重置内部状态
  useEffect(() => {
    if (isOpen) {
      setSelectedTier(null);
      setError(null);
      setIsRedirecting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (tier: PricingTier) => {
    setIsRedirecting(true);
    setError(null);

    const item: CheckoutItem = {
      name: `${projectTitle} - ${tier.name}`,
      price: tier.price,
      period: tier.period,
      tierId: tier.id,
    };

    const successUrl = `${window.location.origin}/project/${encodeURIComponent(projectId)}?payment=success`;
    const cancelUrl = `${window.location.origin}/project/${encodeURIComponent(projectId)}?payment=cancel`;

    const result = await createCheckout([item], successUrl, cancelUrl);

    if (result.ok) {
      window.location.href = result.value;
    } else {
      setError(result.error);
      setIsRedirecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg sticky top-0">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-brutal-accent" />
            <div>
              <h2 className="text-sm font-mono font-bold">Pricing Preview</h2>
              <p className="text-[10px] text-brutal-muted font-mono">TEST MODE — No real charges</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRedirecting}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-3 border border-brutal-warning text-brutal-warning text-xs font-mono">
            [ERROR] {error}
          </div>
        )}

        {/* Tiers */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`border-2 p-5 cursor-pointer transition-all relative ${
                selectedTier === tier.id
                  ? 'border-brutal-accent bg-brutal-accent/5'
                  : 'border-brutal-border bg-brutal-bg hover:border-brutal-accent/50'
              } ${tier.highlighted ? 'md:-mt-2 md:mb-2' : ''}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-brutal-accent text-brutal-bg text-[10px] font-mono uppercase tracking-wider">
                  Popular
                </div>
              )}

              <h3 className="font-mono font-bold text-sm mb-1">{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-mono font-bold">${tier.price}</span>
                <span className="text-xs text-brutal-muted font-mono">
                  /{tier.period === 'month' ? 'mo' : tier.period === 'year' ? 'yr' : 'lifetime'}
                </span>
              </div>

              <ul className="space-y-2 mb-5">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-mono">
                    <Check className="w-3 h-3 text-brutal-success flex-shrink-0 mt-0.5" />
                    <span className="text-brutal-text">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckout(tier);
                }}
                disabled={isRedirecting}
                className={`w-full h-9 font-mono text-xs flex items-center justify-center gap-2 transition-colors ${
                  selectedTier === tier.id || tier.highlighted
                    ? 'bg-brutal-accent text-brutal-bg hover:bg-brutal-accent/90'
                    : 'border border-brutal-border hover:border-brutal-accent hover:text-brutal-accent'
                } disabled:opacity-50`}
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3 h-3" />
                    Subscribe
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-6 pb-6">
          <div className="p-3 border border-brutal-border bg-brutal-bg text-[10px] font-mono text-brutal-muted">
            <span className="text-brutal-accent">{'>'}</span> Powered by Stripe Test Mode.
            Use test card <span className="text-brutal-text font-bold">4242 4242 4242 4242</span> with any future date and CVC.
          </div>
        </div>
      </div>
    </div>
  );
}
