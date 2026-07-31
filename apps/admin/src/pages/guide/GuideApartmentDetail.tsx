// src/pages/guide/GuideApartmentDetail.tsx
// Manage a single apartment: settings, WiFi/rules info blocks, and assigned POIs
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import {
  Box, Typography, Paper, Button, IconButton, TextField, Chip,
  CircularProgress, Alert, Divider, Tooltip, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
  ToggleButtonGroup, ToggleButton, Stack, alpha, LinearProgress, InputAdornment,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title as ChartTitle, Tooltip as ChartTooltip, Legend, Filler,
} from 'chart.js';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Wifi as WifiIcon,
  Gavel as RulesIcon,
  Schedule as ScheduleIcon,
  LocalParking as ParkingIcon,
  Info as InfoIcon,
  Translate as TranslateIcon,
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  PhoneIphone as PhoneIcon,
  Save as SaveIcon,
  LocationOn as LocationOnIcon,
  Image as ImageIcon,
  Star as StarIcon,
  DirectionsWalk as WalkIcon,
  DirectionsCar as DriveIcon,
  DirectionsBike as BikeIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  CheckCircle as CheckCircleIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Celebration as CelebrationIcon,
  Tv as TvIcon,
  ContentCopy as ContentCopyIcon,
  FiberManualRecord as DotIcon,
  Visibility as ImpressionIcon,
  VisibilityOff as VisibilityOffIcon,
  Explore as ExploreIcon,
  Insights as InsightsIcon,
  DevicesOther as DevicesIcon,
  Storefront as StoreIcon,
  ShoppingBag as OrdersIcon,
} from '@mui/icons-material';
import QRCodeGenerator, { QRCodeHandle } from '../../components/QRCodeGenerator';

// Registro de Chart.js (idempotente; el resto del admin lo registra en AnalyticsPage,
// que se carga aparte, así que lo aseguramos aquí para el gráfico de la pestaña TV).
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, ChartTooltip, Legend, Filler);

interface ApartmentInfo {
  id: string;
  info_key: string;
  icon_name: string;
  order_index: number;
  title: string;
  content: string;
  media?: { r2_key: string; media_type: string }[];
}

interface Zone {
  id: string;
  name: string;
}

interface Poi {
  id: string;
  category: string;
  name_es: string;
  name_en: string;
  rating?: number;
  travel_mode?: string;
  travel_time_text?: string;
  distance_text?: string;
}

interface TvDevice {
  id: string;
  pairing_code: string;
  device_label: string | null;
  is_active: boolean;
  paired_at: string | null;
  last_seen_at: string | null;
}

interface TvDailyRow {
  day: string;
  impression: number;
  screen_view: number;
  wifi_reveal: number;
  poi_select: number;
  menu_qr_shown: number;
  booking_qr_shown: number;
}

interface TvStats {
  range: string;
  totals: Record<string, number>;
  byScreen: { screen: string; count: number }[];
  daily: TvDailyRow[];
  devices: { total: number; active: number };
}

type TvRange = '7d' | '30d' | '90d' | 'all';

const TV_RANGE_OPTIONS: { value: TvRange; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
  { value: 'all', label: 'Todo' },
];

// Etiquetas legibles para el anfitrión de cada pantalla de la TV.
const TV_SCREEN_LABELS: Record<string, string> = {
  home: 'Inicio',
  wifi: 'WiFi',
  guide: 'Guía',
  nearby: 'Alrededores',
  info: 'Información',
};

// Columnas del CSV de exportación (clave del evento → cabecera legible).
const TV_CSV_COLUMNS: { key: keyof Omit<TvDailyRow, 'day'>; label: string }[] = [
  { key: 'impression', label: 'Impresiones' },
  { key: 'wifi_reveal', label: 'WiFi mostrado' },
  { key: 'poi_select', label: 'Localizaciones vistas' },
  { key: 'menu_qr_shown', label: 'QR carta mostrado' },
  { key: 'booking_qr_shown', label: 'QR reserva mostrado' },
  { key: 'screen_view', label: 'Vistas de pantalla' },
];

const MEDIA_BASE = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

const ICON_MAP: Record<string, any> = {
  wifi: <WifiIcon />,
  gavel: <RulesIcon />,
  schedule: <ScheduleIcon />,
  local_parking: <ParkingIcon />,
  delete: <DeleteIcon />,
  info: <InfoIcon />,
};

const AVAILABLE_KEYS = [
  { key: 'wifi', label: 'WiFi', icon: 'wifi' },
  { key: 'rules', label: 'Normas', icon: 'gavel' },
  { key: 'checkout', label: 'Check-out', icon: 'schedule' },
  { key: 'checkin', label: 'Check-in', icon: 'schedule' },
  { key: 'parking', label: 'Parking', icon: 'local_parking' },
  { key: 'trash', label: 'Basura', icon: 'delete' },
  { key: 'appliances', label: 'Electrodomésticos', icon: 'info' },
  { key: 'emergency', label: 'Emergencias', icon: 'info' },
  { key: 'pool', label: 'Piscina', icon: 'info' },
  { key: 'beach', label: 'Playa', icon: 'info' },
  { key: 'custom', label: 'Personalizado', icon: 'info' },
];

// Categorías semilla de la Tienda (servicios propios del anfitrión). "custom" cubre
// cualquier otra cosa que el manager quiera vender que no encaje en las anteriores.
const STORE_CATEGORIES = [
  { key: 'late_checkout', label: 'Late check-out' },
  { key: 'early_checkin', label: 'Early check-in' },
  { key: 'cleaning', label: 'Limpieza extra' },
  { key: 'crib', label: 'Cuna / trona' },
  { key: 'transfer', label: 'Traslado' },
  { key: 'welcome_pack', label: 'Pack de bienvenida' },
  { key: 'parking', label: 'Parking' },
  { key: 'rental', label: 'Alquiler (toallas, bicis...)' },
  { key: 'grocery', label: 'Compra / grocery' },
  { key: 'custom', label: 'Personalizado' },
];

const STORE_ORDER_STATUSES = [
  { value: 'requested', label: 'Solicitado' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

// 13 active languages for this project (see CLAUDE.md §5). Keep in sync project-wide.
const LANGUAGES = [
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'it', label: '🇮🇹 Italiano' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'ca', label: '🏴󠁥󠁳󠁣󠁴󠁿 Català' },
  { code: 'ar', label: '🇦🇪 العربية' },
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'uk', label: '🇺🇦 Українська' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'ko', label: '🇰🇷 한국어' },
];

export default function GuideApartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [apartment, setApartment] = useState<any>(null);
  const [infoItems, setInfoItems] = useState<ApartmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState('es');
  const [activeMainTab, setActiveMainTab] = useState(0); // 0: Ajustes, 1: Guía, 2: Localizaciones
  const [previewKey, setPreviewKey] = useState(Date.now()); // For forcing iframe reload
  const qrRef = useRef<QRCodeHandle>(null);

  // Dialog State (info blocks)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ApartmentInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    info_key: '',
    icon_name: 'info',
    translations: {} as Record<string, { title: string; content: string }>,
    media: [] as { r2_key: string; media_type: string }[],
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Settings tab state
  const [zones, setZones] = useState<Zone[]>([]);
  const [settingsForm, setSettingsForm] = useState({ name: '', address: '', zone_id: '', cover_image_url: '', wifi_ssid: '', wifi_password: '', contact_whatsapp: '' });
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // POIs tab state
  const [poisLoading, setPoisLoading] = useState(false);
  const [catalogPois, setCatalogPois] = useState<Poi[]>([]);
  const [assignedOrder, setAssignedOrder] = useState<Record<string, number>>({});
  const [poisError, setPoisError] = useState<string | null>(null);

  // Welcome modal tab state
  const [welcomeForm, setWelcomeForm] = useState({
    is_active: false,
    image_url: '',
    action_enabled: false,
    action_type: 'URL' as 'URL' | 'WHATSAPP' | 'PHONE',
    action_data: '',
    translations: {} as Record<string, { title?: string; body?: string; action_label?: string }>,
  });
  const [welcomeLoading, setWelcomeLoading] = useState(true);
  const [welcomeSaving, setWelcomeSaving] = useState(false);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);
  const [welcomeSuccess, setWelcomeSuccess] = useState<string | null>(null);
  const [uploadingWelcomeImage, setUploadingWelcomeImage] = useState(false);

  // Pantalla TV tab state
  const [tvDevices, setTvDevices] = useState<TvDevice[]>([]);
  const [tvStats, setTvStats] = useState<TvStats | null>(null);
  const [tvLoading, setTvLoading] = useState(false);        // carga inicial (dispositivos)
  const [tvStatsLoading, setTvStatsLoading] = useState(false); // recarga de stats al cambiar rango
  const [tvError, setTvError] = useState<string | null>(null);
  const [tvRange, setTvRange] = useState<TvRange>('30d');
  const [pairing, setPairing] = useState(false);
  const [deviceLabelInput, setDeviceLabelInput] = useState('');
  const [newDevice, setNewDevice] = useState<{ pairingCode: string; deviceLabel: string | null } | null>(null);
  const tvQrRef = useRef<QRCodeHandle>(null);

  // Tienda (store-items propios del anfitrión) tab state
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [editingStoreItem, setEditingStoreItem] = useState<any | null>(null);
  const [storeItemForm, setStoreItemForm] = useState({
    category: 'custom',
    price_amount: '',
    is_featured: false,
    is_active: true,
    cover_image_url: '',
    translations: { es: { name: '', description: '' }, en: { name: '', description: '' } } as Record<string, { name: string; description: string }>,
  });
  const [storeItemSaving, setStoreItemSaving] = useState(false);
  const [uploadingStoreImage, setUploadingStoreImage] = useState(false);

  const [storeOrders, setStoreOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadInfo = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [aptRes, infoRes] = await Promise.all([
        apiClient.request(`/guide/admin/apartments/${id}`),
        apiClient.request(`/guide/admin/apartments/${id}/info?lang=${currentLang}`)
      ]);
      setApartment(aptRes.apartment);
      setInfoItems(infoRes.info || []);
      if (aptRes.apartment) {
        setSettingsForm({
          name: aptRes.apartment.name || '',
          address: aptRes.apartment.address || '',
          zone_id: aptRes.apartment.zone_id || '',
          cover_image_url: aptRes.apartment.cover_image_url || '',
          wifi_ssid: aptRes.apartment.wifi_ssid || '',
          wifi_password: aptRes.apartment.wifi_password || '',
          contact_whatsapp: aptRes.apartment.contact_whatsapp || '',
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      const response = await apiClient.request('/guide/admin/zones');
      if (response.success) setZones(response.zones || []);
    } catch (err) {
      console.error('Error loading zones:', err);
    }
  };

  const loadPois = async (zoneId: string) => {
    if (!id || !zoneId) return;
    setPoisLoading(true);
    setPoisError(null);
    try {
      const [catalogRes, assignedRes] = await Promise.all([
        apiClient.request(`/guide/admin/pois?zone_id=${zoneId}`),
        apiClient.request(`/guide/admin/apartments/${id}/pois`),
      ]);
      setCatalogPois(catalogRes.pois || []);
      const orderMap: Record<string, number> = {};
      for (const p of (assignedRes.pois || [])) {
        orderMap[p.poi_id] = p.order_override ?? 0;
      }
      setAssignedOrder(orderMap);
    } catch (err: any) {
      setPoisError(err.message || 'Error al cargar localizaciones');
    } finally {
      setPoisLoading(false);
    }
  };

  const loadWelcome = async () => {
    if (!id) return;
    setWelcomeLoading(true);
    try {
      const res = await apiClient.request(`/guide/admin/apartments/${id}/welcome`);
      if (res.success && res.welcome) {
        setWelcomeForm({
          is_active: !!res.welcome.is_active,
          image_url: res.welcome.image_url || '',
          action_enabled: !!res.welcome.action_enabled,
          action_type: res.welcome.action_type || 'URL',
          action_data: res.welcome.action_data || '',
          translations: res.welcome.translations || {},
        });
      }
    } catch (err) {
      console.error('Error loading welcome modal:', err);
    } finally {
      setWelcomeLoading(false);
    }
  };

  const loadTvDevices = async () => {
    if (!id) return;
    setTvLoading(true);
    setTvError(null);
    try {
      const devicesRes = await apiClient.request(`/guide/admin/tv/devices?apartment_id=${id}`);
      setTvDevices(devicesRes.devices || []);
    } catch (err: any) {
      setTvError(err.message || 'Error al cargar las TVs');
    } finally {
      setTvLoading(false);
    }
  };

  const loadTvStats = async (range: TvRange) => {
    if (!id) return;
    setTvStatsLoading(true);
    try {
      const statsRes = await apiClient.request(`/guide/admin/tv/stats/${id}?range=${range}`);
      setTvStats(statsRes);
    } catch (err: any) {
      setTvStats(null);
      setTvError(err.message || 'Error al cargar las estadísticas');
    } finally {
      setTvStatsLoading(false);
    }
  };

  const loadStoreItems = async () => {
    if (!id) return;
    setStoreLoading(true);
    setStoreError(null);
    try {
      const res = await apiClient.request(`/guide/admin/apartments/${id}/store-items`);
      setStoreItems(res.items || []);
    } catch (err: any) {
      setStoreError(err.message || 'Error al cargar la tienda');
    } finally {
      setStoreLoading(false);
    }
  };

  const loadStoreOrders = async () => {
    if (!id) return;
    setOrdersLoading(true);
    try {
      const res = await apiClient.request(`/guide/admin/apartments/${id}/orders`);
      setStoreOrders(res.orders || []);
    } catch (err) {
      console.error('Error loading store orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => { loadInfo(); loadZones(); loadWelcome(); }, [id]);
  useEffect(() => { if (id) loadInfo(); }, [currentLang]);
  useEffect(() => {
    if (apartment?.zone_id) loadPois(apartment.zone_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartment?.zone_id]);
  useEffect(() => {
    if (activeMainTab === 4 && id) { loadTvDevices(); loadTvStats(tvRange); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMainTab, id]);
  useEffect(() => {
    if (activeMainTab === 4 && id) loadTvStats(tvRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvRange]);
  useEffect(() => {
    if (activeMainTab === 5 && id) { loadStoreItems(); loadStoreOrders(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMainTab, id]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      info_key: '',
      icon_name: 'info',
      translations: {
        es: { title: '', content: '' },
        en: { title: '', content: '' },
      },
      media: [],
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ApartmentInfo) => {
    setEditingItem(item);
    setForm({
      info_key: item.info_key,
      icon_name: item.icon_name || 'info',
      translations: {
        [currentLang]: { title: item.title || '', content: item.content || '' },
      },
      media: item.media || [],
    });
    setDialogOpen(true);
  };

  const handleSelectKey = (key: string) => {
    const preset = AVAILABLE_KEYS.find(k => k.key === key);
    setForm(prev => ({
      ...prev,
      info_key: key,
      icon_name: preset?.icon || 'info',
    }));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/info`, {
        method: 'POST',
        body: JSON.stringify({
          info_key: form.info_key,
          icon_name: form.icon_name,
          translations: form.translations,
          media: form.media,
        }),
      });
      setDialogOpen(false);
      await loadInfo();
      handleRefreshPreview();
    } catch (err) {
      console.error('Error saving info:', err);
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file: File): Promise<{ r2_key: string; url: string; media_type: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${MEDIA_BASE}/media/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      body: formData
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Error al subir el archivo');
    return {
      r2_key: result.r2_key,
      url: result.url || `${MEDIA_BASE}/media/${result.r2_key}`,
      media_type: file.type.startsWith('video/') ? 'video' : 'image',
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingMedia(true);
    try {
      const file = e.target.files[0];
      const uploaded = await uploadFile(file);
      setForm(prev => ({
        ...prev,
        media: [...prev.media, { r2_key: uploaded.r2_key, media_type: uploaded.media_type }]
      }));
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploadingMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setForm(prev => {
      const newMedia = [...prev.media];
      newMedia.splice(index, 1);
      return { ...prev, media: newMedia };
    });
  };

  const handleRefreshPreview = () => {
    setPreviewKey(Date.now());
  };

  // ---------- Settings (Ajustes) tab ----------
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingCover(true);
    setSettingsError(null);
    try {
      const uploaded = await uploadFile(e.target.files[0]);
      setSettingsForm(prev => ({ ...prev, cover_image_url: uploaded.url }));
    } catch (err: any) {
      setSettingsError(err.message || 'Error al subir la portada');
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveSettings = async () => {
    if (!id) return;
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSuccess(null);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      setApartment((prev: any) => ({ ...prev, ...settingsForm }));
      setSettingsSuccess('Cambios guardados correctamente.');
      handleRefreshPreview();
    } catch (err: any) {
      setSettingsError(err.message || 'Error al guardar los ajustes');
    } finally {
      setSettingsSaving(false);
    }
  };

  // ---------- Bienvenida (welcome modal) tab ----------
  const handleWelcomeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingWelcomeImage(true);
    setWelcomeError(null);
    try {
      const uploaded = await uploadFile(e.target.files[0]);
      setWelcomeForm(prev => ({ ...prev, image_url: uploaded.url }));
    } catch (err: any) {
      setWelcomeError(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingWelcomeImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveWelcome = async () => {
    if (!id) return;
    setWelcomeSaving(true);
    setWelcomeError(null);
    setWelcomeSuccess(null);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/welcome`, {
        method: 'PUT',
        body: JSON.stringify(welcomeForm),
      });
      setWelcomeSuccess('Ventana de bienvenida guardada correctamente.');
      handleRefreshPreview();
    } catch (err: any) {
      setWelcomeError(err.message || 'Error al guardar la ventana de bienvenida');
    } finally {
      setWelcomeSaving(false);
    }
  };

  // ---------- Tienda (host store items) tab ----------
  const handleOpenCreateStoreItem = () => {
    setEditingStoreItem(null);
    setStoreItemForm({
      category: 'custom',
      price_amount: '',
      is_featured: false,
      is_active: true,
      cover_image_url: '',
      translations: { es: { name: '', description: '' }, en: { name: '', description: '' } },
    });
    setStoreDialogOpen(true);
  };

  const handleOpenEditStoreItem = (item: any) => {
    setEditingStoreItem(item);
    setStoreItemForm({
      category: item.category || 'custom',
      price_amount: item.price_amount != null ? String(item.price_amount) : '',
      is_featured: !!item.is_featured,
      is_active: !!item.is_active,
      cover_image_url: item.cover_image_url || '',
      // El backend no devuelve las traducciones en el listado — se completan al
      // editar. Si el manager no toca el campo de un idioma, saveTranslations
      // solo sobrescribe los que sí vienen en el body, así que dejarlo vacío
      // aquí no borra lo que ya hubiera en otros idiomas.
      translations: { es: { name: '', description: '' }, en: { name: '', description: '' } },
    });
    setStoreDialogOpen(true);
  };

  const handleStoreImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingStoreImage(true);
    try {
      const uploaded = await uploadFile(e.target.files[0]);
      setStoreItemForm(prev => ({ ...prev, cover_image_url: uploaded.url }));
    } catch (err: any) {
      setStoreError(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingStoreImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveStoreItem = async () => {
    if (!id) return;
    setStoreItemSaving(true);
    setStoreError(null);
    try {
      const body = {
        category: storeItemForm.category,
        price_amount: storeItemForm.price_amount === '' ? null : Number(storeItemForm.price_amount),
        is_featured: storeItemForm.is_featured,
        is_active: storeItemForm.is_active,
        cover_image_url: storeItemForm.cover_image_url || null,
        translations: storeItemForm.translations,
      };
      if (editingStoreItem) {
        await apiClient.request(`/guide/admin/apartments/${id}/store-items/${editingStoreItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await apiClient.request(`/guide/admin/apartments/${id}/store-items`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setStoreDialogOpen(false);
      await loadStoreItems();
      handleRefreshPreview();
    } catch (err: any) {
      setStoreError(err.message || 'Error al guardar el producto');
    } finally {
      setStoreItemSaving(false);
    }
  };

  const handleDeleteStoreItem = async (itemId: string) => {
    if (!id) return;
    if (!window.confirm('¿Desactivar este producto/servicio? Dejará de verse en la guía.')) return;
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/store-items/${itemId}`, { method: 'DELETE' });
      await loadStoreItems();
      handleRefreshPreview();
    } catch (err: any) {
      setStoreError(err.message || 'Error al desactivar el producto');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiClient.request(`/guide/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setStoreOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  // ---------- Localizaciones (POI assignment) tab ----------
  const handleTogglePoi = async (poiId: string, isAssigned: boolean) => {
    if (!id) return;
    setPoisError(null);
    try {
      if (isAssigned) {
        await apiClient.request(`/guide/admin/apartments/${id}/pois/${poiId}`, { method: 'DELETE' });
        setAssignedOrder(prev => {
          const next = { ...prev };
          delete next[poiId];
          return next;
        });
      } else {
        const nextOrder = Object.keys(assignedOrder).length > 0 ? Math.max(...Object.values(assignedOrder)) + 1 : 0;
        await apiClient.request(`/guide/admin/apartments/${id}/pois`, {
          method: 'POST',
          body: JSON.stringify({ poi_id: poiId, order_override: nextOrder }),
        });
        setAssignedOrder(prev => ({ ...prev, [poiId]: nextOrder }));
      }
    } catch (err: any) {
      setPoisError(err.message || 'Error al actualizar la localización');
    }
  };

  const handleReorderPoi = async (poiId: string, direction: -1 | 1) => {
    if (!id) return;
    const assignedIds = Object.keys(assignedOrder).sort((a, b) => assignedOrder[a] - assignedOrder[b]);
    const currentIdx = assignedIds.indexOf(poiId);
    const targetIdx = currentIdx + direction;
    if (targetIdx < 0 || targetIdx >= assignedIds.length) return;

    const reordered = [...assignedIds];
    [reordered[currentIdx], reordered[targetIdx]] = [reordered[targetIdx], reordered[currentIdx]];
    const items = reordered.map((pid, index) => ({ poi_id: pid, order_override: index }));

    const newOrderMap: Record<string, number> = {};
    for (const item of items) newOrderMap[item.poi_id] = item.order_override;
    setAssignedOrder(newOrderMap); // optimistic

    try {
      await apiClient.request(`/guide/admin/apartments/${id}/pois/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
    } catch (err: any) {
      setPoisError(err.message || 'Error al reordenar');
      if (apartment?.zone_id) loadPois(apartment.zone_id); // revert on failure
    }
  };

  // ---------- Pantalla TV tab ----------
  const handlePairDevice = async () => {
    if (!id) return;
    setPairing(true);
    setTvError(null);
    try {
      const res = await apiClient.request('/guide/admin/tv/devices', {
        method: 'POST',
        body: JSON.stringify({ apartmentId: id, deviceLabel: deviceLabelInput || undefined }),
      });
      setNewDevice({ pairingCode: res.device.pairingCode, deviceLabel: res.device.deviceLabel });
      setDeviceLabelInput('');
      await Promise.all([loadTvDevices(), loadTvStats(tvRange)]);
    } catch (err: any) {
      setTvError(err.message || 'Error al emparejar la TV');
    } finally {
      setPairing(false);
    }
  };

  const copyPairingCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
  };

  const handleToggleDevice = async (deviceId: string, nextActive: boolean) => {
    setTvError(null);
    // Optimista: refleja el cambio antes de que responda el backend.
    setTvDevices(prev => prev.map(d => d.id === deviceId ? { ...d, is_active: nextActive } : d));
    try {
      await apiClient.request(`/guide/admin/tv/devices/${deviceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });
    } catch (err: any) {
      setTvError(err.message || 'Error al actualizar la TV');
      setTvDevices(prev => prev.map(d => d.id === deviceId ? { ...d, is_active: !nextActive } : d)); // revert
    }
  };

  const isRecentlySeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return false;
    return Date.now() - new Date(lastSeenAt).getTime() < 15 * 60 * 1000; // 15 min
  };

  const formatRelativeTime = (iso: string | null) => {
    if (!iso) return 'Nunca conectada';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${Math.floor(hours / 24)} d`;
  };

  // Exporta la serie diaria a CSV (extracción de datos para el anfitrión/agencia).
  const exportTvCsv = () => {
    if (!tvStats || tvStats.daily.length === 0) return;
    const header = ['Fecha', ...TV_CSV_COLUMNS.map(c => c.label)];
    const rows = tvStats.daily.map(d => [d.day, ...TV_CSV_COLUMNS.map(c => d[c.key] ?? 0)]);
    const total = ['TOTAL', ...TV_CSV_COLUMNS.map(c => tvStats.daily.reduce((s, d) => s + (d[c.key] ?? 0), 0))];
    const csv = [header, ...rows, total].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tv-stats-${apartment?.slug || id}-${tvStats.range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const travelIcon = (mode?: string) =>
    mode === 'drive' ? <DriveIcon sx={{ fontSize: 16 }} /> : mode === 'bike' ? <BikeIcon sx={{ fontSize: 16 }} /> : <WalkIcon sx={{ fontSize: 16 }} />;

  // Sub-components for tabs to keep layout clean
  const renderSettingsTab = () => (
    <Box>
      {apartment && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box
            sx={{ flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
            onClick={() => window.open(`https://guide.visualtastes.com/${apartment.slug}`, '_blank')}
            title="Haz click para probar el enlace en nueva pestaña"
          >
             <QRCodeGenerator
                ref={qrRef}
                data={`https://guide.visualtastes.com/${apartment.slug}`}
                size={160}
                dotsOptions={{ color: '#0f172a', type: 'rounded' }}
                cornersSquareOptions={{ type: 'extra-rounded' }}
                imageOptions={{ margin: 10 }}
             />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCodeIcon color="primary" /> Acceso Directo (QR)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 500 }}>
              Descarga este código QR y colócalo en la propiedad. Los huéspedes accederán sin necesidad de descargar ninguna app.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined" size="small"
                startIcon={<DownloadIcon />}
                onClick={() => qrRef.current?.download('svg')}
              >
                SVG (Impresión)
              </Button>
              <Button
                variant="outlined" size="small"
                startIcon={<DownloadIcon />}
                onClick={() => qrRef.current?.download('png')}
              >
                PNG (Web)
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Datos del Apartamento</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Estos datos son la base de la ficha: nombre, dirección, zona turística y portada.
        </Typography>

        {settingsError && <Alert severity="error" sx={{ mb: 2 }}>{settingsError}</Alert>}
        {settingsSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSettingsSuccess(null)}>{settingsSuccess}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Nombre del apartamento" fullWidth
            value={settingsForm.name}
            onChange={(e) => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            label="Dirección" fullWidth
            value={settingsForm.address}
            onChange={(e) => setSettingsForm(prev => ({ ...prev, address: e.target.value }))}
          />
          <FormControl fullWidth>
            <InputLabel>Zona turística</InputLabel>
            <Select
              value={settingsForm.zone_id}
              label="Zona turística"
              onChange={(e) => setSettingsForm(prev => ({ ...prev, zone_id: e.target.value as string }))}
            >
              {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
            </Select>
          </FormControl>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Foto de Portada</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {settingsForm.cover_image_url && (
                <Box sx={{ width: 96, height: 72, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <img src={settingsForm.cover_image_url} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              )}
              <Button
                variant="outlined" component="label" disabled={uploadingCover}
                startIcon={uploadingCover ? <CircularProgress size={18} /> : <ImageIcon />}
              >
                {uploadingCover ? 'Subiendo...' : settingsForm.cover_image_url ? 'Cambiar portada' : 'Subir portada'}
                <input type="file" hidden accept="image/*" onChange={handleCoverUpload} />
              </Button>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WifiIcon fontSize="small" /> WiFi
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Red y contraseña que se muestran (y se convierten en QR de conexión automática) en la Guía y en la pantalla TV.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label="Nombre de red (SSID)" sx={{ flex: 1, minWidth: 220 }}
                value={settingsForm.wifi_ssid}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, wifi_ssid: e.target.value }))}
              />
              <TextField
                label="Contraseña" sx={{ flex: 1, minWidth: 220 }}
                type={showWifiPassword ? 'text' : 'password'}
                value={settingsForm.wifi_password}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, wifi_password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowWifiPassword(v => !v)}>
                        {showWifiPassword ? <VisibilityOffIcon fontSize="small" /> : <ImpressionIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <OrdersIcon fontSize="small" /> Contacto para pedidos de la Tienda
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Número de WhatsApp que recibe los pedidos de tus productos y servicios propios (pestaña Tienda). Sin este número, los pedidos se guardan pero el huésped no puede abrir el WhatsApp para confirmarlos.
            </Typography>
            <TextField
              label="WhatsApp de contacto" placeholder="+34600000000" sx={{ maxWidth: 320 }}
              value={settingsForm.contact_whatsapp}
              onChange={(e) => setSettingsForm(prev => ({ ...prev, contact_whatsapp: e.target.value }))}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={settingsSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            disabled={settingsSaving || !settingsForm.name || !settingsForm.zone_id}
            onClick={handleSaveSettings}
            sx={{ px: 4 }}
          >
            {settingsSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );

  const renderGuideTab = () => (
    <Box>
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={currentLang}
          onChange={(_, v) => setCurrentLang(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1 }}
        >
          {LANGUAGES.map(lang => (
            <Tab key={lang.code} value={lang.code} label={lang.label} sx={{ fontWeight: 500 }} />
          ))}
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : infoItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
          <InfoIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} color="text.secondary">Sin información</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 2 }}>
            Añade bloques de información como la clave del WiFi, normas de la casa o check-out.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Crear Primer Bloque
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {infoItems.map(item => (
            <Card
              key={item.id}
              elevation={0}
              sx={{
                border: '1px solid', borderColor: 'divider', borderRadius: 3,
                transition: 'all 0.2s', '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
              }}
            >
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'start', p: '16px !important' }}>
                <Box sx={{
                  p: 1.5, borderRadius: 2, bgcolor: 'primary.main', color: 'white',
                  display: 'flex', alignItems: 'center', minWidth: 44, justifyContent: 'center'
                }}>
                  {ICON_MAP[item.icon_name] || <InfoIcon />}
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {item.title || item.info_key}
                    </Typography>
                    <Box>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                    {item.content || (
                      <em style={{ opacity: 0.6 }}>
                        Sin traducción en {LANGUAGES.find(l => l.code === currentLang)?.label || currentLang}
                      </em>
                    )}
                  </Typography>
                  {item.media && item.media.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      {item.media.map((m, i) => (
                        <Box key={i} sx={{ width: 48, height: 48, borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                          {m.media_type === 'video' ? (
                            <Box sx={{ width: '100%', height: '100%', bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="caption" color="white" fontSize={8}>VID</Typography>
                            </Box>
                          ) : (
                            <img src={`${MEDIA_BASE}/media/${m.r2_key}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ mt: 1, borderStyle: 'dashed', py: 1.5, borderRadius: 3 }}
          >
            Añadir Nuevo Bloque
          </Button>
        </Box>
      )}
    </Box>
  );

  const renderPoisTab = () => {
    const assignedIds = Object.keys(assignedOrder).sort((a, b) => assignedOrder[a] - assignedOrder[b]);
    const sortedPois = [...catalogPois].sort((a, b) => {
      const aAssigned = a.id in assignedOrder;
      const bAssigned = b.id in assignedOrder;
      if (aAssigned && bAssigned) return assignedOrder[a.id] - assignedOrder[b.id];
      if (aAssigned) return -1;
      if (bAssigned) return 1;
      return 0;
    });

    const assignedCount = assignedIds.length;

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Elige qué localizaciones del catálogo de la zona aparecen en la guía de este apartamento, y en qué orden.
          El catálogo (nombres, fotos, categorías) solo puede editarlo el superadmin desde <strong>Localizaciones</strong>.
        </Alert>
        {poisError && <Alert severity="error" sx={{ mb: 2 }}>{poisError}</Alert>}

        {poisLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : catalogPois.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
            <LocationOnIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
              Sin localizaciones en esta zona todavía
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pide al administrador que añada puntos de interés a esta zona turística.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
              {assignedCount} de {catalogPois.length} incluidas en la guía
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {sortedPois.map(poi => {
                const isAssigned = poi.id in assignedOrder;
                const idx = assignedIds.indexOf(poi.id);
                return (
                  <Card
                    key={poi.id}
                    elevation={0}
                    onClick={() => handleTogglePoi(poi.id, isAssigned)}
                    sx={{
                      border: '2px solid', borderColor: isAssigned ? 'success.main' : 'divider', borderRadius: 3,
                      bgcolor: isAssigned ? 'rgba(107,125,84,0.08)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.15s',
                      '&:hover': { borderColor: isAssigned ? 'success.main' : 'primary.light', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
                    }}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px 16px !important' }}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {poi.name_es || poi.category}
                          </Typography>
                          <Chip label={poi.category} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                          {!!poi.rating && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#f59e0b' }}>
                              <StarIcon sx={{ fontSize: 14 }} />
                              <Typography variant="caption" fontWeight={600}>{poi.rating}</Typography>
                            </Box>
                          )}
                          {poi.travel_time_text && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: 'text.secondary' }}>
                              {travelIcon(poi.travel_mode)}
                              <Typography variant="caption">{poi.travel_time_text}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {isAssigned && (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                          <IconButton size="small" disabled={idx === 0} onClick={() => handleReorderPoi(poi.id, -1)}>
                            <ArrowUpIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" disabled={idx === assignedIds.length - 1} onClick={() => handleReorderPoi(poi.id, 1)}>
                            <ArrowDownIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}

                      <Chip
                        icon={isAssigned ? <CheckCircleIcon /> : <AddCircleOutlineIcon />}
                        label={isAssigned ? 'Incluida' : 'Añadir'}
                        color={isAssigned ? 'success' : 'default'}
                        variant={isAssigned ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 700, pointerEvents: 'none', minWidth: 104 }}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </>
        )}
      </Box>
    );
  };

  const renderWelcomeTab = () => (
    <Box sx={{ maxWidth: 640 }}>
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        Se muestra cada vez que un huésped abre la guía de este apartamento. Siempre se puede cerrar sin usar el botón de acción.
      </Alert>
      {welcomeError && <Alert severity="error" sx={{ mb: 2 }}>{welcomeError}</Alert>}
      {welcomeSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setWelcomeSuccess(null)}>{welcomeSuccess}</Alert>}

      {welcomeLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <FormControlLabel
            sx={{ mb: 2 }}
            control={
              <Switch
                checked={welcomeForm.is_active}
                onChange={(e) => setWelcomeForm(prev => ({ ...prev, is_active: e.target.checked }))}
              />
            }
            label={<Typography fontWeight={600}>Activar ventana de bienvenida</Typography>}
          />

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Imagen (opcional)</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {welcomeForm.image_url && (
                <Box sx={{ width: 96, height: 72, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <img src={welcomeForm.image_url} alt="Bienvenida" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              )}
              <Button
                variant="outlined" component="label" disabled={uploadingWelcomeImage}
                startIcon={uploadingWelcomeImage ? <CircularProgress size={18} /> : <ImageIcon />}
              >
                {uploadingWelcomeImage ? 'Subiendo...' : welcomeForm.image_url ? 'Cambiar imagen' : 'Subir imagen'}
                <input type="file" hidden accept="image/*" onChange={handleWelcomeImageUpload} />
              </Button>
            </Box>
          </Box>

          <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>Texto</Typography>
          {LANGUAGES.slice(0, 3).map(lang => (
            <Box key={lang.code} sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>{lang.label}</Typography>
              <TextField
                label="Título" fullWidth size="small" sx={{ mb: 1.5 }}
                value={welcomeForm.translations[lang.code]?.title || ''}
                onChange={(e) => setWelcomeForm(prev => ({
                  ...prev, translations: { ...prev.translations, [lang.code]: { ...prev.translations[lang.code], title: e.target.value } }
                }))}
              />
              <TextField
                label="Mensaje" fullWidth multiline minRows={2} maxRows={5} size="small"
                value={welcomeForm.translations[lang.code]?.body || ''}
                onChange={(e) => setWelcomeForm(prev => ({
                  ...prev, translations: { ...prev.translations, [lang.code]: { ...prev.translations[lang.code], body: e.target.value } }
                }))}
              />
            </Box>
          ))}

          <Divider sx={{ my: 3 }} />

          <FormControlLabel
            sx={{ mb: 2 }}
            control={
              <Switch
                checked={welcomeForm.action_enabled}
                onChange={(e) => setWelcomeForm(prev => ({ ...prev, action_enabled: e.target.checked }))}
              />
            }
            label={<Typography fontWeight={600}>Incluir botón de acción</Typography>}
          />

          {welcomeForm.action_enabled && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 1, borderLeft: '2px solid', borderColor: 'divider', ml: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', pl: 2 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Tipo de acción</InputLabel>
                  <Select
                    value={welcomeForm.action_type}
                    label="Tipo de acción"
                    onChange={(e) => setWelcomeForm(prev => ({ ...prev, action_type: e.target.value as any }))}
                  >
                    <MenuItem value="URL">Enlace Web (URL)</MenuItem>
                    <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                    <MenuItem value="PHONE">Llamar por teléfono</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small" sx={{ flexGrow: 1, minWidth: 200 }}
                  label={welcomeForm.action_type === 'PHONE' ? 'Número de teléfono' : welcomeForm.action_type === 'WHATSAPP' ? 'Número de WhatsApp' : 'URL de destino'}
                  value={welcomeForm.action_data}
                  onChange={(e) => setWelcomeForm(prev => ({ ...prev, action_data: e.target.value }))}
                />
              </Box>
              <Box sx={{ pl: 2 }}>
                <TextField
                  size="small" label="Texto del botón (ES)" sx={{ minWidth: 240 }}
                  value={welcomeForm.translations.es?.action_label || ''}
                  onChange={(e) => setWelcomeForm(prev => ({
                    ...prev, translations: { ...prev.translations, es: { ...prev.translations.es, action_label: e.target.value } }
                  }))}
                  placeholder="Ej: Ver oferta"
                />
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={welcomeSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={welcomeSaving || !welcomeForm.translations.es?.title}
              onClick={handleSaveWelcome}
              sx={{ px: 4 }}
            >
              {welcomeSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );

  const renderStoreTab = () => (
    <Box sx={{ maxWidth: 780 }}>
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        Tus propios productos y servicios (late check-out, limpieza extra, pack de bienvenida...).
        Aparecen en la pestaña "Tienda" de la guía junto al catálogo de VisualTaste. El huésped hace
        el pedido y se abre WhatsApp con el pedido ya redactado — no hay cobro dentro de la app.
      </Alert>
      {storeError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStoreError(null)}>{storeError}</Alert>}
      {!settingsForm.contact_whatsapp && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No has configurado el WhatsApp de contacto (pestaña Ajustes). Los pedidos se guardarán, pero
          el huésped no podrá abrir el chat para confirmarlos.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>Tus productos y servicios</Typography>
        <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenCreateStoreItem}>
          Añadir
        </Button>
      </Box>

      {storeLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : storeItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, border: '1px dashed', borderColor: 'divider', borderRadius: 3, mb: 4 }}>
          <StoreIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">Todavía no has añadido nada a tu tienda.</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 4 }}>
          {storeItems.map(item => (
            <Paper key={item.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, opacity: item.is_active ? 1 : 0.5 }}>
              {item.cover_image_url ? (
                <Box sx={{ width: 56, height: 56, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={item.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ) : (
                <Box sx={{ width: 56, height: 56, borderRadius: 1.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <StoreIcon color="disabled" />
                </Box>
              )}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography fontWeight={600} noWrap>{item.id}</Typography>
                  <Chip size="small" label={STORE_CATEGORIES.find(c => c.key === item.category)?.label || item.category} />
                  {item.is_featured === 1 && <Chip size="small" color="warning" label="Destacado" />}
                  {!item.is_active && <Chip size="small" label="Inactivo" />}
                </Box>
                {item.price_amount != null && (
                  <Typography variant="body2" color="text.secondary">{Number(item.price_amount).toFixed(2)} {item.price_currency || 'EUR'}</Typography>
                )}
              </Box>
              <IconButton size="small" onClick={() => handleOpenEditStoreItem(item)}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => handleDeleteStoreItem(item.id)}><DeleteIcon fontSize="small" /></IconButton>
            </Paper>
          ))}
        </Stack>
      )}

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <OrdersIcon /> Solicitudes recientes
      </Typography>
      {ordersLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : storeOrders.length === 0 ? (
        <Typography color="text.secondary">Todavía no hay ninguna solicitud.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {storeOrders.map(order => (
            <Paper key={order.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {(order.items || []).map((it: any) => `${it.quantity}x ${it.item_name_es}`).join(', ')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(order.created_at).toLocaleString('es-ES')}
                    {order.total_amount != null && ` · ${Number(order.total_amount).toFixed(2)} ${order.currency || 'EUR'}`}
                  </Typography>
                </Box>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select value={order.status} onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as string)}>
                    {STORE_ORDER_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={storeDialogOpen} onClose={() => setStoreDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingStoreItem ? 'Editar producto/servicio' : 'Nuevo producto/servicio'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select
                value={storeItemForm.category}
                label="Categoría"
                onChange={(e) => setStoreItemForm(prev => ({ ...prev, category: e.target.value as string }))}
              >
                {STORE_CATEGORIES.map(c => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>

            {['es', 'en'].map(lang => (
              <Box key={lang} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>{lang === 'es' ? '🇪🇸 Español' : '🇬🇧 English'}</Typography>
                <TextField
                  label="Nombre" fullWidth size="small" sx={{ mb: 1.5 }}
                  required={lang === 'es'}
                  value={storeItemForm.translations[lang]?.name || ''}
                  onChange={(e) => setStoreItemForm(prev => ({
                    ...prev, translations: { ...prev.translations, [lang]: { ...prev.translations[lang], name: e.target.value } }
                  }))}
                />
                <TextField
                  label="Descripción" fullWidth multiline minRows={2} size="small"
                  value={storeItemForm.translations[lang]?.description || ''}
                  onChange={(e) => setStoreItemForm(prev => ({
                    ...prev, translations: { ...prev.translations, [lang]: { ...prev.translations[lang], description: e.target.value } }
                  }))}
                />
              </Box>
            ))}

            <TextField
              label="Precio (EUR)" type="number" size="small" sx={{ maxWidth: 200 }}
              value={storeItemForm.price_amount}
              onChange={(e) => setStoreItemForm(prev => ({ ...prev, price_amount: e.target.value }))}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {storeItemForm.cover_image_url && (
                <Box sx={{ width: 72, height: 72, borderRadius: 1.5, overflow: 'hidden' }}>
                  <img src={storeItemForm.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              )}
              <Button variant="outlined" component="label" size="small" disabled={uploadingStoreImage} startIcon={uploadingStoreImage ? <CircularProgress size={16} /> : <ImageIcon />}>
                {uploadingStoreImage ? 'Subiendo...' : 'Imagen'}
                <input type="file" hidden accept="image/*" onChange={handleStoreImageUpload} />
              </Button>
            </Box>

            <FormControlLabel
              control={<Switch checked={storeItemForm.is_featured} onChange={(e) => setStoreItemForm(prev => ({ ...prev, is_featured: e.target.checked }))} />}
              label="Destacar en la tienda"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStoreDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={storeItemSaving || !storeItemForm.translations.es?.name}
            onClick={handleSaveStoreItem}
            startIcon={storeItemSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {storeItemSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderTvStats = () => {
    const header = (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h6" fontWeight={600}>Actividad de las TVs</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={tvRange} exclusive size="small"
            onChange={(_, v) => v && setTvRange(v)}
          >
            {TV_RANGE_OPTIONS.map(o => (
              <ToggleButton key={o.value} value={o.value} sx={{ px: 1.5, py: 0.4, textTransform: 'none', fontWeight: 600 }}>
                {o.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button
            size="small" variant="outlined" startIcon={<DownloadIcon />}
            disabled={!tvStats || tvStats.daily.length === 0}
            onClick={exportTvCsv}
          >
            CSV
          </Button>
        </Stack>
      </Box>
    );

    let body: React.ReactNode;
    if (tvStatsLoading) {
      body = <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>;
    } else if (!tvStats) {
      body = <Typography variant="body2" color="text.secondary">No se pudieron cargar las estadísticas.</Typography>;
    } else {
      const t = tvStats.totals;
      const impressions = t.impression || 0;
      const wifi = t.wifi_reveal || 0;
      const guideInteractions = (t.poi_select || 0) + (t.menu_qr_shown || 0) + (t.booking_qr_shown || 0);
      const wifiRate = impressions > 0 ? Math.round((wifi / impressions) * 100) : 0;
      const hasActivity = impressions > 0 || wifi > 0 || guideInteractions > 0;

      const cards = [
        { icon: <ImpressionIcon />, color: '#128099', value: impressions, label: 'Impresiones', sub: 'veces que se encendió la pantalla' },
        { icon: <WifiIcon />, color: '#2e7d32', value: wifi, label: 'WiFi consultado', sub: 'huéspedes que vieron la contraseña' },
        { icon: <ExploreIcon />, color: '#e07a5f', value: guideInteractions, label: 'Interacción con la guía', sub: 'recomendaciones y QRs abiertos' },
        { icon: <DevicesIcon />, color: '#6a1b9a', value: tvStats.devices.active, label: 'TVs activas', sub: `de ${tvStats.devices.total} emparejadas` },
      ];

      const chartLabels = tvStats.daily.map(d => new Date(d.day).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
      const chartData = {
        labels: chartLabels,
        datasets: [
          {
            label: 'Impresiones', data: tvStats.daily.map(d => d.impression),
            borderColor: '#128099', backgroundColor: 'rgba(18,128,153,0.12)', fill: true,
            borderWidth: 2.5, tension: 0.35, pointRadius: tvStats.daily.length > 20 ? 0 : 3, pointHoverRadius: 5,
          },
          {
            label: 'WiFi consultado', data: tvStats.daily.map(d => d.wifi_reveal),
            borderColor: '#2e7d32', backgroundColor: 'transparent',
            borderWidth: 2, tension: 0.35, pointRadius: tvStats.daily.length > 20 ? 0 : 3, pointHoverRadius: 5,
          },
        ],
      };
      const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
          legend: { display: true, position: 'top' as const, labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } },
          tooltip: { cornerRadius: 10, padding: 10 },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 }, autoSkip: true, maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 10 }, precision: 0 }, grid: { color: 'rgba(148,163,184,0.1)' } },
        },
      };

      const screenTotal = tvStats.byScreen.reduce((s, x) => s + x.count, 0);

      body = (
        <>
          {/* Métricas destacadas, con contexto de negocio */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 2, mb: 3 }}>
            {cards.map(c => (
              <Box key={c.label} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(c.color, 0.12), color: c.color, display: 'flex' }}>{c.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" fontWeight={800} lineHeight={1.1}>{c.value.toLocaleString('es-ES')}</Typography>
                  <Typography variant="subtitle2" fontWeight={600}>{c.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.sub}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Insight derivado: cuenta una historia, no solo números */}
          {impressions > 0 && (
            <Alert icon={<InsightsIcon />} severity="success" sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(46,125,50,0.08)' }}>
              <strong>{wifiRate}%</strong> de las veces que se encendió la pantalla, el huésped consultó el WiFi
              {guideInteractions > 0 && <> · <strong>{guideInteractions}</strong> interacciones con tus recomendaciones</>}.
            </Alert>
          )}

          {!hasActivity ? (
            <Box sx={{ textAlign: 'center', py: 5, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
              <ImpressionIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Todavía no hay actividad registrada en este periodo.</Typography>
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>
                Evolución diaria
              </Typography>
              <Box sx={{ height: 240, mb: 3 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>

              {screenTotal > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1.5 }}>
                    Pantallas más vistas
                  </Typography>
                  <Stack spacing={1.2}>
                    {tvStats.byScreen.map(s => {
                      const pct = Math.round((s.count / screenTotal) * 100);
                      return (
                        <Box key={s.screen}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                            <Typography variant="body2" fontWeight={600}>{TV_SCREEN_LABELS[s.screen] || s.screen}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.count} · {pct}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 5 }} />
                        </Box>
                      );
                    })}
                  </Stack>
                </>
              )}
            </>
          )}
        </>
      );
    }

    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {header}
        {body}
      </Paper>
    );
  };

  const renderTvTab = () => {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          Empareja una Android TV con este apartamento para mostrar la pantalla de bienvenida
          (WiFi, guía y alrededores). El código se introduce una sola vez en la app de la TV.
        </Alert>
        {tvError && <Alert severity="error" sx={{ mb: 2 }}>{tvError}</Alert>}

        {/* Emparejar nueva TV */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TvIcon color="primary" /> Emparejar una TV nueva
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 560 }}>
            Genera un código y ábrelo en la app de VisualTaste TV instalada en el televisor
            (o en <code>tv.visualtastes.com/#CODIGO</code> durante las pruebas).
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Etiqueta (opcional)" size="small" sx={{ minWidth: 220 }}
              placeholder="Ej: TV Salón"
              value={deviceLabelInput}
              onChange={(e) => setDeviceLabelInput(e.target.value)}
            />
            <Button
              variant="contained"
              startIcon={pairing ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
              disabled={pairing}
              onClick={handlePairDevice}
            >
              {pairing ? 'Generando...' : 'Generar código'}
            </Button>
          </Box>

          {newDevice && (
            <Box sx={{ mt: 3, p: 3, borderRadius: 3, border: '1px dashed', borderColor: 'primary.main', bgcolor: 'rgba(18,128,153,0.06)', display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
              <QRCodeGenerator
                ref={tvQrRef}
                data={`https://tv.visualtastes.com/#${newDevice.pairingCode}`}
                size={120}
                dotsOptions={{ color: '#128099', type: 'rounded' }}
                cornersSquareOptions={{ type: 'extra-rounded' }}
                imageOptions={{ margin: 0 }}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  Código de emparejamiento{newDevice.deviceLabel ? ` · ${newDevice.deviceLabel}` : ''}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h4" fontWeight={800} letterSpacing={4} fontFamily="monospace">
                    {newDevice.pairingCode}
                  </Typography>
                  <Tooltip title="Copiar código">
                    <IconButton size="small" onClick={() => copyPairingCode(newDevice.pairingCode)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>

        {/* TVs emparejadas */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>TVs emparejadas</Typography>
          {tvLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : tvDevices.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
              <TvIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">Todavía no hay ninguna TV emparejada.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {tvDevices.map(d => (
                <Card key={d.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, opacity: d.is_active ? 1 : 0.55 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '12px 16px !important' }}>
                    <DotIcon sx={{ fontSize: 14, color: isRecentlySeen(d.last_seen_at) ? 'success.main' : 'text.disabled' }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {d.device_label || 'TV sin nombre'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Última conexión: {formatRelativeTime(d.last_seen_at)}
                      </Typography>
                    </Box>
                    <Chip label={d.pairing_code} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                    <Tooltip title={d.is_active ? 'Desactivar TV' : 'Activar TV'}>
                      <Switch
                        size="small"
                        checked={d.is_active}
                        onChange={(e) => handleToggleDevice(d.id, e.target.checked)}
                      />
                    </Tooltip>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Paper>

        {/* Estadísticas */}
        {renderTvStats()}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 3 }}>
      {/* LEFT PANEL: Editor */}
      <Box sx={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', minWidth: 400, overflowY: 'auto', pr: 1 }}>
        {/* Header Left */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/guide/apartments')} size="small" sx={{ bgcolor: 'action.hover' }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={700}>
              {apartment ? apartment.name : 'Cargando...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configura lo que tus huéspedes verán al escanear
            </Typography>
          </Box>
        </Box>

        {/* Editor Tabs */}
        <Tabs
          value={activeMainTab}
          onChange={(_, v) => setActiveMainTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="Ajustes & QR" sx={{ fontWeight: 600 }} />
          <Tab label="Guía y Normas" sx={{ fontWeight: 600 }} />
          <Tab label="Localizaciones" icon={<LocationOnIcon fontSize="small" />} iconPosition="start" sx={{ fontWeight: 600 }} />
          <Tab label="Bienvenida" icon={<CelebrationIcon fontSize="small" />} iconPosition="start" sx={{ fontWeight: 600 }} />
          <Tab label="Pantalla TV" icon={<TvIcon fontSize="small" />} iconPosition="start" sx={{ fontWeight: 600 }} />
          <Tab label="Tienda" icon={<StoreIcon fontSize="small" />} iconPosition="start" sx={{ fontWeight: 600 }} />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, pb: 4 }}>
          {activeMainTab === 0 && renderSettingsTab()}
          {activeMainTab === 1 && renderGuideTab()}
          {activeMainTab === 2 && renderPoisTab()}
          {activeMainTab === 3 && renderWelcomeTab()}
          {activeMainTab === 4 && renderTvTab()}
          {activeMainTab === 5 && renderStoreTab()}
        </Box>
      </Box>

      {/* RIGHT PANEL: Live Preview (Mobile Mockup) */}
      <Box sx={{
        flex: '0 0 380px',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: '#f8fafc',
        borderRadius: 4,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 2, px: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon fontSize="small" color="primary" />
            Live Preview
          </Typography>
          <Tooltip title="Forzar recarga manual">
            <IconButton size="small" onClick={handleRefreshPreview}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Smartphone Frame */}
        <Box sx={{
          width: '100%',
          maxWidth: 340,
          aspectRatio: '9/19',
          bgcolor: 'white',
          borderRadius: '36px',
          border: '10px solid #0f172a',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          position: 'relative'
        }}>
          {/* Notch */}
          <Box sx={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '40%', height: 24, bgcolor: '#0f172a',
            borderBottomLeftRadius: 16, borderBottomRightRadius: 16, zIndex: 10
          }} />

          {apartment ? (
            <iframe
              src={`https://guide.visualtastes.com/${apartment.slug}?refresh=${previewKey}`}
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
              title="Live Preview"
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9' }}>
              <CircularProgress size={30} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TranslateIcon color="primary" />
          {editingItem ? `Editar: ${editingItem.info_key}` : 'Nueva Información'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {!editingItem && (
              <FormControl fullWidth>
                <InputLabel>Tipo de información</InputLabel>
                <Select
                  value={form.info_key}
                  label="Tipo de información"
                  onChange={(e) => handleSelectKey(e.target.value)}
                >
                  {AVAILABLE_KEYS.map(k => (
                    <MenuItem key={k.key} value={k.key}>{k.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Traducciones</Typography>

            {/* Show top 3 languages for quick edit in dialog, others could be expanded */}
            {LANGUAGES.slice(0, 3).map(lang => (
              <Box key={lang.code} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>{lang.label}</Typography>
                <TextField
                  label="Título" fullWidth size="small"
                  value={form.translations[lang.code]?.title || ''}
                  onChange={(e) => setForm(prev => ({
                    ...prev, translations: { ...prev.translations, [lang.code]: { ...prev.translations[lang.code], title: e.target.value, content: prev.translations[lang.code]?.content || '' } }
                  }))}
                  sx={{ mb: 1.5 }}
                />
                <TextField
                  label="Contenido" fullWidth multiline minRows={2} maxRows={6} size="small"
                  value={form.translations[lang.code]?.content || ''}
                  onChange={(e) => setForm(prev => ({
                    ...prev, translations: { ...prev.translations, [lang.code]: { title: prev.translations[lang.code]?.title || '', content: e.target.value } }
                  }))}
                  placeholder="Escribe aquí la información..."
                />
              </Box>
            ))}

            <Divider />

            <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Fotos y Vídeos</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sube fotos para ayudar al huésped (ej: foto del router, de los mandos de la TV).
              </Typography>

              {form.media.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  {form.media.map((m, index) => (
                    <Box key={index} sx={{ position: 'relative', width: 80, height: 80 }}>
                      <Box sx={{ width: '100%', height: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                        {m.media_type === 'video' ? (
                          <Box sx={{ width: '100%', height: '100%', bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" color="white">VIDEO</Typography>
                          </Box>
                        ) : (
                          <img src={`${MEDIA_BASE}/media/${m.r2_key}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMedia(index)}
                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'error.main', color: 'white' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              <Button
                variant="outlined" component="label" disabled={uploadingMedia}
                startIcon={uploadingMedia ? <CircularProgress size={20} /> : <AddIcon />}
              >
                {uploadingMedia ? 'Subiendo...' : 'Añadir Media'}
                <input type="file" hidden accept="image/*,video/*" onChange={handleFileUpload} />
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'background.default' }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.info_key} sx={{ px: 4 }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Guardar y Actualizar Preview'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
