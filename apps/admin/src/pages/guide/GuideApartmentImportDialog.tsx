import { useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import {
  downloadApartmentImportTemplate,
  parseApartmentImportFile,
  type ParsedApartmentRow,
  type TemplateZone,
  type TemplateCategory,
} from '../../lib/guideApartmentTemplate';
import {
  Box, Typography, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Paper, Chip, Checkbox, FormControlLabel, Divider,
  Accordion, AccordionSummary, AccordionDetails, FormControl,
  Select, MenuItem, InputLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';

// Debe coincidir con la respuesta de POST /guide/admin/import/apartments/preview
// (workerGuideApartmentImport.js).
type PreviewStatus = 'new' | 'likely_duplicate' | 'zone_not_found' | 'error';

interface PreviewRow {
  row_number: number;
  name: string;
  slug?: string;
  address?: string | null;
  status: PreviewStatus;
  error?: string;
  zone_id?: string;
  zone_matched_name?: string;
  zone_name_input?: string;
  existing_apartment_id?: string | null;
  match_score?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string | null;
  geocoded?: boolean;
  wifi_ssid?: string | null;
  wifi_password?: string | null;
  whatsapp?: string | null;
  info: { category_key: string; text: string; custom_title: string | null }[];
  phones: { category_key: string; number: string }[];
  warnings: string[];
}

type RowAction = 'create' | 'skip';
type RowOutcome = 'idle' | 'importing' | 'done' | 'failed';

interface ImportRow extends PreviewRow {
  action: RowAction;
  outcome: RowOutcome;
  outcomeError?: string;
}

const STATUS_META: Record<PreviewStatus, { label: string; color: 'success' | 'warning' | 'default' | 'error' }> = {
  new: { label: 'Nuevo', color: 'success' },
  likely_duplicate: { label: 'Posible duplicado', color: 'warning' },
  zone_not_found: { label: 'Zona no reconocida', color: 'error' },
  error: { label: 'Error', color: 'error' },
};

const TERMINAL_STATUSES: PreviewStatus[] = ['zone_not_found', 'error'];

// Debe coincidir con MAX_ROWS_PER_BATCH en workerGuideApartmentImport.js.
const MAX_ROWS_PER_BATCH = 40;
// Debe coincidir con MAX_ENTITIES_PER_REQUEST en workerGuideTranslate.js.
const MAX_TRANSLATE_BATCH = 25;

interface TranslateUsage {
  neurons_spent: number;
  budget_limit: number;
  budget_remaining: number;
}

interface TranslateSummary {
  translated: number;
  failed: number;
  budgetExhausted: boolean;
  usage?: TranslateUsage;
  error?: string;
}

function defaultActionFor(status: PreviewStatus): RowAction {
  return status === 'new' ? 'create' : 'skip';
}

interface Zone { id: string; name: string }

interface GuideApartmentImportDialogProps {
  open: boolean;
  onClose: () => void;
  agencyId: string;
  zones: Zone[];
  onImported: () => void;
}

export default function GuideApartmentImportDialog({ open, onClose, agencyId, zones, onImported }: GuideApartmentImportDialogProps) {
  const [phase, setPhase] = useState<'input' | 'review'>('input');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedApartmentRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<{ created: number; failed: number } | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translationSummary, setTranslationSummary] = useState<TranslateSummary | null>(null);

  const reset = () => {
    setPhase('input');
    setParseErrors([]);
    setParsedCount(null);
    setParsedRows(null);
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

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setError(null);
    try {
      const [catRes, phoneCatRes] = await Promise.all([
        apiClient.request('/guide/admin/info-categories'),
        apiClient.request('/guide/admin/phone-categories'),
      ]);
      const templateZones: TemplateZone[] = zones.map(z => ({ name: z.name }));
      const infoCategories: TemplateCategory[] = (catRes.categories || []) as TemplateCategory[];
      const phoneCategories: TemplateCategory[] = (phoneCatRes.categories || []) as TemplateCategory[];
      downloadApartmentImportTemplate(templateZones, infoCategories, phoneCategories);
    } catch (err: any) {
      setError(err.message || 'No se pudo generar la plantilla.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo tras corregirlo
    if (!file) return;
    setError(null);
    setParsedRows(null);
    setParsedCount(null);
    setParseErrors([]);
    try {
      const { rows: parsed, parseErrors: errs } = await parseApartmentImportFile(file);
      if (parsed.length === 0) {
        setError('No se encontró ninguna fila con nombre en la hoja "Apartamentos".');
        return;
      }
      if (parsed.length > MAX_ROWS_PER_BATCH) {
        setError(`El archivo trae ${parsed.length} apartamentos — el máximo por lote es ${MAX_ROWS_PER_BATCH}. Divide el archivo en varias importaciones.`);
        return;
      }
      setParsedRows(parsed);
      setParsedCount(parsed.length);
      setParseErrors(errs);
    } catch (err: any) {
      setError(err.message || 'No se pudo leer el archivo. ¿Es un .xlsx o .csv válido?');
    }
  };

  const handleAnalyze = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.request('/guide/admin/import/apartments/preview', {
        method: 'POST',
        body: JSON.stringify({ agency_id: agencyId, rows: parsedRows }),
      });
      if (response.success) {
        const built: ImportRow[] = (response.results as PreviewRow[]).map(r => ({
          ...r,
          action: defaultActionFor(r.status),
          outcome: 'idle',
        }));
        setRows(built);
        setSummary(null);
        setPhase('review');
      } else {
        setError(response.error || 'Error al analizar el archivo.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al analizar el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const setRowAction = (rowIndex: number, action: RowAction) => {
    setRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, action } : row));
  };

  /**
   * Traduce en una segunda pasada, después de guardar (mismo motivo que en
   * GuidePoisImportDialog: si Workers AI se queda sin presupuesto diario, los
   * apartamentos ya están guardados en español y solo falta reintentar la
   * traducción, sin volver a tocar Google ni recrear nada).
   *
   * `createdApartments` viaja como parámetro (no se relee de `rows`) porque
   * esta función se llama justo después del bucle de creación, dentro del
   * mismo handleImportSelected: los setRows de ese bucle son actualizaciones
   * de estado asíncronas, así que `rows` en este cierre todavía sería el
   * valor de ANTES de crear nada.
   */
  const runTranslation = async (infoIds: string[], createdApartments: { id: string; address: string }[]) => {
    setTranslating(true);
    const agg: TranslateSummary = { translated: 0, failed: 0, budgetExhausted: false };
    try {
      for (let i = 0; i < infoIds.length; i += MAX_TRANSLATE_BATCH) {
        const response = await apiClient.request('/guide/admin/translate', {
          method: 'POST',
          body: JSON.stringify({ entity_type: 'apartment_info', entity_ids: infoIds.slice(i, i + MAX_TRANSLATE_BATCH) }),
        });
        if (response.usage) agg.usage = response.usage as TranslateUsage;
        for (const result of (response.results || []) as { status: string }[]) {
          if (result.status === 'translated' || result.status === 'partial') agg.translated++;
          else if (result.status === 'budget_exhausted') agg.budgetExhausted = true;
          else if (result.status !== 'up_to_date') agg.failed++;
        }
        if ((response.pending_ids || []).length > 0) { agg.budgetExhausted = true; break; }
      }

      // workerGuideTranslate.js solo re-versiona la caché KV para
      // entity_type 'poi' — para 'apartment_info' escribe la traducción en
      // D1 pero no bumpea ver:apt:{slug}, así que producción seguiría
      // sirviendo el JSON viejo hasta que expire el TTL. Se fuerza aquí con
      // un PUT de apartamento que re-escribe su propia dirección (no-op de
      // datos, pero updateApartment sí bumpea la versión al final de toda
      // llamada) en vez de tocar ese módulo, que a fecha de este import
      // tiene cambios de otra sesión sin commitear.
      if (agg.translated > 0) {
        for (const apt of createdApartments) {
          await apiClient.request(`/guide/admin/apartments/${apt.id}`, {
            method: 'PUT',
            body: JSON.stringify({ address: apt.address }),
          }).catch(() => {});
        }
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
    let created = 0, failed = 0;
    const createdInfoIds: string[] = [];
    const createdApartments: { id: string; address: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.action !== 'create' || TERMINAL_STATUSES.includes(row.status)) continue;

      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, outcome: 'importing' } : r));
      try {
        const createRes = await apiClient.request('/guide/admin/apartments', {
          method: 'POST',
          body: JSON.stringify({
            agency_id: agencyId,
            zone_id: row.zone_id,
            name: row.name,
            slug: row.slug,
            address: row.address || undefined,
            latitude: row.latitude ?? undefined,
            longitude: row.longitude ?? undefined,
          }),
        });
        const aptId = createRes.id as string;
        if (!aptId) throw new Error(createRes.error || 'No se pudo crear el apartamento.');

        // createApartment (workerGuideAdmin.js) no acepta wifi/whatsapp en el
        // INSERT inicial — son columnas que solo updateApartment sabe tocar.
        if (row.wifi_ssid || row.wifi_password || row.whatsapp) {
          await apiClient.request(`/guide/admin/apartments/${aptId}`, {
            method: 'PUT',
            body: JSON.stringify({
              ...(row.wifi_ssid ? { wifi_ssid: row.wifi_ssid } : {}),
              ...(row.wifi_password ? { wifi_password: row.wifi_password } : {}),
              ...(row.whatsapp ? { contact_whatsapp: row.whatsapp } : {}),
            }),
          });
        }

        for (const item of row.info) {
          const infoRes = await apiClient.request(`/guide/admin/apartments/${aptId}/info`, {
            method: 'POST',
            body: JSON.stringify({
              info_key: item.category_key,
              category_key: item.category_key,
              use_custom_title: !!item.custom_title,
              translations: {
                es: {
                  content: item.text,
                  ...(item.custom_title ? { title: item.custom_title } : {}),
                },
              },
            }),
          });
          if (infoRes?.infoId) createdInfoIds.push(infoRes.infoId as string);
        }

        for (const item of row.phones) {
          await apiClient.request(`/guide/admin/apartments/${aptId}/phones`, {
            method: 'POST',
            body: JSON.stringify({ category_key: item.category_key, phone_number: item.number }),
          });
        }

        createdApartments.push({ id: aptId, address: row.address || '' });
        created++;
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, outcome: 'done' } : r));
      } catch (err: any) {
        failed++;
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, outcome: 'failed', outcomeError: err.message } : r));
      }
    }

    setImporting(false);
    setSummary({ created, failed });
    if (created > 0) onImported();

    if (autoTranslate && createdInfoIds.length > 0) {
      await runTranslation(createdInfoIds, createdApartments);
      onImported();
    }
  };

  const hasSelectableRows = rows.some(r => r.action === 'create');

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Importar apartamentos desde Excel</DialogTitle>
      <DialogContent dividers>
        {phase === 'input' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
              1) Descarga la plantilla y pásasela a la agencia (o rellénala tú). 2) Sube el archivo
              relleno aquí — se previsualiza fila a fila antes de crear nada. Este importador solo
              CREA apartamentos nuevos; si una fila parece coincidir con uno que ya existe, se marca
              como posible duplicado para que decidas tú.
            </Alert>

            <Button
              variant="outlined"
              startIcon={downloadingTemplate ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              sx={{ alignSelf: 'flex-start' }}
            >
              Descargar plantilla (.xlsx)
            </Button>

            <Divider />

            <Button
              component="label"
              variant="contained"
              startIcon={<UploadFileIcon />}
              sx={{ alignSelf: 'flex-start' }}
            >
              Subir archivo relleno
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileSelected} />
            </Button>

            {parsedCount != null && (
              <Alert severity={parseErrors.length > 0 ? 'warning' : 'success'}>
                {parsedCount} apartamento{parsedCount !== 1 ? 's' : ''} detectado{parsedCount !== 1 ? 's' : ''} en el archivo.
                {parseErrors.length > 0 && (
                  <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                    {parseErrors.map((e, i) => <li key={i}><Typography variant="caption">{e}</Typography></li>)}
                  </Box>
                )}
              </Alert>
            )}

            <FormControlLabel
              control={<Checkbox checked={autoTranslate} onChange={e => setAutoTranslate(e.target.checked)} />}
              label="Traducir automáticamente a los 13 idiomas al importar"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1.5, ml: 4 }}>
              El texto se guarda en español y la IA de Cloudflare genera el resto de idiomas en una
              segunda pasada, después de crear los apartamentos.
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}

        {phase === 'review' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {summary && (
              <Alert severity={summary.failed > 0 ? 'warning' : 'success'}>
                Importación terminada: {summary.created} creados
                {summary.failed > 0 ? `, ${summary.failed} con error` : ''}.
              </Alert>
            )}
            {translating && (
              <Alert severity="info" icon={<CircularProgress size={18} />}>
                Traduciendo a los otros 12 idiomas…
              </Alert>
            )}
            {translationSummary && !translating && (
              <Alert severity={translationSummary.error || translationSummary.budgetExhausted || translationSummary.failed > 0 ? 'warning' : 'success'}>
                {translationSummary.error
                  ? `Los apartamentos se guardaron, pero la traducción falló: ${translationSummary.error}`
                  : <>
                      Traducción: {translationSummary.translated} bloques traducidos
                      {translationSummary.failed > 0 ? `, ${translationSummary.failed} sin traducir` : ''}.
                      {translationSummary.budgetExhausted && ' Se alcanzó el límite diario de IA — vuelve a intentarlo mañana para lo que falte (ya está guardado).'}
                      {translationSummary.usage && (
                        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                          Coste: {Math.round(translationSummary.usage.neurons_spent)} neuronas · quedan{' '}
                          {translationSummary.usage.budget_remaining.toLocaleString('es-ES')} de{' '}
                          {translationSummary.usage.budget_limit.toLocaleString('es-ES')} del presupuesto diario del traductor.
                        </Typography>
                      )}
                    </>
                }
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}

            {rows.map((row, idx) => {
              const meta = STATUS_META[row.status];
              const isTerminal = TERMINAL_STATUSES.includes(row.status);
              return (
                <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={meta.label} color={meta.color} />
                        {row.status === 'likely_duplicate' && row.match_score != null && (
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(row.match_score * 100)}% parecido a un apartamento existente
                          </Typography>
                        )}
                        <Typography variant="body2" fontWeight={600}>{row.name || `Fila ${row.row_number}`}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Fila {row.row_number}
                        {row.zone_matched_name && ` · Zona: ${row.zone_matched_name}`}
                        {row.address && ` · ${row.address}`}
                        {row.address && (row.geocoded ? ' (geocodificada)' : ' (sin geocodificar)')}
                      </Typography>
                      {row.error && <Typography variant="caption" color="error" component="div">{row.error}</Typography>}
                      {row.warnings?.length > 0 && (
                        <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                          {row.warnings.map((w, i) => (
                            <li key={i}><Typography variant="caption" color="text.secondary">{w}</Typography></li>
                          ))}
                        </Box>
                      )}
                    </Box>

                    {!isTerminal && (
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Acción</InputLabel>
                        <Select
                          value={row.action}
                          label="Acción"
                          onChange={e => setRowAction(idx, e.target.value as RowAction)}
                          disabled={importing}
                        >
                          <MenuItem value="create">Crear como nuevo</MenuItem>
                          <MenuItem value="skip">Descartar</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    {row.outcome === 'importing' && <CircularProgress size={20} />}
                    {row.outcome === 'done' && <Chip size="small" label="Importado" color="success" />}
                    {row.outcome === 'failed' && (
                      <Chip size="small" label={row.outcomeError || 'Error'} color="error" />
                    )}
                  </Box>

                  {!isTerminal && row.action !== 'skip' && (row.info.length > 0 || row.phones.length > 0) && (
                    <Accordion disableGutters elevation={0} sx={{ mt: 1, '&:before': { display: 'none' } }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 0, px: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {row.info.length} bloque{row.info.length !== 1 ? 's' : ''} de info · {row.phones.length} teléfono{row.phones.length !== 1 ? 's' : ''}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ px: 0 }}>
                        <Divider sx={{ mb: 1 }} />
                        {row.info.map((f, i) => (
                          <Typography key={i} variant="body2" sx={{ py: 0.25 }}>
                            <strong>{f.category_key}</strong>: {f.text}
                          </Typography>
                        ))}
                        {row.phones.map((p, i) => (
                          <Typography key={i} variant="body2" sx={{ py: 0.25 }}>
                            <strong>{p.category_key}</strong>: {p.number}
                          </Typography>
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
            <Button variant="contained" onClick={handleAnalyze} disabled={loading || !parsedRows || parsedRows.length === 0}>
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
              disabled={importing || translating || !hasSelectableRows || !!summary}
            >
              {importing || translating ? <CircularProgress size={20} /> : 'Importar seleccionados'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
