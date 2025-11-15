import React, { useEffect, useMemo, useState } from 'react';
import { ChapterContent, ChapterImageAnchor, GeneratedBook, ImagePlacement, PdfConfig, PdfFontFamily, UserImageAsset } from '../types/book';
import { DEFAULT_PDF_CONFIG } from '../config/pdfDefaults';
import { THEME_DEFINITIONS } from '../services/pdfThemes';
import { XIcon } from './icons/XIcon';
import { BookIcon } from './icons/BookIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface PdfDesignerModalProps {
    book: GeneratedBook;
    images: UserImageAsset[];
    chapters: ChapterContent[];
    onClose: () => void;
    onConfirm: (payload: { config: Partial<PdfConfig>; enableDropCaps: boolean }) => Promise<void> | void;
    onUpdateImagePlacement: (id: string, placement: ImagePlacement) => void;
    onReorderImage: (id: string, direction: 'up' | 'down') => void;
    onToggleInclude: (id: string) => void;
    onRemoveImage: (id: string) => void;
    initialConfig: Partial<PdfConfig>;
    initialEnableDropCaps: boolean;
    isBuilding: boolean;
    isReady: boolean;
}

const fontFamilies: PdfFontFamily[] = ['Helvetica', 'TimesRoman', 'Courier'];
const marginPresets = {
    small: { top: 36, bottom: 36, left: 36, right: 36 },
    medium: { top: 64, bottom: 64, left: 60, right: 60 },
    large: { top: 92, bottom: 92, left: 80, right: 80 },
};

const anchorOptions: Array<{ value: ChapterImageAnchor; label: string }> = [
    { value: 'start', label: 'Lead with image' },
    { value: 'middle', label: 'Mid-chapter' },
    { value: 'end', label: 'Wrap up' },
];

const tabs = [
    { id: 'cover', label: 'Cover preview' },
    { id: 'chapter', label: 'Chapter preview' },
    { id: 'gallery', label: 'Gallery preview' },
] as const;

type PreviewTab = (typeof tabs)[number]['id'];

const mergeWithDefaults = (incoming: Partial<PdfConfig>): Partial<PdfConfig> => ({
    ...DEFAULT_PDF_CONFIG,
    ...incoming,
    fonts: {
        title: { ...DEFAULT_PDF_CONFIG.fonts.title, ...incoming.fonts?.title },
        heading: { ...DEFAULT_PDF_CONFIG.fonts.heading, ...incoming.fonts?.heading },
        body: { ...DEFAULT_PDF_CONFIG.fonts.body, ...incoming.fonts?.body },
    },
});

const PdfDesignerModal: React.FC<PdfDesignerModalProps> = ({
    book,
    images,
    chapters,
    onClose,
    onConfirm,
    onUpdateImagePlacement,
    onReorderImage,
    onToggleInclude,
    onRemoveImage,
    initialConfig,
    initialEnableDropCaps,
    isBuilding,
    isReady,
}) => {
    const [config, setConfig] = useState<Partial<PdfConfig>>(() => mergeWithDefaults(initialConfig));
    const [enableDropCaps, setEnableDropCaps] = useState(initialEnableDropCaps);
    const [previewTab, setPreviewTab] = useState<PreviewTab>('cover');
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

    useEffect(() => {
        setConfig(mergeWithDefaults(initialConfig));
    }, [initialConfig]);

    useEffect(() => {
        setEnableDropCaps(initialEnableDropCaps);
    }, [initialEnableDropCaps]);

    useEffect(() => {
        if (selectedImageId && !images.find(image => image.id === selectedImageId)) {
            setSelectedImageId(null);
        }
    }, [images, selectedImageId]);

    const theme = useMemo(() => {
        const preset = config.stylePreset ?? DEFAULT_PDF_CONFIG.stylePreset;
        return THEME_DEFINITIONS[preset];
    }, [config.stylePreset]);

    const mergedMargins = config.margins ?? DEFAULT_PDF_CONFIG.margins;
    const fallbackChapterIndex = chapters[0]?.index ?? 1;
    const includedImageCount = useMemo(() => images.filter(image => image.include).length, [images]);

    const coverHero = images.find(image => image.include && image.placement?.type === 'cover' && image.placement.coverSlot === 'background');
    const coverBadge = images.find(image => image.include && image.placement?.type === 'cover' && image.placement.coverSlot === 'badge');

    const galleryImages = images.filter(image => image.include && (!image.placement || image.placement.type === 'gallery'));
    const chapterImages = (chapterIndex: number) => images.filter(image => image.include && image.placement?.type === 'chapter' && image.placement.chapterIndex === chapterIndex);

    const selectedImage = images.find(image => image.id === selectedImageId);

    const assignSelected = (placement: ImagePlacement) => {
        if (!selectedImageId) return;
        onUpdateImagePlacement(selectedImageId, placement);
    };

    const updateFonts = (section: 'title' | 'heading' | 'body', field: 'family' | 'size' | 'bold', value: string | number | boolean) => {
        setConfig(prev => {
            const baseFonts = { ...DEFAULT_PDF_CONFIG.fonts, ...prev.fonts };
            return {
                ...prev,
                fonts: {
                    ...baseFonts,
                    [section]: {
                        ...baseFonts[section],
                        [field]: field === 'size' ? Number(value) : value,
                    },
                },
            };
        });
    };

    const handlePlacementTypeChange = (image: UserImageAsset, next: ImagePlacement['type']) => {
        if (next === 'gallery') {
            onUpdateImagePlacement(image.id, { type: 'gallery' });
            return;
        }
        if (next === 'cover') {
            onUpdateImagePlacement(image.id, { type: 'cover', coverSlot: 'background' });
            return;
        }
        onUpdateImagePlacement(
            image.id,
            {
                type: 'chapter',
                chapterIndex: image.placement?.type === 'chapter' ? image.placement.chapterIndex : fallbackChapterIndex,
                anchor: 'start',
            }
        );
    };

    const handleChapterSelect = (image: UserImageAsset, chapterIndex: number) => {
        onUpdateImagePlacement(image.id, { type: 'chapter', chapterIndex, anchor: image.placement?.type === 'chapter' ? image.placement.anchor : 'start' });
    };

    const handleAnchorSelect = (image: UserImageAsset, anchor: ChapterImageAnchor) => {
        if (image.placement?.type !== 'chapter') return;
        onUpdateImagePlacement(image.id, { type: 'chapter', chapterIndex: image.placement.chapterIndex, anchor });
    };

    const handleCoverSlotChange = (image: UserImageAsset, coverSlot: 'background' | 'badge') => {
        onUpdateImagePlacement(image.id, { type: 'cover', coverSlot });
    };

    const confirm = async () => {
        await onConfirm({ config, enableDropCaps });
    };

    const previewInstructions = selectedImage ? 'Pick a placement zone below for the highlighted image.' : 'Select an image on the right, then click a zone to place it.';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-2 sm:p-4" onClick={onClose}>
            <div className="w-full max-w-6xl rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Live PDF studio</p>
                        <h2 className="text-2xl font-semibold">Arrange layout before export</h2>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-full border border-white/10 p-2 text-slate-300 hover:text-white">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid gap-6 p-6 lg:grid-cols-2">
                    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Preview</p>
                                <p className="text-sm text-slate-300">{previewInstructions}</p>
                            </div>
                            <div className="flex gap-2">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setPreviewTab(tab.id)}
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${previewTab === tab.id ? 'bg-white/80 text-slate-900' : 'bg-white/10 text-slate-200'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 space-y-4">
                            {previewTab === 'cover' && (
                                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                                    <div
                                        className="rounded-2xl p-6 text-center shadow-inner"
                                        style={{
                                            background: `linear-gradient(135deg, ${theme.colors.coverBackground}, ${theme.colors.accentSoft})`,
                                            borderColor: theme.colors.accent,
                                        }}
                                    >
                                        <p className="text-xs uppercase tracking-[0.4em]" style={{ color: theme.colors.caption }}>BookForge mock cover</p>
                                        <h3 className="mt-3 text-2xl font-bold" style={{ color: theme.colors.title }}>{book.config.title}</h3>
                                        <p className="text-sm" style={{ color: theme.colors.body }}>{book.config.genre} • {book.config.topic}</p>
                                        {coverHero && (
                                            <img src={coverHero.dataUrl} alt={coverHero.name} className="mt-4 h-32 w-full rounded-xl object-cover" />
                                        )}
                                        {coverBadge && (
                                            <img src={coverBadge.dataUrl} alt={coverBadge.name} className="mt-4 h-16 w-16 rounded-full border-2 border-white/80 object-cover mx-auto" />
                                        )}
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            disabled={!selectedImageId}
                                            onClick={() => assignSelected({ type: 'cover', coverSlot: 'background' })}
                                            className={`rounded-2xl border px-3 py-2 text-sm ${selectedImageId ? 'border-emerald-400/60 text-white hover:border-emerald-300' : 'border-white/10 text-slate-500 cursor-not-allowed'}`}
                                        >
                                            Place selected as hero background
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!selectedImageId}
                                            onClick={() => assignSelected({ type: 'cover', coverSlot: 'badge' })}
                                            className={`rounded-2xl border px-3 py-2 text-sm ${selectedImageId ? 'border-emerald-400/60 text-white hover:border-emerald-300' : 'border-white/10 text-slate-500 cursor-not-allowed'}`}
                                        >
                                            Use selected as badge
                                        </button>
                                    </div>
                                </div>
                            )}

                            {previewTab === 'chapter' && (
                                <div className="space-y-4">
                                    {chapters.slice(0, 4).map(ch => (
                                        <div key={ch.index} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Chapter {ch.index}</p>
                                                    <h4 className="text-lg font-semibold text-white">{ch.title}</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    {anchorOptions.map(option => (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            disabled={!selectedImageId}
                                                            onClick={() => assignSelected({ type: 'chapter', chapterIndex: ch.index, anchor: option.value })}
                                                            className={`rounded-full px-3 py-1 ${selectedImageId ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="mt-3 h-[4.5rem] overflow-hidden text-sm text-slate-300">{ch.text.slice(0, 220)}...</p>
                                            {chapterImages(ch.index).length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                                                    {chapterImages(ch.index).map(img => (
                                                        <span key={img.id} className="rounded-full border border-white/10 px-3 py-1">{img.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {previewTab === 'gallery' && (
                                <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                                    {galleryImages.length === 0 ? (
                                        <p className="text-sm text-slate-400">No gallery images yet. Select an image and choose “Send to gallery”.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            {galleryImages.map(image => (
                                                <img key={image.id} src={image.dataUrl} alt={image.name} className="h-28 w-full rounded-xl object-cover" />
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        disabled={!selectedImageId}
                                        onClick={() => assignSelected({ type: 'gallery' })}
                                        className={`mt-4 w-full rounded-2xl border px-3 py-2 text-sm ${selectedImageId ? 'border-emerald-400/60 text-white hover:border-emerald-300' : 'border-white/10 text-slate-500 cursor-not-allowed'}`}
                                    >
                                        Send selected image to gallery
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="space-y-6 overflow-y-auto pr-2 max-h-[70vh]">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <h3 className="text-lg font-semibold">Quick layout controls</h3>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                <label className="flex items-center gap-2 text-sm text-slate-200">
                                    <input type="checkbox" checked={config.pageNumbering !== false} onChange={e => setConfig(prev => ({ ...prev, pageNumbering: e.target.checked }))} className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400" />
                                    Show page numbers
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-200">
                                    <input type="checkbox" checked={enableDropCaps} onChange={e => setEnableDropCaps(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400" />
                                    Drop caps on first paragraph
                                </label>
                            </div>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Page size</p>
                                    <select value={config.pageSize} onChange={e => setConfig(prev => ({ ...prev, pageSize: e.target.value as PdfConfig['pageSize'] }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm">
                                        <option value="A4">A4</option>
                                        <option value="Letter">Letter</option>
                                    </select>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Margin preset</p>
                                    <select
                                        value={JSON.stringify(mergedMargins)}
                                        onChange={e => setConfig(prev => ({ ...prev, margins: JSON.parse(e.target.value) as PdfConfig['margins'] }))}
                                        className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm"
                                    >
                                        <option value={JSON.stringify(marginPresets.small)}>Compact</option>
                                        <option value={JSON.stringify(marginPresets.medium)}>Balanced</option>
                                        <option value={JSON.stringify(marginPresets.large)}>Spacious</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <h3 className="text-lg font-semibold">Theme presets</h3>
                            <p className="text-sm text-slate-400">Controls accent ribbons, drop caps, and background gradients.</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                {Object.values(THEME_DEFINITIONS).map(def => (
                                    <button
                                        key={def.id}
                                        type="button"
                                        onClick={() => setConfig(prev => ({ ...prev, stylePreset: def.id }))}
                                        className={`rounded-2xl border px-4 py-3 text-left ${config.stylePreset === def.id ? 'border-white/70 bg-white/10 shadow-lg' : 'border-white/10 bg-slate-900/60 hover:border-white/30'}`}
                                    >
                                        <div className="h-12 w-full rounded-xl" style={{ background: `linear-gradient(135deg, ${def.colors.accentSoft}, ${def.colors.accent})` }} />
                                        <p className="mt-2 font-semibold">{def.name}</p>
                                        <p className="text-xs text-slate-400">{def.id === 'aurora' && 'Cool glow'}{def.id === 'editorial' && 'Warm editorial'}{def.id === 'midnight' && 'Neon noir'}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
                            <h3 className="text-lg font-semibold">Font system</h3>
                            {(['title', 'heading', 'body'] as Array<'title' | 'heading' | 'body'>).map(section => (
                                <div key={section} className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                                    <p className="text-sm font-semibold capitalize">{section}</p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                        <select
                                            value={config.fonts?.[section]?.family ?? DEFAULT_PDF_CONFIG.fonts[section].family}
                                            onChange={e => updateFonts(section, 'family', e.target.value)}
                                            className="rounded-xl border border-white/10 bg-slate-900/70 px-2 py-2 text-sm"
                                        >
                                            {fontFamilies.map(family => (
                                                <option key={family} value={family}>{family}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min={8}
                                            max={64}
                                            value={config.fonts?.[section]?.size ?? DEFAULT_PDF_CONFIG.fonts[section].size}
                                            onChange={e => updateFonts(section, 'size', Number(e.target.value))}
                                            className="rounded-xl border border-white/10 bg-slate-900/70 px-2 py-2 text-sm"
                                        />
                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                            <input
                                            type="checkbox"
                                            checked={!!config.fonts?.[section]?.bold}
                                            onChange={e => updateFonts(section, 'bold', e.target.checked)}
                                            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-400"
                                            />
                                            Bold
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <h3 className="text-lg font-semibold">Image placement</h3>
                            <p className="text-sm text-slate-400">Select a card to highlight it, tweak placement, reorder, or remove.</p>
                            <div className="mt-4 space-y-3">
                                {images.length === 0 && (
                                    <p className="text-sm text-slate-400">Upload imagery first to enable live placement.</p>
                                )}
                                {images.map((image, index) => {
                                    const isSelected = image.id === selectedImageId;
                                    const placementType = image.placement?.type ?? 'gallery';
                                    return (
                                        <article
                                            key={image.id}
                                            className={`rounded-2xl border p-3 text-sm ${isSelected ? 'border-emerald-400 bg-emerald-500/5' : 'border-white/10 bg-slate-900/40'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <img src={image.dataUrl} alt={image.name} className="h-12 w-12 rounded-xl object-cover" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-white">{image.name}</p>
                                                    <p className="text-xs text-slate-400">{(image.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => setSelectedImageId(isSelected ? null : image.id)} className="rounded-full border border-white/10 px-3 py-1 text-xs">
                                                        {isSelected ? 'Deselect' : 'Select'}
                                                    </button>
                                                    <button type="button" onClick={() => onRemoveImage(image.id)} className="rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-200">
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                <label className="text-xs text-slate-300">
                                                    Placement type
                                                    <select
                                                        value={placementType}
                                                        onChange={e => handlePlacementTypeChange(image, e.target.value as ImagePlacement['type'])}
                                                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1.5"
                                                    >
                                                        <option value="gallery">Gallery</option>
                                                        <option value="cover">Cover</option>
                                                        <option value="chapter">Chapter</option>
                                                    </select>
                                                </label>
                                                {placementType === 'chapter' && (
                                                    <label className="text-xs text-slate-300">
                                                        Chapter
                                                        <select
                                                            value={image.placement?.type === 'chapter' ? image.placement.chapterIndex : fallbackChapterIndex}
                                                            onChange={e => handleChapterSelect(image, Number(e.target.value))}
                                                            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1.5"
                                                        >
                                                            {chapters.map(ch => (
                                                                <option key={ch.index} value={ch.index}>Chapter {ch.index}</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                )}
                                                {placementType === 'cover' && (
                                                    <label className="text-xs text-slate-300">
                                                        Cover slot
                                                        <select
                                                            value={image.placement?.type === 'cover' ? image.placement.coverSlot : 'background'}
                                                            onChange={e => handleCoverSlotChange(image, e.target.value as 'background' | 'badge')}
                                                            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1.5"
                                                        >
                                                            <option value="background">Hero background</option>
                                                            <option value="badge">Corner badge</option>
                                                        </select>
                                                    </label>
                                                )}
                                                {placementType === 'chapter' && (
                                                    <label className="text-xs text-slate-300">
                                                        Anchor
                                                        <select
                                                            value={(image.placement?.type === 'chapter' && image.placement.anchor) || 'start'}
                                                            onChange={e => handleAnchorSelect(image, e.target.value as any)}
                                                            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-2 py-1.5"
                                                        >
                                                            {anchorOptions.map(option => (
                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                )}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                <button type="button" onClick={() => onToggleInclude(image.id)} className="rounded-full border border-white/10 px-3 py-1">
                                                    {image.include ? 'Exclude from PDF' : 'Include in PDF'}
                                                </button>
                                                <button type="button" onClick={() => onReorderImage(image.id, 'up')} disabled={index === 0} className="rounded-full border border-white/10 px-3 py-1 disabled:opacity-40">
                                                    Move up
                                                </button>
                                                <button type="button" onClick={() => onReorderImage(image.id, 'down')} disabled={index === images.length - 1} className="rounded-full border border-white/10 px-3 py-1 disabled:opacity-40">
                                                    Move down
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-4">
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <BookIcon className="h-5 w-5 text-indigo-300" />
                        <span>{includedImageCount} image{includedImageCount === 1 ? '' : 's'} included • Theme: {theme.name}</span>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white">Cancel</button>
                        <button
                            type="button"
                            disabled={!isReady || isBuilding}
                            onClick={confirm}
                            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700"
                        >
                            {isBuilding ? (
                                <>
                                    <DownloadIcon className="h-4 w-4 animate-spin" /> Exporting…
                                </>
                            ) : (
                                <>
                                    <DownloadIcon className="h-4 w-4" /> Build PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PdfDesignerModal;
