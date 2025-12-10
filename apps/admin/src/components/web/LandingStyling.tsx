import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

export default function LandingStyling() {
    const { currentRestaurant } = useAuth();
    const queryClient = useQueryClient();
    const restaurantId = currentRestaurant?.id;
    const [stylingData, setStylingData] = useState<any>(null);

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
        mutationFn: (data: any) => apiClient.updateRestaurantTheme(restaurantId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['restaurant-styling', restaurantId] });
            alert('✅ Tema guardado correctamente');
        },
        onError: (error: any) => {
            alert(`❌ Error al guardar tema: ${error.message}`);
        }
    });

    const handleSaveTheme = async () => {
        await themeMutation.mutateAsync(stylingData);
    };

    const updateStylingColors = (colorField: string, value: string) => {
        setStylingData((prev: any) => prev ? ({
            ...prev,
            override_colors: { ...prev.override_colors, [colorField]: value }
        }) : null);
    };

    const updateStylingFonts = (fontField: string, value: string) => {
        setStylingData((prev: any) => prev ? ({
            ...prev,
            override_fonts: { ...prev.override_fonts, [fontField]: value }
        }) : null);
    };

    const updateStylingData = (field: string, value: any) => {
        setStylingData((prev: any) => prev ? ({ ...prev, [field]: value }) : null);
    };

    if (!restaurantId) return <div>No hay restaurante seleccionado</div>;
    if (loadingStyling) return <div>Cargando...</div>;
    if (stylingError) return <div>Error: {(stylingError as any).message}</div>;
    if (!stylingData) return null;

    return (
        <div style={styles.tabContent}>
            <Section title="Colores de marca">
                <p style={{ color: '#6B7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Estos colores se aplicarán al tema global del restaurante (landing y reels por defecto).
                </p>
                <div style={styles.colorGridWide}>
                    <ColorPicker label="Color primario" value={stylingData.override_colors.primary_color} onChange={(v: string) => updateStylingColors('primary_color', v)} />
                    <ColorPicker label="Color secundario" value={stylingData.override_colors.secondary_color} onChange={(v: string) => updateStylingColors('secondary_color', v)} />
                    <ColorPicker label="Color de acento" value={stylingData.override_colors.accent_color} onChange={(v: string) => updateStylingColors('accent_color', v)} />
                    <ColorPicker label="Color de texto" value={stylingData.override_colors.text_color} onChange={(v: string) => updateStylingColors('text_color', v)} />
                    <ColorPicker label="Color de fondo" value={stylingData.override_colors.background_color} onChange={(v: string) => updateStylingColors('background_color', v)} />
                </div>
            </Section>

            <Section title="Tipografías">
                <div style={styles.grid}>
                    <FormField label="Fuente para títulos">
                        <select value={stylingData.override_fonts.heading_font} onChange={(e) => updateStylingFonts('heading_font', e.target.value)} style={styles.input}>
                            {['Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Poppins', 'Lora'].map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Fuente para cuerpo">
                        <select value={stylingData.override_fonts.body_font} onChange={(e) => updateStylingFonts('body_font', e.target.value)} style={styles.input}>
                            {['Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans Pro'].map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </FormField>
                </div>
            </Section>

            {/* REMOVED PREVIEW SECTION */}

            <Section title="Estilo de layout">
                <div style={styles.layoutGrid}>
                    {['modern', 'classic', 'minimal', 'elegant'].map(layout => (
                        <button key={layout} onClick={() => updateStylingData('layout_style', layout)} style={{ ...styles.layoutCard, ...(stylingData.layout_style === layout ? styles.layoutCardActive : {}) }}>
                            <span style={{ fontSize: '2rem' }}>{{ 'modern': '📱', 'classic': '📰', 'minimal': '⬜', 'elegant': '✨' }[layout]}</span>
                            <span style={styles.layoutName}>{layout.charAt(0).toUpperCase() + layout.slice(1)}</span>
                            {stylingData.layout_style === layout && <span style={styles.layoutCheck}>✓</span>}
                        </button>
                    ))}
                </div>
            </Section>

            <div style={styles.saveButtonContainer}>
                <button
                    onClick={handleSaveTheme}
                    disabled={themeMutation.isPending}
                    style={{ ...styles.saveButton, ...(themeMutation.isPending ? styles.saveButtonDisabled : {}) }}
                >
                    {themeMutation.isPending ? 'Guardando...' : 'Guardar diseño global'}
                </button>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return <div style={styles.section}>{title && <h2 style={styles.sectionTitle}>{title}</h2>}{children}</div>;
}

function FormField({ label, required, children }: { label: string, required?: boolean, children: React.ReactNode }) {
    return <div style={styles.formField}>{label && <label style={styles.label}>{label}{required && <span style={styles.required}> *</span>}</label>}{children}</div>;
}

function ColorPicker({ label, value, onChange, description }: { label: string, value: string, onChange: (v: string) => void, description?: string }) {
    return (
        <div style={styles.colorPickerContainer}>
            <label style={styles.colorPickerLabel}>{label}</label>
            {description && <p style={styles.colorDescription}>{description}</p>}
            <div style={styles.colorPickerWrapper}>
                <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={styles.colorInput} />
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={styles.colorTextInput} />
            </div>
        </div>
    );
}

const styles: any = {
    tabContent: { animation: 'fadeIn 0.3s ease-in-out', padding: '1rem' },
    section: { marginBottom: '2.5rem' },
    sectionTitle: { fontSize: '1.5rem', fontWeight: '600', color: '#1A1A1A', margin: '0 0 1.5rem 0' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' },
    formField: { display: 'flex', flexDirection: 'column' },
    label: { fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' },
    required: { color: '#EF4444' },
    input: { padding: '0.75rem', fontSize: '1rem', border: '1px solid #D1D5DB', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'white' },

    colorGridWide: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' },

    colorPickerContainer: { display: 'flex', flexDirection: 'column' },
    colorPickerLabel: { fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' },
    colorDescription: { fontSize: '0.8rem', color: '#6B7280', margin: '0 0 0.5rem 0' },
    colorPickerWrapper: { display: 'flex', gap: '0.75rem', alignItems: 'center' },

    colorInput: { width: '80px', height: '80px', border: '2px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer' },
    colorTextInput: { flex: 1, padding: '0.75rem', fontSize: '1rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontFamily: 'monospace' },

    layoutGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' },
    layoutCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', border: '2px solid #E5E7EB', borderRadius: '12px', backgroundColor: 'white', cursor: 'pointer', position: 'relative' },
    layoutCardActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
    layoutName: { fontSize: '0.95rem', fontWeight: '600', color: '#374151', marginTop: '0.5rem' },
    layoutCheck: { position: 'absolute', top: '0.5rem', right: '0.5rem', color: '#3B82F6', fontSize: '1.25rem' },

    saveButtonContainer: {
        marginTop: '2rem',
        paddingTop: '2rem',
        borderTop: '2px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'flex-end'
    },

    saveButton: {
        padding: '0.75rem 2rem',
        backgroundColor: '#3B82F6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },

    saveButtonDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed'
    },
};
