import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, CreditCard } from 'lucide-react';
import { paymentsApi } from '../services/api';

interface PaymentResultModalProps {
  result: 'success' | 'cancel' | null;
  onClose: () => void;
}

export function PaymentResultModal({ result, onClose }: PaymentResultModalProps) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (result === 'success') {
      setIsLoading(true);
      paymentsApi.getSubscriptionStatus()
        .then((res) => {
          setSubscriptionStatus(res.status);
        })
        .catch(() => {
          setSubscriptionStatus('unknown');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [result]);

  if (!result) return null;

  const isSuccess = result === 'success';

  return (
    <div className="fixed inset-0 z-[60] bg-brutal-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="border-2 border-brutal-border bg-brutal-surface w-full max-w-md">
        <div className={`p-4 border-b border-brutal-border flex items-center gap-3 ${isSuccess ? 'bg-brutal-success/10' : 'bg-brutal-warning/10'}`}>
          {isSuccess ? (
            <CheckCircle className="w-5 h-5 text-brutal-success" />
          ) : (
            <XCircle className="w-5 h-5 text-brutal-warning" />
          )}
          <span className="text-sm font-mono font-bold">
            {isSuccess ? 'Payment Successful' : 'Payment Cancelled'}
          </span>
        </div>

        <div className="p-6 space-y-4">
          {isSuccess ? (
            <>
              <p className="text-sm font-mono text-brutal-text">
                Your test subscription has been activated. This is a simulated payment in Stripe Test Mode — no real money was charged.
              </p>

              <div className="p-3 border border-brutal-border bg-brutal-bg">
                <div className="text-[10px] text-brutal-muted font-mono uppercase mb-1">Subscription Status</div>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brutal-accent" />
                  ) : (
                    <>
                      <span className={`w-2 h-2 rounded-full ${subscriptionStatus === 'active' ? 'bg-brutal-success' : 'bg-brutal-warning'}`} />
                      <span className="text-sm font-mono font-bold text-brutal-text uppercase">
                        {subscriptionStatus || 'pending'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 border border-brutal-accent/30 bg-brutal-accent/5 text-xs font-mono text-brutal-muted">
                <span className="text-brutal-accent">{'>'}</span> Webhook received from Stripe. User record updated in backend.
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-mono text-brutal-text">
                You cancelled the checkout session. No charges were made.
              </p>
              <div className="p-3 border border-brutal-border bg-brutal-bg text-xs font-mono text-brutal-muted">
                <CreditCard className="w-4 h-4 inline mr-2" />
                You can reopen the preview and try again with a test card.
              </div>
            </>
          )}

          <button
            onClick={onClose}
            className="w-full btn-brutal-primary h-9 flex items-center justify-center"
          >
            {isSuccess ? 'Continue to Project' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
