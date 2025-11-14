
import React, { useState } from 'react';
import { GeneratedBook, PdfConfig, PdfBuildOptions, UserImageAsset } from '../types/book';
import { buildBookPdf } from '../services/pdfService';
import { DownloadIcon } from './icons/DownloadIcon';
import PdfConfigModal from './PdfConfigModal';
import { SettingsIcon } from './icons/SettingsIcon';

interface PdfDownloadButtonProps {
    book?: GeneratedBook;
    images: UserImageAsset[];
    isReady: boolean;
}

const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({ book, images, isReady }) => {
    const [isBuilding, setIsBuilding] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const includedImages = images.filter(image => image.include);

    const handleDownload = async (config: Partial<PdfConfig>) => {
        if (!book) return;

        setIsBuilding(true);
        setIsModalOpen(false);
        try {
            const options: PdfBuildOptions = { images: includedImages };
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
        } catch (error) {
            console.error("Failed to build or download PDF:", error);
            alert("Sorry, there was an error creating the PDF.");
        } finally {
            setIsBuilding(false);
        }
    };

    const isDisabled = !isReady || isBuilding;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                disabled={isDisabled}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-500 disabled:bg-green-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
                {isBuilding ? <DownloadIcon className="h-5 w-5 animate-pulse" /> : <SettingsIcon className="h-5 w-5" />}
                {isBuilding ? 'Building PDF...' : 'Download PDF'}
            </button>
            {isModalOpen && (
                <PdfConfigModal
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={handleDownload}
                />
            )}
        </>
    );
};

export default PdfDownloadButton;