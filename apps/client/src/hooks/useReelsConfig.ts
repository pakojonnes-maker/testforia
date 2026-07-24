// apps/client/src/hooks/useReelsConfig.ts - CORREGIDO PARA CAMBIO DE IDIOMA

import { useState, useEffect, useRef, useCallback } from 'react';

// ✅ Types (mantener iguales)
interface Language {
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string;
}

interface RestaurantBranding {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  // Snake case variants for compatibility
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  accent_color?: string;
  accentColor?: string;
}

interface RestaurantConfig {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logourl?: string;
    coverimageurl?: string;
    website?: string;
    website_url?: string;
    branding: RestaurantBranding;
  };
  sections: any[];
  dishesBySection: { [key: number]: { dishes: any[] } };
  languages: Language[];
  template: {
    id: string;
    name: string;
    description: string;
    isPremium: boolean;
  } | null;
  config: Record<string, any>;
  overrides?: Record<string, any>; // ✅ Reel-specific color overrides (reel_* prefixed keys)
  marketing?: any;
  reservationsEnabled?: boolean;
  deliveryEnabled?: boolean; // ✅ NEW
  deliverySettings?: any;    // ✅ NEW - Full delivery config
  translations?: Record<string, string>; // ✅ Global translations
}

export type ReelConfig = RestaurantConfig;

// ✅ Cache básico pero efectivo
const configCache = new Map<string, {
  data: RestaurantConfig;
  expiry: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ✅ Permite precargar la caché con datos ya obtenidos por otro fetch (p.ej. App.tsx),
// evitando que ReelsContainer/ReservePage repitan la misma petición pesada al montar.
export function seedReelsConfigCache(slug: string, language: string, rawData: any) {
  if (!slug || !rawData) return;
  const data: RestaurantConfig = {
    restaurant: rawData.restaurant,
    sections: rawData.sections || [],
    dishesBySection: rawData.dishesBySection || {},
    languages: rawData.languages || [],
    template: rawData.template || null,
    config: rawData.config || {},
    overrides: rawData.overrides || {},
    marketing: rawData.marketing,
    reservationsEnabled: rawData.reservationsEnabled,
    deliveryEnabled: rawData.deliveryEnabled,
    deliverySettings: rawData.deliverySettings,
    translations: rawData.translations
  };
  configCache.set(`${slug}-${language}`, {
    data,
    expiry: Date.now() + CACHE_TTL
  });
}

// ✅ API call directo al worker
async function fetchReelsData(slug: string, language = 'es'): Promise<RestaurantConfig> {
  const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";

  const url = `${API_URL}/restaurants/${slug}/reels?lang=${language}`;

  console.log(`[useReelsConfig] 🔍 Fetching: ${url}`);

  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'API returned error');
  }

  return {
    restaurant: data.restaurant,
    sections: data.sections,
    dishesBySection: data.dishesBySection,
    languages: data.languages,
    template: data.template,
    config: data.config || {},
    overrides: data.overrides || {}, // ✅ NEW: Reel color overrides (reel_* prefixed)
    marketing: data.marketing, // ✅ Include marketing data
    reservationsEnabled: data.reservationsEnabled, // ✅ Include reservations status
    deliveryEnabled: data.deliveryEnabled, // ✅ NEW: Delivery enabled
    deliverySettings: data.deliverySettings, // ✅ NEW: Full delivery config
    translations: data.translations // ✅ Include global translations
  };
}

// ✅ Default fallback
function getDefaultConfig(): RestaurantConfig {
  return {
    restaurant: {
      id: 'default',
      name: 'Cargando...',
      slug: 'loading',
      branding: {
        primaryColor: '#FF6B6B',
        secondaryColor: '#4ECDC4',
        textColor: '#FFFFFF',
        backgroundColor: '#000000',
        fontFamily: 'Inter, sans-serif'
      }
    },
    sections: [],
    dishesBySection: {},
    languages: [],
    template: {
      id: 'tpl_classic',
      name: 'Classic',
      description: 'Default template',
      isPremium: false
    },
    config: {},
    overrides: {} // ✅ Default empty overrides
  };
}

// ✅ HOOK CORREGIDO: language como dependencia
export function useReelsConfig(slug: string | undefined, language = 'es') {
  const [config, setConfig] = useState<RestaurantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ✅ Cleanup and deduplication
  const mountedRef = useRef(true);
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const loadConfig = useCallback(async (targetSlug: string, lang: string) => {
    const requestId = `${targetSlug}-${lang}`;

    // ✅ Prevent duplicate requests
    if (requestIdRef.current === requestId) return;
    requestIdRef.current = requestId;

    try {
      // ✅ Check simple cache first
      const cacheKey = `${targetSlug}-${lang}`;
      const cached = configCache.get(cacheKey);

      if (cached && Date.now() < cached.expiry) {
        console.log(`[useReelsConfig] ✨ Cache hit: ${cacheKey}`);
        if (mountedRef.current) {
          setConfig(cached.data);
          setLoading(false);
          setError(null);
        }
        return;
      }

      console.log(`[useReelsConfig] 🔍 Fetching: ${targetSlug}, language: ${lang}`);
      setLoading(true);
      setError(null);

      const data = await fetchReelsData(targetSlug, lang);

      if (!mountedRef.current) return;

      // ✅ Cache the result
      configCache.set(cacheKey, {
        data,
        expiry: Date.now() + CACHE_TTL
      });

      setConfig(data);
      setError(null);
      console.log(`[useReelsConfig] ✅ Loaded: ${data.template?.name}, language: ${lang}`);

    } catch (err) {
      if (!mountedRef.current) return;

      console.error('[useReelsConfig] ❌ Error:', err);
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);

      // ✅ Fallback to default
      const defaultConfig = getDefaultConfig();
      setConfig(defaultConfig);

    } finally {
      if (mountedRef.current) {
        setLoading(false);
        requestIdRef.current = null;
      }
    }
  }, []);

  // ✅ CRÍTICO: language como dependencia para reaccionar a cambios
  useEffect(() => {
    if (!slug) {
      console.warn('[useReelsConfig] No slug provided');
      setConfig(getDefaultConfig());
      setLoading(false);
      return;
    }

    console.log(`[useReelsConfig] 🌍 Effect triggered - slug: ${slug}, language: ${language}`);
    loadConfig(slug, language);
  }, [slug, language, loadConfig]); // ✅ AÑADIDO: language como dependencia

  // ✅ Simple refetch
  const refetch = useCallback(() => {
    if (slug) {
      const cacheKey = `${slug}-${language}`;
      configCache.delete(cacheKey);
      loadConfig(slug, language);
    }
  }, [slug, language, loadConfig]);

  return { config, loading, error, refetch };
}

// ✅ Simple cache clear
export const clearConfigCache = () => {
  configCache.clear();
  console.log('[useReelsConfig] 🧹 Cache cleared');
};

export type { RestaurantConfig, Language };
export type ReelColors = RestaurantBranding;
