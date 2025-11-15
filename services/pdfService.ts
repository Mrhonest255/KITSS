import { PDFDocument, rgb, StandardFonts, PageSizes, PDFFont, PDFPage } from 'pdf-lib';
import { GeneratedBook, PdfBuildOptions, PdfConfig, PdfFontFamily, PdfStylePreset, UserImageAsset, ChapterImageAnchor } from '../types/book';
import { getThemeDefinition } from './pdfThemes';
import { DEFAULT_PDF_CONFIG } from '../config/pdfDefaults';
import { parseMarkdownToBlocks } from './markdownParser';
import { StructuredBlock, RichTextSpan } from './pdfTypes';

const hexToRgb = (value: string) => {
    const hex = value.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return rgb(r, g, b);
};

interface ThemeProfile {
    id: PdfStylePreset;
    name: string;
    pageBackground: ReturnType<typeof rgb>;
    coverBackground: ReturnType<typeof rgb>;
    ribbonColor: ReturnType<typeof rgb>;
    accent: ReturnType<typeof rgb>;
    accentSoft: ReturnType<typeof rgb>;
    title: ReturnType<typeof rgb>;
    heading: ReturnType<typeof rgb>;
    body: ReturnType<typeof rgb>;
    caption: ReturnType<typeof rgb>;
    subtle: ReturnType<typeof rgb>;
    lineHeightMultiplier: number;
    paragraphSpacingMultiplier: number;
}

const getTheme = (preset?: PdfStylePreset): ThemeProfile => {
    const definition = getThemeDefinition(preset);
    return {
        id: definition.id,
        name: definition.name,
        pageBackground: hexToRgb(definition.colors.pageBackground),
        coverBackground: hexToRgb(definition.colors.coverBackground),
        ribbonColor: hexToRgb(definition.colors.ribbonColor),
        accent: hexToRgb(definition.colors.accent),
        accentSoft: hexToRgb(definition.colors.accentSoft),
        title: hexToRgb(definition.colors.title),
        heading: hexToRgb(definition.colors.heading),
        body: hexToRgb(definition.colors.body),
        caption: hexToRgb(definition.colors.caption),
        subtle: hexToRgb(definition.colors.subtle),
        lineHeightMultiplier: definition.lineHeightMultiplier,
        paragraphSpacingMultiplier: definition.paragraphSpacingMultiplier,
    };
};

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = String(text).split('\n');
    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
            lines.push('');
            continue;
        }
        let currentLine = '';
        const words = paragraph.split(' ');
        for (const word of words) {
            const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
            if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth) {
                if (currentLine.length > 0) lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
    }
    return lines;
}

const fontMapping = {
    TimesRoman: { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold, italic: StandardFonts.TimesRomanItalic },
    Helvetica: { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold, italic: StandardFonts.HelveticaOblique },
    Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold, italic: StandardFonts.CourierOblique },
};

const decodeBase64 = (value: string): string => {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        return window.atob(value);
    }
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).atob === 'function') {
        return (globalThis as any).atob(value);
    }
    throw new Error('Base64 decoding is not supported in this environment.');
};

const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.split(',')[1] ?? '';
    const binary = decodeBase64(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const embedUserImage = async (pdfDoc: PDFDocument, asset: UserImageAsset) => {
    const bytes = dataUrlToUint8Array(asset.dataUrl);
    if (asset.type === 'image/png') {
        return pdfDoc.embedPng(bytes);
    }
    return pdfDoc.embedJpg(bytes);
};

type EmbeddedImage = Awaited<ReturnType<typeof embedUserImage>>;

interface StyledToken {
    text: string;
    font: PDFFont;
    width: number;
    isSpace: boolean;
}

const tokenizeSpans = (spans: RichTextSpan[], fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont }, fontSize: number): StyledToken[] => {
    const tokens: StyledToken[] = [];
    for (const span of spans) {
        const font = span.bold ? fonts.bold : span.italic ? fonts.italic : fonts.regular;
        const parts = span.text.split(/(\s+)/);
        for (const part of parts) {
            if (!part) continue;
            const isSpace = /^\s+$/.test(part);
            const text = isSpace ? ' ' : part;
            tokens.push({
                text,
                font,
                width: font.widthOfTextAtSize(text, fontSize),
                isSpace,
            });
        }
    }
    return tokens;
};

const wrapTokens = (tokens: StyledToken[], maxWidth: number): StyledToken[][] => {
    const lines: StyledToken[][] = [];
    let currentLine: StyledToken[] = [];
    let lineWidth = 0;

    const pushLine = () => {
        if (!currentLine.length) return;
        let end = currentLine.length;
        while (end > 0 && currentLine[end - 1].isSpace) {
            end--;
        }
        if (end > 0) {
            lines.push(currentLine.slice(0, end));
        }
    };

    for (const token of tokens) {
        if (!token.isSpace && lineWidth + token.width > maxWidth && currentLine.length) {
            pushLine();
            currentLine = [];
            lineWidth = 0;
        }
        if (token.isSpace && !currentLine.length) {
            continue;
        }
        currentLine.push(token);
        lineWidth += token.width;
    }

    pushLine();
    return lines;
};

const drawRichLine = (
    page: PDFPage,
    lineTokens: StyledToken[],
    startX: number,
    y: number,
    fontSize: number,
    color: ReturnType<typeof rgb>
) => {
    let cursorX = startX;
    for (const token of lineTokens) {
        page.drawText(token.text, {
            x: cursorX,
            y,
            font: token.font,
            size: fontSize,
            color,
        });
        cursorX += token.width;
    }
};

interface ParagraphOptions {
    indent?: number;
    spacingBottom?: number;
    color?: ReturnType<typeof rgb>;
    beforeFirstLine?: (lineY: number) => void;
}

const drawRichParagraph = (
    spans: RichTextSpan[],
    fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont },
    state: { page: PDFPage; y: number },
    ensureSpaceFn: (amount: number) => void,
    originX: number,
    contentWidth: number,
    fontSize: number,
    lineHeight: number,
    paragraphSpacing: number,
    defaultColor: ReturnType<typeof rgb>,
    options: ParagraphOptions = {}
) => {
    if (!spans?.length) return;
    const indent = options.indent ?? 0;
    const tokens = tokenizeSpans(spans, fonts, fontSize);
    const lines = wrapTokens(tokens, Math.max(20, contentWidth - indent));
    if (!lines.length) return;
    const spacingBottom = options.spacingBottom ?? paragraphSpacing;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const lineTokens = lines[lineIndex];
        ensureSpaceFn(lineHeight);
        if (lineIndex === 0 && options.beforeFirstLine) {
            options.beforeFirstLine(state.y);
        }
        drawRichLine(state.page, lineTokens, originX + indent, state.y, fontSize, options.color ?? defaultColor);
        state.y -= lineHeight;
    }
    state.y -= spacingBottom;
};

const spansToPlainText = (spans: RichTextSpan[]) =>
    spans
        .map(span => span.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

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
            candidate = spansToPlainText(block.spans);
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

const drawPageBackground = (page: PDFPage, width: number, height: number, color: ReturnType<typeof rgb>) => {
    page.drawRectangle({ x: 0, y: 0, width, height, color });
};

interface PageMeta {
    page: PDFPage;
    role: 'cover' | 'gallery' | 'toc' | 'chapter';
    chapterTitle?: string;
}

interface TocEntry {
    title: string;
    pageNumber: number;
}

interface TocPageState {
    page: PDFPage;
    nextY: number;
}

export async function buildBookPdf(book: GeneratedBook, userConfig: Partial<PdfConfig> = {}, options: PdfBuildOptions = {}): Promise<Uint8Array> {
    const config: PdfConfig = {
        pageSize: userConfig.pageSize ?? DEFAULT_PDF_CONFIG.pageSize,
        margins: { ...DEFAULT_PDF_CONFIG.margins, ...userConfig.margins },
        pageNumbering: userConfig.pageNumbering ?? DEFAULT_PDF_CONFIG.pageNumbering,
        fonts: {
            title: { ...DEFAULT_PDF_CONFIG.fonts.title, ...userConfig.fonts?.title },
            heading: { ...DEFAULT_PDF_CONFIG.fonts.heading, ...userConfig.fonts?.heading },
            body: { ...DEFAULT_PDF_CONFIG.fonts.body, ...userConfig.fonts?.body },
        },
        stylePreset: userConfig.stylePreset ?? DEFAULT_PDF_CONFIG.stylePreset,
    };

    const theme = getTheme(config.stylePreset);
    const pdfDoc = await PDFDocument.create();

    const embeddedImageCache = new Map<string, EmbeddedImage>();
    const getEmbeddedImageForAsset = async (asset: UserImageAsset) => {
        if (!embeddedImageCache.has(asset.id)) {
            embeddedImageCache.set(asset.id, await embedUserImage(pdfDoc, asset));
        }
        return embeddedImageCache.get(asset.id)!;
    };

    const uniqueFontFamilies = new Set([config.fonts.title.family, config.fonts.heading.family, config.fonts.body.family]);
    const embeddedFonts: { [key in PdfFontFamily]?: { regular: PDFFont; bold: PDFFont; italic: PDFFont } } = {};
    for (const family of uniqueFontFamilies) {
        const fontSet = fontMapping[family];
        embeddedFonts[family] = {
            regular: await pdfDoc.embedFont(fontSet.regular),
            bold: await pdfDoc.embedFont(fontSet.bold),
            italic: await pdfDoc.embedFont(fontSet.italic),
        };
    }

    const getFontVariant = (family: PdfFontFamily, variant: 'regular' | 'bold' | 'italic'): PDFFont => embeddedFonts[family]![variant];
    const resolveFont = (configFont: PdfConfig['fonts']['title']) => {
        const variant = configFont.bold ? 'bold' : 'regular';
        return getFontVariant(configFont.family as PdfFontFamily, variant);
    };

    const titleFont = resolveFont(config.fonts.title);
    const headingFont = resolveFont(config.fonts.heading);
    const bodyFont = resolveFont(config.fonts.body);
    const bodyBoldFont = getFontVariant(config.fonts.body.family, 'bold');
    const bodyItalicFont = getFontVariant(config.fonts.body.family, 'italic');

    const pageDimensions = PageSizes[config.pageSize];
    const [pageWidth, pageHeight] = pageDimensions;
    const originX = config.margins.left;
    const contentWidth = pageWidth - config.margins.left - config.margins.right;

    const includedImages = options.images?.filter(image => image.include) ?? [];
    const galleryImages = includedImages.filter(image => !image.placement || image.placement.type === 'gallery');
    const coverImages = includedImages.filter(image => image.placement?.type === 'cover');
    const chapterImageMap = new Map<number, UserImageAsset[]>();
    for (const image of includedImages) {
        if (image.placement?.type === 'chapter' && typeof image.placement.chapterIndex === 'number') {
            const list = chapterImageMap.get(image.placement.chapterIndex) ?? [];
            list.push(image);
            chapterImageMap.set(image.placement.chapterIndex, list);
        }
    }

    const lineHeight = config.fonts.body.size * theme.lineHeightMultiplier;
    const paragraphSpacing = config.fonts.body.size * theme.paragraphSpacingMultiplier;

    const pageMeta: PageMeta[] = [];
    const coverPageCount = 1; // cover page is excluded from numbering
    const registerPage = (page: PDFPage, meta: Omit<PageMeta, 'page'>) => {
        pageMeta.push({ page, ...meta });
        return page;
    };

    const addContentPage = (meta: Omit<PageMeta, 'page'>, background: ReturnType<typeof rgb> = theme.pageBackground) => {
        const page = pdfDoc.addPage(pageDimensions);
        drawPageBackground(page, pageWidth, pageHeight, background);
        return registerPage(page, meta);
    };

    // --- Cover Page ---
    const coverPage = pdfDoc.addPage(pageDimensions);
    drawPageBackground(coverPage, pageWidth, pageHeight, theme.coverBackground);
    registerPage(coverPage, { role: 'cover' });

    const coverBackgroundAsset = coverImages.find(image => image.placement?.type === 'cover' && image.placement.coverSlot === 'background');
    if (coverBackgroundAsset) {
        const embedded = await getEmbeddedImageForAsset(coverBackgroundAsset);
        const maxWidth = pageWidth - originX * 2;
        const maxHeight = pageHeight * 0.55;
        const scale = Math.min(1, maxWidth / embedded.width, maxHeight / embedded.height);
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;
        coverPage.drawImage(embedded, {
            x: (pageWidth - drawWidth) / 2,
            y: pageHeight * 0.35,
            width: drawWidth,
            height: drawHeight,
            opacity: 0.35,
        });
    }

    const coverYStart = pageHeight * 0.58;
    let coverCurrentY = coverYStart;
    const titleLines = wrapText(book.config.title, titleFont, config.fonts.title.size, contentWidth * 0.9);
    for (const line of titleLines) {
        const textWidth = titleFont.widthOfTextAtSize(line, config.fonts.title.size);
        coverPage.drawText(line, {
            x: (pageWidth - textWidth) / 2,
            y: coverCurrentY,
            font: titleFont,
            size: config.fonts.title.size,
            color: theme.title,
        });
        coverCurrentY -= config.fonts.title.size * 1.2;
    }

    const subtitle = `${book.config.genre} • ${book.config.topic}`;
    const subtitleWidth = headingFont.widthOfTextAtSize(subtitle, config.fonts.heading.size * 0.6);
    coverPage.drawText(subtitle, {
        x: (pageWidth - subtitleWidth) / 2,
        y: coverCurrentY - 10,
        font: headingFont,
        size: config.fonts.heading.size * 0.6,
        color: theme.caption,
    });

    const dedication = book.config.dedication?.trim();
    if (dedication) {
        coverPage.drawText(`For ${dedication}`, {
            x: originX,
            y: config.margins.bottom + 40,
            font: bodyItalicFont,
            size: 12,
            color: theme.caption,
        });
    }

    coverPage.drawText('Crafted with BookForge AI', {
        x: originX,
        y: config.margins.bottom + 20,
        font: bodyFont,
        size: 11,
        color: theme.caption,
    });

    const coverBadgeAsset = coverImages.find(image => image.placement?.type === 'cover' && image.placement.coverSlot === 'badge');
    if (coverBadgeAsset) {
        const embedded = await getEmbeddedImageForAsset(coverBadgeAsset);
        const badgeSize = Math.min(140, pageWidth * 0.2);
        const scale = Math.min(1, badgeSize / embedded.width, badgeSize / embedded.height);
        coverPage.drawImage(embedded, {
            x: pageWidth - config.margins.right - embedded.width * scale,
            y: config.margins.bottom + 30,
            width: embedded.width * scale,
            height: embedded.height * scale,
        });
    }

    // --- Table of Contents Placeholder Pages ---
    const tocEntries: TocEntry[] = [];
    const tocPages: TocPageState[] = [];
    const availableTocHeight = pageHeight - config.margins.top - config.margins.bottom - config.fonts.heading.size * 1.5;
    const tocEntriesPerPage = Math.max(1, Math.floor(availableTocHeight / lineHeight));
    const tocPageCount = Math.max(1, Math.ceil(book.chapters.length / tocEntriesPerPage));

    const createTocPage = (): TocPageState => {
        const page = addContentPage({ role: 'toc' });
        const headerY = pageHeight - config.margins.top;
        page.drawText('Table of Contents', {
            x: originX,
            y: headerY,
            font: headingFont,
            size: config.fonts.heading.size,
            color: theme.heading,
        });
        page.drawRectangle({
            x: originX,
            y: headerY - config.fonts.heading.size - 6,
            width: contentWidth,
            height: 2,
            color: theme.accent,
            opacity: 0.3,
        });
        return { page, nextY: headerY - config.fonts.heading.size * 1.8 };
    };

    for (let i = 0; i < tocPageCount; i++) {
        tocPages.push(createTocPage());
    }

    const renderTableOfContents = () => {
        if (!tocPages.length || !tocEntries.length) return;
        let pageIndex = 0;
        let currentPage = tocPages[pageIndex];
        for (const entry of tocEntries) {
            if (!currentPage) break;
            if (currentPage.nextY < config.margins.bottom + lineHeight) {
                pageIndex++;
                currentPage = tocPages[pageIndex];
                if (!currentPage) break;
            }
            currentPage.page.drawText(entry.title, {
                x: originX,
                y: currentPage.nextY,
                font: bodyFont,
                size: config.fonts.body.size,
                color: theme.body,
            });
            const pageNumberText = entry.pageNumber.toString();
            const numberWidth = bodyFont.widthOfTextAtSize(pageNumberText, config.fonts.body.size);
            currentPage.page.drawText(pageNumberText, {
                x: pageWidth - config.margins.right - numberWidth,
                y: currentPage.nextY,
                font: bodyFont,
                size: config.fonts.body.size,
                color: theme.body,
            });
            currentPage.nextY -= lineHeight;
        }
    };

    // --- Optional Image Gallery ---
    if (galleryImages.length > 0) {
        let galleryPage = addContentPage({ role: 'gallery' });
        let galleryY = pageHeight - config.margins.top;
        galleryPage.drawText('Contributor Gallery', {
            x: originX,
            y: galleryY,
            font: headingFont,
            size: config.fonts.heading.size,
            color: theme.heading,
        });
        galleryY -= config.fonts.heading.size * 1.4;

        const columns = 2;
        const gutter = 18;
        const cardWidth = (contentWidth - gutter) / columns;
        let rowMaxHeight = 0;
        for (const [index, asset] of galleryImages.entries()) {
            const embeddedImage = await getEmbeddedImageForAsset(asset);
            const maxImageHeight = pageHeight * 0.35;
            const scale = Math.min(1, cardWidth / embeddedImage.width, maxImageHeight / embeddedImage.height);
            const drawWidth = embeddedImage.width * scale;
            const drawHeight = embeddedImage.height * scale;
            const columnIndex = index % columns;
            if (columnIndex === 0 && galleryY - drawHeight - 50 < config.margins.bottom) {
                galleryPage = addContentPage({ role: 'gallery' });
                galleryY = pageHeight - config.margins.top;
            }

            const originY = galleryY;
            const originColumnX = originX + columnIndex * (cardWidth + gutter);
            galleryPage.drawRectangle({
                x: originColumnX,
                y: originY - drawHeight - 12,
                width: cardWidth,
                height: drawHeight + 42,
                color: theme.accentSoft,
                opacity: 0.2,
            });
            galleryPage.drawImage(embeddedImage, {
                x: originColumnX + (cardWidth - drawWidth) / 2,
                y: originY - drawHeight - 8,
                width: drawWidth,
                height: drawHeight,
            });
            const caption = asset.caption?.trim() || asset.name || 'Uploaded image';
            galleryPage.drawText(caption, {
                x: originColumnX + 8,
                y: originY - drawHeight - 28,
                font: bodyItalicFont,
                size: 10,
                color: theme.caption,
            });

            rowMaxHeight = Math.max(rowMaxHeight, drawHeight);
            if (columnIndex === columns - 1 || index === galleryImages.length - 1) {
                galleryY -= rowMaxHeight + 80;
                rowMaxHeight = 0;
            }
        }
    }

    // --- Chapter Rendering Helpers ---
    const textFonts = { regular: bodyFont, bold: bodyBoldFont, italic: bodyItalicFont };

    const drawChapterImage = async (
        asset: UserImageAsset,
        state: { page: PDFPage; y: number },
        ensureSpaceFn: (amount: number) => void
    ) => {
        const embedded = await getEmbeddedImageForAsset(asset);
        const maxHeight = pageHeight * 0.35;
        const scale = Math.min(1, contentWidth / embedded.width, maxHeight / embedded.height);
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;
        ensureSpaceFn(drawHeight + 40);
        state.page.drawImage(embedded, {
            x: originX + (contentWidth - drawWidth) / 2,
            y: state.y - drawHeight,
            width: drawWidth,
            height: drawHeight,
        });
        state.y -= drawHeight + 16;
        if (asset.caption?.trim()) {
            state.page.drawText(asset.caption.trim(), {
                x: originX,
                y: state.y,
                font: bodyItalicFont,
                size: 10,
                color: theme.caption,
            });
            state.y -= lineHeight;
        }
        state.y -= paragraphSpacing / 2;
    };

    const chapterPageFactory = (chapterIndex: number, chapterTitle: string, isFirstPage: boolean) => {
        const page = addContentPage({ role: 'chapter', chapterTitle });
        page.drawRectangle({
            x: 0,
            y: pageHeight - 32,
            width: pageWidth,
            height: 32,
            color: theme.accentSoft,
            opacity: 0.25,
        });
        const chapterLabel = `Chapter ${chapterIndex}`.toUpperCase();
        page.drawText(chapterLabel, {
            x: originX,
            y: pageHeight - 22,
            font: headingFont,
            size: 12,
            color: theme.caption,
        });

        let bodyStartY = pageHeight - config.margins.top - 24;
        if (isFirstPage) {
            const chapterHeadingSize = config.fonts.heading.size * 1.05;
            const titleLines = wrapText(chapterTitle, headingFont, chapterHeadingSize, contentWidth * 0.9);
            let titleY = pageHeight - config.margins.top - 32;
            for (const line of titleLines) {
                const textWidth = headingFont.widthOfTextAtSize(line, chapterHeadingSize);
                page.drawText(line, {
                    x: originX + (contentWidth - textWidth) / 2,
                    y: titleY,
                    font: headingFont,
                    size: chapterHeadingSize,
                    color: theme.heading,
                });
                titleY -= chapterHeadingSize * 1.2;
            }
            bodyStartY = titleY - 28;
            page.drawRectangle({
                x: originX + (contentWidth / 2) - 30,
                y: bodyStartY + 12,
                width: 60,
                height: 3,
                color: theme.accent,
            });
            bodyStartY -= 24;
        }
        return { page, bodyStartY };
    };

    for (const chapter of book.chapters) {
        if (!chapter.text?.trim() && !chapterImageMap.has(chapter.index)) continue;
        const parsedBlocks = stripLeadingChapterHeading(parseMarkdownToBlocks(chapter.text || ''), chapter.title);
        if (!parsedBlocks.length && !chapterImageMap.has(chapter.index)) continue;

        const firstPage = chapterPageFactory(chapter.index, chapter.title, true);
        const state = { page: firstPage.page, y: firstPage.bodyStartY };
        const tocTitle = `Chapter ${chapter.index}: ${chapter.title}`;
        const chapterPageNumber = Math.max(1, pageMeta.length - coverPageCount);
        tocEntries.push({ title: tocTitle, pageNumber: chapterPageNumber });

        const continuationStartY = pageHeight - config.margins.top - 32;
        const ensureSpace = (needed: number) => {
            if (state.y - needed < config.margins.bottom) {
                const nextPage = chapterPageFactory(chapter.index, chapter.title, false);
                state.page = nextPage.page;
                state.y = continuationStartY;
            }
        };

        const assignedImages = chapterImageMap.get(chapter.index) ?? [];
        const resolveAnchor = (asset: UserImageAsset): ChapterImageAnchor => {
            if (asset.placement?.type === 'chapter') {
                return asset.placement.anchor ?? 'start';
            }
            return 'start';
        };
        const startImages = assignedImages.filter(asset => resolveAnchor(asset) === 'start');
        const middleImages = assignedImages.filter(asset => resolveAnchor(asset) === 'middle');
        const endImages = assignedImages.filter(asset => resolveAnchor(asset) === 'end');

        const drawImages = async (images: UserImageAsset[]) => {
            for (const asset of images) {
                await drawChapterImage(asset, state, ensureSpace);
            }
        };

        await drawImages(startImages);

        const totalBlocks = parsedBlocks.length;
        const middleTrigger = Math.max(1, Math.floor(totalBlocks / 2));
        let middleInserted = false;

        for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex++) {
            const block = parsedBlocks[blockIndex];
            switch (block.kind) {
                case 'heading': {
                    const headingSize = block.level <= 2 ? config.fonts.heading.size : config.fonts.heading.size * 0.9;
                    ensureSpace(headingSize * 2);
                    state.page.drawText(block.text, {
                        x: originX,
                        y: state.y,
                        font: headingFont,
                        size: headingSize,
                        color: theme.heading,
                    });
                    state.y -= headingSize * 1.3;
                    state.y -= paragraphSpacing / 2;
                    break;
                }
                case 'list': {
                    for (const item of block.items) {
                        let bulletDrawn = false;
                        drawRichParagraph(
                            item,
                            textFonts,
                            state,
                            ensureSpace,
                            originX,
                            contentWidth,
                            config.fonts.body.size,
                            lineHeight,
                            paragraphSpacing,
                            theme.body,
                            {
                                indent: 18,
                                spacingBottom: paragraphSpacing / 2,
                                beforeFirstLine: (lineY) => {
                                    if (bulletDrawn) return;
                                    bulletDrawn = true;
                                    state.page.drawText('•', {
                                        x: originX,
                                        y: lineY,
                                        font: headingFont,
                                        size: config.fonts.body.size + 2,
                                        color: theme.heading,
                                    });
                                },
                            }
                        );
                    }
                    break;
                }
                case 'quote': {
                    drawRichParagraph(
                        block.spans,
                        textFonts,
                        state,
                        ensureSpace,
                        originX + 10,
                        contentWidth - 20,
                        config.fonts.body.size,
                        lineHeight,
                        paragraphSpacing,
                        theme.caption,
                        { indent: 0, spacingBottom: paragraphSpacing / 2 }
                    );
                    break;
                }
                case 'paragraph':
                default: {
                    drawRichParagraph(
                        block.kind === 'paragraph' ? block.spans : [{ text: '' }],
                        textFonts,
                        state,
                        ensureSpace,
                        originX,
                        contentWidth,
                        config.fonts.body.size,
                        lineHeight,
                        paragraphSpacing,
                        theme.body
                    );
                }
            }

            if (!middleInserted && blockIndex + 1 >= middleTrigger) {
                await drawImages(middleImages);
                middleInserted = true;
            }
        }

        if (!middleInserted) {
            await drawImages(middleImages);
        }
        await drawImages(endImages);
    }

    renderTableOfContents();

    if (config.pageNumbering) {
        const footerFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const footerSize = 9;
        let numberedPageCounter = 0;
        pageMeta.forEach((meta) => {
            if (meta.role === 'cover') return;
            numberedPageCounter += 1;
            const footerY = config.margins.bottom / 2;
            const footerLabel = meta.chapterTitle ? `${book.config.title} • ${meta.chapterTitle}` : book.config.title;
            const labelWidth = footerFont.widthOfTextAtSize(footerLabel, footerSize);
            const labelX = Math.max(originX, (pageWidth - labelWidth) / 2);
            meta.page.drawText(footerLabel, {
                x: labelX,
                y: footerY,
                font: footerFont,
                size: footerSize,
                color: theme.caption,
            });
            const numberText = numberedPageCounter.toString();
            const numberWidth = footerFont.widthOfTextAtSize(numberText, footerSize);
            meta.page.drawText(numberText, {
                x: pageWidth - config.margins.right - numberWidth,
                y: footerY,
                font: footerFont,
                size: footerSize,
                color: theme.caption,
            });
        });
    }

    return pdfDoc.save();
}
