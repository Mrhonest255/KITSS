
import { useState, useCallback } from 'react';
import { GenerationState, BookConfig } from '../types/book';
import * as textGeneratorService from '../services/textGeneratorService';

const initialState: GenerationState = {
    step: 'idle',
    progress: 0,
    message: 'Waiting to start...',
    book: undefined,
    error: undefined,
};

export const useBookGeneration = () => {
    const [state, setState] = useState<GenerationState>(initialState);

    const updateState = (update: Partial<GenerationState>) => {
        setState(prevState => ({ ...prevState, ...update }));
    };

    const generateBook = useCallback(async (config: BookConfig) => {
        try {
            updateState({ step: 'outline', progress: 5, message: 'Generating book outline...', book: undefined, error: undefined });
            const outline = await textGeneratorService.generateOutline(config);
            updateState({
                step: 'chapters',
                progress: 25,
                message: 'Outline complete. Generating chapters...',
                book: { config, outline, chapters: [] },
            });

            const chapters = await textGeneratorService.generateChapters(config, outline);

            updateState({
                step: 'done',
                progress: 100,
                message: 'Book generation complete! Download your PDF when ready.',
                book: { config, outline, chapters },
            });

        } catch (e) {
            const error = e instanceof Error ? e.message : 'An unknown error occurred.';
            updateState({
                step: 'error',
                error: `Generation failed: ${error}`,
                message: 'An error occurred.',
            });
        }
    }, []);

    const reset = useCallback(() => {
        setState(initialState);
    }, []);

    return { state, generateBook, reset };
};
