import { useState, useEffect } from 'react';
import { Edit2, Check, Plus, X, Lightbulb, GripVertical } from 'lucide-react';
import { useI18n } from '../i18n';
import { aiService } from '../services/ai';
import type { Project } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const AI_PET_CAT = `
    /\_/\
   ( o.o )
    > ^ <
   /|   |\
  (_|   |_)
`;

// 颜色配置
const NOTE_COLORS: Record<string, string> = {
  default: 'border-brutal-border bg-brutal-surface',
  accent: 'border-brutal-accent bg-brutal-accent/10',
  warning: 'border-brutal-warning bg-brutal-warning/10',
  success: 'border-brutal-success bg-brutal-success/10',
};

function SortableNote({
  note,
  isEditing,
  isLocked,
  editTitle,
  editContent,
  onEditTitleChange,
  onEditContentChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  onChangeColor,
}: {
  note: StickyNote;
  isEditing: boolean;
  isLocked: boolean;
  editTitle: string;
  editContent: string;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onChangeColor: (color: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: isLocked || isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  const colorClass = NOTE_COLORS[note.color] || NOTE_COLORS.default;

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className={`relative border-2 ${colorClass} p-4 min-h-[160px] flex flex-col`}>
        <div className="flex-1 flex flex-col gap-2">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="w-full p-2 border border-brutal-accent bg-brutal-bg text-sm font-mono font-bold"
            placeholder="标题"
            autoFocus
          />
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            className="flex-1 w-full p-2 border border-brutal-accent bg-brutal-bg text-sm font-mono resize-none"
            placeholder="内容"
            rows={4}
          />
          <div className="flex gap-2">
            <button onClick={onSave} className="flex-1 py-1 text-xs bg-brutal-accent text-brutal-bg font-mono">
              <Check className="w-3 h-3 inline mr-1" />保存
            </button>
            <button onClick={onCancel} className="flex-1 py-1 text-xs border border-brutal-border font-mono">
              取消
            </button>
          </div>
          <div className="flex gap-1 mt-1">
            {(['default', 'accent', 'warning', 'success'] as const).map((color) => (
              <button
                key={color}
                onClick={() => onChangeColor(color)}
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
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`relative border-2 ${colorClass} p-4 min-h-[160px] flex flex-col group cursor-move`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {!isLocked && (
            <button
              {...attributes}
              {...listeners}
              className="p-1 text-brutal-muted hover:text-brutal-text cursor-grab active:cursor-grabbing"
              title="拖拽排序"
            >
              <GripVertical className="w-3 h-3" />
            </button>
          )}
          <span className="text-xs font-mono text-brutal-muted">#{note.id.padStart(2, '0')}</span>
        </div>
        {!isLocked && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onStartEdit} className="p-1 text-brutal-muted hover:text-brutal-text" title="编辑">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-1 text-brutal-muted hover:text-brutal-warning" title="删除">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <h4 className="font-mono font-bold text-sm mb-2 text-brutal-text">{note.title}</h4>
      <p className="text-sm font-mono text-brutal-muted whitespace-pre-line flex-1">{note.content}</p>
    </div>
  );
}

export function IdeaStage({ project, onUpdateContent, isLocked }: IdeaStageProps) {
  const { t } = useI18n();
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const ideaStage = project.stages?.idea;
    if (ideaStage?.content) {
      try {
        const parsed = JSON.parse(ideaStage.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
          return;
        }
      } catch {}
    }
    const defaultNotes: StickyNote[] = [
      { id: '1', title: '核心痛点', content: project.painPoint || '描述你想解决的核心问题...', color: 'accent' },
      { id: '2', title: '目标用户', content: '谁会使用这个产品？\n例如：25-35岁职场人士', color: 'default' },
      { id: '3', title: '使用场景', content: '用户在什么情况下会用？\n例如：通勤时、工作中', color: 'default' },
      { id: '4', title: '解决方案', content: '你打算如何解决？\n简述核心功能...', color: 'warning' },
      { id: '5', title: '差异化价值', content: '与现有方案相比，你的优势是什么？', color: 'success' },
    ];
    setNotes(defaultNotes);
    saveNotes(defaultNotes);
  }, [project.painPoint]);

  const saveNotes = async (newNotes: StickyNote[]) => {
    const content = JSON.stringify(newNotes);
    await onUpdateContent(content);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = notes.findIndex((item) => item.id === active.id);
      const newIndex = notes.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(notes, oldIndex, newIndex);
      setNotes(newItems);
      await saveNotes(newItems);
    }
  };

  const startEdit = (note: StickyNote) => {
    if (isLocked) return;
    setEditingNote(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const saveEdit = async () => {
    if (!editingNote) return;
    const newNotes = notes.map((note) =>
      note.id === editingNote ? { ...note, title: editTitle, content: editContent } : note
    );
    setNotes(newNotes);
    await saveNotes(newNotes);
    setEditingNote(null);
    setEditContent('');
    setEditTitle('');
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
    setEditTitle('');
  };

  const addNote = async () => {
    if (isLocked) return;
    const newNote: StickyNote = { id: Date.now().toString(), title: '新维度', content: '点击编辑...', color: 'default' };
    const newNotes = [...notes, newNote];
    setNotes(newNotes);
    await saveNotes(newNotes);
    startEdit(newNote);
  };

  const deleteNote = async (id: string) => {
    if (isLocked) return;
    if (!window.confirm('确定要删除这个便利贴吗？')) return;
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await saveNotes(newNotes);
  };

  const changeColor = async (id: string, color: StickyNote['color']) => {
    if (isLocked) return;
    const newNotes = notes.map((note) => (note.id === id ? { ...note, color } : note));
    setNotes(newNotes);
    await saveNotes(newNotes);
  };

  const getAiSuggestion = async () => {
    setIsGenerating(true);
    try {
      const suggestion = await aiService.generateIdeaSuggestion(project.title, project.painPoint, notes);
      setAiSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-brutal-bg">
      <div className="flex items-center justify-between px-6 py-3 border-b border-brutal-border bg-brutal-surface">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-4 h-4 text-brutal-accent" />
          <span className="font-mono text-sm">{t('stage.idea')}</span>
          <span className="text-xs text-brutal-muted">({notes.length} 个维度)</span>
        </div>
        {!isLocked && (
          <div className="flex items-center gap-2">
            <button onClick={getAiSuggestion} disabled={isGenerating} className="btn-brutal h-9 flex items-center gap-2 text-xs">
              {isGenerating ? (
                <div className="w-3 h-3 border border-brutal-text border-t-transparent animate-spin" />
              ) : (
                <span className="text-brutal-accent">✨</span>
              )}
              AI 建议
            </button>
            <button onClick={addNote} className="btn-brutal h-9 flex items-center gap-2 text-xs group">
              <Plus className="w-3 h-3 text-brutal-text group-active:text-brutal-bg" />
              添加
            </button>
          </div>
        )}
      </div>

      {aiSuggestion && (
        <div className="p-4 border-b border-brutal-border">
          <div className="flex items-start gap-4">
            <pre className="text-xs text-brutal-accent font-mono leading-none flex-shrink-0">{AI_PET_CAT}</pre>
            <div className="flex-1">
              <p className="text-sm font-mono text-brutal-text whitespace-pre-line">{aiSuggestion}</p>
              <button onClick={() => setAiSuggestion(null)} className="text-xs text-brutal-muted hover:text-brutal-text mt-2">
                [关闭]
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-6 flex-1 flex flex-col">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={notes.map((n) => n.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start flex-1">
                {notes.map((note) => (
                  <SortableNote
                    key={note.id}
                    note={note}
                    isEditing={editingNote === note.id}
                    isLocked={isLocked}
                    editTitle={editTitle}
                    editContent={editContent}
                    onEditTitleChange={setEditTitle}
                    onEditContentChange={setEditContent}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onStartEdit={() => startEdit(note)}
                    onDelete={() => deleteNote(note.id)}
                    onChangeColor={(color: string) => changeColor(note.id, color as StickyNote['color'])}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {notes.length === 0 && (
            <div className="text-center py-12 flex-1 flex items-center justify-center">
              <p className="text-brutal-muted font-mono text-sm">还没有便利贴，点击"添加"创建第一个</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-brutal-border bg-brutal-surface/50">
          <p className="text-xs text-brutal-muted font-mono">💡 提示：拖拽便利贴可排序，点击编辑图标修改内容</p>
        </div>
      </div>
    </div>
  );
}
