import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

// Default color values - each completely independent
const DEFAULT_COLORS = {
    primary: '#FFC100',
    secondary: '#4ECDC4',
    accent: '#FF8C42',
    text: '#FFFFFF',
    background: '#000000',
    sectionIconActive: '#4ECDC4',
    sectionIconInactive: '#FFFFFF99',
    sectionTextActive: '#FFFFFF',
    sectionTextInactive: '#FFFFFFBF',
    cardOverlay: '#000000CC',
    buttonHover: '#FFFFFF33',
    headerTitle: '#FFFFFF',
    headerSubtitle: '#FFC100'
};

interface ReelsColors {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
    sectionIconActive: string;
    sectionIconInactive: string;
    sectionTextActive: string;
    sectionTextInactive: string;
    cardOverlay: string;
    buttonHover: string;
    headerTitle: string;
    headerSubtitle: string;
}

export default function ReelsStyling() {
    const { currentRestaurant } = useAuth();
    const queryClient = useQueryClient();
    const restaurantId = currentRestaurant?.id;
    const [reelsColorsData, setReelsColorsData] = useState<ReelsColors | null>(null);

    // Query: Obtener colores de reels (config_overrides)
    const { data: reelsColorsResponse, isLoading: loadingReelsColors, error: reelsColorsError } = useQuery({
        queryKey: ['restaurant-reels-colors', restaurantId],
        queryFn: () => apiClient.getRestaurantStyling(restaurantId),
        enabled: !!restaurantId,
    });

    // Load colors from response - NO linked fallbacks between colors
    useEffect(() => {
        if (reelsColorsResponse?.success) {
            const c = reelsColorsResponse.styling?.customColors || {};
            // Each color only falls back to its OWN default, never to another color
            setReelsColorsData({
                primary: c.primary || DEFAULT_COLORS.primary,
                secondary: c.secondary || DEFAULT_COLORS.secondary,
                accent: c.accent || DEFAULT_COLORS.accent,
                text: c.text || DEFAULT_COLORS.text,
                background: c.background || DEFAULT_COLORS.background,
                sectionIconActive: c.sectionIconActive || DEFAULT_COLORS.sectionIconActive,
                sectionIconInactive: c.sectionIconInactive || DEFAULT_COLORS.sectionIconInactive,
                sectionTextActive: c.sectionTextActive || DEFAULT_COLORS.sectionTextActive,
                sectionTextInactive: c.sectionTextInactive || DEFAULT_COLORS.sectionTextInactive,
                cardOverlay: c.cardOverlay || DEFAULT_COLORS.cardOverlay,
                buttonHover: c.buttonHover || DEFAULT_COLORS.buttonHover,
                headerTitle: c.headerTitle || DEFAULT_COLORS.headerTitle,
                headerSubtitle: c.headerSubtitle || DEFAULT_COLORS.headerSubtitle
            });
        } else if (reelsColorsResponse && !reelsColorsResponse.success) {
            setReelsColorsData({ ...DEFAULT_COLORS });
        }
    }, [reelsColorsResponse]);

    // Mutation para colores de reels
    const reelsColorsMutation = useMutation({
        mutationFn: (colors: ReelsColors) => apiClient.updateRestaurantStyling(restaurantId, colors),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['restaurant-reels-colors', restaurantId] });
            alert('✅ Colores de reels guardados correctamente');
        },
        onError: (error: any) => {
            alert(`❌ Error al guardar colores de reels: ${error.message}`);
        }
    });

    const handleSaveReelsColors = async () => {
        if (reelsColorsData) {
            await reelsColorsMutation.mutateAsync(reelsColorsData);
        }
    };

    const updateReelsColor = (colorField: keyof ReelsColors, value: string) => {
        setReelsColorsData((prev) => prev ? ({ ...prev, [colorField]: value }) : null);
    };

    if (!restaurantId) return <div>No hay restaurante seleccionado</div>;
    if (loadingReelsColors) return <div>Cargando...</div>;
    if (reelsColorsError) return <div>Error: {(reelsColorsError as any).message}</div>;
    if (!reelsColorsData) return null;

    return (
        <div style={styles.tabContent}>
            <div style={styles.mainGrid}>
                {/* LEFT COLUMN: Color Pickers */}
                <div style={styles.pickersColumn}>
                    <Section title="🎨 Colores principales">
                        <p style={styles.description}>
                            Colores base que definen la identidad visual de tus reels.
                        </p>
                        <div style={styles.colorGrid}>
                            <ColorPicker
                                label="Primario (nombre plato, precio)"
                                value={reelsColorsData.primary}
                                onChange={(v) => updateReelsColor('primary', v)}
                            />
                            <ColorPicker
                                label="Secundario (botones, iconos)"
                                value={reelsColorsData.secondary}
                                onChange={(v) => updateReelsColor('secondary', v)}
                            />
                            <ColorPicker
                                label="Acento (botón añadir al carrito)"
                                value={reelsColorsData.accent}
                                onChange={(v) => updateReelsColor('accent', v)}
                            />
                            <ColorPicker
                                label="Texto (descripciones, etiquetas)"
                                value={reelsColorsData.text}
                                onChange={(v) => updateReelsColor('text', v)}
                            />
                            <ColorPicker
                                label="Fondo general"
                                value={reelsColorsData.background}
                                onChange={(v) => updateReelsColor('background', v)}
                            />
                        </div>
                    </Section>

                    <Section title="📍 Encabezado">
                        <p style={styles.description}>
                            Color del título del restaurante y nombre de la sección activa.
                        </p>
                        <div style={styles.colorGrid}>
                            <ColorPicker
                                label="Título del restaurante"
                                value={reelsColorsData.headerTitle}
                                onChange={(v) => updateReelsColor('headerTitle', v)}
                            />
                            <ColorPicker
                                label="Nombre de sección debajo del título"
                                value={reelsColorsData.headerSubtitle}
                                onChange={(v) => updateReelsColor('headerSubtitle', v)}
                            />
                        </div>
                    </Section>

                    <Section title="📍 Barra de secciones">
                        <p style={styles.description}>
                            Personaliza los iconos y textos de la navegación por secciones.
                        </p>
                        <div style={styles.colorGrid}>
                            <ColorPicker
                                label="Icono sección ACTIVA"
                                value={reelsColorsData.sectionIconActive}
                                onChange={(v) => updateReelsColor('sectionIconActive', v)}
                            />
                            <ColorPicker
                                label="Icono sección INACTIVA"
                                value={reelsColorsData.sectionIconInactive}
                                onChange={(v) => updateReelsColor('sectionIconInactive', v)}
                            />
                            <ColorPicker
                                label="Texto sección ACTIVA"
                                value={reelsColorsData.sectionTextActive}
                                onChange={(v) => updateReelsColor('sectionTextActive', v)}
                            />
                            <ColorPicker
                                label="Texto sección INACTIVA"
                                value={reelsColorsData.sectionTextInactive}
                                onChange={(v) => updateReelsColor('sectionTextInactive', v)}
                            />
                        </div>
                    </Section>

                    <Section title="✨ Efectos y overlays">
                        <div style={styles.colorGrid}>
                            <ColorPicker
                                label="Overlay sobre el video"
                                value={reelsColorsData.cardOverlay}
                                onChange={(v) => updateReelsColor('cardOverlay', v)}
                            />
                            <ColorPicker
                                label="Botones al pasar el ratón"
                                value={reelsColorsData.buttonHover}
                                onChange={(v) => updateReelsColor('buttonHover', v)}
                            />
                        </div>
                    </Section>
                </div>

                {/* RIGHT COLUMN: Live Preview */}
                <div style={styles.previewColumn}>
                    <h3 style={styles.previewTitle}>Vista previa en vivo</h3>
                    <ReelsPreview colors={reelsColorsData} />
                </div>
            </div>

            <div style={styles.saveButtonContainer}>
                <button
                    onClick={handleSaveReelsColors}
                    disabled={reelsColorsMutation.isPending}
                    style={{ ...styles.saveButton, ...(reelsColorsMutation.isPending ? styles.saveButtonDisabled : {}) }}
                >
                    {reelsColorsMutation.isPending ? 'Guardando...' : '💾 Guardar colores de reels'}
                </button>
            </div>
        </div>
    );
}

// ==================== COMPONENTS ====================

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div style={styles.section}>
            {title && <h2 style={styles.sectionTitle}>{title}</h2>}
            {children}
        </div>
    );
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    // Handle 8-char hex (with alpha) for the color input
    const colorInputValue = value.length > 7 ? value.substring(0, 7) : value;

    return (
        <div style={styles.colorPickerContainer}>
            <label style={styles.colorPickerLabel}>{label}</label>
            <div style={styles.colorPickerWrapper}>
                <input
                    type="color"
                    value={colorInputValue}
                    onChange={(e) => onChange(e.target.value)}
                    style={styles.colorInput}
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={styles.colorTextInput}
                    placeholder="#RRGGBB or #RRGGBBAA"
                />
            </div>
        </div>
    );
}

// ==================== LIVE PREVIEW COMPONENT ====================

function ReelsPreview({ colors }: { colors: ReelsColors }) {
    return (
        <div style={{
            ...styles.phoneFrame,
            background: colors.background
        }}>
            {/* Status bar mock */}
            <div style={styles.statusBar}>
                <span style={{ color: colors.text, fontSize: '0.7rem' }}>9:41</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <span style={{ color: colors.text, fontSize: '0.6rem' }}>📶</span>
                    <span style={{ color: colors.text, fontSize: '0.6rem' }}>🔋</span>
                </div>
            </div>

            {/* Header with restaurant name and section */}
            <div style={{
                padding: '8px 12px',
                textAlign: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <h3 style={{
                    color: colors.headerTitle,
                    margin: '0 0 2px 0',
                    fontSize: '0.95rem',
                    fontWeight: 700
                }}>
                    Restaurante
                </h3>
                <span style={{
                    color: colors.headerSubtitle,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    textTransform: 'uppercase'
                }}>
                    BURGERS
                </span>
            </div>

            {/* Video area with overlay */}
            <div style={{
                flex: 1,
                background: `linear-gradient(180deg, transparent 50%, ${colors.cardOverlay})`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '12px',
                position: 'relative'
            }}>
                {/* Dish info */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <h4 style={{
                        color: colors.primary,
                        margin: '0 0 4px 0',
                        fontSize: '1.1rem',
                        fontWeight: 700
                    }}>
                        Hamburguesa Deluxe
                    </h4>
                    <p style={{
                        color: colors.text,
                        margin: '0 0 8px 0',
                        fontSize: '0.75rem',
                        opacity: 0.85
                    }}>
                        Carne 200g, queso cheddar, lechuga, tomate
                    </p>
                    <span style={{
                        color: colors.secondary,
                        fontWeight: 700,
                        fontSize: '1rem'
                    }}>
                        €12.50
                    </span>
                </div>

                {/* Side action buttons */}
                <div style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: colors.buttonHover,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}>
                        <span style={{ fontSize: '1rem' }}>❤️</span>
                    </div>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: colors.accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}>
                        <span style={{ fontSize: '1.1rem', color: '#fff' }}>+</span>
                    </div>
                </div>
            </div>

            {/* Section bar preview */}
            <div style={{
                padding: '12px 8px',
                background: `linear-gradient(180deg, transparent, ${colors.background}CC)`,
                display: 'flex',
                justifyContent: 'space-around',
                gap: '8px',
                backdropFilter: 'blur(10px)'
            }}>
                {/* Active section */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: `2px solid ${colors.sectionIconActive}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 4px',
                        background: `${colors.sectionIconActive}20`
                    }}>
                        <span style={{ fontSize: '1rem' }}>🍔</span>
                    </div>
                    <span style={{
                        color: colors.sectionTextActive,
                        fontSize: '0.65rem',
                        fontWeight: 600
                    }}>
                        Burgers
                    </span>
                    <div style={{
                        width: '24px',
                        height: '2px',
                        background: colors.sectionIconActive,
                        margin: '4px auto 0',
                        borderRadius: '1px'
                    }} />
                </div>

                {/* Inactive section 1 */}
                <div style={{ textAlign: 'center', opacity: 0.7 }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: `2px solid ${colors.sectionIconInactive}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 4px'
                    }}>
                        <span style={{ fontSize: '1rem' }}>🍕</span>
                    </div>
                    <span style={{
                        color: colors.sectionTextInactive,
                        fontSize: '0.6rem'
                    }}>
                        Pizzas
                    </span>
                </div>

                {/* Inactive section 2 */}
                <div style={{ textAlign: 'center', opacity: 0.7 }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: `2px solid ${colors.sectionIconInactive}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 4px'
                    }}>
                        <span style={{ fontSize: '1rem' }}>🥗</span>
                    </div>
                    <span style={{
                        color: colors.sectionTextInactive,
                        fontSize: '0.6rem'
                    }}>
                        Ensaladas
                    </span>
                </div>
            </div>
        </div>
    );
}

// ==================== STYLES ====================

const styles: Record<string, React.CSSProperties> = {
    tabContent: {
        animation: 'fadeIn 0.3s ease-in-out',
        padding: '1rem'
    },
    mainGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: '2rem',
        alignItems: 'start'
    },
    pickersColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    },
    previewColumn: {
        position: 'sticky',
        top: '1rem'
    },
    previewTitle: {
        fontSize: '1rem',
        fontWeight: 600,
        color: '#374151',
        margin: '0 0 1rem 0',
        textAlign: 'center'
    },
    section: {
        marginBottom: '1rem',
        padding: '1.25rem',
        background: '#F9FAFB',
        borderRadius: '12px',
        border: '1px solid #E5E7EB'
    },
    sectionTitle: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#1F2937',
        margin: '0 0 0.75rem 0'
    },
    description: {
        color: '#6B7280',
        fontSize: '0.85rem',
        margin: '0 0 1rem 0',
        lineHeight: 1.5
    },
    colorGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
    },
    colorPickerContainer: {
        display: 'flex',
        flexDirection: 'column'
    },
    colorPickerLabel: {
        fontSize: '0.8rem',
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: '0.4rem'
    },
    colorPickerWrapper: {
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
    },
    colorInput: {
        width: '48px',
        height: '48px',
        border: '2px solid #E5E7EB',
        borderRadius: '8px',
        cursor: 'pointer',
        padding: 0
    },
    colorTextInput: {
        flex: 1,
        padding: '0.5rem 0.75rem',
        fontSize: '0.85rem',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        fontFamily: 'monospace',
        background: '#fff'
    },
    phoneFrame: {
        width: '280px',
        height: '520px',
        borderRadius: '32px',
        border: '8px solid #1F2937',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        margin: '0 auto'
    },
    statusBar: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'rgba(0,0,0,0.3)'
    },
    saveButtonContainer: {
        marginTop: '2rem',
        paddingTop: '1.5rem',
        borderTop: '2px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'flex-end'
    },
    saveButton: {
        padding: '0.875rem 2rem',
        backgroundColor: '#3B82F6',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
    },
    saveButtonDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed'
    }
};
