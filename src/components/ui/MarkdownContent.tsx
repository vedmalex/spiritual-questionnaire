import { useMemo } from 'react';
import { renderMarkdownToSafeHtml } from '../../utils/markdown';

interface MarkdownContentProps {
  markdown: string;
  className?: string;
}

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(' ');
}

export function MarkdownContent({ markdown, className }: MarkdownContentProps) {
  const html = useMemo(() => renderMarkdownToSafeHtml(markdown), [markdown]);

  if (!html.trim()) {
    return null;
  }

  return (
    <div
      className={joinClasses(
        'break-words text-sm text-gray-700 dark:text-gray-300',
        '[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mb-2',
        '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2',
        '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2',
        '[&_p]:mb-2 [&_p:last-child]:mb-0',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2',
        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2',
        '[&_li]:mb-1',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 dark:[&_blockquote]:border-gray-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:mb-2',
        '[&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline',
        '[&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-gray-200 dark:[&_img]:border-gray-700 [&_img]:my-2',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
