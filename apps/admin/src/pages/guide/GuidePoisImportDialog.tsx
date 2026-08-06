import { useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl,
  Paper, Chip, Checkbox, FormControlLabel, Divider,
  Accordion, AccordionSummary, AccordionDetails, Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StoreIcon from '@mui/icons-material/Store';

// Debe coincidir con la respuesta de POST /guide/admin/import/places/preview
// (workerGuideImport.js). Los `key` de FieldDiff son los mismos nombres de
// campo que espera POST/PUT /guide/admin/pois, así que el payload de import
// se construye leyendo esos keys directamente — sin tabla de traducción.
interface FieldDiff {
  key: string;
  label: string;
  googleValue: string | number | null;
  currentValue: string | number | null;
  differs: boolean;
  defaultChecked: boolean;
}

interface ClientRestaurantMatch {
  restaurantId: string;
  name: string;
  score: number;
}

type PreviewStatus = 'new' | 'existing' | 'likely_duplicate' | 'unresolved' | 'budget_exceeded' | 'not_found' | 'error';

interface PreviewResult {
  input: string;
  status: PreviewStatus;
  error?: string;
  place_id?: string;
  existing_poi_id?: string | null;
  match_score?: number | null;
  client_restaurant?: ClientRestaurantMatch | null;
  photo_preview_url?: string | null;
  /** Derivado del priceLevel de Google; null cuando Google no dice nada. */
  access_type?: 'free' | 'paid' | null;
  fields?: FieldDiff[];
}

type RowAction = 'create' | 'update' | 'skip';
type RowOutcome = 'idle' | 'importing' | 'done' | 'failed';

interface ImportRow extends PreviewResult {
  action: RowAction;
  selectedFields: Record<string, boolean>;
  outcome: RowOutcome;
  outcomeError?: string;
}

const STATUS_META: Record<PreviewStatus, { label: string; color: 'success' | 'warning' | 'default' | 'error' }> = {
  new: { label: 'Nuevo', color: 'success' },
  existing: { label: 'Ya lo tienes', color: 'default' },
  likely_duplicate: { label: 'Posible duplicado', color: 'warning' },
  unresolved: { label: 'No resuelto', color: 'error' },
  budget_exceeded: { label: 'Límite alcanzado', color: 'error' },
  not_found: { label: 'No encontrado', color: 'error' },
  error: { label: 'Error', color: 'error' },
};

// Estados sin ficha de Google que mapear: no hay nada que crear/actualizar.
const TERMINAL_ERROR_STATUSES: PreviewStatus[] = ['unresolved', 'budget_exceeded', 'not_found', 'error'];

// Respuesta de POST /guide/admin/translate (workerGuideTranslate.js). Google
// solo devuelve la ficha en un idioma, así que sin este paso un POI importado
// se queda monolingüe: la traducción a los otros 12 la hace Workers AI.
interface TranslateResult {
  id: string;
  status: 'translated' | 'partial' | 'up_to_date' | 'skipped' | 'failed' | 'budget_exhausted';
  written: number;
  langs?: string[];
  failed_langs?: string[];
}

interface TranslateSummary {
  translated: number;
  upToDate: number;
  failed: number;
  budgetExhausted: boolean;
  error?: string;
}

// Debe coincidir con MAX_ENTITIES_PER_REQUEST en workerGuideTranslate.js.
const MAX_TRANSLATE_BATCH = 25;

function defaultActionFor(status: PreviewStatus): RowAction {
  if (status === 'new') return 'create';
  if (status === 'existing') return 'update';
  // 'likely_duplicate' se deja en "Descartar" por defecto a propósito: es una
  // coincidencia probable, no segura — que decida un humano antes de tocar
  // datos existentes.
  return 'skip';
}

function buildRow(r: PreviewResult): ImportRow {
  const selectedFields: Record<string, boolean> = {};
  (r.fields || []).forEach(f => { selectedFields[f.key] = f.defaultChecked; });
  return { ...r, action: defaultActionFor(r.status), selectedFields, outcome: 'idle' };
}

function buildPayload(row: ImportRow, zoneId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    zone_id: zoneId,
    google_place_id: row.place_id,
    external_id: row.place_id,
    source: 'google_places',
    google_synced_at: new Date().toISOString(),
  };
  // Solo al crear: en un update el host ya pudo fijar el acceso a mano y la
  // señal de Google (que a menudo ni existe) no debe pisarlo.
  if (row.action === 'create' && row.access_type) {
    payload.access_type = row.access_type;
  }
  (row.fields || []).forEach(f => {
    if (row.selectedFields[f.key] && f.googleValue !== null && f.googleValue !== undefined && f.googleValue !== '') {
      payload[f.key] = f.googleValue;
    }
  });
  return payload;
}

interface Zone {
  id: string;
  name: string;
}

interface GuidePoisImportDialogProps {
  open: boolean;
  onClose: () => void;
  zones: Zone[];
  defaultZoneId: string;
  onImported: () => void;
}

export default function GuidePoisImportDialog({ open, onClose, zones, defaultZoneId, onImported }: GuidePoisImportDialogProps) {
  const [phase, setPhase] = useState<'input' | 'review'>('input');
  const [zoneId, setZoneId] = useState(defaultZoneId);
  const [urlsText, setUrlsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<{ created: number; updated: number; failed: number } | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translationSummary, setTranslationSummary] = useState<TranslateSummary | null>(null);

  const reset = () => {
    setPhase('input');
    setUrlsText('');
    setRows([]);
    setSummary(null);
    setTranslationSummary(null);
    setError(null);
  };

  const handleClose = () => {
    if (loading || importing || translating) return;
    reset();
    onClose();
  };

  const handleAnalyze = async () => {
    const urls = urlsText.split('\n').map(s => s.trim()).filter(Boolean);
    if (urls.length === 0) { setError('Pega al menos una URL o el nombre de un sitio.'); return; }
    if (!zoneId) { setError('Selecciona una zona.'); return; }
    if (urls.length > 20) { setError('Máximo 20 por lote — divide la lista en varias importaciones.'); return; }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.request('/guide/admin/import/places/preview', {
        method: 'POST',
        body: JSON.stringify({ urls, zone_id: zoneId }),
      });
      if (response.success) {
        setRows((response.results as PreviewResult[]).map(buildRow));
        setSummary(null);
        setPhase('review');
      } else {
        setError(response.error || 'Error al analizar las URLs.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al analizar las URLs.');
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (rowIndex: number, key: string) => {
    setRows(prev => prev.map((row, i) =>
      i === rowIndex ? { ...row, selectedFields: { ...row.selectedFields, [key]: !row.selectedFields[key] } } : row
    ));
  };

  const setRowAction = (rowIndex: number, action: RowAction) => {
    setRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, action } : row));
  };

  /**
   * Traduce en una segunda pasada, después de guardar. Deliberadamente separado
   * del import: si Workers AI falla o se queda sin presupuesto diario, los POIs
   * ya están guardados y solo queda pendiente la traducción, que se puede
   * reintentar sin volver a tocar Google.
   */
  const runTranslation = async (ids: string[]) => {
    setTranslating(true);
    const agg: TranslateSummary = { translated: 0, upToDate: 0, failed: 0, budgetExhausted: false };
    try {
      for (let i = 0; i < ids.length; i += MAX_TRANSLATE_BATCH) {
        const response = await apiClient.request('/guide/admin/translate', {
          method: 'POST',
          body: JSON.stringify({ entity_type: 'poi', entity_ids: ids.slice(i, i + MAX_TRANSLATE_BATCH) }),
        });
        for (const result of (response.results || []) as TranslateResult[]) {
          if (result.status === 'translated' || result.status === 'partial') agg.translated++;
          else if (result.status === 'up_to_date') agg.upToDate++;
          else if (result.status === 'budget_exhausted') agg.budgetExhausted = true;
          else agg.failed++;
        }
        // El backend corta el lote en cuanto se agota el presupuesto diario y
        // devuelve lo que quedó sin tocar; mandar más lotes solo sumaría errores.
        if ((response.pending_ids || []).length > 0) { agg.budgetExhausted = true; break; }
      }
    } catch (err: any) {
      agg.error = err.message || 'Error al traducir.';
    }
    setTranslationSummary(agg);
    setTranslating(false);
  };

  const handleImportSelected = async () => {
    setImporting(true);
    setTranslationSummary(null);
    let created = 0, updated = 0, failed = 0;
    const importedIds: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.action === 'skip') continue;

      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, outcome: 'importing' } : r));
      try {
        const payload = buildPayload(row, zoneId);
        if (row.action === 'create') {
          const response = await apiClient.request('/guide/admin/pois', { method: 'POST', body: JSON.stringify(payload) });
          if (response?.id) importedIds.push(response.id as string);
          created++;
        } else {
          if (!row.existing_poi_id) throw new Error('No hay POI existente al que actualizar.');
          await apiClient.request(`/guide/admin/pois/${row.existing_poi_id}`, { method: 'PUT', body: JSON.stringify(payload) });
          importedIds.push(row.existing_poi_id);
          updated++;
        }
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, outcome: 'done' } : r));
      } catch (err: any) {
        failed++;
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, outcome: 'failed', outcomeError: err.message } : r));
      }
    }

    setImporting(false);
    setSummary({ created, updated, failed });
    if (created > 0 || updated > 0) onImported();

    if (autoTranslate && importedIds.length > 0) {
      await runTranslation(importedIds);
      onImported();
    }
  };

  const hasSelectableRows = rows.some(r => r.action !== 'skip');

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Importar POIs desde Google Maps</DialogTitle>
      <DialogContent dividers>
        {phase === 'input' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              Pega una o varias URLs de Google Maps (una por línea) — enlace largo de escritorio, enlace
              corto de móvil (maps.app.goo.gl), o directamente el nombre del sitio. Las fotos de Google
              solo se muestran aquí para identificar el lugar: nunca se guardan en VisualTaste.
            </Alert>
            <FormControl fullWidth size="small">
              <InputLabel>Zona</InputLabel>
              <Select value={zoneId} label="Zona" onChange={e => setZoneId(e.target.value)}>
                {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              multiline
              minRows={6}
              fullWidth
              label="URLs de Google Maps o nombres (uno por línea)"
              placeholder={'https://maps.app.goo.gl/xxxx\nhttps://www.google.com/maps/place/...\nEl Pimpi Málaga'}
              value={urlsText}
              onChange={e => setUrlsText(e.target.value)}
            />
            <FormControlLabel
              control={<Checkbox checked={autoTranslate} onChange={e => setAutoTranslate(e.target.checked)} />}
              label="Traducir automáticamente a los 13 idiomas al importar"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5, ml: 4 }}>
              Google devuelve la ficha en un solo idioma. La traducción la genera la IA de Cloudflare
              a partir del español y nunca sobrescribe un texto que ya hayas escrito tú.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}

        {phase === 'review' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {summary && (
              <Alert severity={summary.failed > 0 ? 'warning' : 'success'}>
                Importación terminada: {summary.created} creados, {summary.updated} actualizados
                {summary.failed > 0 ? `, ${summary.failed} con error` : ''}.
              </Alert>
            )}
            {translating && (
              <Alert severity="info" icon={<CircularProgress size={18} />}>
                Traduciendo a los otros 12 idiomas…
              </Alert>
            )}
            {translationSummary && !translating && (
              <Alert severity={
                translationSummary.error || translationSummary.budgetExhausted || translationSummary.failed > 0
                  ? 'warning'
                  : 'success'
              }>
                {translationSummary.error
                  ? `Los POIs se guardaron, pero la traducción falló: ${translationSummary.error}`
                  : <>
                      Traducción: {translationSummary.translated} POIs traducidos
                      {translationSummary.upToDate > 0 ? `, ${translationSummary.upToDate} ya estaban al día` : ''}
                      {translationSummary.failed > 0 ? `, ${translationSummary.failed} sin traducir` : ''}.
                      {translationSummary.budgetExhausted && ' Se alcanzó el límite diario de IA — vuelve a lanzarlo mañana para los que falten (los POIs ya están guardados).'}
                    </>
                }
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}

            {rows.map((row, idx) => {
              const meta = STATUS_META[row.status];
              const isTerminalError = TERMINAL_ERROR_STATUSES.includes(row.status);
              return (
                <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    {row.photo_preview_url && (
                      <Tooltip title="Vista previa de Google — no se guarda en VisualTaste">
                        <Box
                          component="img"
                          src={row.photo_preview_url}
                          alt=""
                          sx={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                        />
                      </Tooltip>
                    )}

                    <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={meta.label} color={meta.color} />
                        {row.status === 'likely_duplicate' && row.match_score != null && (
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(row.match_score * 100)}% de coincidencia
                          </Typography>
                        )}
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 320 }}>
                          {row.fields?.find(f => f.key === 'name_es')?.googleValue || row.input}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" component="div" noWrap sx={{ maxWidth: 500 }}>
                        {row.input}
                      </Typography>
                      {row.error && (
                        <Typography variant="caption" color="error" component="div">{row.error}</Typography>
                      )}
                      {row.client_restaurant && (
                        <Chip
                          size="small"
                          icon={<StoreIcon />}
                          label={`Ya es cliente VisualTaste: ${row.client_restaurant.name}`}
                          color="info"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>

                    {!isTerminalError && (
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Acción</InputLabel>
                        <Select
                          value={row.action}
                          label="Acción"
                          onChange={e => setRowAction(idx, e.target.value as RowAction)}
                          disabled={importing}
                        >
                          <MenuItem value="create">Crear como nuevo</MenuItem>
                          <MenuItem value="update" disabled={!row.existing_poi_id}>Actualizar existente</MenuItem>
                          <MenuItem value="skip">Descartar</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    {row.outcome === 'importing' && <CircularProgress size={20} />}
                    {row.outcome === 'done' && <Chip size="small" label="Importado" color="success" />}
                    {row.outcome === 'failed' && (
                      <Tooltip title={row.outcomeError || 'Error desconocido'}>
                        <Chip size="small" label="Error" color="error" />
                      </Tooltip>
                    )}
                  </Box>

                  {!isTerminalError && row.action !== 'skip' && row.fields && row.fields.length > 0 && (
                    <Accordion disableGutters elevation={0} sx={{ mt: 1, '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 0, px: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          Ver / elegir campos ({row.fields.filter(f => row.selectedFields[f.key]).length} de {row.fields.length} seleccionados)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 0 }}>
                        <Divider sx={{ mb: 1 }} />
                        {row.fields.map(f => (
                          <Box key={f.key} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5 }}>
                            <FormControlLabel
                              sx={{ m: 0 }}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={!!row.selectedFields[f.key]}
                                  onChange={() => toggleField(idx, f.key)}
                                  disabled={importing}
                                />
                              }
                              label=""
                            />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="caption" color="text.secondary" component="div">{f.label}</Typography>
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ color: f.differs ? 'success.main' : 'text.primary' }}>
                                  Google: {f.googleValue ?? '—'}
                                </Typography>
                                {f.currentValue != null && f.currentValue !== '' && (
                                  <Typography variant="body2" color="text.secondary">
                                    Actual: {f.currentValue}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {phase === 'input' && (
          <>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button variant="contained" onClick={handleAnalyze} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Analizar'}
            </Button>
          </>
        )}
        {phase === 'review' && (
          <>
            <Button onClick={() => setPhase('input')} disabled={importing || translating}>Volver</Button>
            <Button onClick={handleClose} disabled={importing || translating}>Cerrar</Button>
            <Button
              variant="contained"
              onClick={handleImportSelected}
              disabled={importing || translating || !hasSelectableRows}
            >
              {importing || translating ? <CircularProgress size={20} /> : 'Importar seleccionados'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
