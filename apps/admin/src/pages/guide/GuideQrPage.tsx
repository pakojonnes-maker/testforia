// src/pages/guide/GuideQrPage.tsx
// «QR para enmarcar»: una lámina imprimible por apartamento (póster de su zona + marco + QR de
// la guía) para poner en un marco de fotos en el piso. El diseño es uno por agencia; la lámina
// de fondo es la de la zona. Todo se compone en el navegador (lib/qrPoster), sin servidor.
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, FormControlLabel, Grid, InputLabel, LinearProgress,
  MenuItem, Select, Slider, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import {
  CropPortrait as PaperIcon, Download as DownloadIcon, FilterFrames as FrameIcon, Image as ImageIcon,
  PictureAsPdf as PdfIcon, QrCode2 as QrIcon, Save as SaveIcon, Style as StyleIcon, Upload as UploadIcon,
  Apartment as ApartmentIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL, apiClient } from '../../lib/apiClient';
import { PageHeader } from '../../components/common/PageHeader';
import { Panel } from '../../components/common/Panel';
import {
  EXPORT_DPI, loadBitmap, loadFrameFonts, posterQuality, previewDpi, renderBackground, renderPoster,
  type PosterOutput, type PosterQuality,
} from '../../lib/qrPoster/render';
import { buildPdf, canvasRegionToFlate, canvasToJpeg, canvasToPng, saveBlob, type PdfPage } from '../../lib/qrPoster/pdf';
import {
  PRINT_SIZES, QR_SIZE_MAX, QR_SIZE_MIN, defaultDesign, guideUrlForFrame, normalizeDesign, printSize,
  type DotStyle, type EyeStyle, type FrameShape, type PrintSizeKey, type PupilStyle, type QrFrameDesign,
} from '../../lib/qrPoster/types';
import type { PosterCheck } from '../../lib/qrPoster/check';
import { contrast, hexToRgb } from '../../lib/qrPoster/color';

const GUIDE_URL = import.meta.env.VITE_GUIDE_URL || 'https://guide.visualtastes.com';

interface QrApartment {
  id: string;
  name: string;
  slug: string;
  zone_id: string;
  zone_name: string;
  frame_sessions: number;
  frame_sessions_30d: number;
  frame_visitors_30d: number;
}

interface QrPoster {
  id: string;
  zone_id: string;
  name: string;
  url: string;
  width: number | null;
  height: number | null;
  qr_x: number;
  qr_y: number;
}

interface QrZone { id: string; name: string; slug: string }

interface QrAgency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  qr_design: unknown;
}

interface Overview {
  agency: QrAgency;
  apartments: QrApartment[];
  posters: QrPoster[];
  zones: QrZone[];
  can_manage_posters: boolean;
}

interface Placement { x: number; y: number }

interface Preview {
  check: PosterCheck;
  quality: PosterQuality | null;
}

type Busy = 'save' | 'png' | 'pdf' | 'upload' | 'placement' | null;

const DOT_OPTIONS: Array<[DotStyle, string]> = [
  ['square', 'Cuadrado (clásico)'], ['rounded', 'Redondeado'], ['dots', 'Puntos'],
  ['classy', 'Elegante'], ['classy-rounded', 'Elegante redondeado'], ['extra-rounded', 'Extra redondeado'],
];
const EYE_OPTIONS: Array<[EyeStyle, string]> = [['square', 'Cuadradas'], ['dot', 'Circulares'], ['extra-rounded', 'Muy redondeadas']];
const PUPIL_OPTIONS: Array<[PupilStyle, string]> = [['square', 'Cuadrados'], ['dot', 'Circulares']];
const SHAPE_OPTIONS: Array<[FrameShape, string]> = [['etiqueta', 'Etiqueta'], ['placa', 'Placa'], ['arco', 'Arco']];
const QUALITY_SEVERITY = { buena: 'success', aceptable: 'warning', baja: 'error' } as const;
/** Papel crema de las láminas: la referencia para decidir si el color de la agencia vale de tinta. */
const REFERENCE_PAPER = '#f6f0d6';

const isHex = (value: string | null | undefined): value is string => !!value && /^#[0-9a-f]{6}$/i.test(value);

/** El color de la agencia como tinta del QR, si es lo bastante oscuro para leerse sobre el papel. */
function agencyInk(agency: QrAgency): string | undefined {
  return isHex(agency.primary_color) && contrast(hexToRgb(agency.primary_color), hexToRgb(REFERENCE_PAPER)) >= 6
    ? agency.primary_color.toLowerCase()
    : undefined;
}

function ColorInput({ label, value, onChange }: { label: ReactNode; value: string; onChange: (value: string) => void }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box component="input" type="color" value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{
            width: 40, height: 40, p: 0, border: 1, borderColor: 'divider', cursor: 'pointer', bgcolor: 'transparent',
            '&::-webkit-color-swatch-wrapper': { p: 0 }, '&::-webkit-color-swatch': { border: 'none' },
          }} />
        <TextField size="small" value={value} sx={{ flexGrow: 1 }} inputProps={{ style: { fontFamily: 'monospace' } }}
          onChange={(e) => { if (isHex(e.target.value)) onChange(e.target.value); }} />
      </Stack>
    </Box>
  );
}

export default function GuideQrPage() {
  const { currentAgency } = useAuth();
  const agencyId: string | undefined = currentAgency?.id;
  const [searchParams] = useSearchParams();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ severity: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [design, setDesign] = useState<QrFrameDesign>(() => defaultDesign(false));
  const [savedDesign, setSavedDesign] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, Placement>>({});
  const [logoFailed, setLogoFailed] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmaps = useRef(new Map<string, Promise<ImageBitmap>>());
  const uploadZone = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const getBitmap = useCallback((url: string) => {
    let pending = bitmaps.current.get(url);
    if (!pending) {
      pending = loadBitmap(url);
      // Un fallo no se queda en la caché: la siguiente vez se vuelve a intentar.
      pending.catch(() => bitmaps.current.delete(url));
      bitmaps.current.set(url, pending);
    }
    return pending;
  }, []);

  useEffect(() => {
    if (!agencyId) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient.request(`/guide/admin/qr/overview?agency_id=${encodeURIComponent(agencyId)}`)
      .then((data: Overview) => {
        if (cancelled) return;
        const start = normalizeDesign(data.agency.qr_design, defaultDesign(!!data.agency.logo_url, agencyInk(data.agency)));
        setOverview(data);
        setDesign(start);
        setSavedDesign(JSON.stringify(start));
        setPlacements({});
        setLogoFailed(false);
        const wanted = searchParams.get('apt');
        setSelectedId(data.apartments.find((a) => a.id === wanted)?.id ?? data.apartments[0]?.id ?? null);
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message || 'No se pudieron cargar los datos'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // searchParams solo se lee al cargar: preselecciona un piso, no recarga la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const posterByZone = useMemo(() => new Map((overview?.posters ?? []).map((p) => [p.zone_id, p])), [overview?.posters]);
  const selected = useMemo(() => overview?.apartments.find((a) => a.id === selectedId) ?? null, [overview?.apartments, selectedId]);
  const selectedPoster = selected ? posterByZone.get(selected.zone_id) ?? null : null;
  const size = printSize(design.print.size);
  const dirty = JSON.stringify(design) !== savedDesign;
  const hasLogo = !!overview?.agency.logo_url && !logoFailed;

  const placementOf = useCallback(
    (poster: QrPoster | null): Placement => (poster ? placements[poster.id] ?? { x: poster.qr_x, y: poster.qr_y } : { x: 0.5, y: 0.5 }),
    [placements],
  );

  /** Compone la lámina de un piso a la resolución pedida. */
  const compose = useCallback(async (apartment: QrApartment, dpi: number): Promise<PosterOutput> => {
    if (!overview) throw new Error('Sin datos');
    const poster = posterByZone.get(apartment.zone_id) ?? null;
    const logoUrl = overview.agency.logo_url;
    const [posterBitmap, logoBitmap] = await Promise.all([
      poster ? getBitmap(poster.url) : Promise.resolve(null),
      design.qr.logo && logoUrl && !logoFailed
        ? getBitmap(logoUrl).catch(() => { setLogoFailed(true); return null; })
        : Promise.resolve(null),
      loadFrameFonts(),
    ]);
    return renderPoster({
      poster: posterBitmap,
      placement: placementOf(poster),
      url: guideUrlForFrame(GUIDE_URL, apartment.slug),
      design,
      logo: logoBitmap,
      apartmentName: apartment.name,
      size: printSize(design.print.size),
      dpi,
    });
  }, [overview, posterByZone, design, logoFailed, getBitmap, placementOf]);

  // Vista previa: se recompone al cambiar el piso o el diseño, con un respiro para los deslizadores.
  useEffect(() => {
    if (!selected) { setPreview(null); return undefined; }
    let cancelled = false;
    setRendering(true);
    const timer = setTimeout(() => {
      compose(selected, previewDpi(size))
        .then((out) => {
          if (cancelled) return;
          const target = canvasRef.current;
          if (target) {
            target.width = out.canvas.width;
            target.height = out.canvas.height;
            target.getContext('2d')?.drawImage(out.canvas, 0, 0);
          }
          const poster = posterByZone.get(selected.zone_id);
          setPreview({
            check: out.check,
            quality: poster?.width && poster.height ? posterQuality(poster.width, poster.height, size) : null,
          });
        })
        .catch((err: Error) => { if (!cancelled) setNotice({ severity: 'error', text: err.message || 'No se pudo componer la lámina' }); })
        .finally(() => { if (!cancelled) setRendering(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [selected, compose, size, posterByZone]);

  const patch = <K extends 'qr' | 'frame' | 'texts' | 'print'>(section: K, changes: Partial<QrFrameDesign[K]>) =>
    setDesign((prev) => ({ ...prev, [section]: { ...prev[section], ...changes } }));

  const fileName = (apartment: QrApartment | null, ext: string) =>
    `${overview?.agency.slug ?? 'agencia'}_${apartment ? apartment.slug : 'qr-marcos'}_${size.key}.${ext}`;

  const handleSave = async () => {
    if (!agencyId) return;
    setBusy('save');
    try {
      await apiClient.request('/guide/admin/qr/design', { method: 'PUT', body: JSON.stringify({ agency_id: agencyId, design }) });
      setSavedDesign(JSON.stringify(design));
      setNotice({ severity: 'success', text: 'Diseño guardado.' });
    } catch (err) {
      setNotice({ severity: 'error', text: (err as Error).message || 'No se pudo guardar el diseño' });
    } finally {
      setBusy(null);
    }
  };

  const handlePng = async (apartment: QrApartment) => {
    setBusy('png');
    try {
      const out = await compose(apartment, EXPORT_DPI);
      saveBlob(await canvasToPng(out.canvas), fileName(apartment, 'png'));
      if (!out.check.ok) setNotice({ severity: 'warning', text: `${apartment.name}: ${out.check.issues.join(' ')}` });
    } catch (err) {
      setNotice({ severity: 'error', text: (err as Error).message || 'No se pudo generar la imagen' });
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    if (!overview || overview.apartments.length === 0) return;
    setBusy('pdf');
    setProgress({ done: 0, total: overview.apartments.length });
    try {
      const pages: PdfPage[] = [];
      const backgrounds = new Map<string, PdfPage['background']>();
      const flagged: string[] = [];
      for (const [index, apartment] of overview.apartments.entries()) {
        const out = await compose(apartment, EXPORT_DPI);
        if (!out.check.ok) flagged.push(apartment.name);
        const poster = posterByZone.get(apartment.zone_id) ?? null;
        // El fondo es el mismo para todos los pisos que comparten lámina: va una sola vez al PDF.
        const key = `${poster?.id ?? `liso-${out.paper}`}|${size.key}`;
        let background = backgrounds.get(key);
        if (!background) {
          const canvas = renderBackground(poster ? await getBitmap(poster.url) : null, size, EXPORT_DPI, out.paper);
          background = { key, jpeg: await canvasToJpeg(canvas), width: canvas.width, height: canvas.height };
          backgrounds.set(key, background);
        }
        const overlay = await canvasRegionToFlate(out.canvas, out.plaque);
        pages.push({
          widthCm: size.w, heightCm: size.h,
          canvasWidth: out.canvas.width, canvasHeight: out.canvas.height,
          background,
          overlay: { ...overlay, x: out.plaque.x, y: out.plaque.y },
        });
        setProgress({ done: index + 1, total: overview.apartments.length });
      }
      saveBlob(buildPdf(pages), fileName(null, 'pdf'));
      setNotice(flagged.length > 0
        ? { severity: 'warning', text: `PDF generado, pero revisa antes de imprimir: ${flagged.join(', ')}.` }
        : { severity: 'success', text: `PDF generado: ${pages.length} ${pages.length === 1 ? 'lámina' : 'láminas'}, todas legibles.` });
    } catch (err) {
      setNotice({ severity: 'error', text: (err as Error).message || 'No se pudo generar el PDF' });
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const pickPoster = (zoneId: string) => {
    uploadZone.current = zoneId;
    fileInput.current?.click();
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const zoneId = uploadZone.current;
    event.target.value = '';
    if (!file || !zoneId) return;
    setBusy('upload');
    try {
      const bitmap = await createImageBitmap(file);
      const form = new FormData();
      form.append('file', file);
      form.append('zone_id', zoneId);
      form.append('width', String(bitmap.width));
      form.append('height', String(bitmap.height));
      const previous = posterByZone.get(zoneId);
      if (previous) {
        // La lámina nueva hereda el hueco de la anterior: suele ser otra versión del mismo dibujo.
        const { x, y } = placementOf(previous);
        form.append('qr_x', String(x));
        form.append('qr_y', String(y));
      }
      // No pasa por apiClient.request: ese fuerza Content-Type JSON y aquí va un formulario.
      const res = await fetch(`${API_URL}/guide/admin/qr/posters`, {
        method: 'POST',
        headers: apiClient.authToken ? { Authorization: `Bearer ${apiClient.authToken}` } : {},
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      const poster: QrPoster = data.poster;
      setOverview((prev) => prev && { ...prev, posters: [...prev.posters.filter((p) => p.zone_id !== zoneId), poster] });
      setNotice({ severity: 'success', text: 'Lámina sustituida. Vuelve a descargar las de esa zona.' });
    } catch (err) {
      setNotice({ severity: 'error', text: (err as Error).message || 'No se pudo subir la lámina' });
    } finally {
      setBusy(null);
    }
  };

  const handleSavePlacement = async (poster: QrPoster) => {
    const { x, y } = placementOf(poster);
    setBusy('placement');
    try {
      const data = await apiClient.request(`/guide/admin/qr/posters/${poster.id}`, { method: 'PUT', body: JSON.stringify({ qr_x: x, qr_y: y }) });
      const updated: QrPoster = data.poster;
      setOverview((prev) => prev && { ...prev, posters: prev.posters.map((p) => (p.id === updated.id ? updated : p)) });
      setPlacements((prev) => { const { [poster.id]: _saved, ...rest } = prev; return rest; });
      setNotice({ severity: 'success', text: 'Posición guardada para todos los pisos de esa zona.' });
    } catch (err) {
      setNotice({ severity: 'error', text: (err as Error).message || 'No se pudo guardar la posición' });
    } finally {
      setBusy(null);
    }
  };

  if (!agencyId) return <Alert severity="info">Elige una agencia para preparar sus láminas.</Alert>;
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error || !overview) return <Alert severity="error">{error || 'No se pudieron cargar los datos'}</Alert>;

  const placement = placementOf(selectedPoster);
  const placementMoved = !!selectedPoster && (placement.x !== selectedPoster.qr_x || placement.y !== selectedPoster.qr_y);
  // El QR se ajusta a píxeles enteros por punto: el tamaño real es el que mide la vista previa.
  const qrCm = (preview?.check.qrCm ?? design.qr.size * size.w).toFixed(1).replace('.', ',');

  const select = <T extends string>(label: string, value: T, options: Array<[T, string]>, onChange: (value: T) => void) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([key, text]) => <MenuItem key={key} value={key}>{text}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      <PageHeader
        icon={<QrIcon />}
        title="QR para enmarcar"
        subtitle="Una lámina por apartamento, lista para imprimir y poner en un marco de fotos"
        actions={
          <>
            <Button variant="outlined" startIcon={<SaveIcon />} disabled={!dirty || busy !== null} onClick={handleSave}>
              {busy === 'save' ? 'Guardando…' : 'Guardar diseño'}
            </Button>
            <Button variant="contained" startIcon={<PdfIcon />} disabled={busy !== null || overview.apartments.length === 0} onClick={handlePdf}>
              Descargar todas (PDF)
            </Button>
          </>
        }
      />

      {notice && <Alert severity={notice.severity} onClose={() => setNotice(null)} sx={{ mb: 3 }}>{notice.text}</Alert>}
      {progress && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary">Componiendo {progress.done} de {progress.total}…</Typography>
          <LinearProgress variant="determinate" value={(progress.done / progress.total) * 100} />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Stack spacing={3}>
            <Panel flush icon={<ApartmentIcon />} title="Apartamentos"
              subtitle="Las entradas por el marco son las aperturas de la guía hechas escaneando el QR impreso, en los últimos 30 días.">
              {overview.apartments.length === 0 ? (
                <Box sx={{ p: 3 }}><Alert severity="info">Esta agencia todavía no tiene apartamentos.</Alert></Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Apartamento</TableCell>
                      <TableCell>Lámina</TableCell>
                      <TableCell align="right">Entradas por el marco</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overview.apartments.map((apartment) => (
                      <TableRow key={apartment.id} hover selected={apartment.id === selectedId}
                        onClick={() => setSelectedId(apartment.id)} sx={{ cursor: 'pointer' }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{apartment.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{apartment.zone_name}</Typography>
                        </TableCell>
                        <TableCell>
                          {posterByZone.has(apartment.zone_id)
                            ? <Chip size="small" variant="outlined" label={posterByZone.get(apartment.zone_id)?.name} />
                            : <Chip size="small" color="warning" variant="outlined" label="Sin lámina: papel liso" />}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title={`${apartment.frame_visitors_30d} huéspedes distintos · ${apartment.frame_sessions} entradas desde el principio`}>
                            <Typography variant="body2" component="span">{apartment.frame_sessions_30d}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" startIcon={<DownloadIcon />} disabled={busy !== null}
                            onClick={(e) => { e.stopPropagation(); handlePng(apartment); }}>
                            PNG
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>

            <Panel icon={<PaperIcon />} title="Papel">
              <Stack spacing={2}>
                {select<PrintSizeKey>('Tamaño de impresión', design.print.size, PRINT_SIZES.map((s) => [s.key, s.label]), (value) => patch('print', { size: value }))}
                {preview?.quality ? (
                  <Alert severity={QUALITY_SEVERITY[preview.quality.level]}>
                    {preview.quality.message}
                    {preview.quality.cropPct >= 2 && ` Este papel recorta un ${preview.quality.cropPct} % de la lámina.`}
                    {preview.quality.level !== 'buena' && ` Para que quede nítida hace falta una lámina de al menos ${preview.quality.sharpAt.w} × ${preview.quality.sharpAt.h} px.`}
                  </Alert>
                ) : selected && !selectedPoster && (
                  <Alert severity="info">La zona de este apartamento no tiene lámina: saldrá el marco sobre papel liso.</Alert>
                )}
              </Stack>
            </Panel>

            <Panel icon={<FrameIcon />} title="Marco">
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <ToggleButtonGroup exclusive fullWidth size="small" color="primary" value={design.frame.shape}
                    onChange={(_, value: FrameShape | null) => { if (value) patch('frame', { shape: value }); }}>
                    {SHAPE_OPTIONS.map(([key, text]) => <ToggleButton key={key} value={key}>{text}</ToggleButton>)}
                  </ToggleButtonGroup>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <ColorInput label="Línea y rótulos" value={design.frame.line} onChange={(value) => patch('frame', { line: value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {design.frame.paper === 'auto'
                    ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>El papel del marco toma el color del borde de la lámina.</Typography>
                    : <ColorInput label="Papel del marco" value={design.frame.paper} onChange={(value) => patch('frame', { paper: value })} />}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel label="Papel del color de la lámina"
                    control={<Switch checked={design.frame.paper === 'auto'} onChange={(e) => patch('frame', { paper: e.target.checked ? 'auto' : REFERENCE_PAPER })} />} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel label="Doble filete"
                    control={<Switch checked={design.frame.double} onChange={(e) => patch('frame', { double: e.target.checked })} />} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Tamaño del QR: {qrCm} cm en este papel</Typography>
                  <Slider min={QR_SIZE_MIN} max={QR_SIZE_MAX} step={0.01} value={design.qr.size}
                    onChange={(_, value) => patch('qr', { size: value as number })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Rótulo de arriba" value={design.texts.top} onChange={(e) => patch('texts', { top: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Frase de abajo" value={design.texts.bottom} onChange={(e) => patch('texts', { bottom: e.target.value })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Línea pequeña" value={design.texts.small} onChange={(e) => patch('texts', { small: e.target.value })}
                    helperText="Escribe {piso} donde quieras el nombre del apartamento: ayuda a no confundir los marcos al repartirlos." />
                </Grid>
              </Grid>
            </Panel>

            <Panel icon={<StyleIcon />} title="QR">
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>{select<DotStyle>('Puntos', design.qr.dots, DOT_OPTIONS, (value) => patch('qr', { dots: value }))}</Grid>
                <Grid item xs={12} sm={4}>{select<EyeStyle>('Esquinas', design.qr.eye, EYE_OPTIONS, (value) => patch('qr', { eye: value }))}</Grid>
                <Grid item xs={12} sm={4}>{select<PupilStyle>('Centro de las esquinas', design.qr.pupil, PUPIL_OPTIONS, (value) => patch('qr', { pupil: value }))}</Grid>
                <Grid item xs={12} sm={6}>
                  <ColorInput label="Tinta del QR" value={design.qr.ink} onChange={(value) => patch('qr', { ink: value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel label="Logo de la agencia en el centro" disabled={!hasLogo}
                    control={<Switch checked={design.qr.logo && hasLogo} onChange={(e) => patch('qr', { logo: e.target.checked })} />} />
                  {!hasLogo && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {logoFailed ? 'El logo de la agencia no se ha podido cargar.' : 'La agencia no tiene logo: súbelo en Diseño.'}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Panel>

            {overview.can_manage_posters && (
              <Panel flush icon={<ImageIcon />} title="Láminas por zona"
                subtitle="Una lámina por zona, para todas las agencias. Al sustituirla, vuelve a descargar las de esa zona.">
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleUpload} />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Zona</TableCell>
                      <TableCell>Lámina</TableCell>
                      <TableCell>En {size.label}</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overview.zones.map((zone) => {
                      const poster = posterByZone.get(zone.id);
                      const quality = poster?.width && poster.height ? posterQuality(poster.width, poster.height, size) : null;
                      return (
                        <TableRow key={zone.id}>
                          <TableCell>{zone.name}</TableCell>
                          <TableCell>
                            {poster
                              ? <Typography variant="body2">{poster.width && poster.height ? `${poster.width} × ${poster.height} px` : 'Tamaño sin medir'}</Typography>
                              : <Typography variant="body2" color="text.secondary">Sin lámina</Typography>}
                          </TableCell>
                          <TableCell>
                            {quality && (
                              <Tooltip title={quality.message}>
                                <Chip size="small" variant="outlined" color={QUALITY_SEVERITY[quality.level]} label={`${quality.level} · ${quality.ppi} ppp`} />
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<UploadIcon />} disabled={busy !== null} onClick={() => pickPoster(zone.id)}>
                              {poster ? 'Sustituir' : 'Subir'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {selectedPoster && (
                  <Box sx={{ p: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Dónde va el marco en «{selectedPoster.name}»</Typography>
                    <Grid container spacing={3} alignItems="center">
                      <Grid item xs={12} sm={5}>
                        <Typography variant="caption" color="text.secondary">Horizontal</Typography>
                        <Slider min={0.15} max={0.85} step={0.005} value={placement.x}
                          onChange={(_, value) => setPlacements((prev) => ({ ...prev, [selectedPoster.id]: { x: value as number, y: placement.y } }))} />
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <Typography variant="caption" color="text.secondary">Vertical</Typography>
                        <Slider min={0.15} max={0.85} step={0.005} value={placement.y}
                          onChange={(_, value) => setPlacements((prev) => ({ ...prev, [selectedPoster.id]: { x: placement.x, y: value as number } }))} />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <Button fullWidth variant="outlined" size="small" disabled={!placementMoved || busy !== null} onClick={() => handleSavePlacement(selectedPoster)}>
                          Guardar
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Panel>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Box sx={{ position: 'sticky', top: 88 }}>
            <Panel title="Vista previa" action={rendering ? <CircularProgress size={18} /> : undefined}>
              {selected ? (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">{selected.name} · {size.label}</Typography>
                  <Box sx={{ border: 1, borderColor: 'divider', lineHeight: 0 }}>
                    <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
                  </Box>
                  {preview && (
                    <Alert severity={preview.check.ok ? 'success' : 'warning'}>
                      {preview.check.ok
                        ? `El QR se lee: ${preview.check.qrCm.toFixed(1).replace('.', ',')} cm, contraste ${preview.check.contrast.toFixed(1).replace('.', ',')}:1.`
                        : preview.check.issues.join(' ')}
                    </Alert>
                  )}
                  <Button variant="contained" startIcon={<DownloadIcon />} disabled={busy !== null} onClick={() => handlePng(selected)}>
                    {busy === 'png' ? 'Componiendo…' : 'Descargar PNG de este apartamento'}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Antes de encargar todas, imprime una y escanéala con el móvil dentro del marco.
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">Elige un apartamento para ver su lámina.</Typography>
              )}
            </Panel>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
