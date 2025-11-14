import { useEffect, useMemo, useState } from 'react';

interface QuotaState {
    date: string;
    used: number;
    bonus: number;
}

const STORAGE_KEY = 'bookforge_quota_v1';
const BASE_LIMIT = 2;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const loadState = (): QuotaState => {
    if (typeof window === 'undefined') {
        return { date: getTodayKey(), used: 0, bonus: 0 };
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { date: getTodayKey(), used: 0, bonus: 0 };
        const parsed = JSON.parse(raw) as QuotaState;
        if (parsed.date !== getTodayKey()) {
            return { date: getTodayKey(), used: 0, bonus: 0 };
        }
        return parsed;
    } catch {
        return { date: getTodayKey(), used: 0, bonus: 0 };
    }
};

export const useGenerationQuota = () => {
    const [state, setState] = useState<QuotaState>(() => loadState());

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
    }, [state]);

    const remaining = useMemo(() => Math.max(0, BASE_LIMIT + state.bonus - state.used), [state]);
    const canGenerate = remaining > 0;

    const consume = () => {
        setState(prev => {
            const today = getTodayKey();
            if (prev.date !== today) {
                return { date: today, used: 1, bonus: 0 };
            }
            return { ...prev, used: Math.min(BASE_LIMIT + prev.bonus, prev.used + 1) };
        });
    };

    const refund = () => {
        setState(prev => {
            const today = getTodayKey();
            if (prev.date !== today) {
                return { date: today, used: 0, bonus: 0 };
            }
            return { ...prev, used: Math.max(0, prev.used - 1) };
        });
    };

    const addShareBonus = () => {
        setState(prev => {
            const today = getTodayKey();
            if (prev.date !== today) {
                return { date: today, used: 0, bonus: 1 };
            }
            return { ...prev, bonus: prev.bonus + 1 };
        });
    };

    return {
        remaining,
        used: state.used,
        bonus: state.bonus,
        canGenerate,
        consume,
        refund,
        addShareBonus,
        baseLimit: BASE_LIMIT,
    };
};
