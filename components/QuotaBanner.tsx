import React from 'react';
import { ShareIcon } from './icons/ShareIcon';

interface QuotaBannerProps {
    remaining: number;
    baseLimit: number;
    onShare: () => void;
    notice?: string | null;
}

const pluralize = (value: number) => (value === 1 ? 'book' : 'books');

const QuotaBanner: React.FC<QuotaBannerProps> = ({ remaining, baseLimit, onShare, notice }) => {
    return (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/70 via-slate-900/80 to-black/70 p-5 text-sm text-slate-200 shadow-inner shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Daily energy</p>
                    <h3 className="text-xl font-semibold text-white">{remaining} / {baseLimit} free generations left today</h3>
                    <p className="text-xs text-slate-400">Limit resets every 24h per browser. Need more runs? Share BookForge to unlock extra tokens.</p>
                    {notice && <p className="mt-2 text-xs text-emerald-300">{notice}</p>}
                </div>
                <button
                    type="button"
                    onClick={onShare}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                    <ShareIcon className="h-4 w-4" />
                    Share for +1
                </button>
            </div>
        </div>
    );
};

export default QuotaBanner;
