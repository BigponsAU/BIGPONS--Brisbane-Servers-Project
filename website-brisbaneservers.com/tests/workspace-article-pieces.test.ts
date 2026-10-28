import { describe, expect, it } from 'vitest';
import {
  articlePieceTemplate,
  duplicatePiece,
  insertPieceAfter,
  movePiece,
  removePiece,
} from '../src/lib/workspace-article-pieces';

describe('article pieces', () => {
  it('inserts a paragraph after the current piece', () => {
    const nodes = [articlePieceTemplate('heading'), articlePieceTemplate('paragraph')];
    const next = insertPieceAfter(nodes, 0, articlePieceTemplate('list'));
    expect(next).toHaveLength(3);
    expect(next[1].type).toBe('bulletList');
  });

  it('moves, duplicates, and removes pieces independently', () => {
    const start = [
      articlePieceTemplate('heading'),
      articlePieceTemplate('paragraph'),
      articlePieceTemplate('quote'),
    ];
    const moved = movePiece(start, 2, -1);
    expect(moved[1].type).toBe('blockquote');
    const copied = duplicatePiece(moved, 0);
    expect(copied).toHaveLength(4);
    expect(copied[1].type).toBe('heading');
    const trimmed = removePiece(copied, 0);
    expect(trimmed).toHaveLength(3);
  });

  it('keeps a blank paragraph when the last piece is removed', () => {
    const next = removePiece([articlePieceTemplate('paragraph')], 0);
    expect(next).toEqual([{ type: 'paragraph' }]);
  });

  it('builds templates for every insertable piece', () => {
    expect(articlePieceTemplate('heading').attrs?.level).toBe(2);
    expect(articlePieceTemplate('subheading').attrs?.level).toBe(3);
    expect(articlePieceTemplate('quote').type).toBe('blockquote');
  });
});
