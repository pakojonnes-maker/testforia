---
name: Mediterranean Horizon
colors:
  surface: '#fcf9f4'
  surface-dim: '#dcdad5'
  surface-bright: '#fcf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ee'
  surface-container: '#f0ede9'
  surface-container-high: '#ebe8e3'
  surface-container-highest: '#e5e2dd'
  on-surface: '#1c1c19'
  on-surface-variant: '#55433d'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f3f0eb'
  outline: '#88726b'
  outline-variant: '#dbc1b9'
  surface-tint: '#974728'
  primary: '#944426'
  on-primary: '#ffffff'
  primary-container: '#b35c3b'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb59b'
  secondary: '#455f87'
  on-secondary: '#ffffff'
  secondary-container: '#b5d0fd'
  on-secondary-container: '#3e5980'
  tertiary: '#50613b'
  on-tertiary: '#ffffff'
  tertiary-container: '#687a52'
  on-tertiary-container: '#f9ffea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#ffb59b'
  on-primary-fixed: '#380d00'
  on-primary-fixed-variant: '#793013'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#adc8f5'
  on-secondary-fixed: '#001c3b'
  on-secondary-fixed-variant: '#2d486d'
  tertiary-fixed: '#d5eab9'
  tertiary-fixed-dim: '#bacd9e'
  on-tertiary-fixed: '#111f02'
  on-tertiary-fixed-variant: '#3b4c28'
  background: '#fcf9f4'
  on-background: '#1c1c19'
  surface-variant: '#e5e2dd'
  terracotta: '#C96D4B'
  deep-sea: '#1E3A5F'
  olive: '#6B7D54'
  warm-sand: '#F1EBE0'
  crisp-white: '#FFFFFF'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1200px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

This design system evokes the serene, sun-drenched atmosphere of a Mediterranean coastal villa. The aesthetic is centered on "Warm Minimalism"—combining the precision of modern layout with the organic, tactile warmth of the Southern European landscape. It targets sophisticated travelers and explorers who value high-quality curation over information density.

The style utilizes generous white space (the "Crisp White") as a canvas for high-quality photography, accented by architectural shapes and subtle, ambient depth. The visual language is premium yet approachable, aiming to create an emotional response of relaxation, clarity, and discovery. Key influences include contemporary architectural editorial design and high-end hospitality branding.

## Colors

The palette is derived from natural coastal elements. **Terracotta** serves as the primary brand driver, used for key actions and highlights to provide warmth. **Deep Sea Blue** offers grounding contrast and authority, while **Olive Green** provides a natural, secondary accent for status or category distinction. 

The background is rarely pure white; instead, **Warm Sand** and **Crisp White** are layered to create a sense of architectural depth and physical substance. All colors are used with high saturation to feel vivid yet sophisticated. Neutral grays are replaced with tinted shades of sand to maintain the "warmth" of the interface.

## Typography

The typographic hierarchy relies on the elegant contrast between the literary, high-contrast **Playfair Display** and the functional, geometric **Montserrat**. 

Headlines should be treated with editorial care, using larger sizes and tighter line-heights to create a "display" feel. Body text uses Montserrat with slightly increased line-height to ensure maximum legibility against warm, off-white backgrounds. Labels and small metadata should utilize uppercase styling and increased letter spacing to provide a modern, organized structure to the otherwise organic serif headings.

## Layout & Spacing

The layout follows a fluid-to-fixed grid model. On desktop, content is contained within a 1200px max-width 12-column grid to maintain focus and premium "white space" on larger displays. Mobile layouts transition to a single-column flow with generous 20px side margins to avoid visual clutter.

A strict 8px base unit governs all spacing. However, the "Mediterranean" feel is achieved by opting for larger spacing increments (e.g., 48px or 64px) between major sections to mimic the open architecture of a villa. Elements should feel uncrowded; if in doubt, increase the padding.

## Elevation & Depth

Depth is conveyed through "Ambient Shadows" rather than hard edges. Surfaces use low-opacity, wide-blur shadows with a subtle warm tint (using the primary terracotta or sand hues in the shadow mix) to avoid a "clinical" gray look.

We use Tonal Layering to distinguish content:
- **Base Layer:** Warm Sand (#F1EBE0)
- **Content Cards:** Crisp White (#FFFFFF)
- **Elevation 1:** Soft shadow (0px 4px 20px rgba(201, 109, 75, 0.08))
- **Elevation 2:** Focused shadow (0px 12px 32px rgba(30, 58, 95, 0.12)) for interactive elements like modals or active cards.

Avoid heavy borders; use subtle shifts in background color or the softest possible shadows to define boundaries.

## Shapes

The design uses a "Rounded" (0.5rem base) shape language to reflect the arched doorways and organic masonry of Mediterranean architecture. 

- **Standard Elements:** 8px radius (buttons, small inputs).
- **Cards & Images:** 16px radius (rounded-lg) to create a soft, inviting frame for photography.
- **Special Accents:** Large-scale image containers may use 24px radius (rounded-xl) or even asymmetrical rounding (top-left and top-right only) to mimic structural archways.

## Components

### Buttons
Primary buttons use the **Terracotta** fill with white text, utilizing the "Rounded" shape. Secondary buttons use the **Deep Sea Blue** as a ghost-style outline or a text-only link with an icon. Interaction states (hover/active) should subtly deepen the saturation rather than darken the color.

### Cards
Cards are the primary vehicle for content. They must always feature a **Crisp White** background with a 16px corner radius and an "Elevation 1" shadow. High-quality imagery should take up at least 50% of the card area, often bleeding to the top edges.

### Input Fields
Fields should have a **Warm Sand** background with no border, becoming **Crisp White** with a thin **Deep Sea Blue** border on focus. This transition mimics light hitting a surface.

### Chips & Tags
Used for categories like "Coastal," "Historic," or "Dining." Use a soft tint of the **Olive Green** or **Deep Sea Blue** with 50% opacity and matching dark text. These should be pill-shaped (radius: 100px) to distinguish them from structural cards.

### Lists
List items should be separated by generous vertical padding (16px+) and very light sand-colored dividers. Icons used in lists should be thin-stroke (2px) and rendered in Deep Sea Blue.