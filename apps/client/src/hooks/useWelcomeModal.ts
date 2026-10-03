import { useEffect, useMemo, useState } from 'react';

/**
 * Owns the welcome_modal campaign extraction + its auto-open scheduling.
 * settings.frequency controls how often it reappears: 'once' | 'session' | 'daily' | 'always'.
 */
/**
 * content/settings de una campaña: llegan como texto JSON (así los guarda el admin), a veces ya
 * como objeto, y alguno roto en producción. Nunca lanza: lo que no sea un objeto vale {}.
 */
export function parseCampaignJson(raw: unknown): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (raw && typeof raw === 'object') return raw as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (typeof raw !== 'string' || !raw) return {};
    try {
        const v = JSON.parse(raw);
        return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch {
        return {};
    }
}

export function useWelcomeModal(reelConfig: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const marketingCampaign = useMemo(() => reelConfig?.marketing, [reelConfig]);
    const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

    useEffect(() => {
        if (!marketingCampaign || !reelConfig?.restaurant?.id) return;

        // settings llega como texto: antes se leía `.auto_open` de un string y la frecuencia y
        // el retardo que se eligen en el admin no se aplicaban nunca.
        const settings = parseCampaignJson(marketingCampaign.settings);
        const isEnabled = settings.auto_open !== false;
        if (!isEnabled) return;

        const delay = Number(settings.delay) || 1500;
        const frequency = settings.frequency || 'once';
        const onceKey = `welcome_seen_${marketingCampaign.id}`;
        const dailyKey = `welcome_seen_day_${marketingCampaign.id}`;
        const sessionKey = `welcome_seen_session_${marketingCampaign.id}`;

        let alreadyShown = false;
        if (frequency === 'once') {
            alreadyShown = !!localStorage.getItem(onceKey);
        } else if (frequency === 'daily') {
            alreadyShown = localStorage.getItem(dailyKey) === new Date().toDateString();
        } else if (frequency === 'session') {
            alreadyShown = !!sessionStorage.getItem(sessionKey);
        }
        // 'always' never blocks

        if (alreadyShown) return;

        const timer = setTimeout(() => {
            setWelcomeModalOpen(true);
            if (frequency === 'once') localStorage.setItem(onceKey, 'true');
            else if (frequency === 'daily') localStorage.setItem(dailyKey, new Date().toDateString());
            else if (frequency === 'session') sessionStorage.setItem(sessionKey, 'true');
        }, delay);
        return () => clearTimeout(timer);
    }, [reelConfig?.restaurant?.id, marketingCampaign]);

    return { marketingCampaign, welcomeModalOpen, setWelcomeModalOpen };
}
