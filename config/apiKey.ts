// Fix: Manually define types for import.meta.env for TypeScript to recognize it,
// which resolves the error when vite/client types are not automatically loaded.
interface ImportMetaEnv {
    readonly VITE_API_KEY: string;
}

// Fix: Use `declare global` to augment the global ImportMeta type.
declare global {
    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

// This file centralizes the access to the environment variable.
// Vite exposes env variables prefixed with VITE_ on the `import.meta.env` object.
export const apiKey = import.meta.env.VITE_API_KEY;