import React from 'react';
import { GenerationState } from '../types/book';

interface GenerationProgressProps {
    state: GenerationState;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({ state }) => {
    if (state.step === 'idle') {
        return null;
    }

    const isError = state.step === 'error';
    const isDone = state.step === 'done';
    const inProgress = !isError && !isDone;

    return (
        <div className={`rounded-3xl border p-6 ${isError ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Step 2</p>
                    <h2 className="text-2xl font-semibold text-white">Generation Progress</h2>
                </div>
                <span className="text-sm font-semibold text-slate-200">{state.progress}%</span>
            </div>
            <p className={`mt-3 text-sm ${isError ? 'text-red-200' : 'text-slate-300'}`}>{state.message}</p>
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${
                        isError ? 'bg-red-500' : isDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                    } ${inProgress ? 'animated-stripes' : ''}`}
                    style={{ width: `${state.progress}%` }}
                ></div>
            </div>
            {isError && state.error && (
                <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-100">
                    <p className="font-semibold">Error details</p>
                    <pre className="mt-1 whitespace-pre-wrap break-all font-mono">{state.error}</pre>
                </div>
            )}
        </div>
    );
};

export default GenerationProgress;