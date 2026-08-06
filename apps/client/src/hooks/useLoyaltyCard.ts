import { useEffect, useMemo, useState } from 'react';
import type { LoyaltyCard } from '../components/loyalty/LoyaltyCardModal';

const VISITOR_KEY = 'vt_visitor_id';
const VISITOR_TTL = 365 * 24 * 60 * 60 * 1000; // 12 meses

function readVisitorId(): string | null {
    try {
        const raw = localStorage.getItem(VISITOR_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed.value && (!parsed.expiry || Date.now() <= parsed.expiry)) return parsed.value;
        return null;
    } catch {
        return null;
    }
}

/**
 * Devuelve el id de visitante creándolo si hace falta.
 *
 * ⚖️ Llamar SOLO desde una acción explícita del cliente sobre la tarjeta de
 * fidelización (sellar). Desde que la analítica es opt-in real, `vt_visitor_id`
 * solo lo crea el tracking cuando hay consentimiento — y sin él la tarjeta se
 * quedaba sin identidad y no se podía sellar.
 *
 * Crearlo aquí es lícito sin consentimiento de analítica porque es
 * "estrictamente necesario para prestar un servicio expresamente solicitado por
 * el usuario" (excepción del art. 22.2 LSSI): el cliente está pidiendo su sello.
 * La base jurídica del tratamiento es contractual (art. 6.1.b RGPD), no
 * consentimiento. Lo que NO puede hacerse es crearlo al cargar la carta.
 */
export function ensureVisitorId(): string {
    const existing = readVisitorId();
    if (existing) return existing;

    const id = crypto.randomUUID
        ? crypto.randomUUID()
        : `vt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
        localStorage.setItem(VISITOR_KEY, JSON.stringify({ value: id, expiry: Date.now() + VISITOR_TTL }));
    } catch {
        // Sin storage (modo privado): el id vive solo esta sesión y el sello no
        // persistirá entre visitas, pero la operación en curso funciona.
    }
    return id;
}

/**
 * Loyalty stamp card: program config comes from reelConfig (server), the card
 * itself is local state so it updates immediately after stamping without
 * refetching the whole menu.
 */
export function useLoyaltyCard(reelConfig: any) {
    const loyaltyProgram = useMemo(() => reelConfig?.loyalty?.program || null, [reelConfig]);
    const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);

    useEffect(() => {
        setLoyaltyCard(reelConfig?.loyalty?.card || null);
    }, [reelConfig]);

    const visitorId = useMemo(readVisitorId, []);

    return { loyaltyProgram, loyaltyCard, setLoyaltyCard, visitorId };
}
