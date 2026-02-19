'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect, useState } from 'react';

interface WordEditorProps {
  content: string;
  onChange: (next: string) => void;
}

export function WordEditor({ content, onChange }: WordEditorProps) {
  const [fontPreset, setFontPreset] = useState<'sans' | 'serif' | 'mono'>('sans');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link,
      Image,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'editor-content',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content && content !== current) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) return null;

  function runCommand(command: () => boolean) {
    command();
  }

  const fontClass =
    fontPreset === 'serif'
      ? 'font-[Georgia,_Times_New_Roman,_serif]'
      : fontPreset === 'mono'
      ? 'font-[ui-monospace,_SFMono-Regular,_Menlo,_monospace]'
      : 'font-[system-ui,_-apple-system,_sans-serif]';

  return (
    <div className="editor-shell">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3 text-sm text-slate-600">
        <button
          type="button"
          className={`rounded border px-2 py-1 ${editor.isActive('bold') ? 'bg-slate-900 text-white' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
        >
          Negrita
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 ${editor.isActive('italic') ? 'bg-slate-900 text-white' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().toggleItalic().run())}
        >
          Cursiva
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-900 text-white' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        >
          Titulo 1
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-900 text-white' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        >
          Titulo 2
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 ${editor.isActive('bulletList') ? 'bg-slate-900 text-white' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand(() => editor.chain().focus().toggleBulletList().run())}
        >
          Lista
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            runCommand(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())
          }
        >
          Tabla
        </button>
        <label className="ml-2 inline-flex items-center gap-2 text-xs">
          Fuente
          <select
            className="rounded border border-slate-300 px-2 py-1 text-xs"
            value={fontPreset}
            onChange={(e) => setFontPreset(e.target.value as 'sans' | 'serif' | 'mono')}
          >
            <option value="sans">Sans</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </select>
        </label>
      </div>
      <div className={`editor-page ${fontClass}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
