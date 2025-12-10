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

  // Estado de datos del restaurante
  const [restaurantData, setRestaurantData] = useState<any>(null);

  // Query: Obtener datos del restaurante
  const { data: restaurantResponse, isLoading: loadingRestaurant, error: restaurantError } = useQuery({
    queryKey: ['restaurant-settings', restaurantId],
    queryFn: () => apiClient.getRestaurant(restaurantId),
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



  // ✅ Handlers separados por sección
  const handleSaveRestaurant = async () => {
    await restaurantMutation.mutateAsync(restaurantData);
  };



  const updateRestaurantData = (field, value) => {
    setRestaurantData(prev => prev ? { ...prev, [field]: value } : null);
  };



  if (!restaurantId) {
    return <div style={styles.errorContainer}><h1>⚠️ No hay restaurante seleccionado</h1></div>;
  }

  if (restaurantError) {
    return (
      <div style={styles.errorContainer}>
        <h1>❌ Error al cargar datos</h1>
        <p>{restaurantError?.message}</p>
      </div>
    );
  }

  const isLoading = loadingRestaurant;

  if (isLoading || !restaurantData) {
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
        <button onClick={() => setActiveTab('restaurant')} style={{ ...styles.tab, ...(activeTab === 'restaurant' ? styles.tabActive : {}) }}>
          <span style={styles.tabIcon}>🏪</span><span>Restaurante</span>
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
                <textarea value={restaurantData.description} onChange={(e) => updateRestaurantData('description', e.target.value)} style={{ ...styles.input, ...styles.textarea }} rows={4} />
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
                style={{ ...styles.saveButton, ...(restaurantMutation.isPending ? styles.saveButtonDisabled : {}) }}
              >
                {restaurantMutation.isPending ? 'Guardando...' : 'Guardar información del restaurante'}
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

const styles: any = {
  errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { width: '40px', height: '40px', border: '4px solid #E5E7EB', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '2rem', fontWeight: '700', color: '#1A1A1A', margin: '0 0 0.5rem 0' },
  subtitle: { fontSize: '1rem', color: '#6B7280', margin: 0 },
  tabsContainer: { display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #E5E7EB' },
  tab: { padding: '1rem 1.5rem', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontSize: '1rem', fontWeight: '500', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '-2px' },
  tabActive: { color: '#3B82F6', borderBottom: '2px solid #3B82F6' },
  tabIcon: { fontSize: '1.25rem' },
  content: { backgroundColor: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' },
  tabContent: { animation: 'fadeIn 0.3s ease-in-out' },
  section: { marginBottom: '2.5rem' },
  sectionTitle: { fontSize: '1.5rem', fontWeight: '600', color: '#1A1A1A', margin: '0 0 1.5rem 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' },
  formField: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' },
  required: { color: '#EF4444' },
  input: { padding: '0.75rem', fontSize: '1rem', border: '1px solid #D1D5DB', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'white' },
  textarea: { resize: 'vertical', minHeight: '100px' },
  checkboxGroup: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' },

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
  }
};
