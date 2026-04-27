import { useState, useEffect } from 'react';
import { X, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/hooks';

interface NoteSuggestion {
  title: string;
  content: string;
}

interface IdeaSuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNotes: NoteSuggestion[];
  suggestedNotes: NoteSuggestion[] | null;
  isLoading: boolean;
  error: string | null;
  onMerge: () => Promise<void>;
  onOverwrite: () => Promise<void>;
}

const AI_PET_CAT = `
    /\\_/\\
   ( o.o )
    > ^ <
   /|   |\\
  (_|   |_)
`;

const DEFAULT_PLACEHOLDERS = [
  '描述你想解决的核心问题...',
  '谁会使用这个产品？',
  '用户在什么情况下会用？',
  '简述核心功能...',
  '与现有方案相比，你的优势是什么？',
  '点击编辑...',
];

function isPlaceholder(content: string): boolean {
  return DEFAULT_PLACEHOLDERS.some((p) => content.includes(p));
}

export function IdeaSuggestModal({
  isOpen,
  onClose,
  currentNotes,
  suggestedNotes,
  isLoading,
  error,
  onMerge,
  onOverwrite,
}: IdeaSuggestModalProps) {
  const { t } = useI18n();
  const [selectedMode, setSelectedMode] = useState<'merge' | 'overwrite'>('merge');
  const [editedSuggestions, setEditedSuggestions] = useState<NoteSuggestion[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (suggestedNotes) {
      setEditedSuggestions(suggestedNotes);
    }
  }, [suggestedNotes]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSuggestionEdit = (index: number, newContent: string) => {
    setEditedSuggestions((prev) =>
      prev.map((n, i) => (i === index ? { ...n, content: newContent } : n))
    );
  };

  const handleApply = async () => {
    if (!selectedMode || isApplying) return;
    setIsApplying(true);
    try {
      if (selectedMode === 'merge') {
        await onMerge();
      } else {
        await onOverwrite();
      }
    } finally {
      setIsApplying(false);
    }
  };

  interface PreviewRow {
    title: string;
    currentContent: string;
    suggestedContent: string;
    willReplace: boolean;
    isPlaceholder: boolean;
  }

  const mergedPreview: PreviewRow[] = currentNotes.map((current, index) => {
    const suggestion = editedSuggestions[index];
    if (!suggestion) {
      return {
        title: current.title,
        currentContent: current.content,
        suggestedContent: current.content,
        willReplace: false,
        isPlaceholder: isPlaceholder(current.content),
      };
    }
    const willReplace = selectedMode === 'overwrite' || (selectedMode === 'merge' && isPlaceholder(current.content));
    return {
      title: current.title,
      currentContent: current.content,
      suggestedContent: suggestion.content,
      willReplace,
      isPlaceholder: isPlaceholder(current.content),
    };
  });

  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto pt-[5vh]">
      <div className="border border-brutal-border bg-brutal-surface w-full max-w-3xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border flex-shrink-0">
          <div>
            <span className="text-xs text-brutal-muted font-mono">// </span>
            <span className="text-sm font-mono font-bold">AI 建议预览</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border border-brutal-border flex items-center justify-center hover:bg-brutal-text hover:text-brutal-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 border border-brutal-warning text-brutal-warning text-sm font-mono">
              <span className="text-brutal-warning">[{t('ai.error_prefix')}]</span> {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-start gap-4 p-4 border border-brutal-border bg-brutal-bg">
              <pre className="text-xs text-brutal-accent font-mono leading-none">{AI_PET_CAT}</pre>
              <div>
                <p className="text-sm font-mono text-brutal-text">正在分析你的想法...</p>
                <p className="text-xs text-brutal-muted mt-1">AI 正在根据你的原始想法生成建议</p>
                <div className="mt-3 flex gap-1">
                  <div className="w-2 h-2 bg-brutal-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-brutal-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-brutal-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {!isLoading && suggestedNotes && (
            <div className="space-y-4">
              {/* 预览说明 */}
              <div className="p-3 border border-brutal-border bg-brutal-bg text-xs font-mono text-brutal-muted">
                <span className="text-brutal-accent">&gt;</span> 左侧为当前内容，右侧为 AI 建议。你可以在右侧直接编辑建议内容。
              </div>

              {/* 对比表格 */}
              <div className="border border-brutal-border">
                {/* 表头 */}
                <div className="grid grid-cols-2 border-b border-brutal-border bg-brutal-bg">
                  <div className="p-2 text-xs font-mono text-brutal-muted border-r border-brutal-border">当前内容</div>
                  <div className="p-2 text-xs font-mono text-brutal-accent">AI 建议（可编辑）</div>
                </div>

                {/* 行 */}
                {mergedPreview.map((row, index) => (
                  <div
                    key={index}
                    className={`grid grid-cols-2 border-b border-brutal-border last:border-b-0 ${
                      row.willReplace ? 'bg-brutal-accent/5' : ''
                    }`}
                  >
                    <div className="p-3 border-r border-brutal-border">
                      <div className="text-xs font-mono text-brutal-muted mb-1">{row.title}</div>
                      <p className={`text-sm font-mono ${row.isPlaceholder ? 'text-brutal-muted' : 'text-brutal-text'}`}>
                        {row.currentContent}
                      </p>
                      {row.isPlaceholder && (
                        <span className="inline-block mt-1 text-[10px] px-1 border border-brutal-warning text-brutal-warning font-mono">
                          占位符
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-mono text-brutal-accent mb-1">{row.title}</div>
                      <textarea
                        value={editedSuggestions[index]?.content || ''}
                        onChange={(e) => handleSuggestionEdit(index, e.target.value)}
                        className="w-full min-h-[60px] p-2 border border-brutal-border bg-brutal-bg text-sm font-mono resize-none focus:border-brutal-accent transition-colors"
                        rows={2}
                      />
                      {selectedMode === 'merge' && !row.isPlaceholder && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-brutal-warning font-mono">
                          <AlertTriangle className="w-3 h-3" />
                          智能合并：此条保留原内容
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 操作模式选择 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMode('merge')}
                  className={`flex-1 p-3 border text-left transition-colors ${
                    selectedMode === 'merge'
                      ? 'border-brutal-accent bg-brutal-accent/15'
                      : 'border-brutal-border hover:border-brutal-text'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-4 h-4 border flex items-center justify-center ${
                        selectedMode === 'merge'
                          ? 'bg-brutal-accent border-brutal-accent text-brutal-bg'
                          : 'border-brutal-border'
                      }`}
                    >
                      {selectedMode === 'merge' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-mono font-bold ${selectedMode === 'merge' ? 'text-brutal-accent' : ''}`}>智能合并</span>
                  </div>
                  <p className="text-xs font-mono text-brutal-muted">
                    只覆盖内容为占位符的便利贴，保留你已编辑的内容
                  </p>
                </button>

                <button
                  onClick={() => setSelectedMode('overwrite')}
                  className={`flex-1 p-3 border text-left transition-colors ${
                    selectedMode === 'overwrite'
                      ? 'border-brutal-accent bg-brutal-accent/15'
                      : 'border-brutal-border hover:border-brutal-text'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-4 h-4 border flex items-center justify-center ${
                        selectedMode === 'overwrite'
                          ? 'bg-brutal-accent border-brutal-accent text-brutal-bg'
                          : 'border-brutal-border'
                      }`}
                    >
                      {selectedMode === 'overwrite' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-mono font-bold ${selectedMode === 'overwrite' ? 'text-brutal-accent' : ''}`}>全部覆盖</span>
                  </div>
                  <p className="text-xs font-mono text-brutal-muted">
                    用 AI 建议替换所有便利贴内容（包括你已编辑的）
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-brutal-border bg-brutal-bg flex-shrink-0">
          <button onClick={onClose} className="btn-brutal h-9 px-4 text-xs">
            取消
          </button>

          {!isLoading && suggestedNotes && (
            <button
              onClick={handleApply}
              disabled={!selectedMode || isApplying}
              className={`btn-brutal-primary h-9 px-4 text-xs flex items-center gap-2 ${
                !selectedMode || isApplying ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isApplying ? (
                <div className="w-3 h-3 border border-brutal-bg border-t-transparent animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              {isApplying ? '保存中...' : '应用建议'}
              {!isApplying && <ArrowRight className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
