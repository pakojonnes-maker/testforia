// apps/client/src/hooks/useReelsConfig.ts
//
// La carta de un restaurante en un idioma (GET /restaurants/:slug/reels?lang=).
// Una caché en memoria de 5 min y una sola petición en vuelo por (slug, idioma): App.tsx pide
// la carta al arrancar y CartaApp/ReservePage la leen de aquí sin repetir la descarga.

import { useEffect, useState } from 'react';
import { API_URL } from '../lib/api';

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
  sections: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  languages: Language[];
  marketing?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  reservationsEnabled?: boolean;
  deliveryEnabled?: boolean;
  deliverySettings?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  translations?: Record<string, string>;
  loyalty?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  userStatus?: { hasRated: boolean; previousRating: number | null };
}

export type ReelConfig = RestaurantConfig;

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: RestaurantConfig; expiry: number }>();
const inFlight = new Map<string, Promise<RestaurantConfig>>();

const keyOf = (slug: string, lang: string) => `${slug}-${lang}`;

function readCache(slug: string, lang: string): RestaurantConfig | null {
  const hit = cache.get(keyOf(slug, lang));
  return hit && Date.now() < hit.expiry ? hit.data : null;
}

/**
 * Descarga (o devuelve de caché) la carta. Dos llamadas simultáneas para lo mismo comparten
 * la petición. Lanza si la API falla.
 */
export function loadReelsConfig(slug: string, lang: string): Promise<RestaurantConfig> {
  const cached = readCache(slug, lang);
  if (cached) return Promise.resolve(cached);
  const key = keyOf(slug, lang);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const p = (async () => {
    const res = await fetch(`${API_URL}/restaurants/${encodeURIComponent(slug)}/reels?lang=${encodeURIComponent(lang)}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) throw new Error(data?.message || `HTTP ${res.status}`);
    const config: RestaurantConfig = {
      restaurant: data.restaurant,
      sections: data.sections || [],
      languages: data.languages || [],
      marketing: data.marketing,
      reservationsEnabled: data.reservationsEnabled,
      deliveryEnabled: data.deliveryEnabled,
      deliverySettings: data.deliverySettings,
      translations: data.translations,
      loyalty: data.loyalty,
      userStatus: data.userStatus,
    };
    cache.set(key, { data: config, expiry: Date.now() + CACHE_TTL });
    return config;
  })();
  inFlight.set(key, p);
  p.finally(() => inFlight.delete(key)).catch(() => { /* lo maneja quien espera */ });
  return p;
}

// Lo que se enseña si la API falla: una carta vacía ("no hay carta disponible"), no un
// esqueleto de carga eterno.
function emptyConfig(slug: string): RestaurantConfig {
  return {
    restaurant: {
      id: '',
      name: '',
      slug,
      branding: { primaryColor: '', secondaryColor: '', textColor: '', backgroundColor: '', fontFamily: '' },
    },
    sections: [],
    languages: [],
  };
}

export function useReelsConfig(slug: string | undefined, language = 'es') {
  // Si App.tsx ya la trajo, se pinta en el primer render sin pasar por "cargando".
  const [config, setConfig] = useState<RestaurantConfig | null>(() => (slug ? readCache(slug, language) : null));
  const [loading, setLoading] = useState(() => !config);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setConfig(emptyConfig(''));
      setLoading(false);
      return;
    }
    const cached = readCache(slug, language);
    if (cached) {
      setConfig(cached);
      setLoading(false);
      setError(null);
      return;
    }
    // `live` evita la carrera al cambiar de idioma deprisa: la respuesta que llega tarde
    // del idioma anterior ya no pisa a la del actual. Mientras llega la nueva se sigue
    // enseñando la carta que había (sin volver a "cargando").
    let live = true;
    setLoading(true);
    loadReelsConfig(slug, language)
      .then((data) => {
        if (!live) return;
        setConfig(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!live) return;
        console.error('[useReelsConfig]', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setConfig((prev) => prev || emptyConfig(slug));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => { live = false; };
  }, [slug, language]);

  return { config, loading, error };
}

export type { RestaurantConfig, Language };
export type ReelColors = RestaurantBranding;
