/**
 * Rich text / markdown editor for resource content in the account workspace.
 * Modes: Visual (contenteditable) | Markdown (source) | Preview (rendered).
 */
import { wrapMarkdownDocument } from '../lib/markdown-render';

type EditorMode = 'visual' | 'markdown' | 'preview';

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join('');
    switch (tag) {
      case 'strong':
      case 'b':
        return `**${inner}**`;
      case 'em':
      case 'i':
        return `*${inner}*`;
      case 'h2':
        return `\n\n## ${inner.trim()}\n\n`;
      case 'h3':
        return `\n\n### ${inner.trim()}\n\n`;
      case 'h4':
        return `\n\n#### ${inner.trim()}\n\n`;
      case 'li':
        return `* ${inner.trim()}\n`;
      case 'ul':
      case 'ol':
        return `\n${inner}\n`;
      case 'p':
        return `${inner.trim()}\n\n`;
      case 'br':
        return '\n';
      case 'code':
        return `\`${inner}\``;
      case 'a': {
        const href = el.getAttribute('href') ?? '';
        return `[${inner}](${href})`;
      }
      case 'div':
        return inner;
      default:
        return inner;
    }
  };
  return walk(doc.body)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function markdownToVisualHtml(markdown: string): string {
  return wrapMarkdownDocument(markdown).replace(/^<div class="markdown-document">|<\/div>$/g, '');
}

function syncTextareaFromVisual(textarea: HTMLTextAreaElement, visual: HTMLElement): void {
  textarea.value = htmlToMarkdown(visual.innerHTML);
}

function syncVisualFromTextarea(textarea: HTMLTextAreaElement, visual: HTMLElement): void {
  visual.innerHTML = markdownToVisualHtml(textarea.value);
}

function wrapSelection(textarea: HTMLTextAreaElement, before: string, after: string): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  textarea.value = textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);
  textarea.focus();
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + selected.length;
}

export function enhanceMarkdownTextarea(textarea: HTMLTextAreaElement): void {
  if (textarea.dataset.markdownEnhanced === 'true') return;
  textarea.dataset.markdownEnhanced = 'true';

  const wrapper = document.createElement('div');
  wrapper.className = 'workspace-markdown-field';
  textarea.parentNode?.insertBefore(wrapper, textarea);
  wrapper.appendChild(textarea);

  const modeBar = document.createElement('div');
  modeBar.className = 'workspace-markdown-field__modes';
  modeBar.setAttribute('role', 'tablist');
  modeBar.innerHTML = `
    <button type="button" class="workspace-markdown-field__tab active" data-mode="visual" role="tab" aria-selected="true">Visual</button>
    <button type="button" class="workspace-markdown-field__tab" data-mode="markdown" role="tab" aria-selected="false">Markdown</button>
    <button type="button" class="workspace-markdown-field__tab" data-mode="preview" role="tab" aria-selected="false">Preview</button>
  `;
  wrapper.insertBefore(modeBar, textarea);

  const formatBar = document.createElement('div');
  formatBar.className = 'workspace-markdown-field__format';
  formatBar.innerHTML = `
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="bold" title="Bold"><strong>B</strong></button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="italic" title="Italic"><em>I</em></button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="h2" title="Heading 2">H2</button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="h3" title="Heading 3">H3</button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="ul" title="Bullet list">• List</button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="link" title="Link">Link</button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="code" title="Inline code">&lt;/&gt;</button>
  `;
  wrapper.insertBefore(formatBar, textarea);

  const visual = document.createElement('div');
  visual.className = 'workspace-markdown-field__visual';
  visual.contentEditable = 'true';
  visual.setAttribute('role', 'textbox');
  visual.setAttribute('aria-multiline', 'true');
  visual.setAttribute('aria-label', 'Visual editor');
  wrapper.appendChild(visual);

  const preview = document.createElement('div');
  preview.className = 'workspace-markdown-field__preview hidden markdown-document';
  preview.setAttribute('aria-live', 'polite');
  wrapper.appendChild(preview);

  let mode: EditorMode = 'visual';
  syncVisualFromTextarea(textarea, visual);

  const tabs = modeBar.querySelectorAll<HTMLButtonElement>('[data-mode]');

  const setMode = (next: EditorMode) => {
    if (next === 'markdown' && mode === 'visual') {
      syncTextareaFromVisual(textarea, visual);
    }
    if (next === 'visual' && mode !== 'visual') {
      syncVisualFromTextarea(textarea, visual);
    }
    if (next === 'preview') {
      if (mode === 'visual') syncTextareaFromVisual(textarea, visual);
      preview.innerHTML = wrapMarkdownDocument(textarea.value);
    }
    mode = next;
    tabs.forEach((tab) => {
      const active = tab.dataset.mode === next;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    visual.classList.toggle('hidden', next !== 'visual');
    textarea.classList.toggle('hidden', next !== 'markdown');
    preview.classList.toggle('hidden', next !== 'preview');
    formatBar.style.display = next === 'preview' ? 'none' : '';
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode as EditorMode));
  });

  visual.addEventListener('input', () => syncTextareaFromVisual(textarea, visual));

  formatBar.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (mode === 'visual') {
        visual.focus();
        if (cmd === 'bold') document.execCommand('bold');
        else if (cmd === 'italic') document.execCommand('italic');
        else if (cmd === 'h2') document.execCommand('formatBlock', false, 'h2');
        else if (cmd === 'h3') document.execCommand('formatBlock', false, 'h3');
        else if (cmd === 'ul') document.execCommand('insertUnorderedList');
        else if (cmd === 'link') {
          const url = window.prompt('Link URL');
          if (url) document.execCommand('createLink', false, url);
        } else if (cmd === 'code') document.execCommand('insertHTML', false, `<code>${window.getSelection()?.toString() || 'code'}</code>`);
        syncTextareaFromVisual(textarea, visual);
        return;
      }
      if (mode === 'markdown') {
        if (cmd === 'bold') wrapSelection(textarea, '**', '**');
        else if (cmd === 'italic') wrapSelection(textarea, '*', '*');
        else if (cmd === 'h2') wrapSelection(textarea, '\n## ', '\n');
        else if (cmd === 'h3') wrapSelection(textarea, '\n### ', '\n');
        else if (cmd === 'ul') wrapSelection(textarea, '\n* ', '\n');
        else if (cmd === 'link') {
          const url = window.prompt('Link URL');
          if (url) wrapSelection(textarea, '[', `](${url})`);
        } else if (cmd === 'code') wrapSelection(textarea, '`', '`');
      }
    });
  });
}

export function mountMarkdownFields(root: ParentNode = document): void {
  root.querySelectorAll<HTMLTextAreaElement>(
    '#detail-edit-content, #edit-resource-content',
  ).forEach((textarea) => enhanceMarkdownTextarea(textarea));
}

export function readMarkdownFieldValue(textareaId: string): string {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (!textarea) return '';
  const wrapper = textarea.closest('.workspace-markdown-field');
  const visual = wrapper?.querySelector('.workspace-markdown-field__visual') as HTMLElement | null;
  if (visual && !visual.classList.contains('hidden')) {
    textarea.value = htmlToMarkdown(visual.innerHTML);
  }
  return textarea.value.trim();
}
