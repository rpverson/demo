'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';

interface WordEditorProps {
  content: string;
  onChange: (next: string) => void;
}

export function WordEditor({ content, onChange }: WordEditorProps) {
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

  return (
    <div className="editor-shell">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3 text-sm text-slate-600">
        <button className="rounded border px-2 py-1" onClick={() => editor.chain().focus().toggleBold().run()}>
          Negrita
        </button>
        <button className="rounded border px-2 py-1" onClick={() => editor.chain().focus().toggleItalic().run()}>
          Cursiva
        </button>
        <button className="rounded border px-2 py-1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          Titulo 1
        </button>
        <button className="rounded border px-2 py-1" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          Titulo 2
        </button>
        <button className="rounded border px-2 py-1" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Lista
        </button>
        <button
          className="rounded border px-2 py-1"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          Tabla
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
