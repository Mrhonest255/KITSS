
import { BookConfig, BookOutline, ChapterContent, ChapterOutline, ServiceResult } from '../types/book';
import { GoogleGenAI, Type } from "@google/genai";
import { apiKey } from '../config/apiKey';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const RETRYABLE_CODES = new Set([429, 500, 503]);
const RETRYABLE_STATUSES = new Set(['UNAVAILABLE', 'RESOURCE_EXHAUSTED']);

interface GeminiErrorDetails {
    code?: number;
    status?: string;
    message: string;
}

const parseGeminiError = (error: unknown): GeminiErrorDetails => {
    if (typeof error === 'object' && error !== null) {
        const anyError = error as Record<string, any>;
        const rawMessage = typeof anyError.message === 'string'
            ? anyError.message
            : JSON.stringify(anyError);
        const codeFromMessage = /"code":(\d+)/.exec(rawMessage)?.[1];
        const parsed: GeminiErrorDetails = {
            code: anyError.code ?? anyError.status?.code ?? (codeFromMessage ? Number(codeFromMessage) : undefined),
            status: typeof anyError.status === 'string'
                ? anyError.status
                : typeof anyError.status?.details === 'string'
                    ? anyError.status.details
                    : anyError.status?.message,
            message: rawMessage,
        };
        return parsed;
    }
    return { message: String(error) };
};

const isTransientGeminiError = (error: unknown): boolean => {
    const parsed = parseGeminiError(error);
    const msg = parsed.message.toLowerCase();
    if (parsed.code && RETRYABLE_CODES.has(parsed.code)) return true;
    if (parsed.status && RETRYABLE_STATUSES.has(parsed.status)) return true;
    return msg.includes('overloaded') || msg.includes('unavailable') || msg.includes('try again later');
};

const formatFallbackWarning = (stage: string, error: unknown): string => {
    const parsed = parseGeminiError(error);
    const detailParts: string[] = [];
    if (parsed.status) detailParts.push(`status ${parsed.status}`);
    if (parsed.code) detailParts.push(`code ${parsed.code}`);
    const detail = detailParts.length ? ` (${detailParts.join(', ')})` : '';
    return `Gemini ${stage} service is temporarily unavailable${detail}. Using offline mock data so you can keep iterating.`;
};

const withRetry = async <T>(operation: () => Promise<T>, retries = 2, initialDelay = 1500): Promise<T> => {
    try {
        return await operation();
    } catch (error) {
        if (retries > 0 && isTransientGeminiError(error)) {
            await delay(initialDelay);
            return withRetry(operation, retries - 1, Math.round(initialDelay * 1.5));
        }
        throw error;
    }
};

// --- MOCK IMPLEMENTATIONS (Fallback) ---

async function generateOutlineMock(config: BookConfig): Promise<BookOutline> {
    await delay(1500);
    const chapters: ChapterOutline[] = [];
    for (let i = 1; i <= config.chaptersCount; i++) {
        chapters.push({
            index: i,
            title: `Chapter ${i}: The Core of ${config.topic}`,
            shortDescription: `An introductory chapter exploring the fundamentals of ${config.topic} for ${config.targetAudience}, written in a ${config.tone} tone.`,
        });
    }
    return { title: config.title, chapters };
}

async function generateChaptersMock(config: BookConfig, outline: BookOutline): Promise<ChapterContent[]> {
    const chapterContents: ChapterContent[] = [];
    for (const chapterOutline of outline.chapters) {
        await delay(1000 + Math.random() * 500);
        let text = `## ${chapterOutline.title}\n\nThis chapter delves into the subject of "${chapterOutline.title}" with a specific focus on ${config.topic}. It is written in a ${config.tone} style, tailored for ${config.targetAudience} and presented in ${config.language}.\n\n`;
        for (let i = 0; i < Math.ceil(config.wordsPerChapter / 100); i++) {
            text += `This is a sample paragraph for the chapter about ${chapterOutline.title}. We are elaborating on the key concepts and ideas. The tone is meant to be ${config.tone}. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n`;
        }
        chapterContents.push({ index: chapterOutline.index, title: chapterOutline.title, text });
    }
    return chapterContents;
}


// --- PRIMARY API IMPLEMENTATIONS ---

async function generateOutlineWithGemini(config: BookConfig): Promise<BookOutline> {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a book author assistant. Generate a book outline for a book with these properties:
        - Title: "${config.title}"
        - Topic: "${config.topic}"
        - Genre: "${config.genre}"
        - Target Audience: "${config.targetAudience}"
        - Language: "${config.language}"
        - Tone: "${config.tone}"
        - Number of Chapters: ${config.chaptersCount}
        Generate a compelling outline with a title and a short description for each of the ${config.chaptersCount} chapters.
        Ensure the content is safe and suitable for the target audience.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    chapters: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { index: { type: Type.NUMBER }, title: { type: Type.STRING }, shortDescription: { type: Type.STRING } },
                            required: ["index", "title", "shortDescription"]
                        }
                    }
                },
                required: ["title", "chapters"]
            }
        }
    });
    return JSON.parse(response.text.trim()) as BookOutline;
}


async function generateChaptersWithGemini(config: BookConfig, outline: BookOutline): Promise<ChapterContent[]> {
    const ai = new GoogleGenAI({ apiKey });
    const results: ChapterContent[] = [];
    const queue = [...outline.chapters];
    const concurrency = Math.min(3, queue.length);

    const worker = async () => {
        while (queue.length > 0) {
            const chapterOutline = queue.shift();
            if (!chapterOutline) break;
            const prompt = `You are a book author. Write the full content for a single chapter of a book.
                Book Details:
                - Title: "${config.title}", Topic: "${config.topic}", Genre: "${config.genre}", Audience: "${config.targetAudience}", Language: "${config.language}", Tone: "${config.tone}"
                Chapter Details:
                - Chapter Number: ${chapterOutline.index}, Title: "${chapterOutline.title}", Description: "${chapterOutline.shortDescription}"
                Instructions:
                1. Write the full chapter text, approximately ${config.wordsPerChapter} words long.
                2. Ensure the content is safe, well-structured, and uses markdown headings where appropriate.
            `;

            const response = await withRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                         type: Type.OBJECT,
                         properties: { text: { type: Type.STRING } },
                         required: ["text"]
                    }
                }
            }));

            const content = JSON.parse(response.text.trim()) as Pick<ChapterContent, 'text'>;
            results.push({ ...content, index: chapterOutline.index, title: chapterOutline.title });
        }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return results.sort((a, b) => a.index - b.index);
}


// --- EXPORTED FUNCTIONS ---

export async function generateOutline(config: BookConfig): Promise<ServiceResult<BookOutline>> {
    if (!apiKey) {
        console.warn("VITE_API_KEY not set. Using mock data for outline generation.");
        const data = await generateOutlineMock(config);
        return {
            data,
            usedFallback: true,
            warning: 'Gemini API key missing. Using offline mock outline instead.'
        };
    }

    try {
        const data = await withRetry(() => generateOutlineWithGemini(config));
        return { data, usedFallback: false };
    } catch (error) {
        console.warn('Gemini outline generation failed. Falling back to mock outline.', error);
        const data = await generateOutlineMock(config);
        return {
            data,
            usedFallback: true,
            warning: formatFallbackWarning('outline generation', error)
        };
    }
}

export async function generateChapters(config: BookConfig, outline: BookOutline): Promise<ServiceResult<ChapterContent[]>> {
    if (!apiKey) {
        console.warn("VITE_API_KEY not set. Using mock data for chapter generation.");
        const data = await generateChaptersMock(config, outline);
        return {
            data,
            usedFallback: true,
            warning: 'Gemini API key missing. Using offline mock chapters instead.'
        };
    }

    try {
        const data = await generateChaptersWithGemini(config, outline);
        return { data, usedFallback: false };
    } catch (error) {
        console.warn('Gemini chapter drafting failed. Falling back to mock chapters.', error);
        const data = await generateChaptersMock(config, outline);
        return {
            data,
            usedFallback: true,
            warning: formatFallbackWarning('chapter drafting', error)
        };
    }
}