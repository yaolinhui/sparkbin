import { useState, useEffect } from 'react';
import { Edit2, Check, Plus, X, Lightbulb } from 'lucide-react';
import { useI18n } from '../i18n';
import { aiService } from '../services/ai';
import type { Project } from '../types';

interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: 'default' | 'accent' | 'warning' | 'success';
}

interface IdeaStageProps {
  project: Project;
  onUpdateContent: (content: string) => Promise<void>;
  isLocked: boolean;
}

// AI 宠物 ASCII 形象
const AI_PET_CAT = `
    /\\_/\\
   ( o.o )
    > ^ <
   /|   |\\
  (_|   |_)
`;

const COLORS = {
  default: 'border-brutal-border bg-brutal-surface',
  accent: 'border-brutal-accent bg-brutal-accent/10',
  warning: 'border-brutal-warning bg-brutal-warning/10',
  success: 'border-brutal-success bg-brutal-success/10',
};

export function IdeaStage({ project, onUpdateContent, isLocked }: IdeaStageProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 初始化便利贴（从项目数据解析或预生成）
  useEffect(() => {
    const ideaStage = project.stages?.idea;
    if (ideaStage?.content) {
      try {
        const parsed = JSON.parse(ideaStage.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
          return;
        }
      } catch {
        // 解析失败，使用默认生成
      }
    }

    // 预生成默认便利贴
    const defaultNotes: StickyNote[] = [
      {
        id: '1',
        title: '核心痛点',
        content: project.painPoint || '描述你想解决的核心问题...',
        color: 'accent',
      },
      {
        id: '2',
        title: '目标用户',
        content: '谁会使用这个产品？\n例如：25-35岁职场人士',
        color: 'default',
      },
      {
        id: '3',
        title: '使用场景',
        content: '用户在什么情况下会用？\n例如：通勤时、工作中',
        color: 'default',
      },
      {
        id: '4',
        title: '解决方案',
        content: '你打算如何解决？\n简述核心功能...',
        color: 'warning',
      },
      {
        id: '5',
        title: '差异化价值',
        content: '与现有方案相比，你的优势是什么？',
        color: 'success',
      },
    ];
    setNotes(defaultNotes);
    saveNotes(defaultNotes);
  }, [project.painPoint]);

  // 保存便利贴到项目
  const saveNotes = async (newNotes: StickyNote[]) => {
    const content = JSON.stringify(newNotes);
    await onUpdateContent(content);
  };

  // 开始编辑
  const startEdit = (note: StickyNote) => {
    if (isLocked) return;
    setEditingNote(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingNote) return;

    const newNotes = notes.map((note) =>
      note.id === editingNote
        ? { ...note, title: editTitle, content: editContent }
        : note
    );
    setNotes(newNotes);
    await saveNotes(newNotes);
    setEditingNote(null);
    setEditContent('');
    setEditTitle('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
    setEditTitle('');
  };

  // 添加新便利贴
  const addNote = async () => {
    if (isLocked) return;

    const newNote: StickyNote = {
      id: Date.now().toString(),
      title: '新维度',
      content: '点击编辑...',
      color: 'default',
    };
    const newNotes = [...notes, newNote];
    setNotes(newNotes);
    await saveNotes(newNotes);
    startEdit(newNote);
  };

  // 删除便利贴
  const deleteNote = async (id: string) => {
    if (isLocked) return;

    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await saveNotes(newNotes);
  };

  // 更改颜色
  const changeColor = async (id: string, color: StickyNote['color']) => {
    if (isLocked) return;

    const newNotes = notes.map((note) =>
      note.id === id ? { ...note, color } : note
    );
    setNotes(newNotes);
    await saveNotes(newNotes);
  };

  // 获取 AI 建议
  const getAiSuggestion = async () => {
    setIsGenerating(true);
    try {
      const suggestion = await aiService.generateIdeaSuggestion(
        project.title,
        project.painPoint,
        notes
      );
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-brutal-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-4 h-4 text-brutal-accent" />
          <span className="font-mono text-sm">{t('stage.idea')}</span>
          <span className="text-xs text-brutal-muted">
            ({notes.length} 个维度)
          </span>
        </div>
        {!isLocked && (
          <div className="flex items-center gap-2">
            <button
              onClick={getAiSuggestion}
              disabled={isGenerating}
              className="btn-brutal flex items-center gap-2 text-xs"
            >
              {isGenerating ? (
                <div className="w-3 h-3 border border-brutal-text border-t-transparent animate-spin" />
              ) : (
                <span className="text-brutal-accent">✨</span>
              )}
              AI 建议
            </button>
            <button
              onClick={addNote}
              className="btn-brutal flex items-center gap-2 text-xs"
            >
              <Plus className="w-3 h-3" />
              添加
            </button>
          </div>
        )}
      </div>

      {/* AI Pet Suggestion */}
      {aiSuggestion && (
        <div className="p-4 border-b border-brutal-border">
          <div className="flex items-start gap-4">
            <pre className="text-xs text-brutal-accent font-mono leading-none flex-shrink-0">
              {AI_PET_CAT}
            </pre>
            <div className="flex-1">
              <p className="text-sm font-mono text-brutal-text whitespace-pre-line">
                {aiSuggestion}
              </p>
              <button
                onClick={() => setAiSuggestion(null)}
                className="text-xs text-brutal-muted hover:text-brutal-text mt-2"
              >
                [关闭]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Notes Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`relative border-2 ${COLORS[note.color]} p-4 min-h-[160px] flex flex-col group`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-brutal-muted">
                  #{note.id.padStart(2, '0')}
                </span>
                {!isLocked && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(note)}
                      className="p-1 text-brutal-muted hover:text-brutal-text"
                      title="编辑"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 text-brutal-muted hover:text-brutal-warning"
                      title="删除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              {editingNote === note.id ? (
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-2 border border-brutal-accent bg-brutal-bg text-sm font-mono font-bold"
                    placeholder="标题"
                    autoFocus
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 w-full p-2 border border-brutal-accent bg-brutal-bg text-sm font-mono resize-none"
                    placeholder="内容"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 py-1 text-xs bg-brutal-accent text-brutal-bg font-mono"
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 py-1 text-xs border border-brutal-border font-mono"
                    >
                      取消
                    </button>
                  </div>
                  {/* Color picker */}
                  <div className="flex gap-1 mt-1">
                    {(['default', 'accent', 'warning', 'success'] as const).map(
                      (color) => (
                        <button
                          key={color}
                          onClick={() => changeColor(note.id, color)}
                          className={`w-4 h-4 border ${
                            color === 'default'
                              ? 'border-brutal-border bg-brutal-surface'
                              : color === 'accent'
                              ? 'border-brutal-accent bg-brutal-accent'
                              : color === 'warning'
                              ? 'border-brutal-warning bg-brutal-warning'
                              : 'border-brutal-success bg-brutal-success'
                          }`}
                          title={color}
                        />
                      )
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="font-mono font-bold text-sm mb-2 text-brutal-text">
                    {note.title}
                  </h4>
                  <p className="text-sm font-mono text-brutal-muted whitespace-pre-line flex-1">
                    {note.content}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {notes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-brutal-muted font-mono text-sm">
              还没有便利贴，点击"添加"创建第一个
            </p>
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="px-6 py-2 border-t border-brutal-border bg-brutal-surface">
        <p className="text-xs text-brutal-muted font-mono">
          💡 提示：点击便利贴上的编辑图标修改内容，或点击颜色块更改颜色
        </p>
      </div>
    </div>
  );
}
