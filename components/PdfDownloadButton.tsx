
import React, { useState } from 'react';
import { ChapterContent, GeneratedBook, PdfBuildOptions, PdfConfig, UserImageAsset } from '../types/book';
import { buildBookPdf } from '../services/pdfService';
import { DownloadIcon } from './icons/DownloadIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import PdfDesignerModal from './PdfDesignerModal';
import { ImagePlacement } from '../types/book';
import { DEFAULT_PDF_CONFIG } from '../config/pdfDefaults';

interface PdfDownloadButtonProps {
    book?: GeneratedBook;
    images: UserImageAsset[];
    chapters: ChapterContent[];
    isReady: boolean;
    onUpdateImagePlacement: (id: string, placement: ImagePlacement) => void;
    onReorderImage: (id: string, direction: 'up' | 'down') => void;
    onToggleInclude: (id: string) => void;
    onRemoveImage: (id: string) => void;
}

const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({
    book,
    images,
    chapters,
    isReady,
    onUpdateImagePlacement,
    onReorderImage,
    onToggleInclude,
    onRemoveImage,
}) => {
    const [isBuilding, setIsBuilding] = useState(false);
    const [isDesignerOpen, setIsDesignerOpen] = useState(false);
    const [designerConfig, setDesignerConfig] = useState<Partial<PdfConfig>>({ ...DEFAULT_PDF_CONFIG });
    const [designerDropCaps, setDesignerDropCaps] = useState(true);
    const includedImages = images.filter(image => image.include);

    const handleDownload = async (configOverride?: Partial<PdfConfig>, dropCapsEnabled = designerDropCaps) => {
        if (!book) return;
        setIsBuilding(true);
        setIsDesignerOpen(false);
        try {
            const config = { ...DEFAULT_PDF_CONFIG, ...designerConfig, ...configOverride };
            const options: PdfBuildOptions = { images: includedImages, enableDropCaps: dropCapsEnabled };
            const pdfBytes = await buildBookPdf(book, config, options);
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${book.config.title.replace(/ /g, '_') || 'generated_book'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setDesignerConfig(config);
            setDesignerDropCaps(dropCapsEnabled);
        } catch (error) {
            console.error('Failed to build or download PDF:', error);
            alert('Sorry, there was an error creating the PDF.');
        } finally {
            setIsBuilding(false);
        }
    };

    const handleDesignerConfirm = async (payload: { config: Partial<PdfConfig>; enableDropCaps: boolean }) => {
        await handleDownload(payload.config, payload.enableDropCaps);
    };

    const isDisabled = !isReady || isBuilding || !book;

    return (
        <>
            <button
                type="button"
                onClick={() => !isDisabled && setIsDesignerOpen(true)}
                disabled={isDisabled}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2 text-sm font-semibold text-white hover:from-emerald-400 hover:to-green-400 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600 sm:w-auto"
            >
                {isBuilding ? <DownloadIcon className="h-5 w-5 animate-pulse" /> : <SettingsIcon className="h-5 w-5" />}
                {isBuilding ? 'Building PDF…' : 'Customize & Download'}
            </button>
            {isDesignerOpen && book && (
                <PdfDesignerModal
                    book={book}
                    images={images}
                    chapters={chapters}
                    onClose={() => setIsDesignerOpen(false)}
                    onConfirm={handleDesignerConfirm}
                    onUpdateImagePlacement={onUpdateImagePlacement}
                    onReorderImage={onReorderImage}
                    onToggleInclude={onToggleInclude}
                    onRemoveImage={onRemoveImage}
                    initialConfig={designerConfig}
                    initialEnableDropCaps={designerDropCaps}
                    isBuilding={isBuilding}
                    isReady={isReady}
                />
            )}
        </>
    );
};

export default PdfDownloadButton;