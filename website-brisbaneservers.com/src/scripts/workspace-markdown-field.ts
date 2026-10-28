/**
 * Visual article editor. Authors compose the page from pieces
 * (heading, paragraph, list, quote, diagram) the same way diagrams are inserted.
 */
import { Editor, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { wrapMarkdownDocument } from '../lib/markdown-render';
import { diagramMarker } from '../lib/resource-infographics';
import {
  articlePieceTemplate,
  duplicatePiece,
  insertPieceAfter,
  movePiece,
  removePiece,
  type ArticlePieceKind,
  type ArticlePieceNode,
} from '../lib/workspace-article-pieces';
import { workspaceFetch } from '../lib/client-api';
import { showPromptDialog } from './portal-confirm-dialog';
import { showWorkspaceNotification } from './account-workspace-utils';

export type MarkdownFieldOptions = {
  resourceId?: string;
  getVoiceApiUrl?: () => string;
  onResourceUpdated?: (resource: unknown) => void;
};

const tipTapEditors = new WeakMap<HTMLTextAreaElement, Editor>();
const fieldOptions = new WeakMap<HTMLTextAreaElement, MarkdownFieldOptions>();

const FIELD_SELECTORS = [
  '#detail-edit-content',
  '#edit-resource-content',
  '#process-content',
  '#document-extracted-text',
].join(', ');

const WorkspaceDiagram = Node.create({
  name: 'workspaceDiagram',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      diagramId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-diagram-id') || '',
        renderHTML: (attributes) => ({ 'data-diagram-id': attributes.diagramId }),
      },
      title: {
        default: 'Diagram',
        parseHTML: (element) => {
          const caption = element.querySelector('strong, span')?.textContent || '';
          return caption.replace(/^Diagram:\s*/i, '').trim() || 'Diagram';
        },
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'figure.workspace-diagram' }, { tag: 'figure.workspace-diagram-placeholder' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        class: 'workspace-diagram-placeholder',
        contenteditable: 'false',
      }),
      ['span', {}, `Diagram: ${HTMLAttributes.title || HTMLAttributes.diagramId}`],
    ];
  },
});

export function editorHtmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: globalThis.Node): string => {
    if (node.nodeType === 3) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== 1) return '';
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
      case 'blockquote':
        return `\n\n> ${inner.trim().replace(/\n+/g, ' ')}\n\n`;
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
      case 'figure': {
        const id = el.getAttribute('data-diagram-id');
        if (id) return `\n\n${diagramMarker(id)}\n\n`;
        return `\n\n${inner}\n\n`;
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
  textarea.value = editorHtmlToMarkdown(editor.getHTML());
}

function docPieces(editor: Editor): ArticlePieceNode[] {
  const json = editor.getJSON();
  return Array.isArray(json.content) ? (json.content as ArticlePieceNode[]) : [];
}

function applyPieces(editor: Editor, nodes: ArticlePieceNode[], _focusIndex?: number): void {
  editor.commands.setContent({ type: 'doc', content: nodes.length ? nodes : [{ type: 'paragraph' }] }, {
    emitUpdate: true,
  });
  editor.commands.focus();
}

function selectedTopIndex(editor: Editor): number {
  const { $from } = editor.state.selection;
  if ($from.depth < 1) return Math.max(0, editor.state.doc.childCount - 1);
  return editor.state.doc.resolve($from.before(1)).index(0);
}

function selectedDiagramId(editor: Editor): string | null {
  const node = editor.state.selection.$from.node(1);
  if (node?.type.name === 'workspaceDiagram' && node.attrs.diagramId) {
    return String(node.attrs.diagramId);
  }
  let last: string | null = null;
  editor.state.doc.descendants((child) => {
    if (child.type.name === 'workspaceDiagram' && child.attrs.diagramId) {
      last = String(child.attrs.diagramId);
    }
  });
  return last;
}

function insertArticlePiece(editor: Editor, kind: ArticlePieceKind): void {
  const index = selectedTopIndex(editor);
  const next = insertPieceAfter(docPieces(editor), index, articlePieceTemplate(kind));
  applyPieces(editor, next, index + 1);
}

async function runDiagramAction(
  textarea: HTMLTextAreaElement,
  editor: Editor,
  action: 'generate' | 'regenerate',
): Promise<void> {
  const options = fieldOptions.get(textarea);
  const resourceId = options?.resourceId;
  const api = options?.getVoiceApiUrl?.();
  if (!resourceId || !api) {
    showWorkspaceNotification('Save this article first, then insert diagrams from the editor.', 'warning');
    return;
  }

  const diagramId = action === 'regenerate' ? selectedDiagramId(editor) || undefined : undefined;
  try {
    const response = await workspaceFetch(`${api}/resources/${resourceId}/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        diagramId,
        place: action === 'generate' ? 'none' : 'end',
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      showWorkspaceNotification(data.error || 'Could not update the diagram.', 'error');
      return;
    }
    const spec = data.diagram as { id?: string; title?: string } | undefined;
    if (action === 'generate' && spec?.id) {
      const index = selectedTopIndex(editor);
      const piece: ArticlePieceNode = {
        type: 'workspaceDiagram',
        attrs: { diagramId: spec.id, title: spec.title || spec.id },
      };
      applyPieces(editor, insertPieceAfter(docPieces(editor), index, piece), index + 1);
    } else if (action === 'regenerate' && spec?.id) {
      const html = editor.getHTML().replace(
        new RegExp(`data-diagram-id="${diagramId || spec.id}"[\\s\\S]*?</figure>`),
        `data-diagram-id="${spec.id}"><span>Diagram: ${spec.title || spec.id}</span></figure`,
      );
      editor.commands.setContent(html, { emitUpdate: true });
    }
    syncTextareaFromEditor(textarea, editor);
    options?.onResourceUpdated?.(data.resource);
    showWorkspaceNotification(action === 'regenerate' ? 'Diagram regenerated.' : 'Diagram inserted.', 'success');
  } catch (error) {
    showWorkspaceNotification(error instanceof Error ? error.message : 'Could not update the diagram.', 'error');
  }
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
      WorkspaceDiagram,
    ],
    content: markdownToVisualHtml(textarea.value),
    onUpdate: ({ editor: ed }) => syncTextareaFromEditor(textarea, ed),
  });
  tipTapEditors.set(textarea, editor);
  return editor;
}

function bindPieceEditor(
  editor: Editor,
  textarea: HTMLTextAreaElement,
  formatBar: HTMLElement,
  blockActions: HTMLElement,
): void {
  formatBar.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      const chain = editor.chain().focus();
      if (cmd === 'bold') chain.toggleBold().run();
      else if (cmd === 'italic') chain.toggleItalic().run();
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
      } else if (cmd === 'paragraph' || cmd === 'heading' || cmd === 'subheading' || cmd === 'list' || cmd === 'quote') {
        insertArticlePiece(editor, cmd);
        syncTextareaFromEditor(textarea, editor);
      } else if (cmd === 'diagram') void runDiagramAction(textarea, editor, 'generate');
      else if (cmd === 'diagram-regen') void runDiagramAction(textarea, editor, 'regenerate');
    });
  });

  blockActions.querySelectorAll<HTMLButtonElement>('[data-block]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.block;
      const index = selectedTopIndex(editor);
      const nodes = docPieces(editor);
      if (action === 'up') applyPieces(editor, movePiece(nodes, index, -1), Math.max(0, index - 1));
      else if (action === 'down') applyPieces(editor, movePiece(nodes, index, 1), Math.min(nodes.length - 1, index + 1));
      else if (action === 'duplicate') applyPieces(editor, duplicatePiece(nodes, index), index + 1);
      else if (action === 'remove') applyPieces(editor, removePiece(nodes, index), Math.max(0, index - 1));
      else if (action === 'paragraph' || action === 'heading' || action === 'list' || action === 'quote') {
        insertArticlePiece(editor, action);
      }
      syncTextareaFromEditor(textarea, editor);
    });
  });
}

export function enhanceMarkdownTextarea(
  textarea: HTMLTextAreaElement,
  options: MarkdownFieldOptions = {},
): void {
  if (options.resourceId || options.getVoiceApiUrl) {
    fieldOptions.set(textarea, { ...fieldOptions.get(textarea), ...options });
  }
  if (textarea.dataset.markdownEnhanced === 'true') return;
  textarea.dataset.markdownEnhanced = 'true';
  fieldOptions.set(textarea, options);

  const wrapper = document.createElement('div');
  wrapper.className = 'workspace-markdown-field';
  textarea.parentNode?.insertBefore(wrapper, textarea);
  wrapper.appendChild(textarea);
  textarea.hidden = true;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.tabIndex = -1;

  const formatBar = document.createElement('div');
  formatBar.className = 'workspace-markdown-field__chrome';
  formatBar.innerHTML = `
    <div class="workspace-markdown-field__format" role="toolbar" aria-label="Text formatting">
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="bold" title="Bold"><strong>B</strong></button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="italic" title="Italic"><em>I</em></button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="link" title="Link">Link</button>
    </div>
    <div class="workspace-markdown-field__insert" role="toolbar" aria-label="Insert a piece into the article">
      <span class="workspace-markdown-field__insert-label">Insert</span>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="heading" title="Add a heading">Heading</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="subheading" title="Add a subheading">Subheading</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="paragraph" title="Add a paragraph">Paragraph</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="list" title="Add a list">List</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="quote" title="Add a quoted note">Quote</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="diagram" title="Insert a positioning diagram">Diagram</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="diagram-regen" title="Regenerate the selected or last diagram">Regenerate diagram</button>
    </div>
  `;
  wrapper.insertBefore(formatBar, textarea);

  const blockActions = document.createElement('div');
  blockActions.className = 'workspace-markdown-field__block-actions';
  blockActions.setAttribute('role', 'toolbar');
  blockActions.setAttribute('aria-label', 'Selected piece');
  blockActions.innerHTML = `
    <span class="workspace-markdown-field__insert-label">This piece</span>
    <button type="button" class="workspace-markdown-field__fmt" data-block="up" title="Move up">Up</button>
    <button type="button" class="workspace-markdown-field__fmt" data-block="down" title="Move down">Down</button>
    <button type="button" class="workspace-markdown-field__fmt" data-block="duplicate" title="Duplicate this piece">Duplicate</button>
    <button type="button" class="workspace-markdown-field__fmt" data-block="remove" title="Remove this piece">Remove</button>
    <button type="button" class="workspace-markdown-field__fmt" data-block="paragraph" title="Add a paragraph below">Add paragraph</button>
  `;
  wrapper.insertBefore(blockActions, textarea);

  const hint = document.createElement('p');
  hint.className = 'workspace-markdown-field__hint';
  hint.textContent =
    'Each heading, paragraph, list, quote, and diagram is its own piece. Click into one to edit it, then insert or move pieces to build the article.';
  wrapper.insertBefore(hint, textarea);

  const visual = document.createElement('div');
  visual.className = 'workspace-markdown-field__visual';
  visual.setAttribute('role', 'textbox');
  visual.setAttribute('aria-multiline', 'true');
  visual.setAttribute('aria-label', textarea.getAttribute('aria-label') || 'Article pieces');
  wrapper.appendChild(visual);

  const editor = createTipTapEditor(visual, textarea);
  bindPieceEditor(editor, textarea, formatBar, blockActions);
}

export function mountMarkdownFields(root: ParentNode = document, options: MarkdownFieldOptions = {}): void {
  root.querySelectorAll<HTMLTextAreaElement>(FIELD_SELECTORS).forEach((textarea) => {
    enhanceMarkdownTextarea(textarea, options);
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
