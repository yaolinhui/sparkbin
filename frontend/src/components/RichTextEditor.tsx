import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { useI18n } from '../i18n/hooks';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readonly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  readonly = false,
  onDirtyChange,
}: RichTextEditorProps) {
  const { t } = useI18n();
  const finalPlaceholder = placeholder || `// ${t('placeholder.enter_notes')}`;
  const initialContentRef = useRef(content || '<p></p>');

  // content 外部变化时（如切换阶段），重置 initialContentRef
  useEffect(() => {
    initialContentRef.current = content || '<p></p>';
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: finalPlaceholder,
        showOnlyWhenEditable: true,
      }),
    ],
    content: content || '<p></p>',
    editable: !readonly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      onDirtyChange?.(html !== initialContentRef.current);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '<p></p>');
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="border border-brutal-border bg-brutal-bg p-4">
        <div className="animate-pulse h-32 bg-brutal-border" />
      </div>
    );
  }

  return (
    <div className={`border border-brutal-border bg-brutal-bg ${readonly ? 'opacity-60' : ''}`}>
      {!readonly && (
        <div className="flex items-center gap-1 p-2 border-b border-brutal-border bg-brutal-surface">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`p-2 border border-transparent hover:border-brutal-muted transition-colors focus-visible:border-brutal-accent focus-visible:outline-none ${
              editor.isActive('bold') ? 'bg-brutal-border border-brutal-muted' : ''
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`p-2 border border-transparent hover:border-brutal-muted transition-colors focus-visible:border-brutal-accent focus-visible:outline-none ${
              editor.isActive('italic') ? 'bg-brutal-border border-brutal-muted' : ''
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-brutal-border mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor.can().chain().focus().toggleBulletList().run()}
            className={`p-2 border border-transparent hover:border-brutal-muted transition-colors focus-visible:border-brutal-accent focus-visible:outline-none ${
              editor.isActive('bulletList') ? 'bg-brutal-border border-brutal-muted' : ''
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor.can().chain().focus().toggleOrderedList().run()}
            className={`p-2 border border-transparent hover:border-brutal-muted transition-colors focus-visible:border-brutal-accent focus-visible:outline-none ${
              editor.isActive('orderedList') ? 'bg-brutal-border border-brutal-muted' : ''
            }`}
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className={`${readonly ? '' : 'min-h-[300px]'}`}>
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-4 focus:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-[260px] [&_.ProseMirror]:empty:before:content-[attr(data-placeholder)] [&_.ProseMirror]:empty:before:text-brutal-muted [&_.ProseMirror]:empty:before:float-left [&_.ProseMirror]:empty:before:pointer-events-none"
        />
      </div>
    </div>
  );
}
