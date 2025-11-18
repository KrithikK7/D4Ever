import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { Extension } from '@tiptap/core';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Highlighter,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Palette,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { CSRF_STORAGE_KEY } from "@/lib/authStorage";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  singleLine?: boolean;
}

const FONT_FAMILIES = [
  { value: 'nanum-myeongjo', label: 'Nanum Myeongjo' },
  { value: 'noto-sans-kr', label: 'Noto Sans KR' },
  { value: 'nanum-pen-script', label: 'Nanum Pen Script' },
  { value: 'nanum-brush-script', label: 'Nanum Brush Script' },
  { value: 'gaegu', label: 'Gaegu' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'monospace', label: 'Monospace' },
];

const FONT_SIZES = [
  { value: '12px', label: 'Small' },
  { value: '16px', label: 'Normal' },
  { value: '20px', label: 'Large' },
  { value: '24px', label: 'Huge' },
];

const TEXT_COLORS = [
  '#000000', '#374151', '#6B7280', '#9CA3AF', // Blacks/Grays
  '#DC2626', '#EA580C', '#D97706', '#CA8A04', // Reds/Oranges/Yellows
  '#65A30D', '#16A34A', '#059669', '#0D9488', // Greens/Teals
  '#0891B2', '#0284C7', '#2563EB', '#4F46E5', // Cyans/Blues/Indigos
  '#7C3AED', '#9333EA', '#C026D3', '#DB2777', // Purples/Pinks
];

const HIGHLIGHT_COLORS = [
  '#FEF08A', '#FDE047', '#FACC15', // Yellows
  '#FCA5A5', '#F87171', '#EF4444', // Reds
  '#86EFAC', '#4ADE80', '#22C55E', // Greens
  '#7DD3FC', '#38BDF8', '#0EA5E9', // Blues
  '#C4B5FD', '#A78BFA', '#8B5CF6', // Purples
];

// Custom FontSize extension
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: (fontSize) => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Custom extension to prevent Enter key in single-line mode
const SingleLineEnter = Extension.create({
  name: 'singleLineEnter',

  addKeyboardShortcuts() {
    return {
      Enter: () => true, // Prevent Enter key
    };
  },
});

export function TiptapEditor({ value, onChange, placeholder, className, singleLine = false }: TiptapEditorProps) {
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightColorOpen, setHighlightColorOpen] = useState(false);

  // Memoize extensions to prevent recreating them on every render
  const extensions = useMemo(() => {
    const exts = [
      StarterKit.configure({
        // Disable conflicting extensions that we configure separately
        link: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Subscript,
      Superscript,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
    ];

    if (singleLine) {
      exts.push(SingleLineEnter);
    }

    return exts;
  }, [singleLine]);

  const editor = useEditor({
    extensions,
    content: value,
    onUpdate: ({ editor }) => {
      // For single-line mode, emit plain text; otherwise emit HTML
      if (singleLine) {
        onChange(editor.getText().replace(/\n/g, ''));
      } else {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  }, [extensions, singleLine]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(async () => {
    if (!editor) return;
    
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      try {
        const csrfToken = localStorage.getItem(CSRF_STORAGE_KEY);
        const headers: HeadersInit = {};
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        editor.chain().focus().setImage({ src: data.url }).run();
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    };
  }, [editor]);

  // Sync editor content when value prop changes (e.g., when switching pages)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-md ${className}`}>
      <div className="border-b p-2 flex flex-wrap gap-1 items-center bg-muted/30">
        {/* Undo/Redo */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          data-testid="button-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Font Family */}
        <Select
          value={editor.getAttributes('textStyle').fontFamily || 'nanum-myeongjo'}
          onValueChange={(value) => {
            if (value === 'nanum-myeongjo') {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(value).run();
            }
          }}
        >
          <SelectTrigger className="w-[140px] h-8" data-testid="select-font-family">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.value }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select
          value={editor.getAttributes('textStyle').fontSize || '16px'}
          onValueChange={(value) => {
            if (value === '16px') {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(value).run();
            }
          }}
        >
          <SelectTrigger className="w-[100px] h-8" data-testid="select-font-size">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border" />

        {/* Text Formatting */}
        <Button
          size="icon"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8"
          data-testid="button-bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8"
          data-testid="button-italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className="h-8 w-8"
          data-testid="button-underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={editor.isActive('strike') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className="h-8 w-8"
          data-testid="button-strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        {/* Text Color */}
        <Popover open={textColorOpen} onOpenChange={setTextColorOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              data-testid="button-text-color"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-16 rounded border border-border cursor-pointer"
                  onChange={(e) => {
                    editor.chain().focus().setColor(e.target.value).run();
                  }}
                  data-testid="input-text-color-picker"
                />
                <span className="text-sm text-muted-foreground">Custom color</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setTextColorOpen(false);
                    }}
                    data-testid={`color-${color}`}
                  />
                ))}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                setTextColorOpen(false);
              }}
              data-testid="button-clear-text-color"
            >
              Clear Color
            </Button>
          </PopoverContent>
        </Popover>

        {/* Highlight Color */}
        <Popover open={highlightColorOpen} onOpenChange={setHighlightColorOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant={editor.isActive('highlight') ? 'default' : 'ghost'}
              className="h-8 w-8"
              data-testid="button-highlight-color"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-8 w-16 rounded border border-border cursor-pointer"
                  onChange={(e) => {
                    editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
                  }}
                  data-testid="input-highlight-color-picker"
                />
                <span className="text-sm text-muted-foreground">Custom highlight</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color }).run();
                      setHighlightColorOpen(false);
                    }}
                    data-testid={`highlight-${color}`}
                  />
                ))}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                setHighlightColorOpen(false);
              }}
              data-testid="button-clear-highlight-color"
            >
              Clear Highlight
            </Button>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border" />

        {/* Script */}
        <Button
          size="icon"
          variant={editor.isActive('subscript') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className="h-8 w-8"
          data-testid="button-subscript"
        >
          <SubscriptIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={editor.isActive('superscript') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className="h-8 w-8"
          data-testid="button-superscript"
        >
          <SuperscriptIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Lists */}
        <Button
          size="icon"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8"
          data-testid="button-bullet-list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8"
          data-testid="button-ordered-list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Alignment */}
        <Button
          size="icon"
          variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className="h-8 w-8"
          data-testid="button-align-left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className="h-8 w-8"
          data-testid="button-align-center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className="h-8 w-8"
          data-testid="button-align-right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className="h-8 w-8"
          data-testid="button-align-justify"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Link and Image */}
        <Button
          size="icon"
          variant={editor.isActive('link') ? 'default' : 'ghost'}
          onClick={setLink}
          className="h-8 w-8"
          data-testid="button-link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={addImage}
          className="h-8 w-8"
          data-testid="button-image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>

      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
}
