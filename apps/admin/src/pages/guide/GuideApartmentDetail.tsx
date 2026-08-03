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
  Stack, InputAdornment,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Wifi as WifiIcon,
  Info as InfoIcon,
  Translate as TranslateIcon,
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
  Upload as UploadJsonIcon,
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
  Visibility as ImpressionIcon,
  VisibilityOff as VisibilityOffIcon,
  Storefront as StoreIcon,
  ShoppingBag as OrdersIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import QRCodeGenerator, { QRCodeHandle } from '../../components/QRCodeGenerator';

interface ApartmentInfo {
  id: string;
  info_key: string;
  icon_name: string;
  order_index: number;
  category_key: string | null;
  use_custom_title: boolean;
  title: string;
  content: string;
  category_icon_name?: string | null;
  category_color?: string | null;
  category_image_r2_key?: string | null;
  category_name?: string | null;
  resolved_title?: string | null;
  media?: { id?: string; r2_key: string; media_type: string }[];
  // Punto de recogida opcional (migración 0084) — hoy solo se edita para door_code.
  latitude?: number | null;
  longitude?: number | null;
  pickup_instructions?: string | null;
}

interface InfoCategory {
  key: string;
  group_key: string;
  icon_name: string;
  color: string;
  image_r2_key: string | null;
  order_index: number;
  name: string;
  hint: string | null;
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

const MEDIA_BASE = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

// Renders a guide_info_categories.icon_name (Material Symbols, e.g. 'local_laundry_service')
// straight from the catalog — no per-icon MUI component mapping to keep in sync
// (see migration 0083's header for why: the repo already had 4 duplicated category
// lists before this, one more hand-maintained map would be a 5th).
function CategoryIcon({ name, color, size = 22 }: { name?: string | null; color?: string | null; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, color: color || 'inherit', fontVariationSettings: "'FILL' 1" }}
    >
      {name || 'info'}
    </span>
  );
}

// Group order/labels for the category picker — mirrors migration 0083's 9
// thematic groups + the 'other' catch-all (just 'custom'). Labels only, the
// admin has no i18n of its own (CLAUDE.md: this business operates in Spanish).
const CATEGORY_GROUP_LABELS: Record<string, string> = {
  arrival: 'Llegada y salida',
  connectivity: 'Conectividad y ocio',
  comfort: 'Clima y confort',
  appliances: 'Electrodomésticos',
  house: 'La casa',
  outdoor: 'Exterior y extras',
  safety: 'Seguridad y ayuda',
  nearby: 'Servicios de la zona',
  hotel: 'Hotel',
  other: 'Otro',
};

// Categorías de la Tienda — agrupaciones, no nombres de producto (ver
// migrations/0081_store_categories_cleanup.sql). El nombre específico de cada ítem
// (p.ej. "Traslado al aeropuerto", "Cuna / trona") va en el nombre traducido, no aquí;
// "custom" cubre cualquier otra cosa que no encaje en las demás. Misma lista que
// GuideStorePage.tsx (catálogo platform) — mantener sincronizadas.
const STORE_CATEGORIES = [
  { key: 'local_product', label: 'Producto local' },
  { key: 'grocery', label: 'Compra / grocery' },
  { key: 'checkinout', label: 'Check-in / Check-out' },
  { key: 'service', label: 'Servicios de la estancia' },
  { key: 'welcome', label: 'Bienvenida' },
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

  // Info category catalog (migration 0083) — global, loaded once
  const [categories, setCategories] = useState<InfoCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [coverage, setCoverage] = useState<{ total: number; by_lang: Record<string, number> } | null>(null);

  // Dialog State (info blocks)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ApartmentInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  const [form, setForm] = useState({
    info_key: '',
    icon_name: '',
    category_key: '',
    use_custom_title: false,
    // Punto de recogida opcional (migración 0084) — solo relevante para door_code
    // (ver condición en el JSX del diálogo), pero el campo es genérico a nivel
    // de item por si se reutiliza para otra categoría más adelante.
    latitude: null as number | null,
    longitude: null as number | null,
    translations: {} as Record<string, { title?: string; content?: string; pickup_instructions?: string }>,
    media: [] as { id?: string; r2_key: string; media_type: string }[],
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deletingInfo, setDeletingInfo] = useState(false);
  const [reorderingInfo, setReorderingInfo] = useState(false);

  // Category picker (inside the create/edit dialog)
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Bulk translations (export JSON / paste from an external AI / import JSON —
  // see CLAUDE.md: no in-app auto-translate yet, this is the manual workflow helper)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkJsonText, setBulkJsonText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ imported_fields: number; skipped: string[] } | null>(null);

  // Teléfonos (migración 0084) — checklist: catálogo global (agencia/policía/
  // bomberos/ambulancia/otro) + las entradas de ESTE apartamento. phoneDrafts
  // guarda el número en edición por categoría antes de guardar, para no
  // disparar un PUT en cada tecla.
  const [phoneCategories, setPhoneCategories] = useState<{ key: string; icon_name: string; order_index: number; name: string }[]>([]);
  const [phones, setPhones] = useState<{ id: string; category_key: string; phone_number: string; label: string | null; category_icon_name: string | null; category_name: string | null }[]>([]);
  const [phonesLoading, setPhonesLoading] = useState(false);
  const [savingPhoneCategory, setSavingPhoneCategory] = useState<string | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomNumber, setNewCustomNumber] = useState('');

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
  const [welcomeLang, setWelcomeLang] = useState('es');

  // Tienda (store-items propios del anfitrión) tab state
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [editingStoreItem, setEditingStoreItem] = useState<any | null>(null);
  const [storeItemLang, setStoreItemLang] = useState('es');
  const [storeItemForm, setStoreItemForm] = useState({
    category: 'custom',
    price_amount: '',
    is_featured: false,
    is_active: true,
    cover_image_url: '',
    translations: {} as Record<string, { name?: string; description?: string }>,
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

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await apiClient.request('/guide/admin/info-categories');
      setCategories(res.categories || []);
    } catch (err) {
      console.error('Error loading info categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadCoverage = async () => {
    if (!id) return;
    try {
      const res = await apiClient.request(`/guide/admin/apartments/${id}/info/coverage`);
      if (res.success) setCoverage({ total: res.total, by_lang: res.by_lang });
    } catch (err) {
      console.error('Error loading translation coverage:', err);
    }
  };

  const loadPhoneCategories = async () => {
    try {
      const res = await apiClient.request('/guide/admin/phone-categories');
      setPhoneCategories(res.categories || []);
    } catch (err) {
      console.error('Error loading phone categories:', err);
    }
  };

  const loadPhones = async () => {
    if (!id) return;
    setPhonesLoading(true);
    try {
      const res = await apiClient.request(`/guide/admin/apartments/${id}/phones`);
      const list = res.phones || [];
      setPhones(list);
      // Sincroniza los borradores con lo guardado — pero solo para categorías que
      // no tiene el usuario a medio editar ahora mismo (evita pisar lo que está
      // escribiendo si loadPhones se dispara por un refresh de fondo).
      setPhoneDrafts(prev => {
        const next = { ...prev };
        for (const p of list) {
          if (next[p.category_key] === undefined) next[p.category_key] = p.phone_number;
        }
        return next;
      });
    } catch (err) {
      console.error('Error loading phones:', err);
    } finally {
      setPhonesLoading(false);
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

  useEffect(() => { loadInfo(); loadZones(); loadWelcome(); loadCategories(); loadCoverage(); loadPhoneCategories(); loadPhones(); }, [id]);
  useEffect(() => { if (id) loadInfo(); }, [currentLang]);
  useEffect(() => {
    if (apartment?.zone_id) loadPois(apartment.zone_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartment?.zone_id]);
  useEffect(() => {
    if (activeMainTab === 4 && id) { loadStoreItems(); loadStoreOrders(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMainTab, id]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      info_key: '',
      icon_name: '',
      category_key: '',
      use_custom_title: false,
      latitude: null,
      longitude: null,
      translations: {},
      media: [],
    });
    setCategorySearch('');
    setCategoryPickerOpen(false);
    setDialogOpen(true);
  };

  // Loads EVERY language for this block before opening the dialog — not just
  // `currentLang`. The old version only ever knew about the tab you were
  // viewing, so saving from e.g. the Italian tab silently wiped out es/en/fr
  // (they were shown as empty in the dialog and got written back that way).
  // A custom title is the only per-apartment thing left to translate now that
  // the category name covers the default case, but the fix applies the same
  // way regardless — never show/save a language the dialog didn't actually load.
  const handleOpenEdit = async (item: ApartmentInfo) => {
    setEditingItem(item);
    setLoadingTranslations(true);
    setCategorySearch('');
    setCategoryPickerOpen(false);
    setForm({
      info_key: item.info_key,
      icon_name: item.icon_name || '',
      category_key: item.category_key || '',
      use_custom_title: !!item.use_custom_title,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      translations: {},
      media: item.media || [],
    });
    setDialogOpen(true);
    try {
      const res = await apiClient.request(`/guide/admin/apartments/${id}/info/${item.id}/translations`);
      setForm(prev => ({ ...prev, translations: res.translations || {} }));
    } catch (err) {
      console.error('Error loading translations:', err);
    } finally {
      setLoadingTranslations(false);
    }
  };

  const handleSelectCategory = (category: InfoCategory) => {
    setForm(prev => ({
      ...prev,
      // A fresh block always starts as a NEW info_key derived from the category
      // (with a numeric suffix if that key is already taken by this apartment —
      // e.g. two washing machines) so category_key stays the single source of
      // truth for icon/color/name; info_key only exists to satisfy the
      // UNIQUE(apartment_id, info_key) constraint and build the row's id.
      info_key: editingItem ? prev.info_key : nextInfoKeyFor(category.key),
      category_key: category.key,
      icon_name: '', // cleared: inherit the category's icon unless overridden later
    }));
    setCategoryPickerOpen(false);
  };

  const nextInfoKeyFor = (categoryKey: string) => {
    const existingKeys = new Set(infoItems.map(i => i.info_key));
    if (!existingKeys.has(categoryKey)) return categoryKey;
    let n = 2;
    while (existingKeys.has(`${categoryKey}_${n}`)) n++;
    return `${categoryKey}_${n}`;
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/info`, {
        method: 'POST',
        body: JSON.stringify({
          info_key: form.info_key,
          icon_name: form.icon_name || null,
          category_key: form.category_key || null,
          use_custom_title: form.use_custom_title,
          order_index: editingItem?.order_index,
          latitude: form.latitude,
          longitude: form.longitude,
          translations: form.translations,
        }),
      });
      setDialogOpen(false);
      await Promise.all([loadInfo(), loadCoverage()]);
      handleRefreshPreview();
    } catch (err) {
      console.error('Error saving info:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInfo = async (item: ApartmentInfo) => {
    if (!id) return;
    if (!window.confirm(`¿Eliminar el bloque "${item.resolved_title || item.title || item.info_key}"? Esta acción no se puede deshacer.`)) return;
    setDeletingInfo(true);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/info/${item.id}`, { method: 'DELETE' });
      await Promise.all([loadInfo(), loadCoverage()]);
      handleRefreshPreview();
    } catch (err) {
      console.error('Error deleting info block:', err);
    } finally {
      setDeletingInfo(false);
    }
  };

  // Un solo endpoint para crear/editar (con id existente actualiza esa fila) —
  // mismo patrón que upsertApartmentInfo en el backend.
  const handleSavePhone = async (categoryKey: string, phoneNumber: string, label?: string) => {
    if (!id || !phoneNumber.trim()) return;
    const existing = phones.find(p => p.category_key === categoryKey && (categoryKey !== 'custom' || p.label === label));
    setSavingPhoneCategory(categoryKey);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/phones`, {
        method: 'POST',
        body: JSON.stringify({ id: existing?.id, category_key: categoryKey, phone_number: phoneNumber.trim(), label: label || null }),
      });
      await loadPhones();
      handleRefreshPreview();
    } catch (err) {
      console.error('Error saving phone:', err);
    } finally {
      setSavingPhoneCategory(null);
    }
  };

  const handleDeletePhone = async (phoneId: string, categoryKey: string) => {
    if (!id) return;
    setSavingPhoneCategory(categoryKey);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/phones/${phoneId}`, { method: 'DELETE' });
      setPhoneDrafts(prev => { const next = { ...prev }; delete next[categoryKey]; return next; });
      await loadPhones();
      handleRefreshPreview();
    } catch (err) {
      console.error('Error deleting phone:', err);
    } finally {
      setSavingPhoneCategory(null);
    }
  };

  const handleReorderInfo = async (itemId: string, direction: -1 | 1) => {
    if (!id) return;
    const sorted = [...infoItems].sort((a, b) => a.order_index - b.order_index);
    const currentIdx = sorted.findIndex(i => i.id === itemId);
    const targetIdx = currentIdx + direction;
    if (currentIdx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[currentIdx], reordered[targetIdx]] = [reordered[targetIdx], reordered[currentIdx]];
    const items = reordered.map((it, index) => ({ id: it.id, order_index: index }));

    setInfoItems(reordered.map((it, index) => ({ ...it, order_index: index }))); // optimistic
    setReorderingInfo(true);
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/info/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
    } catch (err) {
      console.error('Error reordering info blocks:', err);
      await loadInfo(); // revert on failure
    } finally {
      setReorderingInfo(false);
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

  // Info block media goes through its own dedicated endpoint (POST/DELETE
  // .../info/:infoId/media), NOT the shared /media/upload used below for the
  // apartment cover — that one requires a dish_id and 400s for anything
  // guidebook-related (see CLAUDE.md; addPoiMedia already worked around this
  // for POIs the same way). Persists immediately, same UX as POI photos:
  // requires the block to be saved first so an infoId exists.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !id || !editingItem) return;
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      const response = await fetch(`${MEDIA_BASE}/guide/admin/apartments/${id}/info/${editingItem.id}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: formData,
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Error al subir el archivo');
      setForm(prev => ({
        ...prev,
        media: [{ id: result.id, r2_key: result.r2_key, media_type: result.media_type }, ...prev.media],
      }));
      loadInfo(); // refresh the card list's thumbnail in the background
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setUploadingMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveMedia = async (mediaId: string | undefined, index: number) => {
    if (!id || !editingItem || !mediaId) return;
    try {
      await apiClient.request(`/guide/admin/apartments/${id}/info/${editingItem.id}/media/${mediaId}`, { method: 'DELETE' });
      setForm(prev => {
        const newMedia = [...prev.media];
        newMedia.splice(index, 1);
        return { ...prev, media: newMedia };
      });
      loadInfo();
    } catch (err) {
      console.error('Error removing media:', err);
    }
  };

  const handleRefreshPreview = () => {
    setPreviewKey(Date.now());
  };

  // Manual translation workflow (no auto-translate yet, see CLAUDE.md): export
  // the current tab's text as JSON, paste it into an external AI with a
  // translate-these-13-languages prompt, paste the result back in. Title is
  // only included when use_custom_title is set — the default (category-driven)
  // title never needs translating, so it never enters this file.
  const handleExportJson = () => {
    const payload: Record<string, { [lang: string]: { title?: string; content: string } }> = {};
    for (const item of infoItems) {
      const entry: { title?: string; content: string } = { content: item.content || '' };
      if (item.use_custom_title) entry.title = item.title || '';
      payload[item.info_key] = { [currentLang]: entry };
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${apartment?.slug || id}_info_${currentLang}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenBulkImport = () => {
    setBulkJsonText('');
    setBulkError(null);
    setBulkResult(null);
    setBulkDialogOpen(true);
  };

  const handleImportJson = async () => {
    if (!id) return;
    setBulkError(null);
    setBulkResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(bulkJsonText);
    } catch {
      setBulkError('El texto pegado no es JSON válido.');
      return;
    }
    setBulkImporting(true);
    try {
      const res = await apiClient.request(`/guide/admin/apartments/${id}/info/bulk-translations`, {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      setBulkResult({ imported_fields: res.imported_fields, skipped: res.skipped || [] });
      await Promise.all([loadInfo(), loadCoverage()]);
      handleRefreshPreview();
    } catch (err: any) {
      setBulkError(err.message || 'Error al importar las traducciones');
    } finally {
      setBulkImporting(false);
    }
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
    setStoreItemLang('es');
    setStoreItemForm({
      category: 'custom',
      price_amount: '',
      is_featured: false,
      is_active: true,
      cover_image_url: '',
      translations: {},
    });
    setStoreDialogOpen(true);
  };

  const handleOpenEditStoreItem = (item: any) => {
    setEditingStoreItem(item);
    setStoreItemLang('es');
    setStoreItemForm({
      category: item.category || 'custom',
      price_amount: item.price_amount != null ? String(item.price_amount) : '',
      is_featured: !!item.is_featured,
      is_active: !!item.is_active,
      cover_image_url: item.cover_image_url || '',
      // El listado ya trae las traducciones (workerGuideAdmin.js las adjunta) —
      // precargarlas de verdad, no dejarlas en blanco: si el manager guarda sin
      // tocar el nombre, saveTranslations sobrescribiría con "" el que ya hubiera.
      translations: { ...(item.translations || {}) },
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

      {apartment && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.main', color: 'white', display: 'flex' }}>
            <TvIcon />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 200 }}>
            <Typography variant="subtitle1" fontWeight={600}>Pantalla TV</Typography>
            <Typography variant="body2" color="text.secondary">
              Empareja Android TVs y consulta su actividad desde la sección TV del menú.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<TvIcon />}
            onClick={() => navigate(`/guide/tv?apartment=${id}`)}
          >
            Gestionar Pantalla TV
          </Button>
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

  const renderGuideTab = () => {
    const sortedItems = [...infoItems].sort((a, b) => a.order_index - b.order_index);
    return (
    <Box>
      <Paper elevation={0} sx={{ mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={currentLang}
          onChange={(_, v) => setCurrentLang(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1 }}
        >
          {LANGUAGES.map(lang => (
            <Tab
              key={lang.code}
              value={lang.code}
              label={coverage ? `${lang.label} (${coverage.by_lang[lang.code] ?? 0}/${coverage.total})` : lang.label}
              sx={{ fontWeight: 500 }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Button size="small" startIcon={<DownloadIcon />} onClick={handleExportJson} disabled={infoItems.length === 0}>
          Exportar textos ({currentLang})
        </Button>
        <Button size="small" startIcon={<UploadJsonIcon />} onClick={handleOpenBulkImport}>
          Importar traducciones (JSON)
        </Button>
      </Box>

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
          {sortedItems.map((item, idx) => (
            <Card
              key={item.id}
              elevation={0}
              sx={{
                border: '1px solid', borderColor: 'divider', borderRadius: 3,
                transition: 'all 0.2s', '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
              }}
            >
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'start', p: '16px !important' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <IconButton size="small" disabled={idx === 0 || reorderingInfo} onClick={() => handleReorderInfo(item.id, -1)}>
                    <ArrowUpIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" disabled={idx === sortedItems.length - 1 || reorderingInfo} onClick={() => handleReorderInfo(item.id, 1)}>
                    <ArrowDownIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{
                  p: 1.5, borderRadius: 2, bgcolor: item.category_color || 'primary.main', color: 'white',
                  display: 'flex', alignItems: 'center', minWidth: 44, justifyContent: 'center'
                }}>
                  <CategoryIcon name={item.icon_name || item.category_icon_name} color="white" />
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {item.resolved_title || item.title || item.category_name || item.info_key}
                      </Typography>
                      {!item.use_custom_title && (
                        <Chip label="del catálogo" size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" disabled={deletingInfo} onClick={() => handleDeleteInfo(item)}>
                          <DeleteIcon fontSize="small" />
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

      {/* Teléfonos (migración 0084) — checklist aparte de los bloques de info:
          un número no es un bloque de texto libre, necesita "agencia siempre
          primera" (order_index del catálogo) y un link tel: en la app. */}
      <Divider sx={{ my: 4 }} />
      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>Teléfonos</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        La agencia aparece siempre primera para el huésped. Deja vacío lo que no aplique a este apartamento.
      </Typography>

      {phonesLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {phoneCategories.filter(c => c.key !== 'custom').map(cat => {
            const existing = phones.find(p => p.category_key === cat.key);
            const draft = phoneDrafts[cat.key] ?? '';
            const isSaving = savingPhoneCategory === cat.key;
            return (
              <Box
                key={cat.key}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
                  border: '1px solid', borderColor: existing ? 'primary.main' : 'divider',
                }}
              >
                <CategoryIcon name={cat.icon_name} color={existing ? undefined : '#9e9e9e'} size={20} />
                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>{cat.name}</Typography>
                <TextField
                  size="small" placeholder="Número de teléfono" sx={{ flexGrow: 1 }}
                  value={draft}
                  onChange={(e) => setPhoneDrafts(prev => ({ ...prev, [cat.key]: e.target.value }))}
                  onBlur={() => { if (draft.trim() && draft.trim() !== existing?.phone_number) handleSavePhone(cat.key, draft); }}
                />
                {isSaving && <CircularProgress size={18} />}
                {existing && (
                  <Tooltip title="Quitar">
                    <IconButton size="small" onClick={() => handleDeletePhone(existing.id, cat.key)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            );
          })}

          {/* "Otro" — a diferencia del resto, puede tener varias entradas a la vez */}
          {phones.filter(p => p.category_key === 'custom').map(p => (
            <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'primary.main' }}>
              <CategoryIcon name="call" size={20} />
              <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>{p.label}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>{p.phone_number}</Typography>
              <Tooltip title="Quitar">
                <IconButton size="small" onClick={() => handleDeletePhone(p.id, 'custom')}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField size="small" label="Nombre" value={newCustomLabel} onChange={(e) => setNewCustomLabel(e.target.value)} sx={{ minWidth: 160 }} />
            <TextField size="small" label="Número" value={newCustomNumber} onChange={(e) => setNewCustomNumber(e.target.value)} sx={{ flexGrow: 1 }} />
            <Button
              size="small" variant="outlined" startIcon={<AddIcon />}
              disabled={!newCustomLabel.trim() || !newCustomNumber.trim() || savingPhoneCategory === 'custom'}
              onClick={async () => {
                await handleSavePhone('custom', newCustomNumber, newCustomLabel);
                setNewCustomLabel('');
                setNewCustomNumber('');
              }}
            >
              Añadir
            </Button>
          </Box>
        </Box>
      )}
    </Box>
    );
  };

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
          <Tabs
            value={welcomeLang}
            onChange={(_, v) => setWelcomeLang(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
          >
            {LANGUAGES.map(lang => {
              const hasContent = !!(welcomeForm.translations[lang.code]?.title || welcomeForm.translations[lang.code]?.body);
              return (
                <Tab
                  key={lang.code}
                  value={lang.code}
                  label={lang.label}
                  iconPosition="end"
                  icon={hasContent ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} /> : undefined}
                  sx={{ fontWeight: 500, fontSize: '0.8125rem' }}
                />
              );
            })}
          </Tabs>
          <Box sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <TextField
              label={welcomeLang === 'es' ? 'Título (obligatorio)' : 'Título'}
              fullWidth size="small" sx={{ mb: 1.5 }}
              value={welcomeForm.translations[welcomeLang]?.title || ''}
              onChange={(e) => setWelcomeForm(prev => ({
                ...prev, translations: { ...prev.translations, [welcomeLang]: { ...prev.translations[welcomeLang], title: e.target.value } }
              }))}
            />
            <TextField
              label="Mensaje" fullWidth multiline minRows={2} maxRows={5} size="small"
              value={welcomeForm.translations[welcomeLang]?.body || ''}
              onChange={(e) => setWelcomeForm(prev => ({
                ...prev, translations: { ...prev.translations, [welcomeLang]: { ...prev.translations[welcomeLang], body: e.target.value } }
              }))}
            />
          </Box>

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
                  size="small"
                  label={`Texto del botón (${LANGUAGES.find(l => l.code === welcomeLang)?.label || welcomeLang})`}
                  sx={{ minWidth: 240 }}
                  value={welcomeForm.translations[welcomeLang]?.action_label || ''}
                  onChange={(e) => setWelcomeForm(prev => ({
                    ...prev, translations: { ...prev.translations, [welcomeLang]: { ...prev.translations[welcomeLang], action_label: e.target.value } }
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
                  <Typography fontWeight={600} noWrap title={item.name}>{item.name || item.id}</Typography>
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

            <Tabs
              value={storeItemLang}
              onChange={(_, v) => setStoreItemLang(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
            >
              {LANGUAGES.map(lang => {
                const hasContent = !!storeItemForm.translations[lang.code]?.name;
                return (
                  <Tab
                    key={lang.code}
                    value={lang.code}
                    label={lang.label}
                    iconPosition="end"
                    icon={hasContent ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} /> : undefined}
                    sx={{ fontWeight: 500, fontSize: '0.8125rem' }}
                  />
                );
              })}
            </Tabs>
            <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <TextField
                label={storeItemLang === 'es' ? 'Nombre (obligatorio)' : 'Nombre'} fullWidth size="small" sx={{ mb: 1.5 }}
                value={storeItemForm.translations[storeItemLang]?.name || ''}
                onChange={(e) => setStoreItemForm(prev => ({
                  ...prev, translations: { ...prev.translations, [storeItemLang]: { ...prev.translations[storeItemLang], name: e.target.value } }
                }))}
              />
              <TextField
                label="Descripción" fullWidth multiline minRows={2} size="small"
                value={storeItemForm.translations[storeItemLang]?.description || ''}
                onChange={(e) => setStoreItemForm(prev => ({
                  ...prev, translations: { ...prev.translations, [storeItemLang]: { ...prev.translations[storeItemLang], description: e.target.value } }
                }))}
              />
            </Box>

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

  // Category picker data for the info block dialog — grouped by the 9
  // thematic groups from migration 0083 (+ 'other' for 'custom'), filtered by
  // the search box. Cheap to recompute every render: 58 categories, no list
  // virtualization needed.
  const filteredCategories = categories.filter(c => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.key.includes(q);
  });
  const categoriesByGroup: Record<string, InfoCategory[]> = {};
  for (const c of filteredCategories) {
    (categoriesByGroup[c.group_key] ||= []).push(c);
  }
  const selectedCategory = categories.find(c => c.key === form.category_key) || null;

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
          <Tab label="Tienda" icon={<StoreIcon fontSize="small" />} iconPosition="start" sx={{ fontWeight: 600 }} />
        </Tabs>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, pb: 4 }}>
          {activeMainTab === 0 && renderSettingsTab()}
          {activeMainTab === 1 && renderGuideTab()}
          {activeMainTab === 2 && renderPoisTab()}
          {activeMainTab === 3 && renderWelcomeTab()}
          {activeMainTab === 4 && renderStoreTab()}
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
          {editingItem ? `Editar: ${editingItem.resolved_title || editingItem.category_name || editingItem.info_key}` : 'Nueva Información'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* ---- Category picker ---- */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ mb: 1 }}>Categoría</Typography>
              {selectedCategory && !categoryPickerOpen ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: selectedCategory.color, color: 'white', display: 'flex' }}>
                    <CategoryIcon name={selectedCategory.icon_name} color="white" size={20} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{selectedCategory.name}</Typography>
                    {selectedCategory.hint && <Typography variant="caption" color="text.secondary">{selectedCategory.hint}</Typography>}
                  </Box>
                  <Button size="small" onClick={() => setCategoryPickerOpen(true)}>Cambiar</Button>
                </Box>
              ) : (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <TextField
                      size="small" fullWidth placeholder="Buscar categoría (lavadora, wifi, jacuzzi…)"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                    />
                  </Box>
                  <Box sx={{ maxHeight: 280, overflowY: 'auto', p: 1 }}>
                    {categoriesLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
                    ) : Object.keys(categoriesByGroup).length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Sin resultados</Typography>
                    ) : (
                      Object.entries(categoriesByGroup).map(([group, cats]) => (
                        <Box key={group} sx={{ mb: 1 }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ pl: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {CATEGORY_GROUP_LABELS[group] || group}
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5, mt: 0.5 }}>
                            {cats.map(cat => (
                              <Box
                                key={cat.key}
                                onClick={() => handleSelectCategory(cat)}
                                sx={{
                                  display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5, cursor: 'pointer',
                                  bgcolor: form.category_key === cat.key ? 'action.selected' : 'transparent',
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                              >
                                <CategoryIcon name={cat.icon_name} color={cat.color} size={18} />
                                <Typography variant="body2" noWrap>{cat.name}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            {selectedCategory && (
              <FormControlLabel
                control={<Switch checked={form.use_custom_title} onChange={(e) => setForm(prev => ({ ...prev, use_custom_title: e.target.checked }))} />}
                label={`Usar un título personalizado en vez de "${selectedCategory.name}"`}
              />
            )}

            {/* Sin esto es fácil no encontrar los campos de recogida: son 1 de
                58 categorías y solo aparecen tras elegir justo "Código de
                Entrada", sin ningún otro indicio en el formulario. */}
            {selectedCategory && form.category_key !== 'door_code' && (
              <Typography variant="caption" color="text.secondary">
                ¿Buscas el mapa/foto de recogida de la llave? Eso vive en la categoría "Código de Entrada" (grupo Llegada y salida), no en "{selectedCategory.name}".
              </Typography>
            )}

            {/* Punto de recogida (migración 0084) — solo para door_code: es el
                único caso pedido hoy (recoger la llave en la agencia, en una
                cajetilla...). El campo es genérico en base de datos, así que
                basta con ampliar esta condición si otra categoría lo necesita. */}
            {form.category_key === 'door_code' && (
              <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>Punto de recogida (opcional)</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                  <TextField
                    label="Latitud" size="small" type="number" fullWidth
                    value={form.latitude ?? ''}
                    onChange={(e) => setForm(prev => ({ ...prev, latitude: e.target.value === '' ? null : Number(e.target.value) }))}
                  />
                  <TextField
                    label="Longitud" size="small" type="number" fullWidth
                    value={form.longitude ?? ''}
                    onChange={(e) => setForm(prev => ({ ...prev, longitude: e.target.value === '' ? null : Number(e.target.value) }))}
                  />
                </Box>
                <Button
                  size="small" variant="text"
                  disabled={apartment?.latitude == null || apartment?.longitude == null}
                  onClick={() => setForm(prev => ({ ...prev, latitude: apartment.latitude, longitude: apartment.longitude }))}
                >
                  Usar ubicación del apartamento
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Solo hace falta si se recoge en un sitio distinto al apartamento (agencia, cajetilla en otra dirección...). Si se deja vacío no se muestra el botón "Cómo llegar" en la app.
                </Typography>
              </Box>
            )}

            {selectedCategory && (
              <>
                <Divider />

                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                  Traducciones {form.use_custom_title ? '(título y contenido)' : '(solo contenido — el título lo pone la categoría)'}
                </Typography>

                {loadingTranslations ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
                ) : (
                  LANGUAGES.map(lang => (
                    <Box key={lang.code} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>{lang.label}</Typography>
                      {form.use_custom_title && (
                        <TextField
                          label="Título" fullWidth size="small"
                          value={form.translations[lang.code]?.title || ''}
                          onChange={(e) => setForm(prev => ({
                            ...prev, translations: { ...prev.translations, [lang.code]: { ...prev.translations[lang.code], title: e.target.value } }
                          }))}
                          sx={{ mb: 1.5 }}
                        />
                      )}
                      <TextField
                        label="Contenido" fullWidth multiline minRows={2} maxRows={6} size="small"
                        value={form.translations[lang.code]?.content || ''}
                        onChange={(e) => setForm(prev => ({
                          ...prev, translations: { ...prev.translations, [lang.code]: { ...prev.translations[lang.code], content: e.target.value } }
                        }))}
                        placeholder="Escribe aquí la información..."
                      />
                      {form.category_key === 'door_code' && (
                        <TextField
                          label="Dónde recogerlo" fullWidth multiline minRows={2} maxRows={6} size="small"
                          value={form.translations[lang.code]?.pickup_instructions || ''}
                          onChange={(e) => setForm(prev => ({
                            ...prev, translations: { ...prev.translations, [lang.code]: { ...prev.translations[lang.code], pickup_instructions: e.target.value } }
                          }))}
                          placeholder="Ej: recógelo en la caja fuerte junto a la puerta, o en la agencia..."
                          sx={{ mt: 1.5 }}
                        />
                      )}
                    </Box>
                  ))
                )}
              </>
            )}

            <Divider />

            <Box sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Fotos y Vídeos</Typography>
              {!editingItem ? (
                <Typography variant="body2" color="text.secondary">
                  Guarda el bloque para poder añadir fotos (igual que con las localizaciones).
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Sube fotos para ayudar al huésped (ej: foto del router, de los mandos de la TV).
                    {!form.media.length && ' Sin foto propia, se usa el icono de la categoría.'}
                  </Typography>

                  {form.media.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                      {form.media.map((m, index) => (
                        <Box key={m.id || index} sx={{ position: 'relative', width: 80, height: 80 }}>
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
                            onClick={() => handleRemoveMedia(m.id, index)}
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
                    {uploadingMedia ? 'Subiendo...' : 'Añadir Foto/Vídeo'}
                    <input type="file" hidden accept="image/*,video/*" onChange={handleFileUpload} />
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'background.default' }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !form.info_key || !form.category_key || loadingTranslations} sx={{ px: 4 }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Guardar y Actualizar Preview'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Translations Import Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadJsonIcon color="primary" />
          Importar traducciones (JSON)
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pega aquí el JSON con la forma que exporta el botón "Exportar textos" (una vez traducido
            con una IA externa, p.ej. Gemini). Los idiomas deben ser códigos de{' '}
            {LANGUAGES.map(l => l.code).join(', ')}. Un texto vacío no sobrescribe uno que ya exista.
          </Typography>
          <TextField
            fullWidth multiline minRows={10} maxRows={16}
            value={bulkJsonText}
            onChange={(e) => setBulkJsonText(e.target.value)}
            placeholder='{"wifi": {"ja": {"content": "..."}}, "rules": {"ja": {"content": "..."}}}'
            sx={{ fontFamily: 'monospace' }}
          />
          {bulkError && <Alert severity="error" sx={{ mt: 2 }}>{bulkError}</Alert>}
          {bulkResult && (
            <Alert severity={bulkResult.skipped.length ? 'warning' : 'success'} sx={{ mt: 2 }}>
              {bulkResult.imported_fields} campo(s) importado(s).
              {bulkResult.skipped.length > 0 && (
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {bulkResult.skipped.map((s, i) => <li key={i}>{s}</li>)}
                </Box>
              )}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'background.default' }}>
          <Button onClick={() => setBulkDialogOpen(false)} color="inherit">Cerrar</Button>
          <Button onClick={handleImportJson} variant="contained" disabled={bulkImporting || !bulkJsonText.trim()}>
            {bulkImporting ? <CircularProgress size={20} color="inherit" /> : 'Importar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
