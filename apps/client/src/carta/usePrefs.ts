import { useCallback, useEffect, useRef, useState } from 'react';

// Preferencias del cliente que solo viven en su móvil y que él mismo pide guardar
// (sus me gusta, los alérgenos que evita, el idioma). Son funcionales: no identifican
// a nadie ni salen del dispositivo, así que no dependen del banner de cookies.

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin storage (modo privado): la lista vive solo mientras la pestaña esté abierta
  }
}

export function useStoredList(key: string) {
  const [list, setList] = useState<string[]>(() => read(key));
  const ref = useRef(list);
  useEffect(() => {
    ref.current = read(key);
    setList(ref.current);
  }, [key]);

  const commit = useCallback((next: string[]) => {
    ref.current = next;
    write(key, next);
    setList(next);
  }, [key]);

  /** Devuelve si el elemento queda marcado. */
  const toggle = useCallback((id: string): boolean => {
    const on = !ref.current.includes(id);
    commit(on ? [...ref.current, id] : ref.current.filter((x) => x !== id));
    return on;
  }, [commit]);

  const add = useCallback((id: string) => {
    if (!ref.current.includes(id)) commit([...ref.current, id]);
  }, [commit]);

  return { list, toggle, add };
}

export function readLanguage(slug: string): string | null {
  try {
    return localStorage.getItem(`vt_lang_${slug}`);
  } catch {
    return null;
  }
}

/** Idioma con el que se abre la carta: el que eligió el cliente aquí antes, o el de su móvil. */
export function pickInitialLanguage(slug: string): string {
  const stored = readLanguage(slug);
  if (stored) return stored;
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'es').split('-')[0];
  return nav || 'es';
}

export function saveLanguage(slug: string, lang: string) {
  try {
    localStorage.setItem(`vt_lang_${slug}`, lang);
  } catch {
    // ignorar
  }
}
