// 加载骨架组件
export function SkeletonCard() {
  return (
    <div className="bg-brutal-surface border border-brutal-border p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brutal-border" />
          <div className="w-12 h-4 bg-brutal-border" />
        </div>
        <div className="w-16 h-4 bg-brutal-border" />
      </div>
      <div className="h-4 bg-brutal-border mb-2 w-3/4" />
      <div className="h-4 bg-brutal-border mb-4 w-1/2" />
      <div className="h-1 bg-brutal-border mb-3" />
      <div className="flex items-center justify-between">
        <div className="w-20 h-4 bg-brutal-border" />
        <div className="w-16 h-4 bg-brutal-border" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-brutal-border"
          style={{ width: `${Math.random() * 30 + 70}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonNote() {
  return (
    <div className="border-2 border-brutal-border bg-brutal-surface p-4 min-h-[160px] animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-4 bg-brutal-border" />
        <div className="w-12 h-4 bg-brutal-border" />
      </div>
      <div className="h-4 bg-brutal-border mb-2 w-3/4" />
      <div className="h-4 bg-brutal-border w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-brutal-border animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b border-brutal-border last:border-0">
          <div className="w-24 h-4 bg-brutal-border" />
          <div className="w-20 h-4 bg-brutal-border" />
          <div className="flex-1 h-4 bg-brutal-border" />
        </div>
      ))}
    </div>
  );
}
