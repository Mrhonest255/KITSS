import React, { useMemo } from 'react';
import { BookIcon } from './icons/BookIcon';

const prompts = [
    'Sketch a subtitle or tagline that summarizes the promise of your book.',
    'Note three sensory details you want sprinkled through the next chapter.',
    'Draft a reader testimonial you wish to see on the cover flap.',
    'List two real-life anecdotes you would love the AI to weave in.',
    'Outline the call-to-action you want on the final page.'
];

interface CreativeInterludeProps {
    stepLabel: string;
}

const CreativeInterlude: React.FC<CreativeInterludeProps> = ({ stepLabel }) => {
    const selections = useMemo(() => {
        const shuffled = [...prompts].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 2);
    }, []);

    return (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/50 to-slate-900/40 p-5 text-sm text-slate-200">
            <div className="flex items-center gap-3">
                <BookIcon className="h-5 w-5 text-indigo-300" />
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-indigo-200">While {stepLabel}</p>
                    <h3 className="text-lg font-semibold text-white">Channel the creative spark</h3>
                </div>
            </div>
            <ul className="mt-4 space-y-2 text-slate-300">
                {selections.map(prompt => (
                    <li key={prompt} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        {prompt}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CreativeInterlude;
