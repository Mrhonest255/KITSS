import React, { useState } from 'react';
import { ChapterContent } from '../types/book';
import { XIcon } from './icons/XIcon';

interface ChapterEditModalProps {
    chapter: ChapterContent;
    onCancel: () => void;
    onSave: (text: string) => void;
}

const ChapterEditModal: React.FC<ChapterEditModalProps> = ({ chapter, onCancel, onSave }) => {
    const [draft, setDraft] = useState(chapter.text);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
            <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-slate-100 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Refine chapter</p>
                        <h3 className="text-2xl font-semibold text-white">{chapter.title}</h3>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-white" aria-label="Close editor">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    className="mt-4 h-80 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                />
                <div className="mt-4 flex justify-end gap-3">
                    <button onClick={onCancel} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200">
                        Cancel
                    </button>
                    <button onClick={() => onSave(draft)} className="rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white">
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChapterEditModal;
