'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('java', java);
lowlight.register('css', css);
lowlight.register('html', html);
lowlight.register('xml', html);

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Minus,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  disabled?: boolean;
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder = 'Start writing...', disabled = false }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMoreTools, setShowMoreTools] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--accent-secondary)] underline cursor-pointer',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        role: 'textbox', 'aria-label': 'Note content', 'aria-multiline': 'true',
        class: 'focus:outline-none min-h-[300px] sm:min-h-[400px] px-1 py-4',
      },
    },
  });

  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        editor?.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    title, 
    children 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    disabled?: boolean; 
    title: string; 
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-[var(--accent-primary)] text-white shadow-md' 
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={title}
      aria-label={title}
      type="button"
    >
      {children}
    </button>
  );

  const Divider = () => (
    <div className="w-px h-5 sm:h-6 bg-[var(--border-default)] mx-0.5 sm:mx-1 hidden sm:block" />
  );

  return (
    <div className="rounded-xl sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-2 sm:px-3 py-1.5 sm:py-2">
        {/* Main toolbar row */}
        <div className="flex flex-wrap items-center gap-0.5">
          {/* Essential formatting - always visible */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (⌘B)"
          >
            <Bold size={14} className="sm:w-4 sm:h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (⌘I)"
          >
            <Italic size={14} className="sm:w-4 sm:h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (⌘U)"
          >
            <UnderlineIcon size={14} className="sm:w-4 sm:h-4" />
          </ToolbarButton>

          <Divider />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={14} className="sm:w-4 sm:h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={14} className="sm:w-4 sm:h-4" />
          </ToolbarButton>
          
          <div className="hidden sm:flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
          </div>

          <Divider />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={14} className="sm:w-4 sm:h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered size={14} className="sm:w-4 sm:h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Task List"
          >
            <CheckSquare size={14} className="sm:w-4 sm:h-4" />
          </ToolbarButton>

          {/* Desktop-only tools */}
          <div className="hidden sm:flex items-center gap-0.5">
            <Divider />
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline Code"
            >
              <Code size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              isActive={editor.isActive('link')}
              title="Insert Link"
            >
              <LinkIcon size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={handleImageUpload}
              title="Insert Image"
            >
              <ImageIcon size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="Insert Table"
            >
              <TableIcon size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              <Minus size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code Block"
            >
              <Code size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
          </div>

          {/* Mobile more button */}
          <div className="sm:hidden ml-auto">
            <button
              onClick={() => setShowMoreTools(!showMoreTools)}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                showMoreTools 
                  ? 'bg-[var(--accent-primary)] text-white' 
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
              title="More tools"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </div>

          <div className="flex-1 hidden sm:block" />

          {/* Undo/Redo */}
          <div className="hidden sm:flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo (⌘Z)"
            >
              <Undo size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo (⌘⇧Z)"
            >
              <Redo size={14} className="sm:w-4 sm:h-4" />
            </ToolbarButton>
          </div>
        </div>

        {/* Mobile expanded toolbar */}
        {showMoreTools && (
          <div className="sm:hidden flex flex-wrap items-center gap-0.5 mt-2 pt-2 border-t border-[var(--border-subtle)] animate-slide-up">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline Code"
            >
              <Code size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              isActive={editor.isActive('link')}
              title="Insert Link"
            >
              <LinkIcon size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={handleImageUpload}
              title="Insert Image"
            >
              <ImageIcon size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="Insert Table"
            >
              <TableIcon size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code Block"
            >
              <Code size={14} />
            </ToolbarButton>
            
            <div className="flex-1" />
            
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo size={14} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo size={14} />
            </ToolbarButton>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="prose-editor" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
