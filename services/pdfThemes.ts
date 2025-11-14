import { PdfStylePreset } from '../types/book';

export interface ThemeDefinition {
    id: PdfStylePreset;
    name: string;
    colors: {
        pageBackground: string;
        coverBackground: string;
        ribbonColor: string;
        accent: string;
        accentSoft: string;
        title: string;
        heading: string;
        body: string;
        caption: string;
        subtle: string;
    };
    lineHeightMultiplier: number;
    paragraphSpacingMultiplier: number;
}

export const THEME_DEFINITIONS: Record<PdfStylePreset, ThemeDefinition> = {
    aurora: {
        id: 'aurora',
        name: 'Aurora Glow',
        colors: {
            pageBackground: '#f9fbff',
            coverBackground: '#edf6ff',
            ribbonColor: '#5eead4',
            accent: '#2563eb',
            accentSoft: '#a5f3fc',
            title: '#0f172a',
            heading: '#1e293b',
            body: '#111827',
            caption: '#475569',
            subtle: '#94a3b8',
        },
        lineHeightMultiplier: 1.35,
        paragraphSpacingMultiplier: 0.55,
    },
    editorial: {
        id: 'editorial',
        name: 'Editorial Amber',
        colors: {
            pageBackground: '#fffdf8',
            coverBackground: '#fff7ed',
            ribbonColor: '#f97316',
            accent: '#d97706',
            accentSoft: '#fed7aa',
            title: '#78350f',
            heading: '#92400e',
            body: '#3f2a1d',
            caption: '#9a6a45',
            subtle: '#fbbf24',
        },
        lineHeightMultiplier: 1.32,
        paragraphSpacingMultiplier: 0.5,
    },
    midnight: {
        id: 'midnight',
        name: 'Midnight Neon',
        colors: {
            pageBackground: '#0f172a',
            coverBackground: '#0b1120',
            ribbonColor: '#38bdf8',
            accent: '#c084fc',
            accentSoft: '#1e293b',
            title: '#f8fafc',
            heading: '#f1f5f9',
            body: '#e2e8f0',
            caption: '#94a3b8',
            subtle: '#334155',
        },
        lineHeightMultiplier: 1.4,
        paragraphSpacingMultiplier: 0.6,
    },
};

export const getThemeDefinition = (preset?: PdfStylePreset): ThemeDefinition => {
    if (!preset) {
        return THEME_DEFINITIONS.aurora;
    }
    return THEME_DEFINITIONS[preset] ?? THEME_DEFINITIONS.aurora;
};
