// pages/Settings.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/apiClient';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('restaurant');
  const { currentRestaurant } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = currentRestaurant?.id;

  const [restaurantData, setRestaurantData] = useState(null);
  const [stylingData, setStylingData] = useState(null);
  const [reelsColorsData, setReelsColorsData] = useState(null);

  // Query: Obtener datos del restaurante
  const { data: restaurantResponse, isLoading: loadingRestaurant, error: restaurantError } = useQuery({
    queryKey: ['restaurant-settings', restaurantId],
    queryFn: () => apiClient.getRestaurant(restaurantId),
    enabled: !!restaurantId,
  });

  // Query: Obtener configuración de styling (themes)
  const { data: stylingResponse, isLoading: loadingStyling, error: stylingError } = useQuery({
    queryKey: ['restaurant-styling', restaurantId],
    queryFn: () => apiClient.getRestaurantConfig(restaurantId),
    enabled: !!restaurantId,
  });

  // Query: Obtener colores de reels (config_overrides)
  const { data: reelsColorsResponse, isLoading: loadingReelsColors, error: reelsColorsError } = useQuery({
    queryKey: ['restaurant-reels-colors', restaurantId],
    queryFn: () => apiClient.getRestaurantStyling(restaurantId),
    enabled: !!restaurantId,
  });

  // Efecto para cargar datos del restaurante
  useEffect(() => {
    if (restaurantResponse?.restaurant) {
      const r = restaurantResponse.restaurant;
      setRestaurantData({
        name: r.name || '',
        description: r.description || '',
        email: r.email || '',
        phone: r.phone || '',
        website: r.website || '',
        city: r.city || '',
        country: r.country || '',
        timezone: r.timezone || 'Europe/Madrid',
        accepts_reservations: !!r.accepts_reservations,
        reservation_url: r.reservation_url || '',
        reservation_phone: r.reservation_phone || '',
        reservation_email: r.reservation_email || '',
        has_wifi: !!r.has_wifi,
        has_delivery: !!r.has_delivery,
        has_outdoor_seating: !!r.has_outdoor_seating,
        capacity: r.capacity || 50,
        google_maps_url: r.google_maps_url || '',
        facebook_url: r.facebook_url || '',
        instagram_handle: r.instagram_url || '',
        tiktok_handle: r.tiktok_url || '',
        youtube_url: r.youtube_url || '',
        tripadvisor_url: r.tripadvisor_url || ''
      });
    }
  }, [restaurantResponse]);

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

  // Mutation: Actualizar restaurante
  const restaurantMutation = useMutation({
    mutationFn: (data) => apiClient.updateRestaurant(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-settings', restaurantId]);
      alert('✅ Datos guardados correctamente');
    },
    onError: (error) => {
      alert(`❌ Error: ${error.message}`);
    }
  });

  // Mutation para actualizar THEME (tabla themes)
  const themeMutation = useMutation({
    mutationFn: (data) => apiClient.updateRestaurantTheme(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-styling', restaurantId]);
      alert('✅ Tema guardado correctamente');
    },
    onError: (error) => {
      alert(`❌ Error al guardar tema: ${error.message}`);
    }
  });

  // Mutation para colores de reels
  const reelsColorsMutation = useMutation({
    mutationFn: (colors) => apiClient.updateRestaurantStyling(restaurantId, colors),
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurant-reels-colors', restaurantId]);
      alert('✅ Colores de reels guardados correctamente');
    },
    onError: (error) => {
      alert(`❌ Error al guardar colores de reels: ${error.message}`);
    }
  });

  // ✅ Handlers separados por sección
  const handleSaveRestaurant = async () => {
    await restaurantMutation.mutateAsync(restaurantData);
  };

  const handleSaveTheme = async () => {
    await themeMutation.mutateAsync(stylingData);
  };

  const handleSaveReelsColors = async () => {
    await reelsColorsMutation.mutateAsync(reelsColorsData);
  };

  const updateRestaurantData = (field, value) => {
    setRestaurantData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const updateStylingColors = (colorField, value) => {
    setStylingData(prev => prev ? ({
      ...prev,
      override_colors: { ...prev.override_colors, [colorField]: value }
    }) : null);
  };

  const updateStylingFonts = (fontField, value) => {
    setStylingData(prev => prev ? ({
      ...prev,
      override_fonts: { ...prev.override_fonts, [fontField]: value }
    }) : null);
  };

  const updateStylingData = (field, value) => {
    setStylingData(prev => prev ? ({ ...prev, [field]: value }) : null);
  };

  const updateReelsColor = (colorField, value) => {
    setReelsColorsData(prev => prev ? ({ ...prev, [colorField]: value }) : null);
  };

  if (!restaurantId) {
    return <div style={styles.errorContainer}><h1>⚠️ No hay restaurante seleccionado</h1></div>;
  }

  if (restaurantError || stylingError || reelsColorsError) {
    return (
      <div style={styles.errorContainer}>
        <h1>❌ Error al cargar datos</h1>
        <p>{restaurantError?.message || stylingError?.message || reelsColorsError?.message}</p>
      </div>
    );
  }

  const isLoading = loadingRestaurant || loadingStyling || loadingReelsColors;

  if (isLoading || !restaurantData || !stylingData || !reelsColorsData) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ❌ HEADER SIN BOTÓN GLOBAL */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Configuración</h1>
          <p style={styles.subtitle}>Personaliza tu restaurante y diseño</p>
        </div>
      </div>

      <div style={styles.tabsContainer}>
        <button onClick={() => setActiveTab('restaurant')} style={{...styles.tab, ...(activeTab === 'restaurant' ? styles.tabActive : {})}}>
          <span style={styles.tabIcon}>🏪</span><span>Restaurante</span>
        </button>
        <button onClick={() => setActiveTab('styling')} style={{...styles.tab, ...(activeTab === 'styling' ? styles.tabActive : {})}}>
          <span style={styles.tabIcon}>🎨</span><span>Diseño</span>
        </button>
        <button onClick={() => setActiveTab('reels')} style={{...styles.tab, ...(activeTab === 'reels' ? styles.tabActive : {})}}>
          <span style={styles.tabIcon}>🎬</span><span>Colores Reels</span>
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'restaurant' && (
          <div style={styles.tabContent}>
            <Section title="Información básica">
              <div style={styles.grid}>
                <FormField label="Nombre del restaurante" required>
                  <input type="text" value={restaurantData.name} onChange={(e) => updateRestaurantData('name', e.target.value)} style={styles.input} />
                </FormField>
                <FormField label="Email">
                  <input type="email" value={restaurantData.email} onChange={(e) => updateRestaurantData('email', e.target.value)} style={styles.input} />
                </FormField>
                <FormField label="Teléfono">
                  <input type="tel" value={restaurantData.phone} onChange={(e) => updateRestaurantData('phone', e.target.value)} style={styles.input} />
                </FormField>
                <FormField label="Sitio web">
                  <input type="url" value={restaurantData.website} onChange={(e) => updateRestaurantData('website', e.target.value)} style={styles.input} />
                </FormField>
              </div>
              <FormField label="Descripción">
                <textarea value={restaurantData.description} onChange={(e) => updateRestaurantData('description', e.target.value)} style={{...styles.input, ...styles.textarea}} rows={4} />
              </FormField>
            </Section>

            <Section title="Localización">
              <div style={styles.grid}>
                <FormField label="Ciudad">
                  <input type="text" value={restaurantData.city} onChange={(e) => updateRestaurantData('city', e.target.value)} style={styles.input} />
                </FormField>
                <FormField label="País">
                  <input type="text" value={restaurantData.country} onChange={(e) => updateRestaurantData('country', e.target.value)} style={styles.input} />
                </FormField>
                <FormField label="Zona horaria">
                  <select value={restaurantData.timezone} onChange={(e) => updateRestaurantData('timezone', e.target.value)} style={styles.input}>
                    <option value="Europe/Madrid">Europe/Madrid (CET)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  </select>
                </FormField>
                <FormField label="Google Maps URL">
                  <input type="url" value={restaurantData.google_maps_url} onChange={(e) => updateRestaurantData('google_maps_url', e.target.value)} style={styles.input} />
                </FormField>
              </div>
            </Section>

            <Section title="Reservas">
              <div style={styles.checkboxGroup}>
                <label style={styles.checkbox}>
                  <input type="checkbox" checked={restaurantData.accepts_reservations} onChange={(e) => updateRestaurantData('accepts_reservations', e.target.checked)} />
                  <span>Acepta reservas</span>
                </label>
              </div>
              {restaurantData.accepts_reservations && (
                <div style={styles.grid}>
                  <FormField label="URL de reservas">
                    <input type="url" value={restaurantData.reservation_url} onChange={(e) => updateRestaurantData('reservation_url', e.target.value)} style={styles.input} />
                  </FormField>
                  <FormField label="Teléfono de reservas">
                    <input type="tel" value={restaurantData.reservation_phone} onChange={(e) => updateRestaurantData('reservation_phone', e.target.value)} style={styles.input} />
                  </FormField>
                  <FormField label="Email de reservas">
                    <input type="email" value={restaurantData.reservation_email} onChange={(e) => updateRestaurantData('reservation_email', e.target.value)} style={styles.input} />
                  </FormField>
                </div>
              )}
            </Section>

            <Section title="Servicios">
              <div style={styles.checkboxGroup}>
                <label style={styles.checkbox}><input type="checkbox" checked={restaurantData.has_wifi} onChange={(e) => updateRestaurantData('has_wifi', e.target.checked)} /><span>WiFi disponible</span></label>
                <label style={styles.checkbox}><input type="checkbox" checked={restaurantData.has_delivery} onChange={(e) => updateRestaurantData('has_delivery', e.target.checked)} /><span>Servicio de delivery</span></label>
                <label style={styles.checkbox}><input type="checkbox" checked={restaurantData.has_outdoor_seating} onChange={(e) => updateRestaurantData('has_outdoor_seating', e.target.checked)} /><span>Terraza exterior</span></label>
              </div>
              <FormField label="Capacidad (personas)">
                <input type="number" value={restaurantData.capacity} onChange={(e) => updateRestaurantData('capacity', parseInt(e.target.value))} style={styles.input} min="0" />
              </FormField>
            </Section>

            <Section title="Redes sociales">
              <div style={styles.grid}>
                <FormField label="Facebook"><input type="url" value={restaurantData.facebook_url} onChange={(e) => updateRestaurantData('facebook_url', e.target.value)} style={styles.input} /></FormField>
                <FormField label="Instagram"><input type="text" value={restaurantData.instagram_handle} onChange={(e) => updateRestaurantData('instagram_handle', e.target.value)} style={styles.input} placeholder="@usuario" /></FormField>
                <FormField label="TikTok"><input type="text" value={restaurantData.tiktok_handle} onChange={(e) => updateRestaurantData('tiktok_handle', e.target.value)} style={styles.input} placeholder="@usuario" /></FormField>
                <FormField label="YouTube"><input type="url" value={restaurantData.youtube_url} onChange={(e) => updateRestaurantData('youtube_url', e.target.value)} style={styles.input} /></FormField>
                <FormField label="Tripadvisor"><input type="url" value={restaurantData.tripadvisor_url} onChange={(e) => updateRestaurantData('tripadvisor_url', e.target.value)} style={styles.input} /></FormField>
              </div>
            </Section>

            {/* ✅ BOTÓN AL FINAL DE LA TAB */}
            <div style={styles.saveButtonContainer}>
              <button 
                onClick={handleSaveRestaurant} 
                disabled={restaurantMutation.isPending} 
                style={{...styles.saveButton, ...(restaurantMutation.isPending ? styles.saveButtonDisabled : {})}}
              >
                {restaurantMutation.isPending ? 'Guardando...' : 'Guardar información del restaurante'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'styling' && stylingData && (
          <div style={styles.tabContent}>
            <Section title="Colores de marca">
              <p style={{color: '#6B7280', marginBottom: '1.5rem', fontSize: '0.9rem'}}>
                Estos colores se aplicarán al tema global del restaurante (landing y reels por defecto).
              </p>
              {/* ✅ GRID MÁS ANCHO PARA COLORPICKERS */}
              <div style={styles.colorGridWide}>
                <ColorPicker label="Color primario" value={stylingData.override_colors.primary_color} onChange={(v) => updateStylingColors('primary_color', v)} />
                <ColorPicker label="Color secundario" value={stylingData.override_colors.secondary_color} onChange={(v) => updateStylingColors('secondary_color', v)} />
                <ColorPicker label="Color de acento" value={stylingData.override_colors.accent_color} onChange={(v) => updateStylingColors('accent_color', v)} />
                <ColorPicker label="Color de texto" value={stylingData.override_colors.text_color} onChange={(v) => updateStylingColors('text_color', v)} />
                <ColorPicker label="Color de fondo" value={stylingData.override_colors.background_color} onChange={(v) => updateStylingColors('background_color', v)} />
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

            <Section title="Vista previa">
              <div style={{...styles.preview, backgroundColor: stylingData.override_colors.background_color, color: stylingData.override_colors.text_color}}>
                <h2 style={{fontFamily: stylingData.override_fonts.heading_font, color: stylingData.override_colors.primary_color, margin: '0 0 1rem 0'}}>Restaurante Ejemplo</h2>
                <p style={{fontFamily: stylingData.override_fonts.body_font, margin: '0 0 1rem 0'}}>Vista previa de tu carta</p>
                <button style={{backgroundColor: stylingData.override_colors.accent_color, color: '#FFF', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer'}}>Ver Carta</button>
              </div>
            </Section>

            <Section title="Estilo de layout">
              <div style={styles.layoutGrid}>
                {['modern', 'classic', 'minimal', 'elegant'].map(layout => (
                  <button key={layout} onClick={() => updateStylingData('layout_style', layout)} style={{...styles.layoutCard, ...(stylingData.layout_style === layout ? styles.layoutCardActive : {})}}>
                    <span style={{fontSize: '2rem'}}>{{'modern': '📱', 'classic': '📰', 'minimal': '⬜', 'elegant': '✨'}[layout]}</span>
                    <span style={styles.layoutName}>{layout.charAt(0).toUpperCase() + layout.slice(1)}</span>
                    {stylingData.layout_style === layout && <span style={styles.layoutCheck}>✓</span>}
                  </button>
                ))}
              </div>
            </Section>

            {/* ✅ BOTÓN ESPECÍFICO PARA THEME */}
            <div style={styles.saveButtonContainer}>
              <button 
                onClick={handleSaveTheme} 
                disabled={themeMutation.isPending} 
                style={{...styles.saveButton, ...(themeMutation.isPending ? styles.saveButtonDisabled : {})}}
              >
                {themeMutation.isPending ? 'Guardando...' : 'Guardar diseño global'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reels' && reelsColorsData && (
          <div style={styles.tabContent}>
            <Section title="Colores personalizados de reels">
              <p style={{color: '#6B7280', marginBottom: '1.5rem'}}>
                Estos colores sobrescribirán el tema global <strong>solo para los reels</strong> de productos que se muestran en tu menú digital.
              </p>
              {/* ✅ GRID MÁS ANCHO PARA COLORPICKERS */}
              <div style={styles.colorGridWide}>
                <ColorPicker 
                  label="Color primario" 
                  value={reelsColorsData.primary} 
                  onChange={(v) => updateReelsColor('primary', v)} 
                  description="Para títulos y elementos destacados"
                />
                <ColorPicker 
                  label="Color secundario" 
                  value={reelsColorsData.secondary} 
                  onChange={(v) => updateReelsColor('secondary', v)} 
                  description="Para botones y precios"
                />
                <ColorPicker 
                  label="Color de texto" 
                  value={reelsColorsData.text} 
                  onChange={(v) => updateReelsColor('text', v)} 
                  description="Para descripciones"
                />
                <ColorPicker 
                  label="Color de fondo" 
                  value={reelsColorsData.background} 
                  onChange={(v) => updateReelsColor('background', v)} 
                  description="Fondo de las tarjetas"
                />
              </div>
            </Section>

            <Section title="Vista previa de Reel">
              <div style={{
                ...styles.reelPreview,
                backgroundColor: reelsColorsData.background,
                color: reelsColorsData.text
              }}>
                <div style={{
                  backgroundColor: reelsColorsData.primary,
                  color: '#FFF',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{margin: '0', fontWeight: '700'}}>Paella Valenciana</h3>
                  <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.9}}>Plato tradicional</p>
                </div>
                
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed rgba(0,0,0,0.1)',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <span style={{fontSize: '3rem'}}>📷</span>
                </div>
                
                <div style={{
                  backgroundColor: reelsColorsData.secondary,
                  color: '#FFF',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '1.25rem'
                }}>
                  15,99 €
                </div>
              </div>
            </Section>

            {/* ✅ BOTÓN ESPECÍFICO PARA REELS */}
            <div style={styles.saveButtonContainer}>
              <button 
                onClick={handleSaveReelsColors} 
                disabled={reelsColorsMutation.isPending} 
                style={{...styles.saveButton, ...(reelsColorsMutation.isPending ? styles.saveButtonDisabled : {})}}
              >
                {reelsColorsMutation.isPending ? 'Guardando...' : 'Guardar colores de reels'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return <div style={styles.section}>{title && <h2 style={styles.sectionTitle}>{title}</h2>}{children}</div>;
}

function FormField({ label, required, children }) {
  return <div style={styles.formField}>{label && <label style={styles.label}>{label}{required && <span style={styles.required}> *</span>}</label>}{children}</div>;
}

function ColorPicker({ label, value, onChange, description }) {
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

const styles = {
  errorContainer: {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem'},
  loadingContainer: {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'},
  spinner: {width: '40px', height: '40px', border: '4px solid #E5E7EB', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite'},
  container: {maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh'},
  header: {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'},
  title: {fontSize: '2rem', fontWeight: '700', color: '#1A1A1A', margin: '0 0 0.5rem 0'},
  subtitle: {fontSize: '1rem', color: '#6B7280', margin: 0},
  tabsContainer: {display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #E5E7EB'},
  tab: {padding: '1rem 1.5rem', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontSize: '1rem', fontWeight: '500', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '-2px'},
  tabActive: {color: '#3B82F6', borderBottom: '2px solid #3B82F6'},
  tabIcon: {fontSize: '1.25rem'},
  content: {backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'},
  tabContent: {animation: 'fadeIn 0.3s ease-in-out'},
  section: {marginBottom: '2.5rem'},
  sectionTitle: {fontSize: '1.5rem', fontWeight: '600', color: '#1A1A1A', margin: '0 0 1.5rem 0'},
  grid: {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem'},
  formField: {display: 'flex', flexDirection: 'column'},
  label: {fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem'},
  required: {color: '#EF4444'},
  input: {padding: '0.75rem', fontSize: '1rem', border: '1px solid #D1D5DB', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'white'},
  textarea: {resize: 'vertical', minHeight: '100px'},
  checkboxGroup: {display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem'},
  checkbox: {display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer'},
  
  // ✅ NUEVO: Grid más ancho para colorpickers
  colorGridWide: {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem'},
  
  colorPickerContainer: {display: 'flex', flexDirection: 'column'},
  colorPickerLabel: {fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem'},
  colorDescription: {fontSize: '0.8rem', color: '#6B7280', margin: '0 0 0.5rem 0'},
  colorPickerWrapper: {display: 'flex', gap: '0.75rem', alignItems: 'center'},
  
  // ✅ CORREGIDO: Color input más grande
  colorInput: {width: '80px', height: '80px', border: '2px solid #D1D5DB', borderRadius: '8px', cursor: 'pointer'},
  colorTextInput: {flex: 1, padding: '0.75rem', fontSize: '1rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontFamily: 'monospace'},
  
  preview: {padding: '2rem', borderRadius: '12px', border: '2px dashed #D1D5DB'},
  reelPreview: {
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid #E5E7EB',
    maxWidth: '300px',
    aspectRatio: '9/16',
    display: 'flex',
    flexDirection: 'column',
    margin: '0 auto'
  },
  layoutGrid: {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem'},
  layoutCard: {display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', border: '2px solid #E5E7EB', borderRadius: '12px', backgroundColor: 'white', cursor: 'pointer', position: 'relative'},
  layoutCardActive: {borderColor: '#3B82F6', backgroundColor: '#EFF6FF'},
  layoutName: {fontSize: '0.95rem', fontWeight: '600', color: '#374151', marginTop: '0.5rem'},
  layoutCheck: {position: 'absolute', top: '0.5rem', right: '0.5rem', color: '#3B82F6', fontSize: '1.25rem'},
  
  // ✅ NUEVO: Contenedor para botones de guardar
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
