/**
 * Visual rich-text editor for resource content in the account workspace.
 * Authors edit formatted text (TipTap); markdown is only the storage format.
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { wrapMarkdownDocument } from '../lib/markdown-render';
import { showPromptDialog } from './portal-confirm-dialog';

const tipTapEditors = new WeakMap<HTMLTextAreaElement, Editor>();

const FIELD_SELECTORS = [
  '#detail-edit-content',
  '#edit-resource-content',
  '#process-content',
  '#document-extracted-text',
].join(', ');

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
  textarea.hidden = true;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.tabIndex = -1;

  const formatBar = document.createElement('div');
  formatBar.className = 'workspace-markdown-field__format';
  formatBar.setAttribute('role', 'toolbar');
  formatBar.setAttribute('aria-label', 'Text formatting');
  formatBar.innerHTML = `
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="bold" title="Bold"><strong>B</strong></button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="italic" title="Italic"><em>I</em></button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="h2" title="Heading">H2</button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="h3" title="Subheading">H3</button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="ul" title="Bullet list">• List</button>
    <button type="button" class="workspace-markdown-field__fmt" data-cmd="link" title="Link">Link</button>
  `;
  wrapper.insertBefore(formatBar, textarea);

  const visual = document.createElement('div');
  visual.className = 'workspace-markdown-field__visual';
  visual.setAttribute('role', 'textbox');
  visual.setAttribute('aria-multiline', 'true');
  visual.setAttribute('aria-label', textarea.getAttribute('aria-label') || 'Content editor');
  wrapper.appendChild(visual);

  const editor = createTipTapEditor(visual, textarea);

  formatBar.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
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
      }
    });
  });
}

export function mountMarkdownFields(root: ParentNode = document): void {
  root.querySelectorAll<HTMLTextAreaElement>(FIELD_SELECTORS).forEach((textarea) => {
    enhanceMarkdownTextarea(textarea);
  });
}

export function readMarkdownFieldValue(textareaId: string): string {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (!textarea) return '';
  const editor = tipTapEditors.get(textarea);
  if (editor) {
    syncTextareaFromEditor(textarea, editor);
  }
  return textarea.value.trim();
}

/** Sync storage textarea + TipTap when content is set programmatically. */
export function setMarkdownFieldValue(textareaId: string, value: string): void {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (!textarea) return;
  textarea.value = value;
  const editor = tipTapEditors.get(textarea);
  if (editor) {
    editor.commands.setContent(markdownToVisualHtml(value), { emitUpdate: false });
  }
}
