import { useEffect, useMemo, useState } from 'react';
import type { LoyaltyCard } from '../components/loyalty/LoyaltyCardModal';

function readVisitorId(): string | null {
    try {
        const raw = localStorage.getItem('vt_visitor_id');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed.value && (!parsed.expiry || Date.now() <= parsed.expiry)) return parsed.value;
        return null;
    } catch {
        return null;
    }
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
