import MarkdownIt from 'markdown-it';

interface UriValidationOptions {
  allowDataImage?: boolean;
  allowBlob?: boolean;
}

const markdownEngine = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const defaultLinkOpenRenderer =
  markdownEngine.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

const defaultImageRenderer =
  markdownEngine.renderer.rules.image ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

function normalizeUri(input: string): string {
  const initial = String(input || '').trim().replace(/^<|>$/g, '');
  let normalized = initial;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) {
        break;
      }
      normalized = decoded;
    } catch {
      break;
    }
  }

  return normalized;
}

function hasDangerousProtocol(value: string): boolean {
  const probe = normalizeUri(value)
    .replace(/^[\u0000-\u0020]+/, '')
    .toLowerCase();

  return (
    probe.startsWith('javascript:') ||
    probe.startsWith('vbscript:') ||
    probe.startsWith('data:text/html') ||
    probe.startsWith('data:application')
  );
}

function isSafeUri(value: string, options: UriValidationOptions = {}): boolean {
  const { allowDataImage = false, allowBlob = false } = options;

  if (!value || hasDangerousProtocol(value)) {
    return false;
  }

  const normalized = normalizeUri(value);
  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith('#') ||
    normalized.startsWith('/') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../')
  ) {
    return true;
  }

  if (normalized.startsWith('//')) {
    return false;
  }

  if (allowDataImage && /^data:image\/[a-z0-9.+-]+;base64,/i.test(normalized)) {
    return true;
  }

  if (allowBlob && normalized.startsWith('blob:')) {
    return true;
  }

  try {
    const parsed = new URL(normalized);
    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      parsed.protocol === 'mailto:' ||
      parsed.protocol === 'tel:'
    );
  } catch {
    return false;
  }
}

function extractImageSourcesFromTokens(tokens: Array<any>, collector: string[]): void {
  for (const token of tokens) {
    if (token.type === 'image') {
      const src = String(token.attrGet?.('src') || '').trim();
      if (isSafeImageUrl(src) && !collector.includes(src)) {
        collector.push(src);
      }
    }

    if (Array.isArray(token.children) && token.children.length > 0) {
      extractImageSourcesFromTokens(token.children, collector);
    }
  }
}

markdownEngine.validateLink = (url) => isSafeUri(url, { allowDataImage: true, allowBlob: true });

markdownEngine.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet('href');
  if (!href || !isSafeUri(href, { allowDataImage: false, allowBlob: false })) {
    tokens[idx].attrSet('href', '#');
  }

  tokens[idx].attrSet('rel', 'noopener noreferrer nofollow');
  tokens[idx].attrSet('target', '_blank');
  return defaultLinkOpenRenderer(tokens, idx, options, env, self);
};

markdownEngine.renderer.rules.image = (tokens, idx, options, env, self) => {
  const src = tokens[idx].attrGet('src');
  if (!src || !isSafeUri(src, { allowDataImage: true, allowBlob: true })) {
    return '';
  }

  tokens[idx].attrSet('loading', 'lazy');
  tokens[idx].attrSet('decoding', 'async');
  return defaultImageRenderer(tokens, idx, options, env, self);
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

export function isSafeImageUrl(url: string): boolean {
  return isSafeUri(url, { allowDataImage: true, allowBlob: true });
}

export function renderMarkdownToSafeHtml(markdown: string): string {
  return markdownEngine.render(String(markdown || ''));
}

export function extractMarkdownImageSources(markdown: string): string[] {
  const tokens = markdownEngine.parse(String(markdown || ''), {});
  const images: string[] = [];
  extractImageSourcesFromTokens(tokens, images);
  return images;
}

export function markdownToPlainText(markdown: string): string {
  const safeHtml = renderMarkdownToSafeHtml(markdown);

  const text = safeHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '$1 ')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  return decodeHtmlEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function hasMarkdownTextContent(markdown: string): boolean {
  return markdownToPlainText(markdown).length > 0;
}

export function hasMarkdownContent(markdown: string): boolean {
  return hasMarkdownTextContent(markdown) || extractMarkdownImageSources(markdown).length > 0;
}

export function mergeLegacyCommentWithPhotos(
  comment: string | undefined,
  photos: string[] | undefined
): string {
  const normalizedComment = String(comment || '').trim();
  const normalizedPhotos = Array.isArray(photos) ? photos.filter(isSafeImageUrl) : [];

  if (normalizedPhotos.length === 0) {
    return normalizedComment;
  }

  const existingImages = new Set(extractMarkdownImageSources(normalizedComment));
  const missingImages = normalizedPhotos.filter((photo) => !existingImages.has(photo));

  if (missingImages.length === 0) {
    return normalizedComment;
  }

  const appendedImages = missingImages
    .map((photo, index) => `![image ${index + 1}](${photo})`)
    .join('\n\n');

  if (!normalizedComment) {
    return appendedImages;
  }

  return `${normalizedComment}\n\n${appendedImages}`;
}
