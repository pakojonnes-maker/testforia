import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface TranslationContextType {
    t: (key: string, defaultText?: string) => string;
    translations: Record<string, string>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
    translations?: Record<string, string>;
    children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ translations = {}, children }) => {
    const t = (key: string, defaultText?: string): string => {
        if (!translations) return defaultText || key;
        return translations[key] || defaultText || key;
    };

    return (
        <TranslationContext.Provider value={{ t, translations }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        // Graceful fallback if provider is missing
        return {
            t: (key: string, defaultText?: string) => defaultText || key,
            translations: {}
        };
    }
    return context;
};
