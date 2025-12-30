import React, { useRef, useEffect, useState, useCallback } from 'react';

interface ScratchCardProps {
    width?: number;
    height?: number;
    onReveal?: () => void;
    revealThreshold?: number;
    children: React.ReactNode;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
    width = 280,
    height = 280,
    onReveal,
    revealThreshold = 0.45,
    children
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScratching, setIsScratching] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const checkTimeout = useRef<number | null>(null);

    // Draw the scratch surface
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || revealed) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Gold gradient background
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#D4AF37');
        grad.addColorStop(0.5, '#F5E6A3');
        grad.addColorStop(1, '#C5A028');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Border
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, width - 16, height - 16);

        // Text
        ctx.fillStyle = '#5D4E37';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎁 RASCA AQUÍ 🎁', width / 2, height / 2);
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
        ctx.lineWidth = 45;
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

    // Throttled reveal check - only runs 300ms after last scratch
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
            // Check every 50th pixel for performance
            for (let i = 3; i < imgData.data.length; i += 4 * 50) {
                if (imgData.data[i] === 0) transparent++;
            }
            const total = Math.floor(imgData.data.length / (4 * 50));
            if (transparent / total > revealThreshold) {
                setRevealed(true);
                onReveal?.();
            }
        }, 300);
    }, [width, height, revealed, revealThreshold, onReveal]);

    // Cleanup timeout on unmount
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
        // Force check on end
        scheduleRevealCheck();
    };

    return (
        <div
            style={{
                position: 'relative',
                width: `${width}px`,
                height: `${height}px`,
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none' // This prevents scrolling, no need for preventDefault
            }}
        >
            {/* Prize content underneath */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {children}
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
                    transition: 'opacity 0.6s ease-out',
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
    );
};

