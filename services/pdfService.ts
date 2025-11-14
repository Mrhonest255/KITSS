
import { PDFDocument, rgb, StandardFonts, PageSizes, PDFFont } from 'pdf-lib';
import { GeneratedBook, PdfBuildOptions, PdfConfig, PdfFontFamily, UserImageAsset } from '../types/book';

// --- New Professional & Harmonious Color Palette ---
const colors = {
    title: rgb(0.1, 0.15, 0.25), // Very Dark Blue
    heading: rgb(0.2, 0.3, 0.4), // Dark Slate Blue
    body: rgb(0.2, 0.2, 0.2), // Soft Dark Gray (Good for reading)
    caption: rgb(0.4, 0.4, 0.4), // Medium Gray
    subtle: rgb(0.7, 0.7, 0.7), // Light Gray for page numbers
    accent: rgb(0.5, 0.55, 0.6), // Muted Blue-Gray for lines
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

// --- Default Configuration ---
const defaultPdfConfig: PdfConfig = {
    pageSize: 'A4',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    pageNumbering: true,
    fonts: {
        title: { family: 'Helvetica', size: 36, bold: true },
        heading: { family: 'Helvetica', size: 22, bold: true },
        body: { family: 'TimesRoman', size: 12 },
    }
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

// --- Main PDF Generation Function ---

export async function buildBookPdf(book: GeneratedBook, userConfig: Partial<PdfConfig> = {}, options: PdfBuildOptions = {}): Promise<Uint8Array> {
    const config: PdfConfig = {
        pageSize: userConfig.pageSize ?? defaultPdfConfig.pageSize,
        margins: { ...defaultPdfConfig.margins, ...userConfig.margins },
        pageNumbering: userConfig.pageNumbering ?? defaultPdfConfig.pageNumbering,
        fonts: {
            title: { ...defaultPdfConfig.fonts.title, ...userConfig.fonts?.title },
            heading: { ...defaultPdfConfig.fonts.heading, ...userConfig.fonts?.heading },
            body: { ...defaultPdfConfig.fonts.body, ...userConfig.fonts?.body },
        },
    };

    const pdfDoc = await PDFDocument.create();
    
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

    const getFont = (family: PdfFontFamily, bold?: boolean): PDFFont => embeddedFonts[family]![bold ? 'bold' : 'regular'];

    const titleFont = getFont(config.fonts.title.family, config.fonts.title.bold);
    const headingFont = getFont(config.fonts.heading.family, config.fonts.heading.bold);
    const bodyFont = getFont(config.fonts.body.family, config.fonts.body.bold);
    const captionFont = embeddedFonts[config.fonts.body.family]?.italic ?? bodyFont;

    const pageDimensions = PageSizes[config.pageSize];
    const [pageWidth, pageHeight] = pageDimensions;
    const contentWidth = pageWidth - config.margins.left - config.margins.right;
    const includedImages = options.images?.filter(image => image.include) ?? [];

    // --- Cover Page ---
    const coverPage = pdfDoc.addPage(pageDimensions);
    let y = pageHeight * 0.7; // Start title higher up
    const titleLines = wrapText(book.config.title, titleFont, config.fonts.title.size, contentWidth * 0.9);
    for (const line of titleLines) {
        const textWidth = titleFont.widthOfTextAtSize(line, config.fonts.title.size);
        coverPage.drawText(line, { x: (pageWidth - textWidth) / 2, y, font: titleFont, size: config.fonts.title.size, color: colors.title });
        y -= config.fonts.title.size * 1.2;
    }
    y -= 20; // Extra space after title
    coverPage.drawLine({
        start: { x: config.margins.left + contentWidth * 0.2, y },
        end: { x: pageWidth - config.margins.right - contentWidth * 0.2, y },
        thickness: 1,
        color: colors.accent,
        opacity: 0.5,
    });
    y -= 30; // Extra space
    const subtitle = `A ${book.config.genre} book on ${book.config.topic}`;
    const subtitleWidth = bodyFont.widthOfTextAtSize(subtitle, 14);
    coverPage.drawText(subtitle, { x: (pageWidth - subtitleWidth) / 2, y, font: bodyFont, size: 14, color: colors.body });
    const authorText = `Generated by BookForge AI`;
    const authorWidth = bodyFont.widthOfTextAtSize(authorText, 12);
    coverPage.drawText(authorText, { x: (pageWidth - authorWidth) / 2, y: config.margins.bottom + 80, font: bodyFont, size: 12, color: colors.caption });

    // --- Optional Image Gallery ---
    if (includedImages.length > 0) {
        let galleryPage = pdfDoc.addPage(pageDimensions);
        let y = pageHeight - config.margins.top;
        galleryPage.drawText('Contributor Gallery', {
            x: config.margins.left,
            y,
            font: headingFont,
            size: config.fonts.heading.size,
            color: colors.heading,
        });
        y -= config.fonts.heading.size * 1.5;

        for (const asset of includedImages) {
            const embeddedImage = await embedUserImage(pdfDoc, asset);
            const maxImageWidth = contentWidth;
            const maxImageHeight = pageHeight * 0.4;
            const scale = Math.min(1, maxImageWidth / embeddedImage.width, maxImageHeight / embeddedImage.height);
            const drawWidth = embeddedImage.width * scale;
            const drawHeight = embeddedImage.height * scale;

            if (y - drawHeight < config.margins.bottom + 60) {
                galleryPage = pdfDoc.addPage(pageDimensions);
                y = pageHeight - config.margins.top;
            }

            galleryPage.drawImage(embeddedImage, {
                x: config.margins.left + (contentWidth - drawWidth) / 2,
                y: y - drawHeight,
                width: drawWidth,
                height: drawHeight,
            });

            const caption = asset.name || 'Uploaded image';
            galleryPage.drawText(caption, {
                x: config.margins.left,
                y: y - drawHeight - 14,
                size: 10,
                font: captionFont,
                color: colors.caption,
            });
            y -= drawHeight + 50;
        }
    }

    // --- Chapters ---
    for (const chapter of book.chapters) {
        let currentPage = pdfDoc.addPage(pageDimensions);
        y = pageHeight - config.margins.top;
        
        const headingSize = config.fonts.heading.size;
        currentPage.drawText(chapter.title, { x: config.margins.left, y, font: headingFont, size: headingSize, color: colors.heading });
        y -= (headingSize * 1.5);

        const bodySize = config.fonts.body.size;
        const lineHeight = bodySize * 1.5;
        const paragraphs = chapter.text.split('\n').filter(p => p.trim() !== '' && !p.startsWith('## '));
        for (const paragraph of paragraphs) {
            const textLines = wrapText(paragraph, bodyFont, bodySize, contentWidth);
            for (const line of textLines) {
                if (y < config.margins.bottom + lineHeight) {
                    currentPage = pdfDoc.addPage(pageDimensions);
                    y = pageHeight - config.margins.top;
                }
                currentPage.drawText(line, { x: config.margins.left, y, font: bodyFont, size: bodySize, lineHeight, color: colors.body });
                y -= lineHeight;
            }
            y -= (bodySize * 0.4); // Paragraph spacing
        }

    }

    // --- Page Numbering ---
    if (config.pageNumbering) {
        const pages = pdfDoc.getPages();
        const pageNumberFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pageNumberFontSize = 9;
        for (let i = 1; i < pages.length; i++) { // Skip cover page (index 0)
            const page = pages[i];
            const pageNumberText = `${i}`;
            page.drawText(pageNumberText, {
                x: page.getWidth() - config.margins.right,
                y: config.margins.bottom / 2,
                font: pageNumberFont,
                size: pageNumberFontSize,
                color: colors.subtle
            });
        }
    }

    return pdfDoc.save();
}
