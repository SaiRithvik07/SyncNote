'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Terminal,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';

interface EditorProps {
  ydoc: Y.Doc;
  awareness: Awareness;
  initialContent: string;
  onChange: (htmlContent: string) => void;
  onTyping: (isTyping: boolean) => void;
  editable: boolean;
  isSynced?: boolean;
  restoredContent?: string | null;
  currentUser?: { id: string; name: string; email: string } | null;
}

export default function Editor({
  ydoc,
  awareness,
  initialContent,
  onChange,
  onTyping,
  editable,
  isSynced = false,
  restoredContent = null,
  currentUser = null,
}: EditorProps) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSeededRef = useRef(false);
  const prevRestoredContentRef = useRef<string | null>(null);

  const COLLABORATOR_COLORS = ['#6E62E8', '#FF6B57', '#149E90', '#E7A93C', '#EC4899', '#06B6D4'];
  const userColor = currentUser
    ? COLLABORATOR_COLORS[
        Math.abs(
          currentUser.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        ) % COLLABORATOR_COLORS.length
      ]
    : '#6E62E8';

  // ── TipTap editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false, // suppress Next.js hydration warning
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        undoRedo: false,
      }),
      Underline,
      Collaboration.configure({
        document: ydoc,
        field: 'default',
      }),
    ],
    editable,
    onUpdate: ({ editor, transaction }) => {
      // y-sync$ meta marks transactions from remote Yjs updates — skip those
      if (transaction.getMeta('y-sync$')) return;

      onChange(editor.getHTML());

      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 1000);
    },
  });

  // ── Seed initial content into empty Yjs doc ONLY after Yjs sync completes ───
  useEffect(() => {
    if (!editor || !initialContent || !isSynced || hasSeededRef.current) return;
    
    // Mark as seeded immediately so this effect runs at most once
    hasSeededRef.current = true;

    const fragment = ydoc.getXmlFragment('default');
    const hasContent = fragment.length > 0 || fragment.toString().trim().length > 0;

    if (!hasContent) {
      editor.commands.setContent(initialContent, { emitUpdate: true });
    }
  }, [editor, initialContent, ydoc, isSynced]);

  // ── Sync restored content from version history ──────────────────────────────
  useEffect(() => {
    if (editor && restoredContent && restoredContent !== prevRestoredContentRef.current) {
      prevRestoredContentRef.current = restoredContent;
      editor.commands.setContent(restoredContent, { emitUpdate: true });
    }
  }, [editor, restoredContent]);

  // ── Sync editable ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white">
        <div className="animate-spin w-6 h-6 border-2 border-zinc-950 border-t-transparent rounded-full" />
      </div>
    );
  }

  const toggleButtonClass = (isActive: boolean) =>
    `p-1.5 rounded transition-colors hover:bg-zinc-100 text-zinc-600 ${
      isActive ? 'bg-zinc-200 text-zinc-950 font-bold' : ''
    } disabled:opacity-40`;

  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm flex flex-col">
      {editable && (
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex flex-wrap items-center gap-1">
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={toggleButtonClass(editor.isActive('bold'))} title="Bold">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={toggleButtonClass(editor.isActive('italic'))} title="Italic">
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={toggleButtonClass(editor.isActive('underline'))} title="Underline">
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-200 mx-1" />

          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={toggleButtonClass(editor.isActive('heading', { level: 1 }))} title="Heading 1">
            <Heading1 className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={toggleButtonClass(editor.isActive('heading', { level: 2 }))} title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={toggleButtonClass(editor.isActive('heading', { level: 3 }))} title="Heading 3">
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-200 mx-1" />

          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={toggleButtonClass(editor.isActive('bulletList'))} title="Bullet List">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={toggleButtonClass(editor.isActive('orderedList'))} title="Ordered List">
            <ListOrdered className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={toggleButtonClass(editor.isActive('blockquote'))} title="Blockquote">
            <Quote className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={toggleButtonClass(editor.isActive('codeBlock'))} title="Code Block">
            <Terminal className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-200 mx-1" />

          <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={toggleButtonClass(false)} title="Undo">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={toggleButtonClass(false)} title="Redo">
            <Redo className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor content */}
      <div className="p-6 flex-1 min-h-[400px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
