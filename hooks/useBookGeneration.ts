
import { useState, useCallback } from 'react';
import { GenerationState, BookConfig } from '../types/book';
import * as textGeneratorService from '../services/textGeneratorService';

const initialState: GenerationState = {
    step: 'idle',
    progress: 0,
    message: 'Waiting to start...',
    book: undefined,
    error: undefined,
    warnings: [],
};

export const useBookGeneration = () => {
    const [state, setState] = useState<GenerationState>(initialState);

    const updateState = (update: Partial<GenerationState>) => {
        setState(prevState => ({ ...prevState, ...update }));
    };

    const generateBook = useCallback(async (config: BookConfig) => {
        try {
            const warnings: string[] = [];
            updateState({ step: 'outline', progress: 5, message: 'Generating book outline...', book: undefined, error: undefined, warnings: [] });
            const outlineResult = await textGeneratorService.generateOutline(config);
            if (outlineResult.warning) warnings.push(outlineResult.warning);
            const outline = outlineResult.data;

            updateState({
                step: 'chapters',
                progress: 25,
                message: 'Outline complete. Generating chapters...',
                book: { config, outline, chapters: [] },
                warnings: [...warnings],
            });

            const chaptersResult = await textGeneratorService.generateChapters(config, outline);
            if (chaptersResult.warning) warnings.push(chaptersResult.warning);
            const chapters = chaptersResult.data;

            updateState({
                step: 'done',
                progress: 100,
                message: warnings.length
                    ? 'Book generation complete with a few warnings. Review the notice below.'
                    : 'Book generation complete! Download your PDF when ready.',
                book: { config, outline, chapters },
                warnings,
            });

        } catch (e) {
            const error = e instanceof Error ? e.message : 'An unknown error occurred.';
            updateState({
                step: 'error',
                error: `Generation failed: ${error}`,
                message: 'An error occurred.',
                warnings: [],
            });
        }
    }, []);

    const reset = useCallback(() => {
        setState(initialState);
    }, []);

    return { state, generateBook, reset };
};
