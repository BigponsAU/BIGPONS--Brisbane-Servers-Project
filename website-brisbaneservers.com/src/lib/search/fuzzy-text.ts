/** Spelling-tolerant token matching for marketing + public search. */

export const SEARCH_MIN_CHARS = 3;

export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const row = new Array<number>(b.length + 1);
    for (let j = 0; j <= b.length; j++) row[j] = j;

    for (let i = 1; i <= a.length; i++) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const temp = row[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
            prev = temp;
        }
    }

    return row[b.length];
}

export function normalizeFuzzyToken(token: string): string {
    return token.toLowerCase().replace(/[^\w]/g, '').replace(/(.)\1+/g, '$1');
}

export function maxTypoDistance(tokenLength: number): number {
    if (tokenLength <= 4) return 0;
    if (tokenLength <= 6) return 1;
    if (tokenLength <= 10) return 2;
    return 3;
}

export function fuzzyTokenMatch(queryToken: string, candidateToken: string): boolean {
    const qNorm = normalizeFuzzyToken(queryToken);
    const cNorm = normalizeFuzzyToken(candidateToken);
    if (!qNorm || !cNorm) return false;

    if (cNorm.includes(qNorm) || qNorm.includes(cNorm)) return true;

    if (qNorm.length >= SEARCH_MIN_CHARS && cNorm.startsWith(qNorm.slice(0, SEARCH_MIN_CHARS))) {
        return true;
    }

    const qRaw = queryToken.toLowerCase().replace(/[^\w]/g, '');
    const cRaw = candidateToken.toLowerCase().replace(/[^\w]/g, '');
    const maxDist = maxTypoDistance(Math.max(qRaw.length, cRaw.length));

    if (maxDist === 0) return false;

    return (
        levenshteinDistance(qNorm, cNorm) <= maxDist ||
        levenshteinDistance(qRaw, cRaw) <= maxDist
    );
}

export function isExactTokenMatch(queryToken: string, candidateToken: string): boolean {
    const q = queryToken.toLowerCase().replace(/[^\w]/g, '');
    const c = candidateToken.toLowerCase().replace(/[^\w]/g, '');
    if (!q || !c) return false;
    return c.includes(q) || q.includes(c);
}

export function collectSearchTokens(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[\s\-_/]+/)
        .map((token) => token.replace(/[^\w]/g, ''))
        .filter((token) => token.length >= 2);
}

export type FuzzyMatchKind = 'exact' | 'prefix' | 'fuzzy' | 'none';

export function classifyQueryTokenMatch(queryToken: string, candidateToken: string): FuzzyMatchKind {
    if (isExactTokenMatch(queryToken, candidateToken)) return 'exact';

    const qNorm = normalizeFuzzyToken(queryToken);
    const cNorm = normalizeFuzzyToken(candidateToken);
    if (
        qNorm.length >= SEARCH_MIN_CHARS &&
        cNorm.startsWith(qNorm.slice(0, SEARCH_MIN_CHARS))
    ) {
        return 'prefix';
    }

    if (fuzzyTokenMatch(queryToken, candidateToken)) return 'fuzzy';
    return 'none';
}

export function queryTokensFromText(query: string): string[] {
    return query
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .map((token) => token.replace(/[^\w]/g, ''))
        .filter((token) => token.length >= 2);
}

export function textMatchesQueryTokens(query: string, haystack: string): {
    matched: string[];
    fuzzy: boolean;
} {
    const queryWords = queryTokensFromText(query);
    const tokens = collectSearchTokens(haystack);
    const matched: string[] = [];
    let fuzzy = false;

    for (const queryWord of queryWords) {
        let found = false;
        for (const token of tokens) {
            const kind = classifyQueryTokenMatch(queryWord, token);
            if (kind === 'none') continue;
            matched.push(token);
            if (kind === 'fuzzy' || kind === 'prefix') fuzzy = true;
            found = true;
            break;
        }
        if (!found && queryWord.length >= SEARCH_MIN_CHARS) {
            for (const token of tokens) {
                if (fuzzyTokenMatch(queryWord, token)) {
                    matched.push(token);
                    fuzzy = true;
                    break;
                }
            }
        }
    }

    return { matched: [...new Set(matched)], fuzzy };
}
