/** Shared markdown → HTML for workspace preview and public-style rendering. */

function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Allow http(s), site-relative, and data:image/* URLs only. */
function safeImgSrc(raw: string): string | null {
  const src = String(raw ?? '').trim();
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return escapeHtml(src);
  if (src.startsWith('/') && !src.startsWith('//')) return escapeHtml(src);
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src)) {
    // Data URLs must not be HTML-escaped (breaks base64).
    return src.replace(/"/g, '');
  }
  return null;
}

export function renderMarkdownHtml(source: string): string {
  const escaped = escapeHtml(source);
  return escaped
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
    // Images before links so ![alt](url) is not treated as a link.
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, url: string) => {
      // url was HTML-escaped with the rest of the document; unescape common entities for validation.
      const rawUrl = String(url)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
      const safe = safeImgSrc(rawUrl);
      if (!safe) return '';
      const altText = String(alt ?? '');
      return `<figure class="markdown-figure"><img src="${safe}" alt="${altText}" loading="lazy" decoding="async" /></figure>`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');
}

export function wrapMarkdownDocument(source: string): string {
  const inner = renderMarkdownHtml(source);
  return `<div class="markdown-document"><p>${inner}</p></div>`;
}
