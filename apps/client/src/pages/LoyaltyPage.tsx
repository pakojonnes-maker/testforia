import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
    const params = useParams<{ qrId: string }>();
    const [searchParams] = useSearchParams();
    const qrId = params.qrId || searchParams.get('c');

    const [status, setStatus] = useState<Status>('loading');
    const [message, setMessage] = useState('');
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [reward, setReward] = useState<Reward | null>(null);
    const [restaurantId, setRestaurantId] = useState('');
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
            setStatus('ready');
        } catch {
            setStatus('error');
            setMessage('Error de conexión');
        }
    };

    useEffect(() => {
        if (status === 'ready') playGame();
    }, [status]);

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

            // Handle cooldown (fraud prevention)
            if (data.cooldown) {
                setStatus('error');
                setMessage(data.message || 'Ya has jugado hoy. ¡Vuelve mañana!');
                return;
            }

            setReward(data.win && data.reward ? data.reward : null);
            setStatus('playing');
        } catch {
            setStatus('error');
            setMessage('Error al iniciar');
        }
    };

    const onScratchComplete = () => setStatus(reward ? 'won' : 'lost');

    const handleClaimSuccess = (data: any) => {
        setMagicLink(data.magic_link || '');
        setGoogleReviewUrl(data.google_review_url || null);
        setStatus('claimed');
    };

    // STYLES
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

    const btnStyle: React.CSSProperties = {
        display: 'block',
        width: '100%',
        padding: '14px',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        marginTop: '16px'
    };

    // LOADING
    if (status === 'loading') {
        return (
            <div style={pageStyle}>
                <div style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>🎰</div>
                <p style={{ marginTop: '16px', opacity: 0.7 }}>Cargando...</p>
            </div>
        );
    }

    // ERROR
    if (status === 'error') {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                    <h2 style={{ margin: 0 }}>Error</h2>
                    <p style={{ opacity: 0.7 }}>{message}</p>
                </div>
            </div>
        );
    }

    // PLAYING
    if (status === 'playing') {
        return (
            <div style={pageStyle}>
                <h1 style={{ fontSize: '24px', marginBottom: '8px', fontWeight: 700 }}>
                    {campaign?.content?.title || '¡Rasca y Gana!'}
                </h1>
                <p style={{ opacity: 0.7, marginBottom: '24px', fontSize: '14px' }}>
                    {campaign?.content?.description || 'Descubre tu premio'}
                </p>


                <ScratchCard
                    width={300}
                    height={340}
                    onReveal={onScratchComplete}
                    prizeImageUrl={reward?.image_url}
                    prizeName={reward?.name}
                    prizeDescription={reward?.description}
                    isWin={!!reward}
                />

                <p style={{ marginTop: '24px', fontSize: '12px', opacity: 0.5 }}>
                    Desliza para rascar
                </p>
            </div>
        );
    }

    // WON
    if (status === 'won' && reward) {
        return (
            <div style={pageStyle}>
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
                        campaignId={campaign!.id}
                        restaurantId={restaurantId}
                        onClaimSuccess={handleClaimSuccess}
                    />
                </div>
            </div>
        );
    }

    // LOST
    if (status === 'lost') {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍀</div>
                    <h2 style={{ margin: '0 0 8px' }}>¡Vuelve pronto!</h2>
                    <p style={{ opacity: 0.7, fontSize: '14px' }}>
                        No has ganado esta vez, pero sigue intentándolo.
                    </p>
                </div>
            </div>
        );
    }

    // CLAIMED
    if (status === 'claimed') {
        return (
            <div style={pageStyle}>
                <div style={cardStyle}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                    <h2 style={{ margin: '0 0 8px', color: '#10b981' }}>¡Premio Guardado!</h2>
                    <p style={{ opacity: 0.7, fontSize: '14px', marginBottom: '16px' }}>
                        Te enviaremos un recordatorio.
                    </p>

                    {magicLink && (
                        <div style={{
                            background: '#f3f4f6',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            wordBreak: 'break-all',
                            marginBottom: '16px'
                        }}>
                            {magicLink}
                        </div>
                    )}

                    {googleReviewUrl && (
                        <a
                            href={googleReviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                ...btnStyle,
                                background: '#4285F4',
                                color: '#fff',
                                textDecoration: 'none'
                            }}
                        >
                            ⭐ Déjanos una reseña
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return null;
};
