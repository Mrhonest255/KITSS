
import React from 'react';
import { GeneratedBook } from '../types/book';

interface BookPreviewProps {
    book: GeneratedBook;
    onSelectChapter: (index: number) => void;
    selectedChapterIndex: number | null;
}

const BookPreview: React.FC<BookPreviewProps> = ({ book, onSelectChapter, selectedChapterIndex }) => {
    return (
        <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-inner shadow-black/40">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Outline</p>
                    <h3 className="text-2xl font-semibold text-white">{book.config.title}</h3>
                    <p className="text-sm text-slate-400">{book.outline.chapters.length} curated chapters</p>
                </div>
                <span className="rounded-full border border-white/10 px-4 py-1 text-xs font-semibold text-slate-200">
                    {book.config.genre}
                </span>
            </div>
            <div className="mt-5 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                {book.outline.chapters.map(chapter => {
                    const isActive = selectedChapterIndex === chapter.index;
                    return (
                        <button
                            key={chapter.index}
                            onClick={() => onSelectChapter(chapter.index)}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                isActive
                                    ? 'border-transparent bg-gradient-to-r from-indigo-500/80 to-cyan-400/80 text-white shadow-[0_10px_40px_rgba(99,102,241,.35)]'
                                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/30'
                            }`}
                        >
                            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                                <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-500'}`}></span>
                                Chapter {chapter.index}
                            </div>
                            <p className="mt-1 text-lg font-semibold">{chapter.title}</p>
                            <p className="mt-1 text-sm text-slate-300">{chapter.shortDescription}</p>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default BookPreview;