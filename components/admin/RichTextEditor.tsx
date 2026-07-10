"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { 
  Bold, Italic, Heading1, Heading2, List, 
  ListOrdered, Quote, Eye, Code2 
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (htmlContent: string) => void;
  disabled?: boolean;
}

export default function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value || "");

  // Initialize TipTap
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlContent(html);
      onChange(html);
    },
  });

  // Sync value if updated externally (like on initial edit load)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHtmlContent(value);
    }
  }, [value, editor]);

  const toggleMode = () => {
    if (isHtmlMode) {
      // Sync from HTML textarea back to editor
      editor?.commands.setContent(htmlContent);
    }
    setIsHtmlMode(!isHtmlMode);
  };

  const handleHtmlChange = (val: string) => {
    setHtmlContent(val);
    onChange(val);
  };

  if (!editor) {
    return (
      <div className="h-48 border border-border bg-neutral-50 flex items-center justify-center text-xs text-muted-foreground">
        A carregar editor...
      </div>
    );
  }

  return (
    <div className="border border-border rounded-sm overflow-hidden font-sans">
      {/* Tool bar header */}
      <div className="bg-neutral-50 border-b border-border p-2 flex items-center justify-between flex-wrap gap-2 shrink-0">
        
        {/* Formatting actions */}
        <div className="flex items-center gap-1">
          {!isHtmlMode && (
            <>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={disabled}
                className={`p-1.5 rounded hover:bg-neutral-100 cursor-pointer ${
                  editor.isActive("bold") ? "bg-neutral-200 text-primary" : "text-muted-foreground"
                }`}
                title="Negrito"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={disabled}
                className={`p-1.5 rounded hover:bg-neutral-100 cursor-pointer ${
                  editor.isActive("italic") ? "bg-neutral-200 text-primary" : "text-muted-foreground"
                }`}
                title="Itálico"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                disabled={disabled}
                className={`p-1.5 rounded hover:bg-neutral-100 cursor-pointer ${
                  editor.isActive("heading", { level: 1 }) ? "bg-neutral-200 text-primary" : "text-muted-foreground"
                }`}
                title="Título 1"
              >
                <Heading1 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                disabled={disabled}
                className={`p-1.5 rounded hover:bg-neutral-100 cursor-pointer ${
                  editor.isActive("heading", { level: 2 }) ? "bg-neutral-200 text-primary" : "text-muted-foreground"
                }`}
                title="Título 2"
              >
                <Heading2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                disabled={disabled}
                className={`p-1.5 rounded hover:bg-neutral-100 cursor-pointer ${
                  editor.isActive("bulletList") ? "bg-neutral-200 text-primary" : "text-muted-foreground"
                }`}
                title="Lista de Marcadores"
              >
                <List className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                disabled={disabled}
                className={`p-1.5 rounded hover:bg-neutral-100 cursor-pointer ${
                  editor.isActive("orderedList") ? "bg-neutral-200 text-primary" : "text-muted-foreground"
                }`}
                title="Lista Numerada"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                disabled={disabled}
                className={`p-1.5 rounded hover:bg-neutral-100 cursor-pointer ${
                  editor.isActive("blockquote") ? "bg-neutral-200 text-primary" : "text-muted-foreground"
                }`}
                title="Citação"
              >
                <Quote className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Source Mode Toggle */}
        <button
          type="button"
          onClick={toggleMode}
          disabled={disabled}
          className="inline-flex h-7 items-center justify-center px-2.5 border border-border bg-white text-[10px] font-bold uppercase tracking-wider rounded-sm hover:bg-neutral-50 cursor-pointer text-primary gap-1"
        >
          {isHtmlMode ? (
            <>
              <Eye className="h-3 w-3" /> Visual
            </>
          ) : (
            <>
              <Code2 className="h-3 w-3" /> Código HTML
            </>
          )}
        </button>
      </div>

      {/* Editor area viewport */}
      <div className="bg-white min-h-[300px]">
        {isHtmlMode ? (
          <textarea
            value={htmlContent}
            onChange={e => handleHtmlChange(e.target.value)}
            disabled={disabled}
            rows={15}
            className="w-full h-full p-4 font-mono text-xs focus:outline-none focus:ring-0 border-none bg-neutral-50/50 resize-y"
            placeholder="Cole ou edite o código HTML aqui..."
          />
        ) : (
          <div className="p-4 prose prose-sm max-w-none text-sm text-primary focus:outline-none min-h-[300px]">
            <EditorContent editor={editor} className="outline-none min-h-[300px]" />
          </div>
        )}
      </div>

      {/* Custom Styles for Prose Mirror inside TipTap editor */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 300px;
          outline: none;
        }
        .ProseMirror p {
          margin-bottom: 0.75rem;
        }
        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.4rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .ProseMirror blockquote {
          border-left: 3px solid var(--color-primary);
          padding-left: 0.75rem;
          color: #666;
          font-style: italic;
          margin-bottom: 0.75rem;
        }
      `}</style>
    </div>
  );
}
