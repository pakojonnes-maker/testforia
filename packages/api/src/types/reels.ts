// packages/api/src/types/reels.ts
export interface ReelTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
  modified_at: string;
}

export interface ReelTemplateConfig {
  id: string;
  template_id: string;
  config_key: string;
  config_value: string;
  value_type: 'string' | 'number' | 'boolean' | 'color' | 'json';
  is_customizable: boolean;
}

export interface RestaurantReelConfig {
  id: string;
  restaurant_id: string;
  template_id: string;
  config_overrides: Record<string, any> | null;
  custom_colors: ReelColors | null;
  custom_fonts: ReelFonts | null;
  created_at: string;
  modified_at: string;
}

export interface ReelColors {
  primary: string;
  secondary: string;
  accent?: string;
  text: string;
  background: string;
}

export interface ReelFonts {
  title?: string;
  body?: string;
  accent?: string;
}

export interface ReelFullConfig {
  restaurant_id: string;
  restaurant_name: string;
  slug: string;
  template: ReelTemplate;
  colors: ReelColors;
  fonts?: ReelFonts;
  config: Record<string, any>;
}

// Configuraciones específicas por template
export interface ClassicReelConfig {
  layout: 'classic';
  animations: 'fade' | 'slide' | 'none';
  ui_position: 'right' | 'left';
  show_progress: boolean;
  auto_hide_ui: boolean;
  auto_hide_delay: number;
  button_style: 'circular' | 'rounded';
  sections_position: 'bottom' | 'top';
  overlay_gradient: 'linear' | 'none';
  card_border_radius: number;
}

export interface PremiumReelConfig {
  layout: 'premium';
  animations: 'fade' | 'slide' | 'zoom';
  ui_position: 'right' | 'left' | 'bottom' | 'floating';
  show_progress: boolean;
  auto_hide_ui: boolean;
  auto_hide_delay: number;
  button_style: 'circular' | 'rounded';
  sections_position: 'bottom' | 'floating';
  overlay_gradient: 'linear' | 'radial';
  card_border_radius: number;
  glassmorphism: boolean;
  blur_intensity: number;
}

export interface MinimalReelConfig {
  layout: 'minimal';
  animations: 'none';
  ui_position: 'center';
  show_progress: boolean;
  auto_hide_ui: boolean;
  auto_hide_delay: number;
  button_style: 'text' | 'minimal';
  sections_position: 'top';
  overlay_gradient: 'none';
  card_border_radius: number;
}

export interface DynamicReelConfig {
  layout: 'dynamic';
  animations: 'zoom' | 'slide' | 'fade';
  ui_position: 'floating';
  show_progress: boolean;
  auto_hide_ui: boolean;
  auto_hide_delay: number;
  button_style: 'morphing' | 'rounded';
  sections_position: 'floating';
  overlay_gradient: 'animated' | 'radial';
  card_border_radius: number;
  glassmorphism: boolean;
  blur_intensity: number;
  parallax_effect: boolean;
  particle_effects: boolean;
}

export type AnyReelConfig = 
  | ClassicReelConfig 
  | PremiumReelConfig 
  | MinimalReelConfig 
  | DynamicReelConfig;
