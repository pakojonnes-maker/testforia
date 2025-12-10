import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface Language {
    code: string;
    name: string;
    native_name: string;
    flag_emoji: string;
}

interface LanguageContextType {
    currentLanguage: string;
    setLanguage: (lang: string) => void;
    availableLanguages: Language[];
    isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
    restaurantId: string;
    defaultLanguage?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

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

    const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cargar idiomas disponibles para este restaurante
    useEffect(() => {
        async function loadLanguages() {
            try {
                const response = await fetch(`${API_URL}/restaurants/${restaurantId}/languages`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (data.success && data.languages) {
                    setAvailableLanguages(data.languages);
                } else {
                    // Fallback a español si no hay idiomas configurados
                    setAvailableLanguages([
                        {
                            code: 'es',
                            name: 'Spanish',
                            native_name: 'Español',
                            flag_emoji: '🇪🇸'
                        }
                    ]);
                }
            } catch (error) {
                console.error('[LanguageContext] Error loading languages:', error);
                // Fallback a español
                setAvailableLanguages([
                    {
                        code: 'es',
                        name: 'Spanish',
                        native_name: 'Español',
                        flag_emoji: '🇪🇸'
                    }
                ]);
            } finally {
                setIsLoading(false);
            }
        }

        if (restaurantId) {
            loadLanguages();
        }
    }, [restaurantId]);

    const setLanguage = (lang: string) => {
        setCurrentLanguage(lang);
        localStorage.setItem(`vt_language_${restaurantId}`, lang);
    };

    return (
        <LanguageContext.Provider
            value={{
                currentLanguage,
                setLanguage,
                availableLanguages,
                isLoading
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
