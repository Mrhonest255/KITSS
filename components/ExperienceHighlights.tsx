import React from 'react';
import { FileTextIcon } from './icons/FileTextIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { BookIcon } from './icons/BookIcon';

const highlights = [
    {
        title: 'Editorial-grade PDF themes',
        description: 'Choose Aurora, Amber, or Midnight presets for ribbon accents, tinted backgrounds, and modern drop caps.',
        icon: SettingsIcon,
    },
    {
        title: 'Markdown-aware rendering',
        description: 'Headings, quotes, and bullet lists from Gemini are reflowed into polished layouts without awkward gaps.',
        icon: FileTextIcon,
    },
    {
        title: 'Persuasive first impression',
        description: 'Cover pages feature bold gradients, chapter ribbons, and optional contributor galleries to wow early readers.',
        icon: BookIcon,
    },
];

const ExperienceHighlights: React.FC = () => {
    return (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/30">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Why readers stay</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Modern storytelling polish</h3>
            <p className="mt-1 text-sm text-slate-400">Every export now balances typography, spacing, and imagery so your manuscript feels intentional before the first paragraph.</p>
            <div className="mt-5 space-y-4">
                {highlights.map(({ title, description, icon: Icon }) => (
                    <article key={title} className="flex gap-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-indigo-200">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{title}</p>
                            <p className="text-sm text-slate-400">{description}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default ExperienceHighlights;
