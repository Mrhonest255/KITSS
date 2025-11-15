import { RichTextSpan, StructuredBlock } from './pdfTypes';

const headingPattern = /^(#{1,3})\s*(.+)$/;
const bulletPattern = /^[*-+]\s+(.+)$/;
const blockquotePattern = /^>\s*(.+)$/;

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const parseInlineSpans = (text: string): RichTextSpan[] => {
    const spans: RichTextSpan[] = [];
    const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
    let lastIndex = 0;
    text.replace(pattern, (match, _group, offset) => {
        if (offset > lastIndex) {
            spans.push({ text: text.slice(lastIndex, offset) });
        }
        let content = match;
        if (match.startsWith('**') || match.startsWith('__')) {
            content = match.slice(2, -2);
            spans.push({ text: content, bold: true });
        } else if (match.startsWith('*') || match.startsWith('_')) {
            content = match.slice(1, -1);
            spans.push({ text: content, italic: true });
        } else if (match.startsWith('`')) {
            content = match.slice(1, -1);
            spans.push({ text: content });
        }
        lastIndex = offset + match.length;
        return '';
    });
    if (lastIndex < text.length) {
        spans.push({ text: text.slice(lastIndex) });
    }
    return spans.map(span => ({ ...span, text: span.text.replace(/\s+/g, ' ') }));
};

export const parseMarkdownToBlocks = (rawText: string): StructuredBlock[] => {
    const blocks: StructuredBlock[] = [];
    const normalized = rawText?.replace(/\r\n/g, '\n') ?? '';
    const lines = normalized.split('\n');
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
        if (!paragraphBuffer.length) return;
        const paragraphText = normalizeWhitespace(paragraphBuffer.join(' '));
        if (paragraphText) {
            blocks.push({ kind: 'paragraph', spans: parseInlineSpans(paragraphText) });
        }
        paragraphBuffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) {
            flushParagraph();
            continue;
        }

        const headingMatch = trimmed.match(headingPattern);
        if (headingMatch) {
            flushParagraph();
            const level = headingMatch[1].length;
            const text = headingMatch[2].trim();
            blocks.push({ kind: 'heading', level: Math.min(level, 3), text });
            continue;
        }

        const bulletMatch = trimmed.match(bulletPattern);
        if (bulletMatch) {
            flushParagraph();
            const items: RichTextSpan[][] = [];
            let currentIndex = i;
            while (currentIndex < lines.length) {
                const possible = lines[currentIndex].trim();
                const currentMatch = possible.match(bulletPattern);
                if (!currentMatch) break;
                items.push(parseInlineSpans(normalizeWhitespace(currentMatch[1])));
                currentIndex++;
            }
            blocks.push({ kind: 'list', ordered: false, items });
            i = currentIndex - 1;
            continue;
        }

        const quoteMatch = trimmed.match(blockquotePattern);
        if (quoteMatch) {
            flushParagraph();
            blocks.push({ kind: 'quote', spans: parseInlineSpans(normalizeWhitespace(quoteMatch[1])) });
            continue;
        }

        paragraphBuffer.push(trimmed);
    }

    flushParagraph();
    return blocks;
};
