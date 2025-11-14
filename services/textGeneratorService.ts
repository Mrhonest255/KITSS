
import { BookConfig, BookOutline, ChapterContent, ChapterOutline } from '../types/book';
import { GoogleGenAI, Type } from "@google/genai";
import { apiKey } from '../config/apiKey';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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
    const chapterContents: ChapterContent[] = [];

    for (const chapterOutline of outline.chapters) {
        const prompt = `You are a book author. Write the full content for a single chapter of a book.
            Book Details:
            - Title: "${config.title}", Topic: "${config.topic}", Genre: "${config.genre}", Audience: "${config.targetAudience}", Language: "${config.language}", Tone: "${config.tone}"
            Chapter Details:
            - Chapter Number: ${chapterOutline.index}, Title: "${chapterOutline.title}", Description: "${chapterOutline.shortDescription}"
            Instructions:
            1. Write the full chapter text, approximately ${config.wordsPerChapter} words long.
            2. Ensure the content is safe, well-structured, and uses markdown headings where appropriate.
        `;
        
        const response = await ai.models.generateContent({
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
        });
        
        const content = JSON.parse(response.text.trim()) as Pick<ChapterContent, 'text'>;
        chapterContents.push({ ...content, index: chapterOutline.index, title: chapterOutline.title });
    }
    return chapterContents;
}


// --- EXPORTED FUNCTIONS ---

export async function generateOutline(config: BookConfig): Promise<BookOutline> {
    if (!apiKey) {
        console.warn("VITE_API_KEY not set. Using mock data for outline generation.");
        return generateOutlineMock(config);
    }
    return generateOutlineWithGemini(config);
}

export async function generateChapters(config: BookConfig, outline: BookOutline): Promise<ChapterContent[]> {
    if (!apiKey) {
        console.warn("VITE_API_KEY not set. Using mock data for chapter generation.");
        return generateChaptersMock(config, outline);
    }
    return generateChaptersWithGemini(config, outline);
}