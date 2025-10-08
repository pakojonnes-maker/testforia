// packages/api/src/types.ts - Todas las interfaces de datos

// ======================================================================
// Interfaces base
// ======================================================================

export interface BaseEntity {
  id: string;
  created_at?: string;
  modified_at?: string;
}

export interface TranslatedField {
  [language: string]: string;
}

export interface Translation {
  entity_id: string;
  entity_type: string;
  language_code: string;
  field: string;
  value: string;
}

// ======================================================================
// Interfaces principales
// ======================================================================

export interface Account extends BaseEntity {
  name: string;
  email: string;
  plan_type: 'free' | 'starter' | 'professional' | 'enterprise';
  subscription_start?: string;
  subscription_end?: string;
  max_restaurants: number;
  max_dishes_per_restaurant: number;
  is_active: boolean;
}

export interface Restaurant extends BaseEntity {
  account_id: string;
  slug: string;
  name: string;
  logo_url?: string;
  cover_image_url?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  average_visit_duration?: number;
  average_menu_views?: number;
  is_active: boolean;
  theme_id?: string;
  theme?: Theme; // Añadido para conveniencia
}

export interface RestaurantDetails extends BaseEntity {
  restaurant_id: string;
  reservation_url?: string;
  reservation_phone?: string;
  google_maps_url?: string;
  google_maps_embed?: string;
  opening_hours?: string; // JSON string
  has_parking?: boolean;
  has_terrace?: boolean;
  has_wifi?: boolean;
  accepts_credit_cards?: boolean;
  accepts_cash?: boolean;
  cuisine_type?: string;
}

export interface RestaurantTranslation extends BaseEntity {
  restaurant_id: string;
  language_code: string;
  short_description?: string;
  long_description?: string;
  cuisine_type?: string;
  specialties?: string;
  chef_note?: string;
}

export interface Menu extends BaseEntity {
  restaurant_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  is_seasonal: boolean;
  start_date?: string;
  end_date?: string;
}

export interface Section extends BaseEntity {
  menu_id: string;
  restaurant_id: string;
  order_index: number;
  icon_url?: string;
  bg_color?: string;
  translations?: Record<string, Record<string, string>>;
    dishes?: Dish[]; // Añadir esta propiedad opcional
}

export interface Dish extends BaseEntity {
  restaurant_id: string;
  status: 'active' | 'out_of_stock' | 'seasonal' | 'hidden';
  price: number;
  discount_price?: number | null;
  discount_active: boolean;
  calories?: number;
  preparation_time?: number;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_new: boolean;
  is_featured: boolean;
  avg_rating?: number;
  rating_count?: number;
  view_count?: number;
  favorite_count?: number;
  translations?: Record<string, Record<string, string>>;
  allergens?: Array<Allergen>;
  media?: Array<DishMedia>;
  sections?: Array<{ id: string, order_index: number }>;
}

export interface DishMedia extends BaseEntity {
  id: string;
  dish_id: string;
  dish_name?: string;
  media_type: 'image' | 'video' | 'thumbnail';
  content_type: string;
  r2_key: string;
  role?: 'PRIMARY_VIDEO' | 'PRIMARY_IMAGE' | 'GALLERY_IMAGE'; // Nuevo campo
  is_primary: boolean;
  order_index?: number; // Nuevo campo
  url: string;
  thumbnail_url?: string;
  display_name?: string;
  width?: number;
  height?: number;
  duration?: number;
  file_size?: number;
  created_at?: string;
}

export interface Allergen extends BaseEntity {
  icon_url?: string;
  translations?: Record<string, string>;
}

export interface Language extends BaseEntity {
  code: string;
  name: string;
  native_name: string;
  flag_emoji?: string;
  is_active: boolean;
}

export interface RestaurantLanguage extends BaseEntity {
  restaurant_id: string;
  language_code: string;
  priority: number;
  completion_percentage: number;
  is_enabled: boolean;
}

export interface User extends BaseEntity {
  email?: string;
  display_name?: string;
  photo_url?: string;
  auth_provider: string;
  preferred_language?: string;
  last_login?: string;
}

export interface RestaurantStaff extends BaseEntity {
  restaurant_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'staff';
  is_active: boolean;
}

export interface UserFavorite extends BaseEntity {
  user_id: string;
  dish_id: string;
  restaurant_id: string;
}

export interface UserRating extends BaseEntity {
  user_id: string;
  dish_id: string;
  restaurant_id: string;
  rating: number;
  comment?: string;
}

export interface Session extends BaseEntity {
  user_id?: string;
  restaurant_id: string;
  device_type?: string;
  os_name?: string;
  browser?: string;
  country?: string;
  city?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
}

export interface Event extends BaseEntity {
  session_id: string;
  user_id?: string;
  restaurant_id: string;
  event_type: string;
  entity_id?: string;
  entity_type?: string;
  value?: string;
}

export interface DailyAnalytic extends BaseEntity {
  restaurant_id: string;
  date: string;
  total_views: number;
  unique_visitors: number;
  total_sessions: number;
  avg_session_duration: number;
  dish_views: number;
  favorites_added: number;
  ratings_submitted: number;
  shares: number;
}

export interface NotificationToken extends BaseEntity {
  user_id: string;
  token: string;
  device_type?: string;
  is_active: boolean;
  last_used?: string;
}

export interface Notification extends BaseEntity {
  restaurant_id: string;
  title: string;
  message: string;
  deep_link?: string;
  image_url?: string;
  scheduled_for?: string;
  sent_at?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  target_type: 'all' | 'favorites' | 'recent' | 'custom';
}

export interface NotificationTarget extends BaseEntity {
  notification_id: string;
  user_id: string;
  sent: boolean;
  opened: boolean;
  clicked: boolean;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
}

export interface Theme extends BaseEntity {
  name: string;
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  font_family?: string;
  is_premium: boolean;
}

export interface LandingTemplate extends BaseEntity {
  name: string;
  description?: string;
  thumbnail_url?: string;
  is_premium: boolean;
}

export interface BlockType extends BaseEntity {
  type_key: string;
  name: string;
  description?: string;
  icon_url?: string;
  allows_customization: boolean;
  allows_multiple: boolean;
  required: boolean;
}

export interface RestaurantBlock extends BaseEntity {
  restaurant_id: string;
  block_type_id: string;
  order_index: number;
  is_active: boolean;
  background_type: 'color' | 'image' | 'video' | 'gradient';
  background_value?: string;
  custom_styles?: string;
  animation_type?: string;
  padding_top?: string;
  padding_bottom?: string;
}

export interface BlockContent extends BaseEntity {
  block_id: string;
  language_code: string;
  title?: string;
  subtitle?: string;
  content?: string;
  button_text?: string;
  button_url?: string;
  media_urls?: string;
  extra_data?: string;
}

export interface LandingConfig extends BaseEntity {
  restaurant_id: string;
  template_id: string;
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  font_heading?: string;
  font_body?: string;
  show_menu_preview: boolean;
  show_reservation: boolean;
  show_social_links: boolean;
  seo_title?: string;
  seo_description?: string;
  custom_css?: string;
  custom_js?: string;
  is_active: boolean;
}

export interface LandingSEO extends BaseEntity {
  restaurant_id: string;
  language_code: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
}

export interface StatusLabel {
  status_code: string;
  language_code: string;
  label: string;
}

export interface DietaryLabel {
  feature_code: string;
  language_code: string;
  label: string;
  description?: string;
}

export interface UiTranslation {
  key_name: string;
  language_code: string;
  value: string;
  context?: string;
}

export interface PromotionLabel {
  promotion_type: string;
  language_code: string;
  label: string;
  description?: string;
}

export interface DishMessage {
  dish_id: string;
  message_type: string;
  language_code: string;
  message: string;
}

export interface ScheduleTranslation {
  day_code: string;
  language_code: string;
  day_name: string;
  closed_message?: string;
  special_hours_message?: string;
}

// ======================================================================
// Interfaces adicionales para Reels
// ======================================================================

export interface RestaurantReelsData {
  restaurant: Restaurant & { theme: Theme };
  sections: Section[];
  dishesBySection: { [key: number]: { dishes: Dish[] } };
  languages: Language[];
}

// ======================================================================
// Interfaces para respuestas de API
// ======================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface MediaResponse {
  success: boolean;
  media: DishMedia;
  message?: string;
}

export interface MediaListResponse {
  success: boolean;
  media: DishMedia[];
}

export interface MediaStatsResponse {
  success: boolean;
  total_files: number;
  image_count: number;
  video_count: number;
  storage_used: number; // En MB
  storage_limit: number; // En MB
}