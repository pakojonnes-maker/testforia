// src/components/guide/GuideCatalogFormDialog.tsx
// Formulario único del catálogo de zona. Antes había dos (POIs y Experiencias)
// con la mitad de los campos repetidos; como en la base de datos es una sola
// tabla (guide_pois), aquí es un solo formulario y el tipo es un campo más.
//
// Todo se guarda contra /guide/admin/pois (POST/PUT): createPOI/updatePOI ya
// aceptan is_bookable y el resto de columnas, así que no hace falta el endpoint
// /experiences para escribir. Lo que createExperience ponía por defecto en el
// servidor (poi_type, access_type, commission_type) se replica aquí al crear.
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
  Select, MenuItem, InputLabel, FormControl, FormControlLabel, Switch, Typography,
  Box, Divider, Alert, CircularProgress, ToggleButton, ToggleButtonGroup, Autocomplete,
} from '@mui/material';
import {
  Upload as UploadIcon,
  LocalActivity as LocalActivityIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';
import {
  CatalogItem, CatalogKind, Zone, CATEGORIES, ACCESS_TYPES, ACTION_TYPES,
  TRAVEL_MODES, BADGE_TYPES, isExperience, isTrue,
} from './catalogTypes';

interface Props {
  open: boolean;
  zones: Zone[];
  /** null = alta nueva */
  item: CatalogItem | null;
  /** tipo con el que se abre un alta nueva */
  initialKind: CatalogKind;
  defaultZoneId: string;
  onClose: () => void;
  /** el item se guardó: la página debe recargar el listado */
  onSaved: () => void;
}

type FormState = Partial<CatalogItem>;

const API_BASE = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Grid item xs={12}>
    <Divider sx={{ mb: 1.5 }} />
    <Typography variant="overline" color="text.secondary" fontWeight={700}>
      {children}
    </Typography>
  </Grid>
);

/** '' → undefined para no mandar campos vacíos que el worker guardaría como NULL sin necesidad. */
const num = (value: string): number | undefined => (value === '' ? undefined : parseFloat(value));

export default function GuideCatalogFormDialog({
  open, zones, item, initialKind, defaultZoneId, onClose, onSaved,
}: Props) {
  const [kind, setKind] = useState<CatalogKind>(initialKind);
  const [form, setForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** id del item recién creado: desbloquea la subida de portada sin cerrar el diálogo */
  const [createdId, setCreatedId] = useState<string | null>(null);

  const editing = item !== null;
  const itemId = item?.id || createdId;
  const originalKind: CatalogKind = item ? (isExperience(item) ? 'experience' : 'place') : initialKind;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setErrors({});
    setCreatedId(null);
    if (item) {
      setKind(isExperience(item) ? 'experience' : 'place');
      setForm({
        ...item,
        // el worker devuelve el alias de compatibilidad; aquí se maneja una sola columna
        subcategory: item.subcategory ?? item.service_subcategory ?? '',
      });
    } else {
      setKind(initialKind);
      setForm({
        zone_id: defaultZoneId,
        category: initialKind === 'experience' ? '' : CATEGORIES[0],
        access_type: initialKind === 'experience' ? 'paid' : 'free',
        poi_type: initialKind === 'experience' ? 'experience' : 'sight',
        travel_mode: initialKind === 'experience' ? '' : 'walk',
        action_type: initialKind === 'experience' ? 'URL' : '',
        badge_type: 'none',
        commission_type: 'none',
        order_index: 0,
        is_active: true,
        is_featured: false,
      });
    }
  }, [open, item, initialKind, defaultZoneId]);

  const set = (patch: FormState) => setForm(prev => ({ ...prev, ...patch }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name_es?.trim()) next.name_es = 'El nombre en español es obligatorio';
    if (!form.category?.trim()) next.category = 'La categoría es obligatoria';
    if (kind === 'experience') {
      if (!form.action_type) next.action_type = 'Una experiencia necesita una acción';
      if (!form.action_data?.trim()) next.action_data = 'Indica la URL, el teléfono o el cupón';
    }
    const hasLat = form.latitude !== undefined && form.latitude !== null && !Number.isNaN(form.latitude);
    const hasLng = form.longitude !== undefined && form.longitude !== null && !Number.isNaN(form.longitude);
    if (hasLat !== hasLng) {
      next.latitude = 'Latitud y longitud van juntas o ninguna';
      next.longitude = 'Latitud y longitud van juntas o ninguna';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        zone_id: form.zone_id,
        category: form.category,
        subcategory: form.subcategory || '',
        poi_type: form.poi_type || (kind === 'experience' ? 'experience' : 'sight'),
        is_bookable: kind === 'experience' ? 1 : 0,
        is_featured: isTrue(form.is_featured) ? 1 : 0,
        is_active: isTrue(form.is_active) ? 1 : 0,
        order_index: form.order_index ?? 0,

        name_es: form.name_es, name_en: form.name_en,
        description_es: form.description_es, description_en: form.description_en,
        short_tip_es: form.short_tip_es, short_tip_en: form.short_tip_en,

        address: form.address ?? '',
        latitude: form.latitude, longitude: form.longitude,
        google_maps_url: form.google_maps_url ?? '',
        google_place_id: form.google_place_id ?? '',
        phone: form.phone ?? '',
        website_url: form.website_url ?? '',
        opening_hours: form.opening_hours ?? '',
        duration_text: form.duration_text ?? '',
        rating: form.rating,
        travel_mode: form.travel_mode || '',
        travel_time_text: form.travel_time_text ?? '',
        distance_text: form.distance_text ?? '',

        access_type: form.access_type || 'free',
        price_display: form.price_display ?? '',
      };

      // Los campos de venta solo tienen sentido en una experiencia. Al convertir
      // una experiencia en lugar se limpian, para que no queden restos de una
      // promoción antigua colgando de la fila.
      if (kind === 'experience') {
        Object.assign(payload, {
          cta_label_es: form.cta_label_es, cta_label_en: form.cta_label_en,
          original_price_display: form.original_price_display ?? '',
          discount_display: form.discount_display ?? '',
          badge_type: form.badge_type || 'none',
          action_type: form.action_type,
          action_data: form.action_data,
          action_prefilled_message: form.action_type === 'WHATSAPP' ? (form.action_prefilled_message ?? '') : '',
          booking_url: form.booking_url ?? '',
          commission_type: form.commission_type || 'none',
          commission_value: form.commission_type && form.commission_type !== 'none' ? (form.commission_value ?? 0) : 0,
        });
      } else if (originalKind === 'experience') {
        Object.assign(payload, {
          action_type: '', action_data: '', action_prefilled_message: '',
          badge_type: 'none', original_price_display: '', discount_display: '',
          commission_type: 'none', commission_value: 0,
        });
      }

      if (itemId) {
        await apiClient.request(`/guide/admin/pois/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        onSaved();
        onClose();
      } else {
        const res = await apiClient.request('/guide/admin/pois', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        // No se cierra: recién creado es cuando se quiere subir la portada, y
        // el endpoint de media necesita un id ya existente.
        setCreatedId(res.id);
        onSaved();
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !itemId) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`${API_BASE}/guide/admin/pois/${itemId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.url) {
        set({ cover_image_url: data.url });
        // La portada se guarda en la fila al pulsar Guardar; avisamos por si acaso.
        setError(null);
      } else {
        throw new Error(data.message || data.error || 'Error al subir la imagen');
      }
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    } finally {
      event.target.value = '';
    }
  };

  const experience = kind === 'experience';
  const converting = editing && kind !== originalKind;

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {experience ? <LocalActivityIcon color="secondary" /> : <PlaceIcon color="primary" />}
        {editing || createdId
          ? `Editar ${experience ? 'experiencia' : 'lugar'}`
          : `Nuevo ${experience ? 'experiencia' : 'lugar'}`}
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {createdId && !editing && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Creado. Ya puedes subir la foto de portada; recuerda pulsar <strong>Guardar</strong> al terminar.
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* ---------- Tipo y clasificación ---------- */}
          <Grid item xs={12}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={kind}
              onChange={(_, value) => value && setKind(value as CatalogKind)}
              sx={{ mb: 1 }}
            >
              <ToggleButton value="place" sx={{ textTransform: 'none', px: 2 }}>
                <PlaceIcon fontSize="small" sx={{ mr: 0.75 }} /> Lugar
              </ToggleButton>
              <ToggleButton value="experience" sx={{ textTransform: 'none', px: 2 }}>
                <LocalActivityIcon fontSize="small" sx={{ mr: 0.75 }} /> Experiencia
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" display="block">
              Un <strong>lugar</strong> sale en el mapa de Explorar. Una <strong>experiencia</strong> además es
              reservable: aparece en el carrusel de promociones con su botón de acción.
            </Typography>
            {converting && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {experience
                  ? 'Al guardar pasará a ser reservable y aparecerá en el carrusel de experiencias del huésped.'
                  : 'Al guardar dejará de ser reservable: desaparecerá del carrusel de experiencias y se borrarán su acción, badge y comisión.'}
              </Alert>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small" disabled={editing}>
              <InputLabel>Zona</InputLabel>
              <Select
                value={form.zone_id || ''}
                label="Zona"
                onChange={e => set({ zone_id: e.target.value })}
              >
                {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
              </Select>
              {editing && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  La zona no se puede cambiar
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              freeSolo
              size="small"
              options={CATEGORIES}
              value={form.category || ''}
              onChange={(_, value) => set({ category: value || '' })}
              onInputChange={(_, value) => set({ category: value })}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Categoría"
                  error={!!errors.category}
                  helperText={errors.category}
                />
              )}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth size="small" label="Subcategoría"
              value={form.subcategory || ''}
              onChange={e => set({ subcategory: e.target.value })}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth size="small" type="number" label="Orden"
              value={form.order_index ?? 0}
              onChange={e => set({ order_index: parseInt(e.target.value, 10) || 0 })}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch checked={isTrue(form.is_active)} onChange={e => set({ is_active: e.target.checked })} />}
                label="Activo"
              />
              <FormControlLabel
                control={<Switch checked={isTrue(form.is_featured)} onChange={e => set({ is_featured: e.target.checked })} />}
                label="Destacado"
              />
            </Box>
          </Grid>

          {/* ---------- Contenido ---------- */}
          <SectionTitle>Contenido (ES / EN)</SectionTitle>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" label="Nombre (ES)" required
              value={form.name_es || ''}
              error={!!errors.name_es} helperText={errors.name_es}
              onChange={e => set({ name_es: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" label="Nombre (EN)"
              value={form.name_en || ''}
              onChange={e => set({ name_en: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" multiline rows={3} label="Descripción (ES)"
              value={form.description_es || ''}
              onChange={e => set({ description_es: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" multiline rows={3} label="Descripción (EN)"
              value={form.description_en || ''}
              onChange={e => set({ description_en: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" label="Tip rápido (ES)"
              placeholder="Ej. Entrada gratuita. Cerrado los lunes."
              value={form.short_tip_es || ''}
              onChange={e => set({ short_tip_es: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" label="Tip rápido (EN)"
              value={form.short_tip_en || ''}
              onChange={e => set({ short_tip_en: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Solo hace falta ES y EN: los otros 11 idiomas los rellena «Traducir zona» sin pisar lo ya escrito.
            </Typography>
          </Grid>

          {/* ---------- Ubicación y contacto ---------- */}
          <SectionTitle>Ubicación y contacto</SectionTitle>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth size="small" label="Dirección"
              value={form.address || ''}
              onChange={e => set({ address: e.target.value })}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth size="small" type="number" label="Latitud"
              value={form.latitude ?? ''}
              error={!!errors.latitude} helperText={errors.latitude}
              onChange={e => set({ latitude: num(e.target.value) })}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth size="small" type="number" label="Longitud"
              value={form.longitude ?? ''}
              error={!!errors.longitude} helperText={errors.longitude}
              onChange={e => set({ longitude: num(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" label="Google Maps URL"
              value={form.google_maps_url || ''}
              onChange={e => set({ google_maps_url: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" label="Google Place ID (para sincronizar)"
              value={form.google_place_id || ''}
              onChange={e => set({ google_place_id: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth size="small" label="Web oficial"
              value={form.website_url || ''}
              onChange={e => set({ website_url: e.target.value })}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              fullWidth size="small" label="Teléfono"
              value={form.phone || ''}
              onChange={e => set({ phone: e.target.value })}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              fullWidth size="small" type="number" label="Rating"
              inputProps={{ min: 0, max: 5, step: 0.1 }}
              value={form.rating ?? ''}
              onChange={e => set({ rating: num(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth size="small" label="Horario (texto libre)"
              placeholder="Ej. Mar-Sáb 10:00-18:00, Dom 10:00-16:00, cerrado Lun"
              value={form.opening_hours || ''}
              onChange={e => set({ opening_hours: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth size="small" label="Duración de la visita"
              placeholder="Ej. 1-2 h"
              value={form.duration_text || ''}
              onChange={e => set({ duration_text: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Modo de trayecto</InputLabel>
              <Select
                value={form.travel_mode || ''}
                label="Modo de trayecto"
                onChange={e => set({ travel_mode: e.target.value })}
              >
                <MenuItem value="">Sin definir</MenuItem>
                {TRAVEL_MODES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              fullWidth size="small" label="Tiempo"
              placeholder="Ej. 5 min"
              value={form.travel_time_text || ''}
              onChange={e => set({ travel_time_text: e.target.value })}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <TextField
              fullWidth size="small" label="Distancia"
              placeholder="Ej. 450 m"
              value={form.distance_text || ''}
              onChange={e => set({ distance_text: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Tiempo y distancia son el valor por defecto de la zona. Cada apartamento puede sobreescribirlos
              desde su propia ficha.
            </Typography>
          </Grid>

          {/* ---------- Precio y acceso ---------- */}
          <SectionTitle>Precio y acceso</SectionTitle>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Acceso</InputLabel>
              <Select
                value={form.access_type || 'free'}
                label="Acceso"
                onChange={e => set({ access_type: e.target.value })}
              >
                {ACCESS_TYPES.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth size="small" label="Precio / entrada"
              placeholder="Ej. 12 € · 200 €/persona"
              helperText="Se muestra tal cual en la tarjeta del huésped"
              value={form.price_display || ''}
              disabled={!experience && (form.access_type || 'free') === 'free'}
              onChange={e => set({ price_display: e.target.value })}
            />
          </Grid>
          {experience && (
            <>
              <Grid item xs={6} md={4}>
                <TextField
                  fullWidth size="small" label="Precio original (tachado)"
                  value={form.original_price_display || ''}
                  onChange={e => set({ original_price_display: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  fullWidth size="small" label="Descuento"
                  placeholder="Ej. -20%"
                  value={form.discount_display || ''}
                  onChange={e => set({ discount_display: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Badge</InputLabel>
                  <Select
                    value={form.badge_type || 'none'}
                    label="Badge"
                    onChange={e => set({ badge_type: e.target.value })}
                  >
                    {BADGE_TYPES.map(b => <MenuItem key={b.value} value={b.value}>{b.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              {/* ---------- Acción del huésped ---------- */}
              <SectionTitle>Acción del huésped</SectionTitle>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small" error={!!errors.action_type}>
                  <InputLabel>Tipo de acción</InputLabel>
                  <Select
                    value={form.action_type || ''}
                    label="Tipo de acción"
                    onChange={e => set({ action_type: e.target.value })}
                  >
                    {ACTION_TYPES.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth size="small" label="Destino de la acción (URL, teléfono o cupón)"
                  value={form.action_data || ''}
                  error={!!errors.action_data} helperText={errors.action_data}
                  onChange={e => set({ action_data: e.target.value })}
                />
              </Grid>
              {form.action_type === 'WHATSAPP' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth size="small" multiline rows={2} label="Mensaje predefinido de WhatsApp"
                    value={form.action_prefilled_message || ''}
                    onChange={e => set({ action_prefilled_message: e.target.value })}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth size="small" label="Botón CTA (ES)"
                  placeholder="Ej. Reservar ahora"
                  value={form.cta_label_es || ''}
                  onChange={e => set({ cta_label_es: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth size="small" label="Botón CTA (EN)"
                  value={form.cta_label_en || ''}
                  onChange={e => set({ cta_label_en: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth size="small" label="URL de reserva (si difiere)"
                  value={form.booking_url || ''}
                  onChange={e => set({ booking_url: e.target.value })}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Comisión</InputLabel>
                  <Select
                    value={form.commission_type || 'none'}
                    label="Comisión"
                    onChange={e => set({ commission_type: e.target.value })}
                  >
                    <MenuItem value="none">Ninguna</MenuItem>
                    <MenuItem value="percentage">Porcentaje</MenuItem>
                    <MenuItem value="fixed">Fija</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField
                  fullWidth size="small" type="number" label="Valor de la comisión"
                  value={form.commission_value ?? 0}
                  disabled={!form.commission_type || form.commission_type === 'none'}
                  onChange={e => set({ commission_value: num(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  La comisión es dato interno: las agencias no la ven en su panel.
                </Typography>
              </Grid>
            </>
          )}

          {/* ---------- Portada ---------- */}
          <SectionTitle>Foto de portada</SectionTitle>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt="Portada"
                  style={{ height: 72, borderRadius: 8, objectFit: 'cover' }}
                />
              )}
              <Button variant="outlined" component="label" startIcon={<UploadIcon />} disabled={!itemId}>
                Subir imagen
                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
              </Button>
              {!itemId && (
                <Typography variant="caption" color="text.secondary">
                  Guarda primero: la foto necesita que el registro exista.
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cerrar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
