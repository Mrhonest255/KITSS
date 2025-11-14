
import React, { useState } from 'react';
import { BookConfig, ChapterContent, UserImageAsset, ImagePlacement } from './types/book';
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
import ImageUploadPanel from './components/ImageUploadPanel';
import ExperienceHighlights from './components/ExperienceHighlights';
import QuotaBanner from './components/QuotaBanner';
import CreativeInterlude from './components/CreativeInterlude';
import ChapterEditModal from './components/ChapterEditModal';
import { apiKey } from './config/apiKey';
import { useGenerationQuota } from './hooks/useGenerationQuota';

const App: React.FC = () => {
    const { state, generateBook, reset, updateChapterText } = useBookGeneration();
    const quota = useGenerationQuota();
    const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | null>(null);
    const [showApiInfo, setShowApiInfo] = useState(!apiKey);
    const [userImages, setUserImages] = useState<UserImageAsset[]>([]);
    const [imageStatus, setImageStatus] = useState<string | null>(null);
    const [quotaNotice, setQuotaNotice] = useState<string | null>(null);
    const [chapterBeingEdited, setChapterBeingEdited] = useState<ChapterContent | null>(null);

    const MAX_IMAGE_UPLOADS = 12;
    const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

    const createImageId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const fileToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
            reader.readAsDataURL(file);
        });
    };

    const handleGenerate = async (config: BookConfig) => {
        if (!quota.canGenerate) {
            setQuotaNotice('Daily limit reached. Share BookForge on WhatsApp to unlock another slot.');
            return;
        }
        setQuotaNotice(null);
        setSelectedChapterIndex(null);
        quota.consume();
        const success = await generateBook(config);
        if (!success) {
            quota.refund();
        }
    };

    const handleReset = () => {
        reset();
        setSelectedChapterIndex(null);
        setImageStatus(null);
    }

    const handleImagesSelected = async (files: FileList) => {
        const validFiles = Array.from(files).filter(file => allowedMimeTypes.has(file.type));
        if (validFiles.length === 0) {
            setImageStatus('Unsupported file type. Please upload PNG, JPG, or WEBP images.');
            return;
        }

        const remainingSlots = MAX_IMAGE_UPLOADS - userImages.length;
        if (remainingSlots <= 0) {
            setImageStatus(`Gallery is full. Remove an image to add more (max ${MAX_IMAGE_UPLOADS}).`);
            return;
        }

        const filesToProcess = validFiles.slice(0, remainingSlots);
        try {
            const newAssets: UserImageAsset[] = [];
            for (const file of filesToProcess) {
                const dataUrl = await fileToDataUrl(file);
                newAssets.push({
                    id: createImageId(),
                    name: file.name,
                    dataUrl,
                    size: file.size,
                    type: file.type,
                    include: true,
                    source: 'upload',
                    createdAt: Date.now(),
                    placement: { type: 'gallery' },
                });
            }
            setUserImages(prev => [...prev, ...newAssets]);
            const skipped = validFiles.length - filesToProcess.length;
            const summary = `${newAssets.length} image${newAssets.length === 1 ? '' : 's'} ready for the PDF gallery.` + (skipped > 0 ? ` Skipped ${skipped} due to the ${MAX_IMAGE_UPLOADS}-image limit.` : '');
            setImageStatus(summary);
        } catch (error) {
            console.error('Failed to process uploaded images', error);
            setImageStatus('Could not process one or more images. Please try again.');
        }
    };

    const handleToggleImage = (id: string) => {
        setUserImages(prev => prev.map(image => image.id === id ? { ...image, include: !image.include } : image));
    };

    const handleRemoveImage = (id: string) => {
        setUserImages(prev => prev.filter(image => image.id !== id));
    };

    const handleClearImages = () => {
        setUserImages([]);
        setImageStatus('Cleared all uploads.');
    };

    const handleCaptionChange = (id: string, caption: string) => {
        setUserImages(prev => prev.map(image => image.id === id ? { ...image, caption } : image));
    };

    const handleImagePlacementChange = (id: string, placement: ImagePlacement) => {
        setUserImages(prev => prev.map(image => image.id === id ? { ...image, placement } : image));
    };

    const handleReorderImage = (id: string, direction: 'up' | 'down') => {
        setUserImages(prev => {
            const index = prev.findIndex(image => image.id === id);
            if (index === -1) return prev;
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
    };

    const blobToDataUrl = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error || new Error('Failed to read blob.'));
            reader.readAsDataURL(blob);
        });
    };

    const handleAddImageByUrl = async (url: string) => {
        try {
            setImageStatus('Fetching remote image...');
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Image request failed.');
            }
            const blob = await response.blob();
            const mime = blob.type || 'image/png';
            if (!allowedMimeTypes.has(mime)) {
                throw new Error('Unsupported image type.');
            }
            const dataUrl = await blobToDataUrl(blob);
            const name = url.split('/').pop() || 'shared-image';
            const asset: UserImageAsset = {
                id: createImageId(),
                name,
                dataUrl,
                size: blob.size,
                type: mime,
                include: true,
                source: 'url',
                createdAt: Date.now(),
                placement: { type: 'gallery' },
            };
            setUserImages(prev => {
                if (prev.length >= MAX_IMAGE_UPLOADS) {
                    setImageStatus(`Gallery is full. Remove an image to add more (max ${MAX_IMAGE_UPLOADS}).`);
                    return prev;
                }
                return [...prev, asset];
            });
            setImageStatus('Link imported successfully.');
        } catch (error) {
            console.error('Failed to grab image via URL', error);
            setImageStatus('Could not fetch that link. Make sure it points to a direct PNG/JPG/WEBP file.');
        }
    };

    const handleShareForBonus = () => {
        const shareMessage = encodeURIComponent('I am creating polished AI books with BookForge. Try it here: https://kitss-hvfpj0a02-mrhonest255s-projects.vercel.app/');
        if (typeof window !== 'undefined') {
            window.open(`https://wa.me/?text=${shareMessage}`, '_blank');
        }
        quota.addShareBonus();
        setQuotaNotice('Thanks for sharing! You unlocked one extra generation.');
    };

    const selectedChapter = state.book?.chapters.find(c => c.index === selectedChapterIndex);
    const isGenerating = state.step !== 'idle' && state.step !== 'done' && state.step !== 'error';
    const activeImages = userImages.filter(image => image.include);

    const handleEditChapter = (chapter: ChapterContent) => {
        setChapterBeingEdited(chapter);
    };

    const handleSaveEditedChapter = (text: string) => {
        if (!chapterBeingEdited) return;
        updateChapterText(chapterBeingEdited.index, text);
        setChapterBeingEdited(null);
    };

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
                            <span>Editorial PDF themes & drop caps</span>
                            <span className="text-slate-600">•</span>
                            <span>Optional gallery with your own imagery</span>
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
                                <QuotaBanner
                                    remaining={quota.remaining}
                                    baseLimit={quota.baseLimit}
                                    onShare={handleShareForBonus}
                                    notice={quotaNotice}
                                />
                                <BookConfigForm onGenerate={handleGenerate} isGenerating={isGenerating} quotaRemaining={quota.remaining} canGenerate={quota.canGenerate} />
                                <GenerationProgress state={state} />
                                {isGenerating && (
                                    <CreativeInterlude stepLabel={state.step === 'outline' ? 'we outline' : 'chapters render'} />
                                )}
                                <ImageUploadPanel
                                    images={userImages}
                                    statusMessage={imageStatus}
                                    onFilesSelected={handleImagesSelected}
                                    onToggleInclude={handleToggleImage}
                                    onRemove={handleRemoveImage}
                                    onClearAll={handleClearImages}
                                    onCaptionChange={handleCaptionChange}
                                    onAddByUrl={handleAddImageByUrl}
                                />
                                <ExperienceHighlights />
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
                                                <div className="flex flex-col items-center gap-2">
                                                    <PdfDownloadButton
                                                        book={state.book}
                                                        images={userImages}
                                                        isReady={state.step === 'done'}
                                                        chapters={state.book.chapters}
                                                        onUpdateImagePlacement={handleImagePlacementChange}
                                                        onReorderImage={handleReorderImage}
                                                        onToggleInclude={handleToggleImage}
                                                        onRemoveImage={handleRemoveImage}
                                                    />
                                                    <p className="text-center text-xs text-slate-400">
                                                        {activeImages.length > 0
                                                            ? `${activeImages.length} image${activeImages.length === 1 ? '' : 's'} queued for the PDF gallery.`
                                                            : 'No images selected for this PDF.'}
                                                    </p>
                                                </div>
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
                                                <ChapterPreview chapter={selectedChapter} onEdit={handleEditChapter} />
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
            {chapterBeingEdited && (
                <ChapterEditModal
                    chapter={chapterBeingEdited}
                    onCancel={() => setChapterBeingEdited(null)}
                    onSave={handleSaveEditedChapter}
                />
            )}
        </div>
    );
};

export default App;