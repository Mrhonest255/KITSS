import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { GeneratedBook, DocxBuildOptions, UserImageAsset } from '../types/book';
import { parseMarkdownToBlocks } from './markdownParser';
import { StructuredBlock, RichTextSpan } from './pdfTypes';

const spansToTextRuns = (spans: RichTextSpan[]) => {
    if (!spans.length) {
        return [new TextRun('')];
    }
    return spans.map(span => new TextRun({
        text: span.text,
        bold: span.bold,
        italics: span.italic,
    }));
};

const normalizeForComparison = (value?: string): string =>
    value
        ?.replace(/chapter\s+\d+[:\-]?/i, '')
        .replace(/[^a-z0-9]+/gi, ' ')
        .trim()
        .toLowerCase() ?? '';

const stripLeadingChapterHeading = (blocks: StructuredBlock[], chapterTitle: string): StructuredBlock[] => {
    const normalizedTitle = normalizeForComparison(chapterTitle);
    if (!normalizedTitle) return blocks;
    let startIndex = 0;
    while (startIndex < blocks.length) {
        const block = blocks[startIndex];
        if (!block) break;
        let candidate = '';
        if (block.kind === 'heading') {
            candidate = block.text;
        } else if (block.kind === 'paragraph') {
            candidate = spansToPlain(block.spans);
        } else {
            break;
        }
        if (normalizeForComparison(candidate) === normalizedTitle) {
            startIndex++;
            continue;
        }
        break;
    }
    return startIndex === 0 ? blocks : blocks.slice(startIndex);
};

const spansToPlain = (spans: RichTextSpan[]) =>
    spans
        .map(span => span.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

const createParagraph = (spans: RichTextSpan[], options?: { spacingAfter?: number; indentLeftTwip?: number }) =>
    new Paragraph({
        children: spansToTextRuns(spans),
        spacing: { after: options?.spacingAfter ?? 200 },
        indent: options?.indentLeftTwip ? { left: options.indentLeftTwip } : undefined,
    });

const createBulletParagraph = (spans: RichTextSpan[]) =>
    new Paragraph({
        children: spansToTextRuns(spans),
        bullet: { level: 0 },
        spacing: { after: 100 },
    });

const createQuoteParagraph = (spans: RichTextSpan[]) =>
    new Paragraph({
        children: spansToTextRuns(spans),
        italics: true,
        indent: { left: 720 },
        spacing: { after: 180 },
    });

const formatChapterNumber = (index: number) => `Chapter ${index}`;

const buildCoverSection = (book: GeneratedBook) => ({
    children: [
        new Paragraph({
            text: book.config.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
        }),
        new Paragraph({
            text: `${book.config.genre} • ${book.config.topic}`,
            heading: HeadingLevel.HEADING_3,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        book.config.dedication
            ? new Paragraph({
                  text: `For ${book.config.dedication}`,
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 },
              })
            : new Paragraph({ text: '', spacing: { after: 200 } }),
        new Paragraph({
            text: 'Crafted with BookForge AI',
            alignment: AlignmentType.CENTER,
        }),
    ],
});

const buildTocSection = (book: GeneratedBook) => ({
    children: [
        new Paragraph({ text: 'Table of Contents', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
        ...book.chapters.map(chapter =>
            new Paragraph({
                text: `${formatChapterNumber(chapter.index)} – ${chapter.title}`,
                spacing: { after: 120 },
            })
        ),
    ],
});

const buildChapterChildren = (chapter: GeneratedBook['chapters'][number]) => {
    const blocks = stripLeadingChapterHeading(parseMarkdownToBlocks(chapter.text || ''), chapter.title);
    const children: Paragraph[] = [];

    children.push(
        new Paragraph({ text: formatChapterNumber(chapter.index), heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
        new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1, spacing: { after: 240 } })
    );

    for (const block of blocks) {
        switch (block.kind) {
            case 'heading':
                children.push(
                    new Paragraph({
                        text: block.text,
                        heading: block.level === 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
                        spacing: { after: 200 },
                    })
                );
                break;
            case 'list':
                block.items.forEach(item => children.push(createBulletParagraph(item)));
                children.push(new Paragraph(''));
                break;
            case 'quote':
                children.push(createQuoteParagraph(block.spans));
                break;
            case 'paragraph':
            default:
                children.push(createParagraph(block.kind === 'paragraph' ? block.spans : [{ text: '' }]));
        }
    }

    children.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    return children;
};

const mapImagesToAppendix = (images: UserImageAsset[] = []) =>
    images.length
        ? [{
              children: [
                  new Paragraph({ text: 'Image Appendix', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
                  ...images.map(asset =>
                      new Paragraph({ text: `${asset.name}${asset.caption ? ` – ${asset.caption}` : ''}`, spacing: { after: 120 } })
                  ),
              ],
          }]
        : [];

export async function buildBookDocx(book: GeneratedBook, options: DocxBuildOptions = {}): Promise<Uint8Array> {
    const doc = new Document();
    doc.addSection(buildCoverSection(book));
    doc.addSection(buildTocSection(book));

    for (const chapter of book.chapters) {
        doc.addSection({ children: buildChapterChildren(chapter) });
    }

    if (options.images?.length) {
        mapImagesToAppendix(options.images).forEach(section => doc.addSection(section));
    }

    return Packer.toUint8Array(doc);
}
