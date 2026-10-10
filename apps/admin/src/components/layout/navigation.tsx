import type { ReactElement } from 'react';
import {
  Restaurant as RestaurantIcon,
  MenuBook as DishesIcon,
  Settings as SettingsIcon,
  BarChart as StatsIcon,
  Campaign as CampaignIcon,
  Web as WebIcon,
  Person as PersonIcon,
  QrCode as QrCodeIcon,
  EventAvailable,
  TwoWheeler,
  Apartment as ApartmentIcon,
  Dashboard as GuideDashboardIcon,
  Palette as PaletteIcon,
  LocalActivity as LocalActivityIcon,
  Storefront as StoreIcon,
  Insights as ConversionsIcon,
  Collections as CollectionsIcon,
  Loyalty as LoyaltyIcon,
  Tv as TvIcon,
} from '@mui/icons-material';

export interface NavItem {
  text: string;
  icon: ReactElement;
  path: string;
  /** Clave de restaurants.features que puede ocultar la entrada (null = siempre). */
  featureKey: string | null;
  /** Rótulo del grupo en la barra lateral; sin él la entrada va arriba, sin rótulo. */
  section?: string;
}

// Mismo esquema en los dos modos: una portada arriba y el resto agrupado.
export const restaurantNav: NavItem[] = [
  { text: 'Estadísticas', icon: <StatsIcon />, path: '/', featureKey: 'statistics' },
  { text: 'Platos', icon: <DishesIcon />, path: '/dishes', featureKey: 'menu', section: 'CARTA' },
  { text: 'Web', icon: <WebIcon />, path: '/admin/landing', featureKey: 'website', section: 'CARTA' },
  { text: 'Generador QR', icon: <QrCodeIcon />, path: '/qr-generator', featureKey: 'qr_generator', section: 'CARTA' },
  { text: 'Reservas', icon: <EventAvailable />, path: '/reservations', featureKey: 'reservations', section: 'CLIENTES' },
  { text: 'Delivery', icon: <TwoWheeler />, path: '/delivery', featureKey: 'delivery', section: 'CLIENTES' },
  { text: 'Marketing', icon: <CampaignIcon />, path: '/marketing', featureKey: 'marketing', section: 'CLIENTES' },
  { text: 'Lealtad', icon: <LoyaltyIcon />, path: '/loyalty', featureKey: 'loyalty', section: 'CLIENTES' },
  { text: 'Usuarios', icon: <PersonIcon />, path: '/users', featureKey: 'users', section: 'AJUSTES' },
  // Siempre visible para owners/admins
  { text: 'Configuración', icon: <SettingsIcon />, path: '/settings', featureKey: null, section: 'AJUSTES' },
];

export function agencyNav(isSuperadmin: boolean): NavItem[] {
  return [
    { text: 'Dashboard', icon: <GuideDashboardIcon />, path: '/guide', featureKey: null },
    { text: 'Apartamentos', icon: <ApartmentIcon />, path: '/guide/apartments', featureKey: null, section: 'GESTIÓN' },
    { text: 'Pantalla TV', icon: <TvIcon />, path: '/guide/tv', featureKey: null, section: 'GESTIÓN' },
    { text: 'QR para enmarcar', icon: <QrCodeIcon />, path: '/guide/qr', featureKey: null, section: 'GESTIÓN' },
    { text: 'Diseño', icon: <PaletteIcon />, path: '/guide/design', featureKey: null, section: 'GESTIÓN' },
    // Lugares y Experiencias se fusionaron en una sola pantalla (guide_pois es
    // una tabla única desde la migración 0059). El personal de agencia solo ve
    // experiencias activas, en lectura (sin comisiones, filtrado server-side),
    // de ahí el rótulo distinto.
    { text: isSuperadmin ? 'Lugares y experiencias' : 'Experiencias', icon: <LocalActivityIcon />, path: '/guide/catalog', featureKey: null, section: 'CATÁLOGO' },
    // No es superadmin-only: gestiona los TRES ámbitos de la tienda, y el de
    // agencia —un producto en todas las propiedades del property manager— es
    // justo el que tiene que poder tocar el personal de agencia. El catálogo
    // global sigue en solo lectura para ellos; eso lo decide el worker (can_edit).
    { text: 'Tienda (catálogo)', icon: <StoreIcon />, path: '/guide/store', featureKey: null, section: 'CATÁLOGO' },
    ...(isSuperadmin ? [
      { text: 'Imágenes de categorías', icon: <CollectionsIcon />, path: '/guide/categories', featureKey: null, section: 'CATÁLOGO' },
      { text: 'Restaurantes por zona', icon: <RestaurantIcon />, path: '/guide/restaurants', featureKey: null, section: 'CATÁLOGO' },
      { text: 'Conversión Restaurantes', icon: <ConversionsIcon />, path: '/guide/conversions', featureKey: null, section: 'CATÁLOGO' },
    ] : []),
  ];
}

/** `features` de un restaurante: viene como objeto o como JSON en texto. */
export function parseFeatures(features: unknown): Record<string, unknown> {
  if (!features) return {};
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof features === 'object' ? features as Record<string, unknown> : {};
}
