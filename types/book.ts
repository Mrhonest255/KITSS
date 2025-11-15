
export type Genre = "Educational" | "Fiction" | "Non-Fiction" | "Guide" | "Story" | "Other";

export interface BookConfig {
  title: string;
  topic: string;
  genre: Genre;
  targetAudience: string;
  language: string;
  tone: string;
  chaptersCount: number;
  wordsPerChapter: number;
  dedication?: string;
}

export interface ChapterOutline {
  index: number;
  title: string;
  shortDescription: string;
}

export interface BookOutline {
  title: string;
  chapters: ChapterOutline[];
}

export interface ChapterContent {
  index: number;
  title:string;
  text: string;
}

export interface GeneratedBook {
  config: BookConfig;
  outline: BookOutline;
  chapters: ChapterContent[];
}

export type GenerationStep = "idle" | "outline" | "chapters" | "images" | "done" | "error";

export interface GenerationState {
  step: GenerationStep;
  progress: number; // 0–100
  message: string;
  error?: string;
  book?: GeneratedBook;
  warnings?: string[];
}

export type ChapterImageAnchor = 'start' | 'middle' | 'end';

export type ImagePlacement =
  | { type: 'gallery' }
  | { type: 'cover'; coverSlot: 'background' | 'badge' }
  | { type: 'chapter'; chapterIndex: number; anchor?: ChapterImageAnchor };

export interface UserImageAsset {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  type: string;
  include: boolean;
  caption?: string;
  source?: 'upload' | 'url';
  createdAt: number;
  placement?: ImagePlacement;
}

export interface ServiceResult<T> {
  data: T;
  usedFallback: boolean;
  warning?: string;
}

// --- PDF Configuration Types ---

export type PageSize = "A4" | "Letter";

export interface PdfMargins {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export type PdfFontFamily = 'TimesRoman' | 'Helvetica' | 'Courier';

export interface PdfFontConfig {
    family: PdfFontFamily;
    size: number;
    bold?: boolean;
}

export type PdfStylePreset = 'aurora' | 'editorial' | 'midnight';

export interface PdfConfig {
    pageSize: PageSize;
    margins: PdfMargins;
    pageNumbering?: boolean;
    // The fonts configuration is required, but individual styles can be overridden.
    fonts: {
        title: PdfFontConfig;
        heading: PdfFontConfig;
        body: PdfFontConfig;
    };
  stylePreset?: PdfStylePreset;
}

export interface PdfBuildOptions {
  images?: UserImageAsset[];
  enableDropCaps?: boolean;
}

export interface DocxBuildOptions {
  images?: UserImageAsset[];
}
