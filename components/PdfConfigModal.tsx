
import React, { useState } from 'react';
import { PdfConfig, PageSize, PdfFontFamily } from '../types/book';
import { XIcon } from './icons/XIcon';

interface PdfConfigModalProps {
    onClose: () => void;
    onConfirm: (config: Partial<PdfConfig>) => void;
}

const fontFamilies: PdfFontFamily[] = ['Helvetica', 'TimesRoman', 'Courier'];
const marginPresets = {
    small: { top: 36, bottom: 36, left: 36, right: 36 },
    medium: { top: 72, bottom: 72, left: 72, right: 72 },
    large: { top: 108, bottom: 108, left: 108, right: 108 },
};

const PdfConfigModal: React.FC<PdfConfigModalProps> = ({ onClose, onConfirm }) => {
    const [config, setConfig] = useState<Partial<PdfConfig>>({
        pageSize: 'A4',
        margins: marginPresets.medium,
        fonts: {
            title: { family: 'Helvetica', size: 40, bold: true },
            heading: { family: 'Helvetica', size: 24, bold: true },
            body: { family: 'TimesRoman', size: 12, bold: false },
        }
    });

    const handleFontChange = (
        section: 'title' | 'heading' | 'body',
        field: 'family' | 'size' | 'bold',
        value: string | number | boolean
    ) => {
        setConfig(prev => ({
            ...prev,
            fonts: {
                ...prev.fonts,
                [section]: {
                    ...prev.fonts![section],
                    [field]: value,
                }
            }
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                    <h2 className="text-2xl font-bold text-white">Customize PDF Export</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-8">
                    {/* Page Layout Section */}
                    <div className="space-y-4">
                         <h3 className="text-lg font-semibold text-indigo-300 border-b border-indigo-500/30 pb-2">Page Layout</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Select label="Page Size" value={config.pageSize || 'A4'} onChange={e => setConfig(p => ({ ...p, pageSize: e.target.value as PageSize }))}>
                                <option value="A4">A4</option>
                                <option value="Letter">Letter</option>
                            </Select>
                            <Select label="Margins" value={JSON.stringify(config.margins)} onChange={e => setConfig(p => ({ ...p, margins: JSON.parse(e.target.value) }))}>
                                <option value={JSON.stringify(marginPresets.small)}>Small</option>
                                <option value={JSON.stringify(marginPresets.medium)}>Medium</option>
                                <option value={JSON.stringify(marginPresets.large)}>Large</option>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Font Styles Section */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-indigo-300 border-b border-indigo-500/30 pb-2">Font Styles</h3>
                        {/* Title Font */}
                        <FontSelector title="Title Font" config={config.fonts?.title!} onChange={(field, value) => handleFontChange('title', field, value)} />
                        {/* Heading Font */}
                        <FontSelector title="Chapter Heading Font" config={config.fonts?.heading!} onChange={(field, value) => handleFontChange('heading', field, value)} />
                        {/* Body Font */}
                        <FontSelector title="Body Text Font" config={config.fonts?.body!} onChange={(field, value) => handleFontChange('body', field, value)} />
                    </div>
                </div>
                <div className="p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800/80 backdrop-blur-sm z-10 flex justify-end">
                    <button onClick={() => onConfirm(config)} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-500 transition-colors">
                        Generate & Download
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Helper Components for the Modal ---

interface FontSelectorProps {
    title: string;
    config: { family: PdfFontFamily; size: number; bold?: boolean };
    onChange: (field: 'family' | 'size' | 'bold', value: any) => void;
}

const FontSelector: React.FC<FontSelectorProps> = ({ title, config, onChange }) => (
    <div className="p-4 bg-slate-900/50 rounded-lg">
        <p className="font-medium text-slate-200 mb-3">{title}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
            <Select label="Family" value={config.family} onChange={e => onChange('family', e.target.value)}>
                {fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
            <Input label="Size" type="number" value={config.size} onChange={e => onChange('size', parseInt(e.target.value, 10))} />
            <label className="flex items-center space-x-2 cursor-pointer pb-2">
                <input type="checkbox" checked={!!config.bold} onChange={e => onChange('bold', e.target.checked)} className="w-5 h-5 bg-slate-700/50 border-slate-600 rounded text-indigo-500 focus:ring-indigo-500" />
                <span className="text-slate-200">Bold</span>
            </label>
        </div>
    </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input {...props} className="w-full bg-slate-700/50 border border-slate-600 rounded-md shadow-sm px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
     <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <select {...props} className="w-full bg-slate-700/50 border border-slate-600 rounded-md shadow-sm px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            {children}
        </select>
    </div>
);

export default PdfConfigModal;