/**
 * Rich text / markdown editor for resource content in the account workspace.
 * Visual mode: TipTap (ProseMirror). Markdown + Preview tabs unchanged.
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { wrapMarkdownDocument } from '../lib/markdown-render';
import { showPromptDialog } from './portal-confirm-dialog';

type EditorMode = 'visual' | 'markdown' | 'preview';

const tipTapEditors = new WeakMap<HTMLTextAreaElement, Editor>();

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

function syncTextareaFromEditor(textarea: HTMLTextAreaElement, editor: Editor): void {
  textarea.value = htmlToMarkdown(editor.getHTML());
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

function createTipTapEditor(mount: HTMLElement, textarea: HTMLTextAreaElement): Editor {
  const editor = new Editor({
    element: mount,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
    ],
    content: markdownToVisualHtml(textarea.value),
    onUpdate: ({ editor: ed }) => syncTextareaFromEditor(textarea, ed),
  });
  tipTapEditors.set(textarea, editor);
  return editor;
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
  visual.setAttribute('role', 'textbox');
  visual.setAttribute('aria-multiline', 'true');
  visual.setAttribute('aria-label', 'Visual editor');
  wrapper.appendChild(visual);

  const preview = document.createElement('div');
  preview.className = 'workspace-markdown-field__preview hidden markdown-document';
  preview.setAttribute('aria-live', 'polite');
  wrapper.appendChild(preview);

  const editor = createTipTapEditor(visual, textarea);

  let mode: EditorMode = 'visual';

  const tabs = modeBar.querySelectorAll<HTMLButtonElement>('[data-mode]');

  const setMode = (next: EditorMode) => {
    if (next === 'markdown' && mode === 'visual') {
      syncTextareaFromEditor(textarea, editor);
    }
    if (next === 'visual' && mode !== 'visual') {
      editor.commands.setContent(markdownToVisualHtml(textarea.value), { emitUpdate: false });
    }
    if (next === 'preview') {
      if (mode === 'visual') syncTextareaFromEditor(textarea, editor);
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

  formatBar.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (mode === 'visual') {
        const chain = editor.chain().focus();
        if (cmd === 'bold') chain.toggleBold().run();
        else if (cmd === 'italic') chain.toggleItalic().run();
        else if (cmd === 'h2') chain.toggleHeading({ level: 2 }).run();
        else if (cmd === 'h3') chain.toggleHeading({ level: 3 }).run();
        else if (cmd === 'ul') chain.toggleBulletList().run();
        else if (cmd === 'link') {
          void showPromptDialog({
            title: 'Insert link',
            message: 'Enter the URL for this link.',
            inputType: 'url',
            placeholder: 'https://',
          }).then((url) => {
            if (!url) return;
            const { from, to } = editor.state.selection;
            if (from === to) {
              chain.setLink({ href: url }).insertContent(url).run();
            } else {
              chain.setLink({ href: url }).run();
            }
          });
        } else if (cmd === 'code') chain.toggleCode().run();
        return;
      }
      if (mode === 'markdown') {
        if (cmd === 'bold') wrapSelection(textarea, '**', '**');
        else if (cmd === 'italic') wrapSelection(textarea, '*', '*');
        else if (cmd === 'h2') wrapSelection(textarea, '\n## ', '\n');
        else if (cmd === 'h3') wrapSelection(textarea, '\n### ', '\n');
        else if (cmd === 'ul') wrapSelection(textarea, '\n* ', '\n');
        else if (cmd === 'link') {
          void showPromptDialog({
            title: 'Insert link',
            message: 'Enter the URL for this link.',
            inputType: 'url',
            placeholder: 'https://',
          }).then((url) => {
            if (url) wrapSelection(textarea, '[', `](${url})`);
          });
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
  const visual = wrapper?.querySelector('.workspace-markdown-field__visual');
  const editor = tipTapEditors.get(textarea);
  if (editor && visual && !visual.classList.contains('hidden')) {
    syncTextareaFromEditor(textarea, editor);
  }
  return textarea.value.trim();
}
