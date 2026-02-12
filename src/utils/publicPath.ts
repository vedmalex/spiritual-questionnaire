export function toPublicPath(relativePath: string): string {
  const rawBase =
    typeof import.meta.env.BASE_URL === 'string' && import.meta.env.BASE_URL.trim()
      ? import.meta.env.BASE_URL
      : '/';
  const normalizedBase = rawBase === './' ? '/' : rawBase;
  const base = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`;
  const normalizedPath = relativePath.replace(/^\/+/, '');
  return `${base}${normalizedPath}`;
}
