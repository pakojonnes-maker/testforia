import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

export default function ReelsStyling() {
    const { currentRestaurant } = useAuth();
    const queryClient = useQueryClient();
    const restaurantId = currentRestaurant?.id;
    const [reelsColorsData, setReelsColorsData] = useState<any>(null);

    // Query: Obtener colores de reels (config_overrides)
    const { data: reelsColorsResponse, isLoading: loadingReelsColors, error: reelsColorsError } = useQuery({
        queryKey: ['restaurant-reels-colors', restaurantId],
        queryFn: () => apiClient.getRestaurantStyling(restaurantId),
        enabled: !!restaurantId,
    });

    // Efecto para cargar colores de reels
    useEffect(() => {
        if (reelsColorsResponse?.success) {
            const styling = reelsColorsResponse.styling;
            if (styling?.customColors) {
                setReelsColorsData({
                    primary: styling.customColors.primary || '#FF6B6B',
                    secondary: styling.customColors.secondary || '#4ECDC4',
                    text: styling.customColors.text || '#2C3E50',
                    background: styling.customColors.background || '#FFFFFF'
                });
            } else {
                setReelsColorsData({
                    primary: '#FF6B6B',
                    secondary: '#4ECDC4',
                    text: '#2C3E50',
                    background: '#FFFFFF'
                });
            }
        }
    }, [reelsColorsResponse]);

    // Mutation para colores de reels
    const reelsColorsMutation = useMutation({
        mutationFn: (colors: any) => apiClient.updateRestaurantStyling(restaurantId, colors),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['restaurant-reels-colors', restaurantId] });
            alert('✅ Colores de reels guardados correctamente');
        },
        onError: (error: any) => {
            alert(`❌ Error al guardar colores de reels: ${error.message}`);
        }
    });

    const handleSaveReelsColors = async () => {
        await reelsColorsMutation.mutateAsync(reelsColorsData);
    };

    const updateReelsColor = (colorField: string, value: string) => {
        setReelsColorsData((prev: any) => prev ? ({ ...prev, [colorField]: value }) : null);
    };

    if (!restaurantId) return <div>No hay restaurante seleccionado</div>;
    if (loadingReelsColors) return <div>Cargando...</div>;
    if (reelsColorsError) return <div>Error: {(reelsColorsError as any).message}</div>;
    if (!reelsColorsData) return null;

    return (
        <div style={styles.tabContent}>
            <Section title="Colores personalizados de reels">
                <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
                    Estos colores sobrescribirán el tema global <strong>solo para los reels</strong> de productos que se muestran en tu menú digital.
                </p>
                <div style={styles.colorGridWide}>
                    <ColorPicker
                        label="Color primario"
                        value={reelsColorsData.primary}
                        onChange={(v: string) => updateReelsColor('primary', v)}
                        description="Para títulos y elementos destacados"
                    />
                    <ColorPicker
                        label="Color secundario"
                        value={reelsColorsData.secondary}
                        onChange={(v: string) => updateReelsColor('secondary', v)}
                        description="Para botones y precios"
                    />
                    <ColorPicker
                        label="Color de texto"
                        value={reelsColorsData.text}
                        onChange={(v: string) => updateReelsColor('text', v)}
                        description="Para descripciones"
                    />
                    <ColorPicker
                        label="Color de fondo"
                        value={reelsColorsData.background}
                        onChange={(v: string) => updateReelsColor('background', v)}
                        description="Fondo de las tarjetas"
                    />
                </div>
            </Section>

            {/* REMOVED PREVIEW SECTION */}

            <div style={styles.saveButtonContainer}>
                <button
                    onClick={handleSaveReelsColors}
                    disabled={reelsColorsMutation.isPending}
                    style={{ ...styles.saveButton, ...(reelsColorsMutation.isPending ? styles.saveButtonDisabled : {}) }}
                >
                    {reelsColorsMutation.isPending ? 'Guardando...' : 'Guardar colores de reels'}
                </button>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return <div style={styles.section}>{title && <h2 style={styles.sectionTitle}>{title}</h2>}{children}</div>;
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

    colorGridWide: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' },

    colorPickerContainer: { display: 'flex', flexDirection: 'column' },
    colorPickerLabel: { fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' },
    colorDescription: { fontSize: '0.8rem', color: '#6B7280', margin: '0 0 0.5rem 0' },
    colorPickerWrapper: { display: 'flex', gap: '0.75rem', alignItems: 'center' },

    colorInput: { width: '80px', height: '80px', border: '2px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer' },
    colorTextInput: { flex: 1, padding: '0.75rem', fontSize: '1rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontFamily: 'monospace' },

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
