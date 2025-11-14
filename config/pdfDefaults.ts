import { PdfConfig } from '../types/book';

export const DEFAULT_PDF_CONFIG: PdfConfig = {
    pageSize: 'A4',
    margins: { top: 64, bottom: 64, left: 60, right: 60 },
    pageNumbering: true,
    fonts: {
        title: { family: 'Helvetica', size: 40, bold: true },
        heading: { family: 'Helvetica', size: 24, bold: true },
        body: { family: 'TimesRoman', size: 12, bold: false },
    },
    stylePreset: 'aurora',
};
