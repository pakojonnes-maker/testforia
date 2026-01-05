import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ScratchCardProps {
    width?: number;
    height?: number;
    onReveal?: () => void;
    revealThreshold?: number;
    prizeImageUrl?: string;
    prizeName?: string;
    prizeDescription?: string;
    isWin?: boolean;
}

/**
 * Premium ScratchCard Component
 * Features:
 * - Elegant metallic scratch surface with shimmer effect
 * - Prize image reveal underneath
 * - Confetti celebration on win
 */
export const ScratchCard: React.FC<ScratchCardProps> = ({
    width = 300,
    height = 340,
    onReveal,
    revealThreshold = 0.45,
    prizeImageUrl,
    prizeName,
    prizeDescription,
    isWin = true
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScratching, setIsScratching] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const checkTimeout = useRef<number | null>(null);

    // Draw elegant scratch surface
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || revealed) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Premium silver/platinum gradient
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#C0C0C0');
        grad.addColorStop(0.3, '#E8E8E8');
        grad.addColorStop(0.5, '#F5F5F5');
        grad.addColorStop(0.7, '#E0E0E0');
        grad.addColorStop(1, '#A8A8A8');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Add subtle noise texture
        const imageData = ctx.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 15;
            imageData.data[i] += noise;
            imageData.data[i + 1] += noise;
            imageData.data[i + 2] += noise;
        }
        ctx.putImageData(imageData, 0, 0);

        // Elegant border
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, width - 8, height - 8);

        // Inner shadow effect
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, width - 12, height - 12);

        // Scratch instruction text
        ctx.fillStyle = 'rgba(80,80,80,0.8)';
        ctx.font = 'bold 16px "SF Pro Display", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✨ RASCA AQUÍ ✨', width / 2, height / 2 - 10);

        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(100,100,100,0.7)';
        ctx.fillText('Desliza para descubrir', width / 2, height / 2 + 15);

    }, [width, height, revealed]);

    const getPos = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        const me = e as React.MouseEvent;
        return { x: me.clientX - rect.left, y: me.clientY - rect.top };
    }, []);

    const scratch = useCallback((pos: { x: number; y: number }) => {
        const canvas = canvasRef.current;
        if (!canvas || revealed) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 50;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        if (lastPos.current) {
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
        } else {
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x, pos.y);
        }
        ctx.stroke();
        lastPos.current = pos;
    }, [revealed]);

    const scheduleRevealCheck = useCallback(() => {
        if (checkTimeout.current) {
            window.clearTimeout(checkTimeout.current);
        }
        checkTimeout.current = window.setTimeout(() => {
            const canvas = canvasRef.current;
            if (!canvas || revealed) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const imgData = ctx.getImageData(0, 0, width, height);
            let transparent = 0;
            for (let i = 3; i < imgData.data.length; i += 4 * 50) {
                if (imgData.data[i] === 0) transparent++;
            }
            const total = Math.floor(imgData.data.length / (4 * 50));
            if (transparent / total > revealThreshold) {
                setRevealed(true);
                if (isWin) setShowConfetti(true);
                onReveal?.();
            }
        }, 200);
    }, [width, height, revealed, revealThreshold, onReveal, isWin]);

    useEffect(() => {
        return () => {
            if (checkTimeout.current) window.clearTimeout(checkTimeout.current);
        };
    }, []);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsScratching(true);
        const pos = getPos(e);
        lastPos.current = pos;
        scratch(pos);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isScratching) return;
        scratch(getPos(e));
        scheduleRevealCheck();
    };

    const handleEnd = () => {
        setIsScratching(false);
        lastPos.current = null;
        scheduleRevealCheck();
    };

    // Generate confetti particles
    const confettiElements = showConfetti ? Array.from({ length: 50 }).map((_, i) => (
        <div
            key={i}
            style={{
                position: 'absolute',
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#3498DB'][i % 5],
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animation: `confetti-fall ${1.5 + Math.random()}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.3}s`,
                transform: `rotate(${Math.random() * 360}deg)`
            }}
        />
    )) : null;

    return (
        <div style={{ position: 'relative' }}>
            {/* Confetti animation styles */}
            <style>{`
                @keyframes confetti-fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
                }
                @keyframes prize-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.4); }
                    50% { box-shadow: 0 0 40px rgba(255,215,0,0.8); }
                }
            `}</style>

            {/* Confetti container */}
            {showConfetti && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    {confettiElements}
                </div>
            )}

            <div
                style={{
                    position: 'relative',
                    width: `${width}px`,
                    height: `${height}px`,
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: revealed && isWin
                        ? '0 10px 50px rgba(255,215,0,0.4), 0 0 0 3px rgba(255,215,0,0.3)'
                        : '0 15px 50px rgba(0,0,0,0.3)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    touchAction: 'none',
                    animation: revealed && isWin ? 'prize-glow 2s ease-in-out infinite' : 'none'
                }}
            >
                {/* Prize content underneath */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    background: isWin
                        ? 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)'
                        : 'linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%)'
                }}>
                    {/* Prize Image */}
                    {prizeImageUrl && isWin ? (
                        <div style={{
                            flex: 1,
                            backgroundImage: `url(${prizeImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            position: 'relative'
                        }}>
                            {/* Gradient overlay for text readability */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: '60%',
                                background: 'linear-gradient(transparent, rgba(0,0,0,0.9))'
                            }} />
                        </div>
                    ) : (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '64px'
                        }}>
                            {isWin ? '🎁' : '😔'}
                        </div>
                    )}

                    {/* Prize Info */}
                    <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: 'white',
                        position: prizeImageUrl && isWin ? 'absolute' : 'relative',
                        bottom: 0,
                        left: 0,
                        right: 0
                    }}>
                        <div style={{
                            fontSize: '22px',
                            fontWeight: 700,
                            marginBottom: '6px',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            fontFamily: '"SF Pro Display", system-ui, sans-serif'
                        }}>
                            {isWin ? (prizeName || '¡PREMIO!') : 'Suerte la próxima'}
                        </div>
                        {isWin && prizeDescription && (
                            <div style={{
                                fontSize: '14px',
                                opacity: 0.85,
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                                {prizeDescription}
                            </div>
                        )}
                    </div>
                </div>

                {/* Scratch layer */}
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1,
                        cursor: 'crosshair',
                        opacity: revealed ? 0 : 1,
                        transition: 'opacity 0.8s ease-out',
                        pointerEvents: revealed ? 'none' : 'auto'
                    }}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                />
            </div>
        </div>
    );
};

export default ScratchCard;
