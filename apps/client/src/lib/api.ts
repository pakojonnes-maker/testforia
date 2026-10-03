// URL del worker. Una sola definición: antes había 13 copias de esta línea repartidas por la app.
export const API_URL: string = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

/** Error de la API con la forma que ya leía ReservePage (`err.response.status`, `err.message`). */
export class ApiError extends Error {
  response: { status: number; data: unknown };
  constructor(status: number, data: unknown) {
    const msg = (data as { message?: unknown } | null)?.message;
    super(typeof msg === 'string' && msg ? msg : `HTTP ${status}`);
    this.response = { status, data };
  }
}

/** fetch + JSON. Lanza ApiError si la respuesta no es 2xx; si lo es, devuelve el cuerpo. */
export async function apiRequest<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { json, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/** POST que sobrevive al cierre de la página (eventos, fin de sesión). Si el navegador no puede, fetch con keepalive. */
export function beacon(path: string, payload: unknown): void {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.(`${API_URL}${path}`, new Blob([body], { type: 'application/json' }))) return;
  } catch { /* seguimos con fetch */ }
  fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => { /* best-effort */ });
}
