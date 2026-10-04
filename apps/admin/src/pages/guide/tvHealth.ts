// src/pages/guide/tvHealth.ts
// Qué significa la «última señal» de una TV. La única fuente es
// guide_tv_devices.last_seen_at: una TV encendida repide su config cada 30 min
// (apps/tv/src/lib/useGuidebook.ts) y el worker la apunta en cada petición.
// No hay forma de distinguir «apagada» de «desinstalada» desde el servidor: lo
// que sí se sabe es cuánto lleva callada, y a partir de unos días eso ya no es
// una tele apagada por la noche.

export type TvHealth = 'online' | 'off' | 'lost' | 'never' | 'disabled';

/** 30 min entre señales + margen: más tiempo y ya no está en pantalla. */
export const ONLINE_MS = 45 * 60 * 1000;
/** Más de 3 días sin señal: desenchufada, sin WiFi o sin la app. */
export const LOST_MS = 3 * 24 * 60 * 60 * 1000;

export interface TvHealthInput {
  /** D1 devuelve 0/1, no true/false. */
  is_active: boolean | number;
  last_seen_at: string | null;
}

export function tvHealth(device: TvHealthInput, now = Date.now()): TvHealth {
  if (!device.is_active) return 'disabled';
  if (!device.last_seen_at) return 'never';
  const age = now - new Date(device.last_seen_at).getTime();
  if (age < ONLINE_MS) return 'online';
  return age < LOST_MS ? 'off' : 'lost';
}

export const TV_HEALTH: Record<TvHealth, { label: string; color: string; hint: string }> = {
  lost: {
    label: 'Sin señal',
    color: 'error.main',
    hint: 'Más de 3 días sin dar señal: puede estar desenchufada, sin WiFi o sin la app. Conviene revisarla.',
  },
  never: {
    label: 'Nunca conectada',
    color: 'warning.main',
    hint: 'Se generó el código pero la TV aún no lo ha abierto.',
  },
  off: {
    label: 'Apagada',
    color: 'text.disabled',
    hint: 'Sin señal hace menos de 3 días: lo normal si está apagada o con otra app delante.',
  },
  online: {
    label: 'Conectada',
    color: 'success.main',
    hint: 'Ha dado señal en los últimos 45 min: está encendida con la pantalla de bienvenida.',
  },
  disabled: {
    label: 'Desactivada',
    color: 'text.disabled',
    hint: 'Desactivada desde el admin: aunque esté encendida no recibe datos.',
  },
};

/** Orden del resumen: primero lo que hay que revisar. */
export const TV_HEALTH_ORDER: TvHealth[] = ['lost', 'never', 'off', 'online', 'disabled'];

export function formatLastSeen(iso: string | null, now = Date.now()): string {
  if (!iso) return 'Nunca conectada';
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
}
