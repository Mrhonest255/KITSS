import React from 'react';
import { ChapterContent } from '../types/book';
import ChapterDownloadButton from './ChapterDownloadButton';

interface ChapterPreviewProps {
    chapter: ChapterContent;
}

const ChapterPreview: React.FC<ChapterPreviewProps> = ({ chapter }) => {
    const paragraphs = chapter.text.split('\n\n').map(p => p.trim()).filter(Boolean);

    return (
        <section className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner shadow-black/40">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Chapter {chapter.index}</p>
                    <h3 className="text-2xl font-semibold text-white">{chapter.title}</h3>
                </div>
                <ChapterDownloadButton chapter={chapter} />
            </div>
            <div className="max-h-[26rem] overflow-y-auto rounded-2xl border border-white/5 bg-black/20 p-5 text-sm leading-relaxed text-slate-200">
                {paragraphs.map((paragraph, idx) => (
                    <p key={idx} className="mb-4 last:mb-0 text-slate-300">
                        {paragraph.replace(/^##\s+/g, '')}
                    </p>
                ))}
            </div>
        </section>
    );
};

export default ChapterPreview;