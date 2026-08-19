// src/pages/guide/GuideApartmentLinkDialog.tsx
// Importar un apartamento pegando una URL (o una dirección en texto) —
// alternativa de un solo campo a GuideApartmentImportDialog (Excel/CSV).
//
// Respuesta esperada de POST /guide/admin/import/apartments/from-url
// (workerGuideApartmentLink.js): campo a campo con su origen (jsonld /
// opengraph / places / geocode), para poder mostrar de dónde vino cada dato
// y dejar que el admin lo corrija antes de crear el apartamento — el commit
// real va por POST /guide/admin/apartments, igual que el resto del admin.
import { useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, Checkbox, FormControlLabel, Grid, ImageList, ImageListItem,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';

type FieldSource = 'jsonld' | 'opengraph' | 'places' | 'geocode' | null;

interface DraftField {
  value: string | number | string[] | null;
  source: FieldSource;
}

interface FromUrlResponse {
  success: boolean;
  error?: string;
  resolved?: boolean;
  reason?: string;
  message?: string;
  source_kind?: 'jsonld' | 'opengraph' | 'places' | 'geocode';
  matched_type?: string | null;
  source_url?: string | null;
  fields?: Record<string, DraftField>;
  images?: string[];
  source_payload?: unknown;
  likely_duplicate?: { apartment_id: string; name: string; score: number } | null;
}

const SOURCE_LABEL: Record<Exclude<FieldSource, null>, string> = {
  jsonld: 'ficha estructurada de la web',
  opengraph: 'metadatos de la web',
  places: 'Google Maps',
  geocode: 'geocodificado',
};

interface Zone { id: string; name: string }

interface GuideApartmentLinkDialogProps {
  open: boolean;
  onClose: () => void;
  agencyId: string;
  zones: Zone[];
  onCreated: (apartmentId: string) => void;
}

interface EditableDraft {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  capacity: string;
  bedrooms: string;
  bathrooms: string;
  size_m2: string;
  checkin_time: string;
  checkout_time: string;
  property_type: string;
  description: string;
  amenities: string[];
}

function toEditable(fields: Record<string, DraftField>): EditableDraft {
  const str = (k: string) => {
    const v = fields[k]?.value;
    return v == null ? '' : String(v);
  };
  const num = (k: string) => {
    const v = fields[k]?.value;
    return typeof v === 'number' ? v : null;
  };
  const arr = (k: string) => {
    const v = fields[k]?.value;
    return Array.isArray(v) ? v.map(String) : [];
  };
  return {
    name: str('name'),
    address: str('address'),
    latitude: num('latitude'),
    longitude: num('longitude'),
    capacity: str('capacity'),
    bedrooms: str('bedrooms'),
    bathrooms: str('bathrooms'),
    size_m2: str('size_m2'),
    checkin_time: str('checkin_time'),
    checkout_time: str('checkout_time'),
    property_type: str('property_type'),
    description: str('description'),
    amenities: arr('amenities'),
  };
}

export default function GuideApartmentLinkDialog({ open, onClose, agencyId, zones, onCreated }: GuideApartmentLinkDialogProps) {
  const [phase, setPhase] = useState<'input' | 'review'>('input');
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unresolvedMessage, setUnresolvedMessage] = useState<string | null>(null);

  const [response, setResponse] = useState<FromUrlResponse | null>(null);
  const [draft, setDraft] = useState<EditableDraft | null>(null);
  const [zoneId, setZoneId] = useState('');
  const [ownsPhotos, setOwnsPhotos] = useState(true);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setPhase('input');
    setInput('');
    setError(null);
    setUnresolvedMessage(null);
    setResponse(null);
    setDraft(null);
    setZoneId('');
    setOwnsPhotos(true);
  };

  const handleClose = () => {
    if (analyzing || creating) return;
    reset();
    onClose();
  };

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setAnalyzing(true);
    setError(null);
    setUnresolvedMessage(null);
    try {
      const res: FromUrlResponse = await apiClient.request('/guide/admin/import/apartments/from-url', {
        method: 'POST',
        body: JSON.stringify({ agency_id: agencyId, url: input.trim() }),
      });
      if (!res.success) {
        setError(res.error || 'Error al analizar la URL.');
        return;
      }
      if (!res.resolved) {
        setUnresolvedMessage(res.message || 'No se pudieron extraer datos de esa URL o dirección.');
        return;
      }
      setResponse(res);
      setDraft(toEditable(res.fields || {}));
      setZoneId(zones[0]?.id || '');
      setPhase('review');
    } catch (err: any) {
      setError(err.message || 'Error al analizar la URL.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateDraft = (patch: Partial<EditableDraft>) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const handleCreate = async () => {
    if (!draft || !zoneId || !draft.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const toNumOrUndef = (s: string) => (s.trim() === '' ? undefined : Number(s));
      const createRes = await apiClient.request('/guide/admin/apartments', {
        method: 'POST',
        body: JSON.stringify({
          agency_id: agencyId,
          zone_id: zoneId,
          name: draft.name.trim(),
          address: draft.address || undefined,
          latitude: draft.latitude ?? undefined,
          longitude: draft.longitude ?? undefined,
          capacity: toNumOrUndef(draft.capacity),
          bedrooms: toNumOrUndef(draft.bedrooms),
          bathrooms: toNumOrUndef(draft.bathrooms),
          size_m2: toNumOrUndef(draft.size_m2),
          checkin_time: draft.checkin_time || undefined,
          checkout_time: draft.checkout_time || undefined,
          property_type: draft.property_type || undefined,
          description: draft.description || undefined,
          amenities: draft.amenities.length ? draft.amenities : undefined,
          gallery_urls: response?.images?.length ? response.images : undefined,
          source_url: response?.source_url || input.trim(),
          source_payload: response?.source_payload ?? undefined,
          imported_at: new Date().toISOString(),
        }),
      });
      const aptId = createRes.id as string;
      if (!aptId) throw new Error(createRes.error || 'No se pudo crear el apartamento.');

      // Portada: solo se descarga a R2 si el usuario confirma que tiene
      // derechos sobre la foto (fotos de una web ajena tienen copyright de
      // terceros — ver GuideApartmentLinkDialog en el plan). Subir el
      // fichero a R2 NO fija cover_image_url por sí solo — igual que en
      // GuideApartmentDetail.tsx, el upload solo devuelve la URL final; hay
      // que guardarla aparte con un PUT. Si algo falla, el apartamento ya
      // está creado igualmente; no se bloquea por esto.
      const coverUrl = response?.images?.[0];
      if (ownsPhotos && coverUrl) {
        try {
          const uploaded = await apiClient.request(`/guide/admin/apartments/${aptId}/media`, {
            method: 'POST',
            body: JSON.stringify({ source_url: coverUrl }),
          });
          if (uploaded?.url) {
            await apiClient.request(`/guide/admin/apartments/${aptId}`, {
              method: 'PUT',
              body: JSON.stringify({ cover_image_url: uploaded.url }),
            });
          }
        } catch (err: any) {
          console.warn('No se pudo fijar la portada:', err.message);
        }
      }

      onCreated(aptId);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear el apartamento.');
    } finally {
      setCreating(false);
    }
  };

  const fieldChip = (key: string) => {
    const source = response?.fields?.[key]?.source;
    if (!source) return null;
    return <Chip size="small" variant="outlined" label={SOURCE_LABEL[source]} sx={{ ml: 1 }} />;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Importar apartamento desde URL</DialogTitle>
      <DialogContent dividers>
        {phase === 'input' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Pega la URL de la web del alojamiento (o de su gestor de reservas), una URL de
              Google Maps, o directamente una dirección. Se rellenan los datos que se puedan
              encontrar — el resto se completa a mano antes de crear el apartamento.
            </Alert>
            <TextField
              label="URL o dirección"
              fullWidth
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://mi-alojamiento.com/piso-centro o Calle Mayor 12, Nerja"
              onKeyDown={(e) => { if (e.key === 'Enter' && !analyzing) handleAnalyze(); }}
            />
            {unresolvedMessage && <Alert severity="warning">{unresolvedMessage}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}

        {phase === 'review' && draft && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="success">
              Datos extraídos ({response?.source_kind === 'jsonld' ? 'ficha estructurada' : response?.source_kind === 'opengraph' ? 'metadatos de la web' : response?.source_kind === 'places' ? 'Google Maps' : 'dirección geocodificada'}
              {response?.matched_type ? ` · ${response.matched_type}` : ''}). Revisa y corrige lo que haga falta antes de crear.
            </Alert>
            {response?.likely_duplicate && (
              <Alert severity="warning">
                Se parece a un apartamento que ya existe: <strong>{response.likely_duplicate.name}</strong>{' '}
                ({Math.round(response.likely_duplicate.score * 100)}% de coincidencia). Revisa que no sea un duplicado.
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Nombre"
                  fullWidth
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                  InputProps={{ endAdornment: fieldChip('name') }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>Zona</InputLabel>
                  <Select value={zoneId} label="Zona" onChange={(e) => setZoneId(e.target.value)}>
                    {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Dirección"
                  fullWidth
                  value={draft.address}
                  onChange={(e) => updateDraft({ address: e.target.value })}
                  InputProps={{ endAdornment: fieldChip('address') }}
                  helperText={draft.latitude != null && draft.longitude != null ? `Coordenadas: ${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}` : 'Sin coordenadas — corrige la dirección o rellénalas más tarde'}
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <TextField label="Capacidad" type="number" fullWidth value={draft.capacity} onChange={(e) => updateDraft({ capacity: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Dormitorios" type="number" fullWidth value={draft.bedrooms} onChange={(e) => updateDraft({ bedrooms: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Baños" type="number" fullWidth value={draft.bathrooms} onChange={(e) => updateDraft({ bathrooms: e.target.value })} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="m²" type="number" fullWidth value={draft.size_m2} onChange={(e) => updateDraft({ size_m2: e.target.value })} />
              </Grid>

              <Grid item xs={6} sm={3}>
                <TextField label="Check-in" fullWidth value={draft.checkin_time} onChange={(e) => updateDraft({ checkin_time: e.target.value })} placeholder="15:00" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField label="Check-out" fullWidth value={draft.checkout_time} onChange={(e) => updateDraft({ checkout_time: e.target.value })} placeholder="11:00" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Tipo" fullWidth value={draft.property_type} onChange={(e) => updateDraft({ property_type: e.target.value })} placeholder="Apartment, Villa..." />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Descripción"
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  value={draft.description}
                  onChange={(e) => updateDraft({ description: e.target.value })}
                />
              </Grid>

              {draft.amenities.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Comodidades detectadas</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {draft.amenities.map((a, i) => <Chip key={i} size="small" label={a} />)}
                  </Box>
                </Grid>
              )}

              {response?.images && response.images.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    {response.images.length} foto{response.images.length !== 1 ? 's' : ''} encontrada{response.images.length !== 1 ? 's' : ''} — la primera se usa como portada
                  </Typography>
                  <ImageList cols={6} rowHeight={80} sx={{ mt: 0.5, maxHeight: 180 }}>
                    {response.images.slice(0, 12).map((src, i) => (
                      <ImageListItem key={i}>
                        <img src={src} alt="" loading="lazy" style={{ objectFit: 'cover', height: 80, borderRadius: 4 }} />
                      </ImageListItem>
                    ))}
                  </ImageList>
                  <FormControlLabel
                    sx={{ mt: 1 }}
                    control={<Checkbox checked={ownsPhotos} onChange={(e) => setOwnsPhotos(e.target.checked)} />}
                    label="Soy el propietario o tengo derechos sobre estas fotos (si no, solo se guardan sus enlaces, no se copian)"
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {phase === 'input' && (
          <>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button
              variant="contained"
              startIcon={analyzing ? <CircularProgress size={16} /> : <LinkIcon />}
              onClick={handleAnalyze}
              disabled={analyzing || !input.trim()}
            >
              {analyzing ? 'Analizando…' : 'Analizar'}
            </Button>
          </>
        )}
        {phase === 'review' && (
          <>
            <Button onClick={() => setPhase('input')} disabled={creating}>Volver</Button>
            <Button onClick={handleClose} disabled={creating}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating || !draft?.name.trim() || !zoneId}
            >
              {creating ? <CircularProgress size={20} /> : 'Crear apartamento'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
