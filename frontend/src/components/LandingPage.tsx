import { Lock, Lightbulb, CheckCircle, Hammer, Rocket, TrendingUp, DollarSign } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const STAGES = [
  { key: 'idea', label: 'IDEA', desc: '想法', icon: Lightbulb },
  { key: 'validate', label: 'VALIDATE', desc: '验证', icon: CheckCircle },
  { key: 'prototype', label: 'PROTOTYPE', desc: '原型', icon: Hammer },
  { key: 'ship', label: 'SHIP', desc: '发布', icon: Rocket },
  { key: 'grow', label: 'GROW', desc: '增长', icon: TrendingUp },
  { key: 'monetize', label: 'MONETIZE', desc: '变现', icon: DollarSign },
];

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div
      className="min-h-[100dvh] bg-brutal-bg flex flex-col items-center justify-center p-4"
      style={{
        backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--brutal-text) 18%, transparent) 2px, transparent 2px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div className="w-full max-w-2xl">
        {/* Brand */}
        <div className="border-2 border-brutal-border bg-brutal-surface p-8 text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-brutal-text flex items-center justify-center">
              <Lock className="w-6 h-6 text-brutal-bg" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-mono font-bold text-brutal-text tracking-tight">SPARKBIN</h1>
              <p className="text-xs font-mono text-brutal-muted">BACKEND AUTHENTICATION</p>
            </div>
          </div>
          <p className="text-sm font-mono text-brutal-text-secondary mb-2">
            为独立开发者打造的 6 阶段项目工作流工具
          </p>
          <p className="text-xs font-mono text-brutal-muted">
            从想法到变现，用 AI 辅助每一步决策
          </p>
        </div>

        {/* Stages Grid */}
        <div className="grid grid-cols-3 gap-px bg-brutal-border border-2 border-brutal-border mb-6">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.key}
                className="bg-brutal-surface p-4 text-center hover:bg-brutal-surface-hover transition-colors"
              >
                <Icon className="w-5 h-5 text-brutal-accent mx-auto mb-2" />
                <div className="text-xs font-mono font-bold text-brutal-text">{stage.label}</div>
                <div className="text-[10px] font-mono text-brutal-muted">{stage.desc}</div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="border-2 border-brutal-border bg-brutal-surface p-6 text-center">
          <button
            onClick={onEnter}
            className="w-full py-3 bg-brutal-accent text-brutal-bg font-mono font-bold
                       border-2 border-brutal-accent
                       hover:bg-brutal-bg hover:text-brutal-accent
                       transition-colors
                       active:translate-x-[2px] active:translate-y-[2px]"
          >
            进入系统
          </button>
          <p className="text-[10px] font-mono text-brutal-muted mt-3">
            需要登录后才能管理项目
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[10px] font-mono text-brutal-muted">
            SPARKBIN © 2026 — Indie Hacker Workflow
          </p>
        </div>
      </div>
    </div>
  );
}
