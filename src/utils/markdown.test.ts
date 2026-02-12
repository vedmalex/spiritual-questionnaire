import { describe, expect, it } from 'vitest';
import {
  extractMarkdownImageSources,
  hasMarkdownContent,
  hasMarkdownTextContent,
  markdownToPlainText,
  mergeLegacyCommentWithPhotos,
  renderMarkdownToSafeHtml,
} from './markdown';

describe('markdown utils', () => {
  it('renders markdown safely and blocks dangerous javascript links', () => {
    const html = renderMarkdownToSafeHtml('[xss](javascript:alert(1))');

    expect(html).not.toContain('<a href="javascript:');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror=');
  });

  it('extracts only safe image sources from markdown', () => {
    const markdown = [
      '![safe](data:image/png;base64,AAA)',
      '![unsafe](javascript:alert(1))',
      '![safe2](https://example.com/pic.png)',
    ].join('\n\n');

    expect(extractMarkdownImageSources(markdown)).toEqual([
      'data:image/png;base64,AAA',
      'https://example.com/pic.png',
    ]);
  });

  it('merges legacy comment and photos into markdown without duplicates', () => {
    const merged = mergeLegacyCommentWithPhotos('Text\n\n![image 1](data:image/png;base64,AAA)', [
      'data:image/png;base64,AAA',
      'data:image/png;base64,BBB',
    ]);

    expect(merged).toContain('Text');
    expect(merged).toContain('data:image/png;base64,AAA');
    expect(merged).toContain('data:image/png;base64,BBB');
    expect(merged.match(/data:image\/png;base64,AAA/g)?.length).toBe(1);
  });

  it('derives plain text and content flags from markdown', () => {
    const markdown = '**Bold** text\n\n![img](data:image/png;base64,AAA)';

    expect(markdownToPlainText(markdown)).toContain('Bold text');
    expect(hasMarkdownTextContent(markdown)).toBe(true);
    expect(hasMarkdownContent('![img](data:image/png;base64,AAA)')).toBe(true);
    expect(hasMarkdownContent('   ')).toBe(false);
  });
});
