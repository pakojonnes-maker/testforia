import { useEffect, useMemo, useState } from 'react';

/**
 * Owns the welcome_modal campaign extraction + its auto-open scheduling.
 * settings.frequency controls how often it reappears: 'once' | 'session' | 'daily' | 'always'.
 */
export function useWelcomeModal(reelConfig: any) {
    const marketingCampaign = useMemo(() => reelConfig?.marketing, [reelConfig]);
    const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);

    useEffect(() => {
        if (!marketingCampaign || !reelConfig?.restaurant?.id) return;

        const isEnabled = marketingCampaign.settings?.auto_open !== false;
        if (!isEnabled) return;

        const delay = marketingCampaign.settings?.delay || 1500;
        const frequency = marketingCampaign.settings?.frequency || 'once';
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
