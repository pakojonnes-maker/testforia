import { useEffect, useMemo, useState } from 'react';
import type { LoyaltyCard } from '../components/loyalty/LoyaltyCardModal';
import { getVisitorId, setVisitorId } from '../lib/visitor';

/**
 * Devuelve el id de visitante creándolo si hace falta.
 *
 * ⚖️ Llamar SOLO desde una acción explícita del cliente sobre la tarjeta de
 * fidelización (sellar). Sin "recordar este dispositivo" la carta no guarda ningún
 * id, y sin él la tarjeta no tendría identidad y no se podría sellar.
 *
 * Crearlo aquí es lícito sin consentimiento de analítica porque es
 * "estrictamente necesario para prestar un servicio expresamente solicitado por
 * el usuario" (excepción del art. 22.2 LSSI): el cliente está pidiendo su sello.
 * La base jurídica del tratamiento es contractual (art. 6.1.b RGPD), no
 * consentimiento. Por eso este id solo viaja con la analítica si además dijo que sí
 * a "recordar este dispositivo" (lib/visitor.ts). Lo que NO puede hacerse es crearlo al
 * cargar la carta.
 */
export function ensureVisitorId(): string {
    const existing = getVisitorId();
    if (existing) return existing;
    const id = crypto.randomUUID
        ? crypto.randomUUID()
        : `vt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    // Sin storage (modo privado) el id vive solo esta sesión y el sello no persistirá
    // entre visitas, pero la operación en curso funciona.
    setVisitorId(id);
    return id;
}

/**
 * Loyalty stamp card: program config comes from reelConfig (server), the card
 * itself is local state so it updates immediately after stamping without
 * refetching the whole menu. LoyaltyCardModal pide la tarjeta de este móvil al abrirse.
 */
export function useLoyaltyCard(reelConfig: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const loyaltyProgram = useMemo(() => reelConfig?.loyalty?.program || null, [reelConfig]);
    const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);

    useEffect(() => {
        setLoyaltyCard(reelConfig?.loyalty?.card || null);
    }, [reelConfig]);

    const visitorId = useMemo(getVisitorId, []);

    return { loyaltyProgram, loyaltyCard, setLoyaltyCard, visitorId };
}
