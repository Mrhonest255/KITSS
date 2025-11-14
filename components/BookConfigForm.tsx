
import React, { useState } from 'react';
import { BookConfig, Genre } from '../types/book';
import { BookIcon } from './icons/BookIcon';

interface BookConfigFormProps {
    onGenerate: (config: BookConfig) => void;
    isGenerating: boolean;
}

const genres: Genre[] = ["Educational", "Fiction", "Non-Fiction", "Guide", "Story", "Other"];
const languages = ["English", "Swahili", "Spanish", "French"];

const BookConfigForm: React.FC<BookConfigFormProps> = ({ onGenerate, isGenerating }) => {
    const [config, setConfig] = useState<BookConfig>({
        title: 'The Wonders of Child Safety',
        topic: 'child safety for parents',
        genre: 'Educational',
        targetAudience: 'Parents and guardians',
        language: 'English',
        tone: 'Friendly, reassuring, and informative',
        chaptersCount: 5,
        wordsPerChapter: 500,
    });
    const [errors, setErrors] = useState<Partial<Record<keyof BookConfig, string>>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | number | boolean = value;

        if (type === 'number') {
            processedValue = value === '' ? 0 : parseInt(value, 10);
        } else if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        }

        setConfig(prev => ({ ...prev, [name]: processedValue }));
        if (errors[name as keyof BookConfig]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof BookConfig, string>> = {};
        if (!config.title.trim()) newErrors.title = "Title is required.";
        if (!config.topic.trim()) newErrors.topic = "Topic is required.";
        if (!config.targetAudience.trim()) newErrors.targetAudience = "Target audience is required.";
        if (config.chaptersCount < 3 || config.chaptersCount > 25) newErrors.chaptersCount = "Chapters must be between 3 and 25.";
        if (config.wordsPerChapter < 200 || config.wordsPerChapter > 5000) newErrors.wordsPerChapter = "Words must be between 200 and 5000.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onGenerate(config);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-[0_20px_120px_rgba(15,15,40,0.6)] space-y-8">
            <div className="flex flex-col gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Step 1</p>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-3xl font-semibold text-white">Configure Your Manuscript</h2>
                    <span className="rounded-full border border-white/10 px-4 py-1 text-sm text-slate-200">
                        Tailored outline & chapters
                    </span>
                </div>
                <p className="text-slate-400 text-sm max-w-2xl">
                    Describe the story you want to tell and BookForge AI will craft a clean outline, generate polished chapters, and prep everything for PDF in one pass.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField label="Book Title" name="title" value={config.title} onChange={handleChange} error={errors.title} />
                <InputField label="Topic / Subject" name="topic" value={config.topic} onChange={handleChange} error={errors.topic} />
                <SelectField label="Genre" name="genre" value={config.genre} onChange={handleChange} options={genres} />
                <SelectField label="Language" name="language" value={config.language} onChange={handleChange} options={languages} />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField label="Target Audience" name="targetAudience" value={config.targetAudience} onChange={handleChange} error={errors.targetAudience} />
                <InputField label="Tone" name="tone" value={config.tone} onChange={handleChange} />
                <InputField label="Number of Chapters" name="chaptersCount" type="number" min={3} max={25} value={config.chaptersCount} onChange={handleChange} error={errors.chaptersCount} />
                <InputField label="Words per Chapter" name="wordsPerChapter" type="number" min={200} max={5000} step={100} value={config.wordsPerChapter} onChange={handleChange} error={errors.wordsPerChapter} />
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <BookIcon className="h-5 w-5 text-indigo-300" />
                <p>Your manuscript defaults to a text-first layout. Upload personal imagery in the "Optional media" panel to append a curated gallery to the PDF.</p>
            </div>

            <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 py-4 text-lg font-semibold text-white transition hover:shadow-[0_10px_40px_rgba(99,102,241,.4)] disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600"
            >
                <BookIcon className={`h-5 w-5 ${isGenerating ? 'animate-pulse' : ''}`} />
                {isGenerating ? 'Forging your book...' : 'Generate Book'}
            </button>
        </form>
    );
};

// Helper components for form fields
interface FieldProps {
    label: string;
    name: keyof BookConfig;
    value: string | number;
    onChange: (e: React.ChangeEvent<any>) => void;
    error?: string;
}

const InputField: React.FC<FieldProps & { type?: string; min?: number; max?: number; step?: number }> = ({ label, name, type = "text", error, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            id={name}
            name={name}
            type={type}
            {...props}
            className={`w-full rounded-2xl border px-4 py-3 text-base text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${error ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
);

const SelectField: React.FC<FieldProps & { options: string[] }> = ({ label, name, options, error, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <select
            id={name}
            name={name}
            {...props}
            className={`w-full rounded-2xl border px-4 py-3 text-base text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${error ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
);

export default BookConfigForm;