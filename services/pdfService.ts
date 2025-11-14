
import { PDFDocument, rgb, StandardFonts, PageSizes, PDFFont, PDFPage } from 'pdf-lib';
import { GeneratedBook, PdfBuildOptions, PdfConfig, PdfFontFamily, PdfStylePreset, UserImageAsset, ChapterImageAnchor } from '../types/book';
import { getThemeDefinition } from './pdfThemes';
import { DEFAULT_PDF_CONFIG } from '../config/pdfDefaults';

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


// --- Helper Functions ---

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const lines: string[] = [];
    // Ensure text is treated as a string to avoid errors with undefined/null inputs
    const paragraphs = String(text).split('\n');
    
    for (const paragraph of paragraphs) {
        if (paragraph.trim() === '') {
            lines.push(''); // Preserve empty lines for paragraph breaks
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
    Courier: { regular: StandardFonts.Courier, bold: StandardFonts.CourierBold, italic: StandardFonts.CourierOblique }
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

// --- Main PDF Generation Function ---

interface TextBlock {
    kind: 'heading' | 'subheading' | 'paragraph' | 'bullet' | 'quote';
    content: string;
}

const parseChapterText = (text: string): TextBlock[] => {
    const blocks: TextBlock[] = [];
    const lines = String(text ?? '').split('\n');
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
        if (paragraphBuffer.length === 0) return;
        const paragraphText = paragraphBuffer.join(' ').trim();
        if (paragraphText) {
            blocks.push({ kind: 'paragraph', content: paragraphText });
        }
        paragraphBuffer = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
            flushParagraph();
            continue;
        }

        if (/^#{2,}/.test(line)) {
            flushParagraph();
            const type = line.startsWith('###') ? 'subheading' : 'heading';
            blocks.push({ kind: type, content: line.replace(/^#+\s*/, '') });
            continue;
        }

        if (/^[*-]\s+/.test(line)) {
            flushParagraph();
            blocks.push({ kind: 'bullet', content: line.replace(/^[*-]\s+/, '') });
            continue;
        }

        if (line.startsWith('>')) {
            flushParagraph();
            blocks.push({ kind: 'quote', content: line.replace(/^>\s*/, '') });
            continue;
        }

        paragraphBuffer.push(line);
    }

    flushParagraph();
    return blocks;
};

const drawPageBackground = (page: PDFPage, width: number, height: number, color: ReturnType<typeof rgb>) => {
    page.drawRectangle({ x: 0, y: 0, width, height, color });
};

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
    const embeddedFonts: { [key in PdfFontFamily]?: { regular: PDFFont, bold: PDFFont, italic: PDFFont } } = {};
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
    const italicBodyFont = getFontVariant(config.fonts.body.family, 'italic');

    const pageDimensions = PageSizes[config.pageSize];
    const [pageWidth, pageHeight] = pageDimensions;
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
    const enableDropCaps = options.enableDropCaps ?? true;

    // --- Cover Page ---
    const coverPage = pdfDoc.addPage(pageDimensions);
    drawPageBackground(coverPage, pageWidth, pageHeight, theme.coverBackground);

    coverPage.drawRectangle({
        x: 0,
        y: pageHeight * 0.62,
        width: pageWidth,
        height: pageHeight * 0.38,
        color: theme.accentSoft,
        opacity: 0.35,
    });

    coverPage.drawRectangle({
        x: config.margins.left,
        y: pageHeight * 0.65,
        width: pageWidth - config.margins.left - config.margins.right,
        height: 6,
        color: theme.ribbonColor,
        opacity: 0.8,
    });

    const coverBackgroundAsset = coverImages.find(image => image.placement?.type === 'cover' && image.placement.coverSlot === 'background');
    if (coverBackgroundAsset) {
        const embedded = await getEmbeddedImageForAsset(coverBackgroundAsset);
        const maxWidth = pageWidth - config.margins.left * 2;
        const maxHeight = pageHeight * 0.45;
        const scale = Math.min(1, maxWidth / embedded.width, maxHeight / embedded.height);
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;
        coverPage.drawImage(embedded, {
            x: (pageWidth - drawWidth) / 2,
            y: pageHeight * 0.68 + 40,
            width: drawWidth,
            height: drawHeight,
            opacity: 0.35,
        });
    }

    let y = pageHeight * 0.68;
    const titleLines = wrapText(book.config.title, titleFont, config.fonts.title.size, contentWidth * 0.9);
    for (const line of titleLines) {
        const textWidth = titleFont.widthOfTextAtSize(line, config.fonts.title.size);
        coverPage.drawText(line, {
            x: (pageWidth - textWidth) / 2,
            y,
            font: titleFont,
            size: config.fonts.title.size,
            color: theme.title,
        });
        y -= config.fonts.title.size * 1.2;
    }

    const subtitle = `${book.config.genre} • ${book.config.topic}`;
    const subtitleWidth = headingFont.widthOfTextAtSize(subtitle, 14);
    coverPage.drawText(subtitle, {
        x: (pageWidth - subtitleWidth) / 2,
        y: y - 10,
        font: headingFont,
        size: 14,
        color: theme.caption,
    });

    const footerBaseY = config.margins.bottom + 40;
    if (book.config.dedication) {
        coverPage.drawText(`Created for ${book.config.dedication}`, {
            x: config.margins.left,
            y: footerBaseY + 18,
            font: italicBodyFont,
            size: 12,
            color: theme.caption,
        });
    }

    coverPage.drawText('Crafted with BookForge AI', {
        x: config.margins.left,
        y: footerBaseY,
        font: bodyFont,
        size: 12,
        color: theme.caption,
    });

    const coverBadgeAsset = coverImages.find(image => image.placement?.type === 'cover' && image.placement.coverSlot === 'badge');
    if (coverBadgeAsset) {
        const embedded = await getEmbeddedImageForAsset(coverBadgeAsset);
        const badgeSize = Math.min(140, pageWidth * 0.2);
        const scale = Math.min(1, badgeSize / embedded.width, badgeSize / embedded.height);
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;
        coverPage.drawImage(embedded, {
            x: pageWidth - config.margins.right - drawWidth,
            y: footerBaseY + 10,
            width: drawWidth,
            height: drawHeight,
        });
    }

    // --- Optional Image Gallery ---
    if (galleryImages.length > 0) {
        let galleryPage = pdfDoc.addPage(pageDimensions);
        drawPageBackground(galleryPage, pageWidth, pageHeight, theme.pageBackground);
        let galleryY = pageHeight - config.margins.top;
        galleryPage.drawText('Contributor Gallery', {
            x: config.margins.left,
            y: galleryY,
            font: headingFont,
            size: config.fonts.heading.size,
            color: theme.heading,
        });
        galleryY -= config.fonts.heading.size * 1.4;

        const columns = 2;
        const gutter = 16;
        const cardWidth = (contentWidth - gutter) / columns;
        let rowMaxHeight = 0;
        for (const [index, asset] of galleryImages.entries()) {
            const embeddedImage = await getEmbeddedImageForAsset(asset);
            const maxImageHeight = pageHeight * 0.35;
            const scale = Math.min(1, cardWidth / embeddedImage.width, maxImageHeight / embeddedImage.height);
            const drawWidth = embeddedImage.width * scale;
            const drawHeight = embeddedImage.height * scale;

            const columnIndex = index % columns;
            if (columnIndex === 0 && galleryY - drawHeight - 40 < config.margins.bottom) {
                galleryPage = pdfDoc.addPage(pageDimensions);
                drawPageBackground(galleryPage, pageWidth, pageHeight, theme.pageBackground);
                galleryY = pageHeight - config.margins.top;
            }

            const originX = config.margins.left + columnIndex * (cardWidth + gutter);
            const originY = galleryY;

            galleryPage.drawRectangle({
                x: originX,
                y: originY - drawHeight - 8,
                width: cardWidth,
                height: drawHeight + 36,
                color: theme.accentSoft,
                opacity: 0.2,
            });

            galleryPage.drawImage(embeddedImage, {
                x: originX + (cardWidth - drawWidth) / 2,
                y: originY - drawHeight - 4,
                width: drawWidth,
                height: drawHeight,
            });

            const caption = asset.caption?.trim() || asset.name || 'Uploaded image';
            galleryPage.drawText(caption, {
                x: originX + 8,
                y: originY - drawHeight - 24,
                font: italicBodyFont,
                size: 10,
                color: theme.caption,
            });

            rowMaxHeight = Math.max(rowMaxHeight, drawHeight);
            if (columnIndex === columns - 1 || index === galleryImages.length - 1) {
                galleryY -= rowMaxHeight + 70;
                rowMaxHeight = 0;
            }
        }
    }

    // --- Chapter Rendering Helpers ---
    const createChapterPage = (chapterIndex: number, chapterTitle: string, isFirstPage: boolean): PDFPage => {
        const page = pdfDoc.addPage(pageDimensions);
        drawPageBackground(page, pageWidth, pageHeight, theme.pageBackground);

        page.drawRectangle({
            x: 0,
            y: pageHeight - 32,
            width: pageWidth,
            height: 32,
            color: theme.accentSoft,
            opacity: 0.3,
        });

        page.drawText(`Chapter ${chapterIndex}`, {
            x: config.margins.left,
            y: pageHeight - 22,
            font: headingFont,
            size: 10,
            color: theme.caption,
        });

        if (isFirstPage) {
            const headingSize = config.fonts.heading.size;
            page.drawText(chapterTitle, {
                x: config.margins.left,
                y: pageHeight - config.margins.top,
                font: headingFont,
                size: headingSize,
                color: theme.heading,
            });
            page.drawRectangle({
                x: config.margins.left,
                y: pageHeight - config.margins.top - headingSize - 8,
                width: 48,
                height: 4,
                color: theme.accent,
            });
        }

        return page;
    };

    const drawParagraph = (page: PDFPage, text: string, dropcap: boolean, state: { y: number }) => {
        const dropCapSize = config.fonts.body.size * 3.8;
        const dropCapIndent = dropCapSize * 0.35 + 8;
        if (dropcap && text.length > 2) {
            const firstChar = text[0];
            const remainder = text.slice(1).trimStart();
            page.drawText(firstChar.toUpperCase(), {
                x: config.margins.left,
                y: state.y + dropCapSize - config.fonts.body.size,
                font: headingFont,
                size: dropCapSize,
                color: theme.accent,
            });
            const lines = wrapText(remainder, bodyFont, config.fonts.body.size, contentWidth - dropCapIndent);
            let localY = state.y;
            for (const line of lines) {
                if (localY < config.margins.bottom + lineHeight) {
                    break;
                }
                page.drawText(line, {
                    x: config.margins.left + dropCapIndent,
                    y: localY,
                    font: bodyFont,
                    size: config.fonts.body.size,
                    color: theme.body,
                });
                localY -= lineHeight;
            }
            state.y = localY - paragraphSpacing;
            return;
        }

        const lines = wrapText(text, bodyFont, config.fonts.body.size, contentWidth);
        for (const line of lines) {
            if (state.y < config.margins.bottom + lineHeight) {
                break;
            }
            page.drawText(line, {
                x: config.margins.left,
                y: state.y,
                font: bodyFont,
                size: config.fonts.body.size,
                color: theme.body,
            });
            state.y -= lineHeight;
        }
        state.y -= paragraphSpacing;
    };

    const ensureSpace = (state: { page: PDFPage; y: number }, chapterIndex: number, chapterTitle: string, needed: number) => {
        if (state.y - needed < config.margins.bottom) {
            state.page = createChapterPage(chapterIndex, chapterTitle, false);
            state.y = pageHeight - config.margins.top - 20;
        }
    };

    const drawChapterImage = async (
        asset: UserImageAsset,
        state: { page: PDFPage; y: number },
        chapterIndex: number,
        chapterTitle: string
    ) => {
        const embedded = await getEmbeddedImageForAsset(asset);
        const maxHeight = pageHeight * 0.35;
        const scale = Math.min(1, contentWidth / embedded.width, maxHeight / embedded.height);
        const drawWidth = embedded.width * scale;
        const drawHeight = embedded.height * scale;
        ensureSpace(state, chapterIndex, chapterTitle, drawHeight + 40);
        state.page.drawImage(embedded, {
            x: config.margins.left + (contentWidth - drawWidth) / 2,
            y: state.y - drawHeight,
            width: drawWidth,
            height: drawHeight,
        });
        if (asset.caption?.trim()) {
            state.page.drawText(asset.caption.trim(), {
                x: config.margins.left,
                y: state.y - drawHeight - 16,
                font: italicBodyFont,
                size: 10,
                color: theme.caption,
            });
        }
        state.y -= drawHeight + 32;
    };

    for (const chapter of book.chapters) {
        if (!chapter.text || !chapter.text.trim()) continue;
        const blocks = parseChapterText(chapter.text);
        if (!blocks.length && !chapterImageMap.has(chapter.index)) continue;

        const state = {
            page: createChapterPage(chapter.index, chapter.title, true),
            y: pageHeight - config.margins.top - config.fonts.heading.size * 2,
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
                await drawChapterImage(asset, state, chapter.index, chapter.title);
            }
        };

        await drawImages(startImages);

        let dropcapAvailable = enableDropCaps;
        const totalBlocks = blocks.length;
        const middleTriggerIndex = Math.max(1, Math.floor(totalBlocks / 2));
        let middleRendered = false;

        for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex++) {
            const block = blocks[blockIndex];
            if (state.y < config.margins.bottom + lineHeight * 2) {
                state.page = createChapterPage(chapter.index, chapter.title, false);
                state.y = pageHeight - config.margins.top;
            }

            switch (block.kind) {
                case 'heading':
                case 'subheading': {
                    const sizeMultiplier = block.kind === 'heading' ? 1.15 : 1.05;
                    const headingSize = config.fonts.heading.size * sizeMultiplier;
                    ensureSpace(state, chapter.index, chapter.title, headingSize * 1.5);
                    state.page.drawText(block.content, {
                        x: config.margins.left,
                        y: state.y,
                        font: headingFont,
                        size: headingSize,
                        color: theme.heading,
                    });
                    state.y -= headingSize * 1.2;
                    dropcapAvailable = false;
                    break;
                }
                case 'bullet': {
                    ensureSpace(state, chapter.index, chapter.title, lineHeight * 1.4);
                    state.page.drawText('•', {
                        x: config.margins.left,
                        y: state.y,
                        font: headingFont,
                        size: config.fonts.body.size + 2,
                        color: theme.accent,
                    });
                    const lines = wrapText(block.content, bodyFont, config.fonts.body.size, contentWidth - 18);
                    for (const line of lines) {
                        state.page.drawText(line, {
                            x: config.margins.left + 18,
                            y: state.y,
                            font: bodyFont,
                            size: config.fonts.body.size,
                            color: theme.body,
                        });
                        state.y -= lineHeight;
                        ensureSpace(state, chapter.index, chapter.title, lineHeight);
                    }
                    state.y -= paragraphSpacing / 2;
                    dropcapAvailable = false;
                    break;
                }
                case 'quote': {
                    const quoteHeight = lineHeight * 2;
                    ensureSpace(state, chapter.index, chapter.title, quoteHeight + 10);
                    state.page.drawRectangle({
                        x: config.margins.left,
                        y: state.y - quoteHeight,
                        width: contentWidth,
                        height: quoteHeight + 12,
                        color: theme.accentSoft,
                        opacity: 0.3,
                    });
                    const quoteLines = wrapText(block.content, italicBodyFont, config.fonts.body.size, contentWidth - 20);
                    let localY = state.y - 8;
                    for (const line of quoteLines) {
                        state.page.drawText(line, {
                            x: config.margins.left + 12,
                            y: localY,
                            font: italicBodyFont,
                            size: config.fonts.body.size,
                            color: theme.caption,
                        });
                        localY -= lineHeight;
                    }
                    state.y = localY - paragraphSpacing;
                    dropcapAvailable = false;
                    break;
                }
                case 'paragraph':
                default: {
                    ensureSpace(state, chapter.index, chapter.title, lineHeight * 3);
                    drawParagraph(state.page, block.content, dropcapAvailable, state);
                    dropcapAvailable = false;
                }
            }

            if (!middleRendered && blockIndex + 1 >= middleTriggerIndex) {
                await drawImages(middleImages);
                middleRendered = true;
            }
        }

        if (!middleRendered) {
            await drawImages(middleImages);
        }
        await drawImages(endImages);
    }

    // --- Page Numbering ---
    if (config.pageNumbering) {
        const pages = pdfDoc.getPages();
        const pageNumberFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pageNumberFontSize = 9;
        for (let i = 1; i < pages.length; i++) {
            const page = pages[i];
            const pageNumberText = `${i}`;
            page.drawText(pageNumberText, {
                x: page.getWidth() - config.margins.right,
                y: config.margins.bottom / 2,
                font: pageNumberFont,
                size: pageNumberFontSize,
                color: theme.subtle,
            });
        }
    }

    return pdfDoc.save();
}
