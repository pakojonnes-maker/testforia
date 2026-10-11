import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface LanguageContextType {
    currentLanguage: string;
    setLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
    restaurantId: string;
    defaultLanguage?: string;
}

/**
 * Solo guarda el idioma elegido. La lista de idiomas del restaurante llega en la
 * respuesta de GET /restaurants/:slug/landing (`languages`, ya filtrada por
 * `is_enabled`): aquí no se pide. Antes se pedía a /restaurants/:slug/languages,
 * que exige sesión, y cada visita a la landing dejaba un 401 en la consola por
 * un dato que nadie leía.
 */
export function LanguageProvider({
    children,
    restaurantId,
    defaultLanguage = 'es'
}: LanguageProviderProps) {
    const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
        // 1. Intentar recuperar del localStorage
        const stored = localStorage.getItem(`vt_language_${restaurantId}`);
        if (stored) return stored;

        // 2. Detectar idioma del navegador
        const browserLang = navigator.language.split('-')[0]; // 'es-ES' -> 'es'
        return browserLang || defaultLanguage;
    });

    const setLanguage = (lang: string) => {
        setCurrentLanguage(lang);
        localStorage.setItem(`vt_language_${restaurantId}`, lang);
    };

    return (
        <LanguageContext.Provider
            value={{
                currentLanguage,
                setLanguage
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

/**
 * Hook para acceder al contexto de idioma
 */
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
