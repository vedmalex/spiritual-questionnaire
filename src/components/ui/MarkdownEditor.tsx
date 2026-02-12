import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from 'lucide-react';
import { t } from '../../utils/i18n';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeightClassName?: string;
  disabled?: boolean;
  allowImages?: boolean;
}

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

function normalizeMarkdownValue(input: string): string {
  return String(input || '')
    .replace(/\r\n/g, '\n')
    .trimEnd();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

interface ToolbarButton {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function MarkdownEditorClient({
  value,
  onChange,
  placeholder,
  className,
  minHeightClassName,
  disabled,
  allowImages,
}: Required<MarkdownEditorProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const normalizedValue = useMemo(() => normalizeMarkdownValue(value), [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: normalizedValue,
    contentType: 'markdown',
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({
        placeholder: placeholder || t('quiz.comment.placeholder'),
      }),
      Markdown,
    ],
    editorProps: {
      attributes: {
        class: joinClasses(
          'outline-none px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
          'whitespace-pre-wrap break-words',
          minHeightClassName || 'min-h-[120px]',
          disabled && 'cursor-not-allowed opacity-75'
        ),
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChangeRef.current(normalizeMarkdownValue(nextEditor.getMarkdown()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = normalizeMarkdownValue(editor.getMarkdown());
    if (current === normalizedValue) {
      return;
    }

    editor.commands.setContent(normalizedValue, {
      contentType: 'markdown',
      emitUpdate: false,
    });
  }, [editor, normalizedValue]);

  const handleImageFiles = async (files: FileList | null) => {
    if (!editor || !files || disabled) {
      return;
    }

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const src = await readFileAsDataUrl(file);
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      }
    } catch (error) {
      console.error('Failed to attach image into markdown editor:', error);
    }
  };

  const toolbarButtons: ToolbarButton[] = editor
    ? [
        {
          id: 'bold',
          label: t('markdown.toolbar.bold'),
          icon: <Bold className="w-4 h-4" aria-hidden="true" />,
          active: editor.isActive('bold'),
          disabled: disabled || !editor.can().chain().focus().toggleBold().run(),
          onClick: () => editor.chain().focus().toggleBold().run(),
        },
        {
          id: 'italic',
          label: t('markdown.toolbar.italic'),
          icon: <Italic className="w-4 h-4" aria-hidden="true" />,
          active: editor.isActive('italic'),
          disabled: disabled || !editor.can().chain().focus().toggleItalic().run(),
          onClick: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          id: 'bullet-list',
          label: t('markdown.toolbar.bulletList'),
          icon: <List className="w-4 h-4" aria-hidden="true" />,
          active: editor.isActive('bulletList'),
          disabled: disabled || !editor.can().chain().focus().toggleBulletList().run(),
          onClick: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          id: 'ordered-list',
          label: t('markdown.toolbar.orderedList'),
          icon: <ListOrdered className="w-4 h-4" aria-hidden="true" />,
          active: editor.isActive('orderedList'),
          disabled: disabled || !editor.can().chain().focus().toggleOrderedList().run(),
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
        },
      ]
    : [];

  const undoDisabled = !editor || disabled || !editor.can().chain().focus().undo().run();
  const redoDisabled = !editor || disabled || !editor.can().chain().focus().redo().run();

  return (
    <div className={joinClasses('rounded-lg border border-gray-300 dark:border-gray-600', className)}>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
        {toolbarButtons.map((button) => (
          <button
            key={button.id}
            type="button"
            onClick={button.onClick}
            disabled={button.disabled}
            title={button.label}
            aria-label={button.label}
            className={joinClasses(
              'h-8 min-w-8 px-2 rounded text-sm border transition-colors flex items-center justify-center',
              button.active
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700',
              button.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {button.icon}
          </button>
        ))}

        {allowImages && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title={t('markdown.toolbar.image')}
              aria-label={t('markdown.toolbar.image')}
              className={joinClasses(
                'h-8 min-w-8 px-2 rounded text-sm border transition-colors flex items-center justify-center',
                'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <ImagePlus className="w-4 h-4" aria-hidden="true" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleImageFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={undoDisabled}
            title={t('markdown.toolbar.undo')}
            aria-label={t('markdown.toolbar.undo')}
            className={joinClasses(
              'h-8 min-w-8 px-2 rounded text-sm border transition-colors flex items-center justify-center',
              'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700',
              undoDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Undo2 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={redoDisabled}
            title={t('markdown.toolbar.redo')}
            aria-label={t('markdown.toolbar.redo')}
            className={joinClasses(
              'h-8 min-w-8 px-2 rounded text-sm border transition-colors flex items-center justify-center',
              'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700',
              redoDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Redo2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <EditorContent editor={editor} className="bg-white dark:bg-gray-900 rounded-b-lg" />
    </div>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = '',
  className = '',
  minHeightClassName = 'min-h-[120px]',
  disabled = false,
  allowImages = false,
}: MarkdownEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={joinClasses('rounded-lg border border-gray-300 dark:border-gray-600', className)}>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || t('quiz.comment.placeholder')}
          disabled={disabled}
          className={joinClasses(
            'w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm border-0 resize-none',
            minHeightClassName,
            disabled && 'cursor-not-allowed opacity-75'
          )}
        />
      </div>
    );
  }

  return (
    <MarkdownEditorClient
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      minHeightClassName={minHeightClassName}
      disabled={disabled}
      allowImages={allowImages}
    />
  );
}
