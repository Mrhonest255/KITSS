import React, { useRef } from 'react';
import { UserImageAsset } from '../types/book';
import { XIcon } from './icons/XIcon';
import { FileTextIcon } from './icons/FileTextIcon';

interface ImageUploadPanelProps {
    images: UserImageAsset[];
    statusMessage?: string | null;
    onFilesSelected: (files: FileList) => void;
    onToggleInclude: (id: string) => void;
    onRemove: (id: string) => void;
    onClearAll: () => void;
    onCaptionChange: (id: string, caption: string) => void;
    onAddByUrl: (url: string) => void;
}

const ImageUploadPanel: React.FC<ImageUploadPanelProps> = ({
    images,
    statusMessage,
    onFilesSelected,
    onToggleInclude,
    onRemove,
    onClearAll,
    onCaptionChange,
    onAddByUrl,
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const urlInputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            onFilesSelected(event.target.files);
            event.target.value = '';
        }
    };

    return (
        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-inner shadow-black/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Optional media</p>
                    <h3 className="mt-1 text-2xl font-semibold text-white">Upload Custom Images</h3>
                    <p className="mt-1 text-sm text-slate-400 max-w-lg">
                        Drop up to 12 PNG, JPG, or WEBP files. Toggle each item to decide whether it should appear inside the PDF gallery page, then fine-tune placements inside the "Customize & Download" studio.
                    </p>
                    {statusMessage && (
                        <p className="mt-2 text-xs text-amber-300">{statusMessage}</p>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
                    >
                        Add Images
                    </button>
                    {images.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="text-xs text-slate-400 underline-offset-2 hover:text-white"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
            />

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Add via link</p>
                <p className="text-xs text-slate-400">Paste an image URL (PNG, JPG, or WEBP). We'll pull it into your gallery.</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                        ref={urlInputRef}
                        type="url"
                        placeholder="https://example.com/cover.png"
                        className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-white/40 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            const value = urlInputRef.current?.value?.trim();
                            if (!value) return;
                            onAddByUrl(value);
                            if (urlInputRef.current) urlInputRef.current.value = '';
                        }}
                        className="rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white"
                    >
                        Grab Image
                    </button>
                </div>
            </div>

            {images.length === 0 ? (
                <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 py-10 text-center text-slate-400">
                    <FileTextIcon className="h-10 w-10 text-slate-600" />
                    <p className="mt-3 text-sm">No uploads yet.</p>
                    <p className="text-xs text-slate-500">Use the button above to attach personal imagery.</p>
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {images.map(asset => (
                        <article key={asset.id} className="flex gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                                <img src={asset.dataUrl} alt={asset.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex flex-1 flex-col text-sm text-slate-200">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white truncate" title={asset.name}>{asset.name}</p>
                                        <p className="text-xs text-slate-400">{(asset.size / 1024).toFixed(1)} KB • {asset.type.replace('image/', '').toUpperCase()}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(asset.id)}
                                        className="text-slate-500 hover:text-red-300"
                                        aria-label={`Remove ${asset.name}`}
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <label className="mt-auto flex items-center gap-2 text-xs text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={asset.include}
                                        onChange={() => onToggleInclude(asset.id)}
                                        className="h-4 w-4 rounded border border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    Include in PDF gallery
                                </label>
                                <label className="mt-3 text-xs text-slate-300">
                                    Caption
                                    <input
                                        type="text"
                                        value={asset.caption ?? ''}
                                        onChange={e => onCaptionChange(asset.id, e.target.value)}
                                        placeholder="Describe this image"
                                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-white/30 focus:outline-none"
                                    />
                                </label>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
};

export default ImageUploadPanel;
