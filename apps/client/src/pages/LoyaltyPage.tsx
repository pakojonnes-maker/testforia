import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScratchCard } from '../components/marketing/ScratchCard';
import { ClaimPrize } from '../components/marketing/ClaimPrize';

interface Reward {
    id: string;
    name: string;
    description: string;
    image_url?: string;
}

interface Campaign {
    id: string;
    name: string;
    content: any;
    restaurant_id?: string;
}

type Status = 'loading' | 'error' | 'ready' | 'playing' | 'won' | 'lost' | 'claimed';

export const LoyaltyPage: React.FC = () => {
    const [searchParams] = useSearchParams();

    // ✅ FIX: Extract ID from URL path — supports /{slug}/loyalty/{id} and /loyalty/{id}
    const extractIdFromPath = (): string | null => {
        const segments = window.location.pathname.split('/').filter(Boolean);
        const loyaltyIndex = segments.indexOf('loyalty');
        if (loyaltyIndex >= 0 && segments[loyaltyIndex + 1]) {
            return segments[loyaltyIndex + 1];
        }
        return null;
    };

    const qrId = extractIdFromPath() || searchParams.get('c');

    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('');
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [reward, setReward] = useState<Reward | null>(null);
    const [restaurantId, setRestaurantId] = useState('');
    const [restaurantSlug, setRestaurantSlug] = useState('');
    const [restaurantName, setRestaurantName] = useState('');
    const [restaurantLogo, setRestaurantLogo] = useState('');
    const [magicLink, setMagicLink] = useState('');
    const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);

    const API = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

    useEffect(() => {
        if (!qrId) {
            setStatus('error');
            setMessage('Código QR inválido');
            return;
        }
        initSession();
    }, [qrId]);

    const initSession = async () => {
        try {
            const res = await fetch(`${API}/api/loyalty/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_id: qrId })
            });
            const data = await res.json();

            if (data.error || !data.has_game) {
                setStatus('error');
                setMessage(data.error || data.message || 'Sin juego activo');
                return;
            }

            setSessionId(data.session_id);
            setCampaign(data.campaign);
            setRestaurantId(data.restaurant_id || data.campaign?.restaurant_id || '');
            setRestaurantSlug(data.restaurant_slug || '');
            setRestaurantName(data.restaurant_name || '');
            setRestaurantLogo(data.restaurant_logo || '');
            setStatus('ready'); // Now shows the "Play" screen instead of auto-playing
        } catch {
            setStatus('error');
            setMessage('Error de conexión');
        }
    };

    // Bug #10 fix: No longer auto-plays. User must press the button.
    const playGame = async () => {
        try {
            const visitorId = localStorage.getItem('vt_visitor_id');
            const res = await fetch(`${API}/api/loyalty/play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    campaign_id: campaign?.id,
                    visitor_id: visitorId
                })
            });
            const data = await res.json();

            if (data.cooldown) {
                setStatus('error');
                setMessage(data.message || 'Ya has jugado hoy. ¡Vuelve mañana!');
                return;
            }

            setReward(data.win && data.reward ? data.reward : null);
            // Haptic feedback on game start
            if (navigator.vibrate) navigator.vibrate(50);
            setStatus('playing');
        } catch {
            setStatus('error');
            setMessage('Error al iniciar');
        }
    };

    const onScratchComplete = () => {
        // Haptic on reveal
        if (navigator.vibrate) navigator.vibrate(reward ? [50, 100, 50, 100, 200] : [200]);
        setStatus(reward ? 'won' : 'lost');
    };

    const handleClaimSuccess = (data: any) => {
        setMagicLink(data.magic_link || '');
        setGoogleReviewUrl(data.google_review_url || null);
        setStatus('claimed');
    };

    // Get the menu URL for CTA buttons
    const menuUrl = restaurantSlug
        ? `https://menu.visualtastes.com/${restaurantSlug}`
        : '';

    // ============================================
    // STYLES
    // ============================================

    const pageStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#fff'
    };

    const cardStyle: React.CSSProperties = {
        background: '#fff',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        color: '#1a1a2e',
        maxWidth: '340px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
    };

    const btnPrimary: React.CSSProperties = {
        display: 'block',
        width: '100%',
        padding: '16px',
        border: 'none',
        borderRadius: '14px',
        fontSize: '17px',
        fontWeight: 700,
        cursor: 'pointer',
        marginTop: '16px',
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        color: '#1a1a2e',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 6px 20px rgba(255,215,0,0.3)'
    };

    const btnSecondary: React.CSSProperties = {
        display: 'block',
        width: '100%',
        padding: '14px',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 500,
        cursor: 'pointer',
        marginTop: '12px',
        background: 'transparent',
        color: 'rgba(255,255,255,0.7)',
        textDecoration: 'none',
        textAlign: 'center' as const
    };

    // ============================================
    // Restaurant Branding Header (Bug F fix)
    // ============================================
    const BrandingHeader = () => (
        (restaurantLogo || restaurantName) ? (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '24px',
                opacity: 0.9
            }}>
                {restaurantLogo && (
                    <img
                        src={restaurantLogo}
                        alt={restaurantName}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid rgba(255,255,255,0.2)'
                        }}
                    />
                )}
                {restaurantName && (
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>
                        {restaurantName}
                    </span>
                )}
            </div>
        ) : null
    );

    // ============================================
    // LOADING
    // ============================================
    if (status === 'loading') {
        return (
            <div style={pageStyle}>
                <div style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>🎰</div>
                <p style={{ marginTop: '16px', opacity: 0.7 }}>Cargando...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ============================================
    // ERROR
    // ============================================
    if (status === 'error') {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                    <h2 style={{ margin: 0 }}>Error</h2>
                    <p style={{ opacity: 0.7 }}>{message}</p>
                    {menuUrl && (
                        <a href={menuUrl} style={{ ...btnSecondary, color: '#667eea' }}>
                            🍽️ Ver menú
                        </a>
                    )}
                </div>
            </div>
        );
    }

    // ============================================
    // READY — Bug #10 fix: Intermediate screen with play button
    // ============================================
    if (status === 'ready') {
        return (
            <div style={pageStyle}>
                <BrandingHeader />
                <div style={{
                    ...cardStyle,
                    background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <div style={{
                        fontSize: '64px',
                        marginBottom: '16px',
                        animation: 'float 3s ease-in-out infinite'
                    }}>
                        🎁
                    </div>
                    <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700 }}>
                        {campaign?.content?.title || '¡Tienes un premio esperándote!'}
                    </h2>
                    <p style={{ opacity: 0.65, fontSize: '14px', margin: '0 0 24px', lineHeight: 1.5 }}>
                        {campaign?.content?.description || 'Rasca la tarjeta y descubre si hoy es tu día de suerte'}
                    </p>
                    <button
                        onClick={playGame}
                        style={btnPrimary}
                    >
                        🎰 ¡Descubrir mi premio!
                    </button>
                    <p style={{ marginTop: '16px', fontSize: '11px', opacity: 0.35 }}>
                        Un intento por día
                    </p>
                </div>
                <style>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-10px); }
                    }
                `}</style>
            </div>
        );
    }

    // ============================================
    // PLAYING
    // ============================================
    if (status === 'playing') {
        return (
            <div style={pageStyle}>
                <BrandingHeader />
                <h1 style={{ fontSize: '22px', marginBottom: '6px', fontWeight: 700 }}>
                    {campaign?.content?.title || '¡Rasca y Gana!'}
                </h1>
                <p style={{ opacity: 0.6, marginBottom: '20px', fontSize: '13px' }}>
                    {campaign?.content?.description || 'Descubre tu premio'}
                </p>

                <ScratchCard
                    width={300}
                    height={340}
                    onReveal={onScratchComplete}
                    revealThreshold={0.30}
                    prizeImageUrl={reward?.image_url}
                    prizeName={reward?.name}
                    prizeDescription={reward?.description}
                    isWin={!!reward}
                />

                <p style={{ marginTop: '20px', fontSize: '12px', opacity: 0.4 }}>
                    Desliza para rascar
                </p>
            </div>
        );
    }

    // ============================================
    // WON
    // ============================================
    if (status === 'won' && reward) {
        return (
            <div style={pageStyle}>
                <BrandingHeader />
                <div style={cardStyle}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
                    <h2 style={{ margin: '0 0 8px' }}>¡Felicidades!</h2>
                    <h3 style={{ margin: '0 0 16px', color: '#667eea' }}>{reward.name}</h3>
                    <p style={{ opacity: 0.7, fontSize: '14px', marginBottom: '24px' }}>
                        {reward.description}
                    </p>
                    <ClaimPrize
                        sessionId={sessionId!}
                        rewardId={reward.id}
                        rewardName={reward.name}
                        rewardDescription={reward.description}
                        campaignId={campaign!.id}
                        restaurantId={restaurantId}
                        restaurantName={restaurantName}
                        restaurantSlug={restaurantSlug}
                        onClaimSuccess={handleClaimSuccess}
                    />
                </div>
            </div>
        );
    }

    // ============================================
    // LOST — Bug #11 fix: Added CTAs (menu + review)
    // ============================================
    if (status === 'lost') {
        return (
            <div style={pageStyle}>
                <BrandingHeader />
                <div style={cardStyle}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍀</div>
                    <h2 style={{ margin: '0 0 8px' }}>¡La próxima será!</h2>
                    <p style={{ opacity: 0.7, fontSize: '14px', marginBottom: '20px' }}>
                        No has ganado esta vez, pero vuelve mañana para intentarlo de nuevo.
                    </p>
                    {menuUrl && (
                        <a href={menuUrl} style={{
                            ...btnPrimary,
                            textDecoration: 'none',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            boxShadow: '0 6px 20px rgba(102,126,234,0.3)'
                        }}>
                            🍽️ Ver nuestro menú
                        </a>
                    )}
                </div>
            </div>
        );
    }

    // ============================================
    // CLAIMED — Bug #12 fix: Removed raw magic link display
    // ============================================
    if (status === 'claimed') {
        return (
            <div style={pageStyle}>
                <BrandingHeader />
                <div style={cardStyle}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                    <h2 style={{ margin: '0 0 8px', color: '#10b981' }}>¡Premio Guardado!</h2>
                    <p style={{ opacity: 0.7, fontSize: '14px', marginBottom: '20px' }}>
                        Guárdalo en WhatsApp para no perderlo. Muéstralo al personal cuando lo visites.
                    </p>

                    {magicLink && (
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                                `🎁 *${restaurantName || 'Mi premio'}*\n\n` +
                                `🏆 ${reward?.name || 'Premio'}\n` +
                                `${reward?.description || ''}\n\n` +
                                `🔗 Ver premio: ${magicLink}`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                ...btnPrimary,
                                background: '#25D366',
                                color: '#fff',
                                textDecoration: 'none',
                                boxShadow: '0 6px 20px rgba(37,211,102,0.3)'
                            }}
                        >
                            💬 Guardar en WhatsApp
                        </a>
                    )}

                    {googleReviewUrl && (
                        <a
                            href={googleReviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                ...btnSecondary,
                                color: '#4285F4',
                                borderColor: 'rgba(66,133,244,0.3)'
                            }}
                        >
                            ⭐ Déjanos una reseña
                        </a>
                    )}

                    {menuUrl && (
                        <a href={menuUrl} style={btnSecondary}>
                            🍽️ Ver menú
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return null;
};
