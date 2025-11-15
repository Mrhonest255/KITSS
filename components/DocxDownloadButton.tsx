import React, { useState } from 'react';
import { GeneratedBook, UserImageAsset } from '../types/book';
import { buildBookDocx } from '../services/docxService';
import { DownloadIcon } from './icons/DownloadIcon';

interface DocxDownloadButtonProps {
    book?: GeneratedBook;
    images: UserImageAsset[];
    isReady: boolean;
}

const DocxDownloadButton: React.FC<DocxDownloadButtonProps> = ({ book, images, isReady }) => {
    const [isBuilding, setIsBuilding] = useState(false);
    const includedImages = images.filter(image => image.include);

    const handleDocxDownload = async () => {
        if (!book || !isReady) return;
        setIsBuilding(true);
        try {
            const docxBytes = await buildBookDocx(book, { images: includedImages });
            const docxBuffer = docxBytes.buffer.slice(docxBytes.byteOffset, docxBytes.byteOffset + docxBytes.byteLength) as ArrayBuffer;
            const blob = new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${book.config.title.replace(/ /g, '_') || 'generated_book'}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to build DOCX document', error);
            alert('Could not export the Word file. Please try again.');
        } finally {
            setIsBuilding(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleDocxDownload}
            disabled={!book || !isReady || isBuilding}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500 sm:w-auto"
        >
            <DownloadIcon className={`h-5 w-5 ${isBuilding ? 'animate-pulse' : ''}`} />
            {isBuilding ? 'Preparing DOCX…' : 'Download Word (.docx)'}
        </button>
    );
};

export default DocxDownloadButton;
