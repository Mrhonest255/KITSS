import React from 'react';
import { ChapterContent } from '../types/book';
import { FileTextIcon } from './icons/FileTextIcon';

interface ChapterDownloadButtonProps {
    chapter: ChapterContent;
}

const ChapterDownloadButton: React.FC<ChapterDownloadButtonProps> = ({ chapter }) => {
    
    const sanitizeFilename = (name: string) => {
        return name.replace(/[\\/:"*?<>|]/g, '').replace(/ /g, '_');
    };

    const handleDownload = () => {
        if (!chapter) return;

        try {
            const blob = new Blob([chapter.text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = `Chapter_${chapter.index}_${sanitizeFilename(chapter.title)}.txt`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download chapter text:", error);
            alert("Sorry, there was an error downloading the chapter file.");
        }
    };

    return (
        <button
            onClick={handleDownload}
            title="Download chapter as .txt"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
        >
            <FileTextIcon className="h-5 w-5" />
            <span>Export</span>
        </button>
    );
};

export default ChapterDownloadButton;