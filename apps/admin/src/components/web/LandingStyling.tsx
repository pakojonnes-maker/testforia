import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

interface LandingColors {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    text_color: string;
    background_color: string;
}

interface StylingData {
    override_colors: LandingColors;
    override_fonts: {
        heading_font: string;
        body_font: string;
        font_accent: string;
    };
    layout_style: string;
}

export default function LandingStyling() {
    const { currentRestaurant } = useAuth();
    const queryClient = useQueryClient();
    const restaurantId = currentRestaurant?.id;
    const [stylingData, setStylingData] = useState<StylingData | null>(null);

    // Query: Obtener configuración de styling (themes)
    const { data: stylingResponse, isLoading: loadingStyling, error: stylingError } = useQuery({
        queryKey: ['restaurant-styling', restaurantId],
        queryFn: () => apiClient.getRestaurantConfig(restaurantId),
        enabled: !!restaurantId,
    });

    // Efecto para cargar configuración de styling (themes)
    useEffect(() => {
        if (stylingResponse?.config) {
            const cfg = stylingResponse.config;
            setStylingData({
                override_colors: {
                    primary_color: cfg.branding?.primaryColor || '#FF6B35',
                    secondary_color: cfg.branding?.secondaryColor || '#004E89',
                    accent_color: cfg.branding?.accentColor || cfg.theme?.accentColor || '#F7B32B',
                    text_color: cfg.theme?.textColor || '#2B2D42',
                    background_color: cfg.theme?.backgroundColor || '#FFFFFF'
                },
                override_fonts: {
                    heading_font: cfg.theme?.fontFamily || 'Inter',
                    body_font: cfg.theme?.fontFamily || 'Inter',
                    font_accent: cfg.theme?.fontAccent || 'serif'
                },
                layout_style: cfg.template?.id || 'modern'
            });
        }
    }, [stylingResponse]);

    // Mutation para actualizar THEME (tabla themes)
    const themeMutation = useMutation({
        mutationFn: (data: StylingData) => apiClient.updateRestaurantTheme(restaurantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['restaurant-styling', restaurantId] });
            alert('✅ Tema de landing guardado correctamente');
        },
        onError: (error: any) => {
            alert(`❌ Error al guardar tema: ${error.message}`);
        }
    });

    const handleSaveTheme = async () => {
        if (stylingData) {
            await themeMutation.mutateAsync(stylingData);
        }
    };

    const updateStylingColors = (colorField: keyof LandingColors, value: string) => {
        setStylingData((prev) => prev ? ({
            ...prev,
            override_colors: { ...prev.override_colors, [colorField]: value }
        }) : null);
    };

    const updateStylingFonts = (fontField: string, value: string) => {
        setStylingData((prev) => prev ? ({
            ...prev,
            override_fonts: { ...prev.override_fonts, [fontField]: value }
        }) : null);
    };

    const updateStylingData = (field: string, value: any) => {
        setStylingData((prev) => prev ? ({ ...prev, [field]: value }) : null);
    };

    if (!restaurantId) return <div>No hay restaurante seleccionado</div>;
    if (loadingStyling) return <div>Cargando...</div>;
    if (stylingError) return <div>Error: {(stylingError as any).message}</div>;
    if (!stylingData) return null;

    return (
        <div style={styles.tabContent}>
            <div style={styles.mainGrid}>
                {/* LEFT COLUMN: Settings */}
                <div style={styles.settingsColumn}>
                    <Section title="🎨 Colores de la landing">
                        <p style={styles.description}>
                            Estos colores se aplicarán <strong>solo a la página de landing</strong> de tu restaurante.
                        </p>
                        <div style={styles.colorGrid}>
                            <ColorPicker
                                label="Primario (encabezados, iconos)"
                                value={stylingData.override_colors.primary_color}
                                onChange={(v) => updateStylingColors('primary_color', v)}
                            />
                            <ColorPicker
                                label="Secundario (enlaces, acentos)"
                                value={stylingData.override_colors.secondary_color}
                                onChange={(v) => updateStylingColors('secondary_color', v)}
                            />
                            <ColorPicker
                                label="Acento (botones CTA)"
                                value={stylingData.override_colors.accent_color}
                                onChange={(v) => updateStylingColors('accent_color', v)}
                            />
                            <ColorPicker
                                label="Texto del cuerpo"
                                value={stylingData.override_colors.text_color}
                                onChange={(v) => updateStylingColors('text_color', v)}
                            />
                            <ColorPicker
                                label="Fondo de las secciones"
                                value={stylingData.override_colors.background_color}
                                onChange={(v) => updateStylingColors('background_color', v)}
                            />
                        </div>
                    </Section>

                    <Section title="🔤 Tipografías">
                        <div style={styles.fontGrid}>
                            <FormField label="Fuente para títulos">
                                <select
                                    value={stylingData.override_fonts.heading_font}
                                    onChange={(e) => updateStylingFonts('heading_font', e.target.value)}
                                    style={styles.input}
                                >
                                    {['Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Poppins', 'Lora'].map(f =>
                                        <option key={f} value={f}>{f}</option>
                                    )}
                                </select>
                            </FormField>
                            <FormField label="Fuente para cuerpo">
                                <select
                                    value={stylingData.override_fonts.body_font}
                                    onChange={(e) => updateStylingFonts('body_font', e.target.value)}
                                    style={styles.input}
                                >
                                    {['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans Pro'].map(f =>
                                        <option key={f} value={f}>{f}</option>
                                    )}
                                </select>
                            </FormField>
                        </div>
                    </Section>

                    <Section title="📐 Estilo de layout">
                        <div style={styles.layoutGrid}>
                            {['modern', 'classic', 'minimal', 'elegant'].map(layout => (
                                <button
                                    key={layout}
                                    onClick={() => updateStylingData('layout_style', layout)}
                                    style={{
                                        ...styles.layoutCard,
                                        ...(stylingData.layout_style === layout ? styles.layoutCardActive : {})
                                    }}
                                >
                                    <span style={{ fontSize: '2rem' }}>
                                        {{ 'modern': '📱', 'classic': '📰', 'minimal': '⬜', 'elegant': '✨' }[layout]}
                                    </span>
                                    <span style={styles.layoutName}>
                                        {layout.charAt(0).toUpperCase() + layout.slice(1)}
                                    </span>
                                    {stylingData.layout_style === layout &&
                                        <span style={styles.layoutCheck}>✓</span>
                                    }
                                </button>
                            ))}
                        </div>
                    </Section>
                </div>

                {/* RIGHT COLUMN: Preview */}
                <div style={styles.previewColumn}>
                    <h3 style={styles.previewTitle}>Vista previa de landing</h3>
                    <LandingPreview
                        colors={stylingData.override_colors}
                        fonts={stylingData.override_fonts}
                    />
                </div>
            </div>

            <div style={styles.saveButtonContainer}>
                <button
                    onClick={handleSaveTheme}
                    disabled={themeMutation.isPending}
                    style={{ ...styles.saveButton, ...(themeMutation.isPending ? styles.saveButtonDisabled : {}) }}
                >
                    {themeMutation.isPending ? 'Guardando...' : '💾 Guardar diseño de landing'}
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

function FormField({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div style={styles.formField}>
            <label style={styles.label}>{label}</label>
            {children}
        </div>
    );
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div style={styles.colorPickerContainer}>
            <label style={styles.colorPickerLabel}>{label}</label>
            <div style={styles.colorPickerWrapper}>
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={styles.colorInput}
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={styles.colorTextInput}
                />
            </div>
        </div>
    );
}

// ==================== LIVE PREVIEW COMPONENT ====================

function LandingPreview({ colors, fonts }: { colors: LandingColors, fonts: { heading_font: string, body_font: string } }) {
    return (
        <div style={{
            ...styles.browserFrame,
            background: colors.background_color
        }}>
            {/* Browser chrome */}
            <div style={styles.browserChrome}>
                <div style={styles.browserDots}>
                    <span style={{ ...styles.browserDot, background: '#FF5F56' }} />
                    <span style={{ ...styles.browserDot, background: '#FFBD2E' }} />
                    <span style={{ ...styles.browserDot, background: '#27CA40' }} />
                </div>
                <div style={styles.browserUrl}>
                    <span style={{ fontSize: '0.65rem', color: '#666' }}>🔒 restaurante.com</span>
                </div>
            </div>

            {/* Hero section */}
            <div style={{
                background: `linear-gradient(135deg, ${colors.primary_color}, ${colors.secondary_color})`,
                padding: '20px 12px',
                textAlign: 'center'
            }}>
                <h2 style={{
                    color: '#fff',
                    margin: '0 0 6px 0',
                    fontSize: '1rem',
                    fontFamily: fonts.heading_font
                }}>
                    Restaurante Ejemplo
                </h2>
                <p style={{
                    color: 'rgba(255,255,255,0.9)',
                    margin: '0 0 10px 0',
                    fontSize: '0.7rem',
                    fontFamily: fonts.body_font
                }}>
                    La mejor experiencia gastronómica
                </p>
                <button style={{
                    background: colors.accent_color,
                    color: '#fff',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                    Ver Menú
                </button>
            </div>

            {/* About section */}
            <div style={{ padding: '16px 12px' }}>
                <h3 style={{
                    color: colors.primary_color,
                    margin: '0 0 8px 0',
                    fontSize: '0.85rem',
                    fontFamily: fonts.heading_font
                }}>
                    Sobre Nosotros
                </h3>
                <p style={{
                    color: colors.text_color,
                    margin: 0,
                    fontSize: '0.65rem',
                    lineHeight: 1.5,
                    fontFamily: fonts.body_font
                }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Sed do eiusmod tempor incididunt ut labore.
                </p>
            </div>

            {/* Menu preview card */}
            <div style={{ padding: '0 12px 12px' }}>
                <div style={{
                    border: `1px solid ${colors.secondary_color}40`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#fff'
                }}>
                    <div style={{
                        height: '50px',
                        background: `linear-gradient(45deg, ${colors.primary_color}20, ${colors.secondary_color}20)`
                    }} />
                    <div style={{ padding: '8px' }}>
                        <span style={{
                            color: colors.primary_color,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            fontFamily: fonts.heading_font
                        }}>
                            Plato Destacado
                        </span>
                        <p style={{
                            color: colors.text_color,
                            fontSize: '0.6rem',
                            margin: '2px 0 4px',
                            opacity: 0.8,
                            fontFamily: fonts.body_font
                        }}>
                            Descripción del plato
                        </p>
                        <span style={{
                            color: colors.accent_color,
                            fontWeight: 700,
                            fontSize: '0.7rem'
                        }}>
                            €12.50
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                background: colors.primary_color,
                padding: '8px 12px',
                textAlign: 'center'
            }}>
                <p style={{
                    color: '#fff',
                    margin: 0,
                    fontSize: '0.55rem',
                    opacity: 0.9
                }}>
                    © 2024 Restaurante Ejemplo
                </p>
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
        gridTemplateColumns: '1fr 280px',
        gap: '2rem',
        alignItems: 'start'
    },
    settingsColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
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
        marginBottom: '0.5rem',
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
    },
    fontGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem'
    },
    formField: {
        display: 'flex',
        flexDirection: 'column'
    },
    label: {
        fontSize: '0.8rem',
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: '0.4rem'
    },
    input: {
        padding: '0.6rem',
        fontSize: '0.9rem',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        outline: 'none',
        fontFamily: 'inherit',
        backgroundColor: 'white'
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
        width: '40px',
        height: '40px',
        border: '2px solid #E5E7EB',
        borderRadius: '8px',
        cursor: 'pointer',
        padding: 0
    },
    colorTextInput: {
        flex: 1,
        padding: '0.5rem',
        fontSize: '0.8rem',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        fontFamily: 'monospace',
        background: '#fff'
    },
    layoutGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem'
    },
    layoutCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem',
        border: '2px solid #E5E7EB',
        borderRadius: '12px',
        backgroundColor: 'white',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s'
    },
    layoutCardActive: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF'
    },
    layoutName: {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#374151',
        marginTop: '0.5rem'
    },
    layoutCheck: {
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        color: '#3B82F6',
        fontSize: '1rem'
    },
    browserFrame: {
        width: '250px',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
        margin: '0 auto'
    },
    browserChrome: {
        background: '#F3F4F6',
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '1px solid #E5E7EB'
    },
    browserDots: {
        display: 'flex',
        gap: '4px'
    },
    browserDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%'
    },
    browserUrl: {
        flex: 1,
        background: '#fff',
        borderRadius: '4px',
        padding: '3px 8px',
        textAlign: 'center'
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
        backgroundColor: '#10B981',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
    },
    saveButtonDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed'
    }
};
