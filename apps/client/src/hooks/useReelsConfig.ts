// apps/client/src/hooks/useReelsConfig.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

// ✅ EXPORTAR TODOS LOS TIPOS
export interface ReelColors {
  primary: string;
  secondary: string;
  accent?: string;
  text: string;
  background: string;
}

export interface ReelFonts {
  title?: string;
  body?: string;
  accent?: string;
}

export interface ReelTemplate {
  id: string;
  name: string;
  description: string;
  is_premium: boolean;
}

export interface ReelConfig {
  template: ReelTemplate;
  colors: ReelColors;
  fonts?: ReelFonts;
  config: Record<string, any>;
  restaurantId: string;
  restaurantName: string;
}

export const useReelsConfig = (slug: string) => {
  const [config, setConfig] = useState<ReelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiClient.getReelsConfig(slug);

        if (!response.success) {
          throw new Error(response.message || 'Failed to load config');
        }

        if (isMounted) {
          setConfig(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          console.error('[useReelsConfig] Error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (slug) {
      fetchConfig();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return { config, isLoading, error };
};
