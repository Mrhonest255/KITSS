
import React, { useState } from 'react';
import { BookConfig } from './types/book';
import { useBookGeneration } from './hooks/useBookGeneration';
import BookConfigForm from './components/BookConfigForm';
import GenerationProgress from './components/GenerationProgress';
import BookPreview from './components/BookPreview';
import ChapterPreview from './components/ChapterPreview';
import PdfDownloadButton from './components/PdfDownloadButton';
import Layout from './components/Layout';
import { LogoIcon } from './components/icons/LogoIcon';
import ApiStatusIndicator from './components/ApiStatusIndicator';
import ApiInfoPanel from './components/ApiInfoPanel';
import { apiKey } from './config/apiKey';

const App: React.FC = () => {
    const { state, generateBook, reset } = useBookGeneration();
    const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null);
    const [showApiInfo, setShowApiInfo] = useState(!apiKey);

    const handleGenerate = (config: BookConfig) => {
        setSelectedChapterIndex(null);
        generateBook(config);
    };

    const handleReset = () => {
        reset();
        setSelectedChapterIndex(null);
    }

    const selectedChapter = state.book?.chapters.find(c => c.index === selectedChapterIndex);
    const isGenerating = state.step !== 'idle' && state.step !== 'done' && state.step !== 'error';

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#050615] text-slate-100">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-indigo-800/40 via-transparent to-transparent blur-3xl" aria-hidden />
            <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:px-10">
                <header className="mb-10 space-y-6 text-center">
                    <div className="flex flex-col items-center gap-6">
                        <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">
                            Text-first workflow
                        </span>
                        <div className="relative flex flex-col items-center gap-4 text-center">
                            <LogoIcon className="h-14 w-14 text-indigo-300" />
                            <div>
                                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                                    BookForge AI
                                </h1>
                                <p className="mt-3 text-base text-slate-300 sm:text-lg">
                                    Generate thoughtful outlines, fully written chapters, and press-ready PDFs without juggling multiple tools.
                                </p>
                            </div>
                            <ApiStatusIndicator apiKey={apiKey} />
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-400">
                            <span>Markdown-friendly prose</span>
                            <span className="text-slate-600">•</span>
                            <span>PDF export with typography controls</span>
                            <span className="text-slate-600">•</span>
                            <span>Zero-image, distraction-free layout</span>
                        </div>
                    </div>
                </header>

                {!apiKey && showApiInfo && (
                    <ApiInfoPanel onClose={() => setShowApiInfo(false)} />
                )}

                <Layout>
                    {{
                        left: (
                            <div className="flex flex-col gap-6">
                                <BookConfigForm onGenerate={handleGenerate} isGenerating={isGenerating} />
                                <GenerationProgress state={state} />
                                <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
                                    <p className="font-semibold">Content Safety Reminder</p>
                                    <p className="mt-1 text-amber-200/80">
                                        Keep prompts educational and inclusive. Apply the Gemini safety filters provided by Google Cloud when you wire this app to production data.
                                    </p>
                                </div>
                            </div>
                        ),
                        right: (
                            <div className="flex flex-col gap-6">
                                {state.book ? (
                                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(2,6,23,0.6)]">
                                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-5">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Manuscript ready</p>
                                                <h2 className="mt-1 text-3xl font-semibold text-white">{state.book.config.title}</h2>
                                                <p className="text-sm text-slate-300">by BookForge AI</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <PdfDownloadButton book={state.book} isReady={state.step === 'done'} />
                                                <button
                                                    onClick={handleReset}
                                                    className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40"
                                                >
                                                    New Book
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                                            <BookPreview book={state.book} onSelectChapter={setSelectedChapterIndex} selectedChapterIndex={selectedChapterIndex} />
                                            {selectedChapter ? (
                                                <ChapterPreview chapter={selectedChapter} />
                                            ) : (
                                                <div className="flex min-h-[20rem] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/20 text-sm text-slate-400">
                                                    Select a chapter to see the live draft.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
                                        <LogoIcon className="h-16 w-16 text-slate-600" />
                                        <h3 className="mt-4 text-2xl font-semibold text-white">Waiting for your brief</h3>
                                        <p className="mt-2 max-w-md text-sm text-slate-400">
                                            Start on the left by describing your topic, tone, and chapter goals. BookForge AI will handle outlines, prose, and PDFs automatically.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ),
                    }}
                </Layout>
            </div>
        </div>
    );
};

export default App;