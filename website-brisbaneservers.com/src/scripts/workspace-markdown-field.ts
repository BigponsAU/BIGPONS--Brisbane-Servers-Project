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
  changeHeadingLevel,
  duplicatePiece,
  insertPieceAfter,
  movePiece,
  removePiece,
  type ArticlePieceKind,
  type ArticlePieceNode,
} from '../lib/workspace-article-pieces';
import { workspaceFetch } from '../lib/client-api';
import { developArticle, type DevelopMode } from '../lib/inference/article-develop';
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

function articleFieldContext(textarea: HTMLTextAreaElement): { industry: string; topic: string; title: string } {
  const root = textarea.closest('form, .resource-detail-edit, .modal, .account-workspace-shell') || document;
  const valueOf = (ids: string[]) => {
    for (const id of ids) {
      const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
      if (el?.value?.trim()) return el.value.trim();
    }
    return '';
  };
  return {
    title: valueOf(['detail-edit-title', 'edit-resource-title-input', 'resource-title']),
    industry: valueOf(['detail-edit-industry', 'edit-resource-industry', 'resource-industry']),
    topic: valueOf(['detail-edit-topic', 'edit-resource-topic', 'resource-topic']),
  };
}

function selectedHeadingTitle(editor: Editor): string | undefined {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === 'heading' && node.textContent.trim()) return node.textContent.trim();
  }
  const index = selectedTopIndex(editor);
  const pieces = docPieces(editor);
  for (let i = index; i >= 0; i -= 1) {
    const piece = pieces[i];
    if (piece?.type === 'heading') {
      const text = (piece.content || []).map((child) => child.text || '').join('').trim();
      if (text) return text;
    }
  }
  return undefined;
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
        heading: { levels: [1, 2, 3, 4] },
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

async function runDevelopAction(
  textarea: HTMLTextAreaElement,
  editor: Editor,
  mode: DevelopMode,
): Promise<void> {
  syncTextareaFromEditor(textarea, editor);
  const ctx = articleFieldContext(textarea);
  const heading = selectedHeadingTitle(editor);
  const local = developArticle({
    content: textarea.value,
    industry: ctx.industry || 'this industry',
    topic: ctx.topic || 'this work',
    title: ctx.title,
    mode,
    heading,
  });
  setMarkdownFieldValue(textarea.id, local);
  showWorkspaceNotification(
    mode === 'support'
      ? 'Supporting section added under this point.'
      : mode === 'aside'
        ? 'Short aside added.'
        : 'This point was given more depth.',
    'success',
  );

  const options = fieldOptions.get(textarea);
  const resourceId = options?.resourceId;
  const api = options?.getVoiceApiUrl?.();
  if (!resourceId || !api || mode !== 'continue') return;

  try {
    const response = await workspaceFetch(`${api}/resources/${resourceId}/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        develop: mode,
        heading,
        content: local,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success || typeof data.resource?.content !== 'string') return;
    setMarkdownFieldValue(textarea.id, data.resource.content);
    options?.onResourceUpdated?.(data.resource);
    showWorkspaceNotification('Generated more on the main point.', 'success');
  } catch {
    /* Local develop already applied. */
  }
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
      } else if (
        cmd === 'paragraph' ||
        cmd === 'title' ||
        cmd === 'heading' ||
        cmd === 'subheading' ||
        cmd === 'list' ||
        cmd === 'quote'
      ) {
        insertArticlePiece(editor, cmd);
        syncTextareaFromEditor(textarea, editor);
      } else if (cmd === 'diagram') void runDiagramAction(textarea, editor, 'generate');
      else if (cmd === 'diagram-regen') void runDiagramAction(textarea, editor, 'regenerate');
      else if (cmd === 'develop-expand') void runDevelopAction(textarea, editor, 'expand');
      else if (cmd === 'develop-support') void runDevelopAction(textarea, editor, 'support');
      else if (cmd === 'develop-aside') void runDevelopAction(textarea, editor, 'aside');
      else if (cmd === 'develop-continue') void runDevelopAction(textarea, editor, 'continue');
    });
  });

  blockActions.querySelectorAll<HTMLButtonElement>('[data-block]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.block;
      const index = selectedTopIndex(editor);
      const nodes = docPieces(editor);
      if (action === 'up') applyPieces(editor, movePiece(nodes, index, -1), Math.max(0, index - 1));
      else if (action === 'down') applyPieces(editor, movePiece(nodes, index, 1), Math.min(nodes.length - 1, index + 1));
      else if (action === 'bigger') applyPieces(editor, changeHeadingLevel(nodes, index, -1), index);
      else if (action === 'smaller') applyPieces(editor, changeHeadingLevel(nodes, index, 1), index);
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
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="title" title="Add a page title">Title</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="heading" title="Add a section heading">Heading</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="subheading" title="Add a subsection">Subheading</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="paragraph" title="Add a paragraph">Paragraph</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="list" title="Add a list">List</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="quote" title="Add a quoted note">Quote</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="diagram" title="Insert a positioning diagram">Diagram</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="diagram-regen" title="Regenerate the selected or last diagram">Regenerate diagram</button>
    </div>
    <div class="workspace-markdown-field__develop" role="toolbar" aria-label="Develop this article">
      <span class="workspace-markdown-field__insert-label">Develop</span>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="develop-expand" title="Add depth to the selected section">Deepen this</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="develop-support" title="Add a supporting section that follows from this point">Add supporting</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="develop-aside" title="Add a short aside">Add aside</button>
      <button type="button" class="workspace-markdown-field__fmt" data-cmd="develop-continue" title="Generate more on the main point">More on the main point</button>
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
    <button type="button" class="workspace-markdown-field__fmt" data-block="bigger" title="Make this heading larger">Larger heading</button>
    <button type="button" class="workspace-markdown-field__fmt" data-block="smaller" title="Make this heading a subsection">Smaller heading</button>
    <button type="button" class="workspace-markdown-field__fmt" data-block="duplicate" title="Duplicate this piece">Duplicate</button>
    <button type="button" class="workspace-markdown-field__fmt" data-block="remove" title="Remove this piece">Remove</button>
    <button type="button" class="workspace-markdown-field__fmt" data-block="paragraph" title="Add a paragraph below">Add paragraph</button>
  `;
  wrapper.insertBefore(blockActions, textarea);

  const hint = document.createElement('p');
  hint.className = 'workspace-markdown-field__hint';
  hint.textContent =
    'Develop the page around the main point: deepen a section, add supporting or an aside, and keep the diagram next to the join it explains.';
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
