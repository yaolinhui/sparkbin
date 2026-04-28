import { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ClipboardList, Users, MessageSquare, Target } from 'lucide-react';
import type { ValidationItem, ValidationTool } from '../types';

interface ValidateSuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentItems: ValidationItem[];
  currentTools: ValidationTool[];
  suggestedItems: { title: string; description: string; method: string }[] | null;
  suggestedTools: { type: string; title: string; content: string }[] | null;
  analysis: string | null;
  isLoading: boolean;
  error: string | null;
  onApply: (mode: 'append' | 'overwrite', items: ValidationItem[], tools: ValidationTool[]) => Promise<void>;
}

const METHOD_ICONS: Record<string, React.ElementType> = {
  survey: ClipboardList,
  interview: Users,
  community: MessageSquare,
  competitor: Target,
};

const METHOD_LABELS: Record<string, string> = {
  survey: '问卷',
  interview: '访谈',
  community: '社区',
  competitor: '竞品',
};

const AI_PET_CAT = `
    /\\_/\\
   ( o.o )
    > ^ <
   /|   |\\
  (_|   |_)
`;

export function ValidateSuggestModal({
  isOpen,
  onClose,
  currentItems,
  currentTools,
  suggestedItems,
  suggestedTools,
  analysis,
  isLoading,
  error,
  onApply,
}: ValidateSuggestModalProps) {
  const [selectedMode, setSelectedMode] = useState<'append' | 'overwrite'>('append');
  const [editedItems, setEditedItems] = useState<{ title: string; description: string; method: string }[]>([]);
  const [editedTools, setEditedTools] = useState<{ type: string; title: string; content: string }[]>([]);
  const [selectedItemIndexes, setSelectedItemIndexes] = useState<Set<number>>(new Set());
  const [selectedToolIndexes, setSelectedToolIndexes] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (suggestedItems) {
      setEditedItems(suggestedItems);
      setSelectedItemIndexes(new Set(suggestedItems.map((_, i) => i)));
    }
  }, [suggestedItems]);

  useEffect(() => {
    if (suggestedTools) {
      setEditedTools(suggestedTools);
      setSelectedToolIndexes(new Set(suggestedTools.map((_, i) => i)));
    }
  }, [suggestedTools]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemEdit = (index: number, field: 'title' | 'description', value: string) => {
    setEditedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleToolEdit = (index: number, field: 'title' | 'content', value: string) => {
    setEditedTools((prev) =>
      prev.map((tool, i) => (i === index ? { ...tool, [field]: value } : tool))
    );
  };

  const toggleItem = (index: number) => {
    setSelectedItemIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleTool = (index: number) => {
    setSelectedToolIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApply = async () => {
    if (isApplying) return;

    const chosenItems = editedItems.filter((_, i) => selectedItemIndexes.has(i));
    const chosenTools = editedTools.filter((_, i) => selectedToolIndexes.has(i));

    // 转换为 ValidationItem / ValidationTool（生成 id 和 createdAt）
    const now = new Date().toISOString();
    const newItems: ValidationItem[] = chosenItems.map((item) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      title: item.title,
      description: item.description,
      status: 'pending',
      method: item.method as ValidationItem['method'],
      createdAt: now,
    }));

    const newTools: ValidationTool[] = chosenTools.map((tool) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      type: tool.type as ValidationTool['type'],
      title: tool.title,
      content: tool.content,
      generatedAt: now,
    }));

    let finalItems: ValidationItem[];
    let finalTools: ValidationTool[];

    if (selectedMode === 'overwrite') {
      finalItems = newItems;
      finalTools = newTools;
    } else {
      // append: 保留已有的，追加新的（去重标题）
      const existingItemTitles = new Set(currentItems.map((i) => i.title));
      finalItems = [
        ...currentItems,
        ...newItems.filter((i) => !existingItemTitles.has(i.title)),
      ];
      const existingToolTitles = new Set(currentTools.map((t) => t.title));
      finalTools = [
        ...currentTools,
        ...newTools.filter((t) => !existingToolTitles.has(t.title)),
      ];
    }

    setIsApplying(true);
    try {
      await onApply(selectedMode, finalItems, finalTools);
    } finally {
      setIsApplying(false);
    }
  };

  const hasSelections = selectedItemIndexes.size > 0 || selectedToolIndexes.size > 0;

  return (
    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto pt-[5vh]">
      <div className="border border-brutal-border bg-brutal-surface w-full max-w-4xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brutal-border flex-shrink-0">
          <div>
            <span className="text-xs text-brutal-muted font-mono">// </span>
            <span className="text-sm font-mono font-bold">AI 验证方案建议</span>
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
              <span className="text-brutal-warning">[错误]</span> {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-start gap-4 p-4 border border-brutal-border bg-brutal-bg">
              <pre className="text-xs text-brutal-accent font-mono leading-none">{AI_PET_CAT}</pre>
              <div>
                <p className="text-sm font-mono text-brutal-text">正在设计验证方案...</p>
                <p className="text-xs text-brutal-muted mt-1">AI 正在根据项目信息生成验证项和工具</p>
                <div className="mt-3 flex gap-1">
                  <div className="w-2 h-2 bg-brutal-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-brutal-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-brutal-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {!isLoading && suggestedItems && (
            <div className="space-y-6">
              {/* AI 分析 */}
              {analysis && (
                <div className="p-3 border border-brutal-accent bg-brutal-accent/5 text-sm font-mono">
                  <span className="text-brutal-accent font-bold">&gt; 分析建议：</span>
                  <p className="text-brutal-text mt-1">{analysis}</p>
                </div>
              )}

              {/* 验证项建议 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-brutal-muted uppercase">验证项建议</span>
                  <span className="text-xs font-mono text-brutal-accent">
                    已选 {selectedItemIndexes.size} / {editedItems.length}
                  </span>
                </div>
                <div className="border border-brutal-border">
                  {editedItems.map((item, index) => {
                    const Icon = METHOD_ICONS[item.method] || ClipboardList;
                    const isSelected = selectedItemIndexes.has(index);
                    const isDuplicate = currentItems.some((ci) => ci.title === item.title);
                    return (
                      <div
                        key={index}
                        className={`border-b border-brutal-border last:border-b-0 p-3 ${
                          isSelected ? 'bg-brutal-accent/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleItem(index)}
                            className={`mt-0.5 w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-brutal-accent border-brutal-accent text-brutal-bg' : 'border-brutal-border'
                            }`}
                          >
                            {isSelected && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-3.5 h-3.5 text-brutal-accent" />
                              <input
                                value={item.title}
                                onChange={(e) => handleItemEdit(index, 'title', e.target.value)}
                                className="flex-1 text-sm font-mono font-bold bg-transparent border-b border-transparent focus:border-brutal-accent outline-none"
                              />
                              <span className="text-[10px] font-mono text-brutal-muted px-1 border border-brutal-border">
                                {METHOD_LABELS[item.method] || item.method}
                              </span>
                              {isDuplicate && selectedMode === 'append' && (
                                <span className="text-[10px] font-mono text-brutal-warning">已存在</span>
                              )}
                            </div>
                            <textarea
                              value={item.description}
                              onChange={(e) => handleItemEdit(index, 'description', e.target.value)}
                              className="w-full min-h-[50px] p-2 border border-brutal-border bg-brutal-bg text-xs font-mono resize-none focus:border-brutal-accent transition-colors"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 验证工具建议 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-brutal-muted uppercase">验证工具建议</span>
                  <span className="text-xs font-mono text-brutal-accent">
                    已选 {selectedToolIndexes.size} / {editedTools.length}
                  </span>
                </div>
                <div className="border border-brutal-border space-y-px">
                  {editedTools.map((tool, index) => {
                    const Icon = METHOD_ICONS[tool.type] || ClipboardList;
                    const isSelected = selectedToolIndexes.has(index);
                    const isDuplicate = currentTools.some((ct) => ct.title === tool.title);
                    return (
                      <div
                        key={index}
                        className={`p-3 ${isSelected ? 'bg-brutal-accent/5' : 'bg-brutal-bg'}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleTool(index)}
                            className={`mt-0.5 w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-brutal-accent border-brutal-accent text-brutal-bg' : 'border-brutal-border'
                            }`}
                          >
                            {isSelected && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-3.5 h-3.5 text-brutal-accent" />
                              <input
                                value={tool.title}
                                onChange={(e) => handleToolEdit(index, 'title', e.target.value)}
                                className="flex-1 text-sm font-mono font-bold bg-transparent border-b border-transparent focus:border-brutal-accent outline-none"
                              />
                              <span className="text-[10px] font-mono text-brutal-muted px-1 border border-brutal-border">
                                {METHOD_LABELS[tool.type] || tool.type}
                              </span>
                              {isDuplicate && selectedMode === 'append' && (
                                <span className="text-[10px] font-mono text-brutal-warning">已存在</span>
                              )}
                            </div>
                            <textarea
                              value={tool.content}
                              onChange={(e) => handleToolEdit(index, 'content', e.target.value)}
                              className="w-full min-h-[80px] p-2 border border-brutal-border bg-brutal-bg text-xs font-mono resize-none focus:border-brutal-accent transition-colors"
                              rows={4}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 操作模式 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMode('append')}
                  className={`flex-1 p-3 border text-left transition-colors ${
                    selectedMode === 'append'
                      ? 'border-brutal-accent bg-brutal-accent/15'
                      : 'border-brutal-border hover:border-brutal-text'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-4 h-4 border flex items-center justify-center ${
                        selectedMode === 'append' ? 'bg-brutal-accent border-brutal-accent text-brutal-bg' : 'border-brutal-border'
                      }`}
                    >
                      {selectedMode === 'append' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-mono font-bold ${selectedMode === 'append' ? 'text-brutal-accent' : ''}`}>
                      智能追加
                    </span>
                  </div>
                  <p className="text-xs font-mono text-brutal-muted">保留已有内容，追加新的验证项和工具</p>
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
                        selectedMode === 'overwrite' ? 'bg-brutal-accent border-brutal-accent text-brutal-bg' : 'border-brutal-border'
                      }`}
                    >
                      {selectedMode === 'overwrite' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1 5L4 8L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-mono font-bold ${selectedMode === 'overwrite' ? 'text-brutal-accent' : ''}`}>
                      全部覆盖
                    </span>
                  </div>
                  <p className="text-xs font-mono text-brutal-muted">用 AI 建议替换所有验证项和工具</p>
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

          {!isLoading && suggestedItems && (
            <button
              onClick={handleApply}
              disabled={!hasSelections || isApplying}
              className={`btn-brutal-primary h-9 px-4 text-xs flex items-center gap-2 ${
                !hasSelections || isApplying ? 'opacity-50 cursor-not-allowed' : ''
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
