import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Add, Remove, Favorite, FavoriteBorder, AddShoppingCart } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useDishTracking } from '../../../../providers/TrackingAndPushProvider';
import { useTranslation } from '../../../../contexts/TranslationContext';

// ======================================================================
// DISH LIST ITEM COMPONENT - DESIGN "PREMIUM EDITORIAL"
// ======================================================================

interface DishListItemProps {
    dish: any;
    currentLanguage: string;
    colors: any;
    onAddToCart: (dish: any, quantity: number, portion?: 'full' | 'half', price?: number) => void;
    cartQuantity: number;
    onDishClick: (dish: any) => void;
    index: number;
    isActive: boolean;
    onActivate: () => void;
}

const DishListItem: React.FC<DishListItemProps> = ({
    dish,
    currentLanguage,
    colors,
    onAddToCart,
    cartQuantity,
    onDishClick,
    index,
    isActive,
    onActivate
}) => {
    const { t } = useTranslation();
    const [quantity, setQuantity] = useState(1);
    const { favoriteDish, isFavorited } = useDishTracking();
    const [isFavorite, setIsFavorite] = useState(false);

    // Video Transition State
    const [videoStarted, setVideoStarted] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    // Reset video state when activity changes (or if recycled)
    useEffect(() => {
        if (!isActive) {
            setVideoStarted(false);
        }
    }, [isActive]);

    useEffect(() => {
        if (dish?.id) {
            setIsFavorite(isFavorited(dish.id));
        }
    }, [dish?.id, isFavorited]);

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isFavorite;
        setIsFavorite(newState);
        favoriteDish(dish.id, newState);
    };

    const dishName = dish?.translations?.name?.[currentLanguage] || dish?.name || t('dish_untitled', 'Plato');
    const description = dish?.translations?.description?.[currentLanguage] || dish?.description || '';
    const media = dish?.media?.[0];
    const mediaUrl = media?.url;
    const isVideo = media?.type === 'video' || mediaUrl?.endsWith('.mp4');

    // Animation direction based on index
    const initialX = index % 2 === 0 ? '-20px' : '20px'; // Reduced movement for list view

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart(dish, quantity, 'full', dish.price);
        setQuantity(1);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: initialX }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
            style={{ marginBottom: '16px', cursor: 'pointer' }}
            onClick={() => onDishClick(dish)}
            // ✅ Trigger Activation on Interaction
            onTouchStart={() => onActivate()}
            onMouseEnter={() => onActivate()}
        >
            <Box
                sx={{
                    position: 'relative',
                    overflow: 'visible',
                }}
            >
                {/* Glow Effect behind the card */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: '10%',
                        left: '10%',
                        right: '10%',
                        bottom: '10%',
                        background: `radial-gradient(circle, ${colors.primary}30 0%, transparent 70%)`,
                        filter: 'blur(20px)',
                        opacity: 0.3,
                        zIndex: 0,
                    }}
                />

                <Box
                    sx={{
                        position: 'relative',
                        bgcolor: 'rgba(20,20,20,0.85)',
                        borderRadius: 3,
                        backdropFilter: 'blur(30px)',
                        border: `1px solid ${colors.secondary}40`,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'row',
                        zIndex: 1,
                        boxShadow: `0 4px 16px rgba(0,0,0,0.2)`,
                        minHeight: '140px'
                    }}
                >
                    {/* Left: Video/Image Container */}
                    <Box sx={{
                        position: 'relative',
                        width: '130px',
                        minWidth: '130px',
                        bgcolor: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRight: `1px solid ${colors.secondary}20`
                    }}>
                        {mediaUrl ? (
                            <>
                                {/* ✅ Render Video ONLY if Active */}
                                {isActive && isVideo ? (
                                    <video
                                        ref={videoRef}
                                        src={mediaUrl}
                                        playsInline
                                        muted
                                        autoPlay // Controlled by mount
                                        loop
                                        // poster={media?.thumbnail_url} // Removed for custom overlay
                                        onPlaying={() => setVideoStarted(true)}
                                        onTimeUpdate={(e) => {
                                            if (e.currentTarget.currentTime > 0.1 && !videoStarted) {
                                                setVideoStarted(true);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : null}

                                {/* ✅ Custom Overlay for Smooth Transition & Inactive State */}
                                <Box
                                    component="img"
                                    src={media?.thumbnail_url || mediaUrl}
                                    alt={dishName}
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        zIndex: 2,
                                        opacity: (isActive && videoStarted) ? 0 : 1, // Fade out only when playing
                                        transition: 'opacity 0.5s ease-out',
                                        pointerEvents: 'none',
                                        willChange: 'opacity'
                                    }}
                                />
                            </>
                        ) : (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                                    {t('no_media', 'Sin imagen')}
                                </Typography>
                            </Box>
                        )}

                        {/* Cart Counter Badge */}
                        {cartQuantity > 0 && (
                            <Box sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                bgcolor: colors.primary,
                                color: '#fff',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                zIndex: 5
                            }}>
                                {cartQuantity}
                            </Box>
                        )}
                    </Box>

                    {/* Right: Content & Actions */}
                    <Box sx={{
                        p: 1.5,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                    }}>
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: colors.text,
                                        fontFamily: '"Fraunces", serif',
                                        fontWeight: 700,
                                        fontSize: '1.1rem',
                                        lineHeight: 1.2,
                                        mb: 0.5
                                    }}
                                >
                                    {dishName}
                                </Typography>

                                <Typography sx={{
                                    color: colors.secondary,
                                    fontWeight: 700,
                                    fontFamily: '"Fraunces", serif',
                                    fontSize: '1rem',
                                    whiteSpace: 'nowrap'
                                }}>
                                    €{(dish.price || 0).toFixed(2)}
                                </Typography>
                            </Box>

                            {description && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: '0.8rem',
                                        lineHeight: 1.4,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        mb: 1
                                    }}
                                >
                                    {description}
                                </Typography>
                            )}
                        </Box>

                        {/* Action Bar */}
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mt: 'auto'
                        }}>
                            <IconButton
                                onClick={handleFavorite}
                                size="small"
                                sx={{
                                    color: isFavorite ? colors.primary : 'rgba(255,255,255,0.4)',
                                    p: 0.5,
                                    mr: 1,
                                    '&:hover': { color: colors.primary }
                                }}
                            >
                                {isFavorite ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                            </IconButton>

                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: 'rgba(255,255,255,0.05)',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.1)',
                                p: 0.25 // Minimal padding
                            }}>
                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (quantity > 1) setQuantity(quantity - 1);
                                    }}
                                    size="small"
                                    sx={{
                                        color: '#FF4444',
                                        width: 28,
                                        height: 28,
                                    }}
                                >
                                    <Remove fontSize="small" sx={{ fontSize: '1rem' }} />
                                </IconButton>

                                <Typography sx={{
                                    mx: 1,
                                    color: '#fff',
                                    fontWeight: 700,
                                    minWidth: '16px',
                                    textAlign: 'center',
                                    fontSize: '0.9rem',
                                }}>
                                    {quantity}
                                </Typography>

                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setQuantity(quantity + 1);
                                    }}
                                    size="small"
                                    sx={{
                                        color: '#fff',
                                        width: 28,
                                        height: 28,
                                    }}
                                >
                                    <Add fontSize="small" sx={{ fontSize: '1rem' }} />
                                </IconButton>
                            </Box>

                            {/* ✅ Add to Cart Icon Button */}
                            <IconButton
                                onClick={handleAdd}
                                size="small"
                                sx={{
                                    ml: 1,
                                    bgcolor: colors.accent || colors.secondary,
                                    color: '#000',
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%', // Circle shape
                                    '&:hover': {
                                        bgcolor: colors.accent || colors.secondary,
                                        filter: 'brightness(1.1)',
                                        transform: 'scale(1.05)'
                                    },
                                    transition: 'all 0.2s',
                                    boxShadow: `0 4px 12px ${colors.accent || colors.secondary}40`
                                }}
                            >
                                <AddShoppingCart sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </motion.div>
    );
};

// ======================================================================
// LIST VIEW CONTAINER ESTRUCTURA
// ======================================================================

interface ListViewProps {
    sections: any[];
    config: any;
    currentLanguage: string;
    onAddToCart: (dish: any, quantity: number, portion?: 'full' | 'half', price?: number) => void;
    cart: any[];
    activeSectionId?: string;
    onDishClick: (dish: any) => void;
    onActiveSectionChange?: (sectionIndex: number) => void; // ✅ Callback for sync
}

const ListView: React.FC<ListViewProps> = ({
    sections,
    config,
    currentLanguage,
    onAddToCart,
    cart,
    activeSectionId,
    onDishClick,
    onActiveSectionChange
}) => {
    const { t } = useTranslation();
    const branding = config?.restaurant?.branding || {};
    const colors = {
        primary: branding.primary_color || branding.primaryColor || '#FF6B6B',
        secondary: branding.secondary_color || branding.secondaryColor || '#4ECDC4',
        accent: branding.accent_color || branding.accentColor || '#FF8C42',
        text: branding.text_color || branding.textColor || '#FFFFFF',
        background: branding.background_color || branding.backgroundColor || '#000000'
    };

    const [activeDishId, setActiveDishId] = useState<string | null>(null);
    const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Track if strict scrolling is needed (prevent loop)
    const lastReportedSectionRef = useRef<string | null>(null);
    const isManualScrollRef = useRef(false);

    // Initialize with first dish
    useEffect(() => {
        if (!activeDishId && sections.length > 0 && sections[0].dishes?.length > 0) {
            setActiveDishId(sections[0].dishes[0].id);
        }
    }, [sections]);

    // ✅ Intersection Observer for Sections (Scroll Spy)
    useEffect(() => {
        if (!onActiveSectionChange) return;

        const observerOptions = {
            root: null,
            rootMargin: '-40% 0px -40% 0px', // Center band of screen
            threshold: 0
        };

        const observerCallback: IntersectionObserverCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id.replace('section-', '');

                    // Avoid duplicate updates
                    if (lastReportedSectionRef.current !== sectionId) {
                        const index = sections.findIndex(s => s.id === sectionId);
                        if (index !== -1) {
                            // Mark that this change comes from manual scrolling
                            isManualScrollRef.current = true;
                            lastReportedSectionRef.current = sectionId;

                            // console.log(`📜 [ListView] User scrolled to section: ${sectionId} (Index: ${index})`);
                            onActiveSectionChange(index);

                            // Reset manual scroll flag after a delay to allow prop echo to settle
                            setTimeout(() => {
                                isManualScrollRef.current = false;
                            }, 1000);
                        }
                    }
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);

        Object.values(sectionRefs.current).forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [sections, onActiveSectionChange]);

    // Handle Scroll from Prop (External change, e.g. switching from Reel)
    useEffect(() => {
        if (activeSectionId &&
            sectionRefs.current[activeSectionId] &&
            activeSectionId !== lastReportedSectionRef.current &&
            !isManualScrollRef.current // Only scroll if NOT user-driven
        ) {
            sectionRefs.current[activeSectionId]?.scrollIntoView({ behavior: 'auto', block: 'start' });

            // Sync local ref to prevent immediate echo back
            lastReportedSectionRef.current = activeSectionId;
        }
    }, [activeSectionId]);

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                pt: '120px', // ✅ Increased from 60px to 120px to prevent header cut-off
                pb: '120px',
                px: 2,
                scrollBehavior: 'smooth',
                // Scrollbar styling
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }
            }}
        >
            <Box sx={{ maxWidth: '600px', mx: 'auto' }}>
                {sections.map((section, _index) => {
                    const sectionName = section?.translations?.name?.[currentLanguage] || section?.name || t('default_section_name', 'Sección');

                    return (
                        <Box
                            key={section.id}
                            id={`section-${section.id}`}
                            ref={(el: any) => sectionRefs.current[section.id] = el}
                            sx={{ mb: 8, scrollMarginTop: '120px' }} // Match padding-top
                        >
                            {/* Section Header - Static */}
                            <Box
                                sx={{
                                    borderBottom: `1px solid ${colors.secondary}`,
                                    py: 1,
                                    mb: 4,
                                    mx: -2,
                                    px: 2,
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Typography
                                    variant="h5"
                                    sx={{
                                        color: colors.secondary,
                                        fontFamily: '"Fraunces", serif',
                                        fontWeight: 700,
                                        textShadow: `0 0 15px ${colors.secondary}40`,
                                    }}
                                >
                                    {sectionName}
                                </Typography>
                            </Box>


                            <Box>
                                {section.dishes?.map((dish: any, idx: number) => (
                                    <DishListItem
                                        key={dish.id}
                                        index={idx}
                                        dish={dish}
                                        currentLanguage={currentLanguage}
                                        colors={colors}
                                        onAddToCart={onAddToCart}
                                        cartQuantity={cart.find(item => item.dishId === dish.id)?.quantity || 0}
                                        onDishClick={onDishClick}
                                        isActive={activeDishId === dish.id}
                                        onActivate={() => setActiveDishId(dish.id)}
                                    />
                                ))}
                            </Box>
                        </Box >
                    );
                })}
            </Box >
        </Box >
    );
};

export default ListView;
