
import React from 'react';

interface ApiStatusIndicatorProps {
    apiKey?: string;
}

const ApiStatusIndicator: React.FC<ApiStatusIndicatorProps> = ({ apiKey }) => {
    const isConnected = !!apiKey;
    
    return (
        <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold ${
                isConnected
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                    : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
            }`}
        >
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-300' : 'bg-amber-300'}`}></span>
            {isConnected ? 'AI Connected' : 'Mock Mode'}
        </div>
    );
};

export default ApiStatusIndicator;
