// packages/api/src/constants.ts - Constantes compartidas
export const DEFAULT_API_URL = "https://visualtasteworker.franciscotortosaestudios.workers.dev";

// Constantes para timeouts y reintentos
export const API_TIMEOUT = 30000; // 30 segundos
export const DEFAULT_RETRIES = 2;
export const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutos
export const DEFAULT_CACHE_TIME = 10 * 60 * 1000; // 10 minutos

// Constantes para encabezados
export const AUTH_HEADER_PREFIX = "Bearer ";
export const CONTENT_TYPE_JSON = "application/json";

// Configuraciones para React Query
export const QUERY_CONFIG = {
  staleTime: DEFAULT_STALE_TIME,
  cacheTime: DEFAULT_CACHE_TIME,
  retry: DEFAULT_RETRIES
};