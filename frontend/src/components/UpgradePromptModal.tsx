import { X, Zap } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'projects' | 'ai_calls' | 'analysis';
}

const MESSAGES = {
  projects: {
    title: '项目数量已达上限',
    desc: '免费版最多创建 3 个项目。升级 Pro 可创建无限项目，并获得 500 次 AI 调用/月。',
  },
  ai_calls: {
    title: 'AI 调用配额已用完',
    desc: '本月 AI 调用次数已达上限。升级 Pro 可获得 500 次/月，让 AI 伙伴继续为你出谋划策。',
  },
  analysis: {
    title: 'Pro 功能',
    desc: '深度分析、竞品模拟、导出 PDF 等功能为 Pro 专属。升级后立即解锁全部能力。',
  },
};

export function UpgradePromptModal({ isOpen, onClose, feature }: UpgradePromptProps) {
  if (!isOpen) return null;

  const msg = MESSAGES[feature];

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-brutal-surface border-2 border-brutal-border w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border bg-brutal-bg">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brutal-accent" />
            <span className="text-sm font-mono font-bold">{msg.title}</span>
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
            {msg.desc}
          </p>

          <div className="space-y-3">
            <div className="border border-brutal-border p-3 bg-brutal-bg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-mono font-bold">Pro</span>
                <span className="text-xs font-mono text-brutal-accent">$9/月</span>
              </div>
              <ul className="text-[11px] font-mono text-brutal-muted space-y-0.5">
                <li>• 无限项目</li>
                <li>• 500 次 AI 调用/月</li>
                <li>• 深度分析 + 导出 PDF</li>
                <li>• GitHub 自动备份</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-brutal-border bg-brutal-bg">
          <button onClick={onClose} className="flex-1 btn-brutal h-9 py-3">
            稍后再说
          </button>
          <button
            onClick={() => window.open('https://sparkbin.dev/pricing', '_blank')}
            className="flex-1 btn-brutal-primary h-9 py-3"
          >
            查看定价
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpgradePromptModal;
