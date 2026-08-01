/** @type {import('tailwindcss').Config} */
// Modern Mediterranean Editorial (Stitch export, ago 2026) — reemplaza el tema
// "Mediterranean Horizon" (terracota cálido/Playfair) anterior. Ver DESIGN.md
// original en frontend-stich/modern_mediterranean_editorial/DESIGN.md.
//
// NOTA: esta app usa Tailwind v4 vía @tailwindcss/vite sin `@config`, así que
// el `@theme` de src/index.css es la fuente de verdad real en build. Este
// archivo se mantiene en paralelo (mismos valores) solo por documentación /
// compatibilidad con tooling que sí lea tailwind.config.js — si difieren, gana
// index.css.
//
// Los alias "amigables" (terracotta/deep-sea/olive/warm-sand/crisp-white/
// accent-gold) se mantienen a propósito — decenas de componentes ya los usan
// por nombre — pero ahora resuelven a la paleta nueva en vez de a la vieja:
//   terracotta  -> primary (Azul Cobalto #0038AE): acciones, CTAs, acentos
//   deep-sea    -> on-primary-fixed (#001550, "Mar Profundo"): titulares, footer
//   olive       -> secondary (#48607E, tono "Agua"): etiquetas/categorías
//   warm-sand   -> surface-container-low (#F4F4F0): fondos suaves, chips
//   crisp-white -> surface-container-lowest (#FFFFFF): tarjetas, paneles
//   accent-gold -> tertiary-fixed-dim (#F7BE29, "Sol"): precios, destacados
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "outline-variant": "#c4c5d7",
        "tertiary": "#594100",
        "surface-container-highest": "#e3e2df",
        "inverse-primary": "#b6c4ff",
        "on-error": "#ffffff",
        "secondary-container": "#c4dcff",
        "on-secondary-container": "#49617f",
        "on-secondary-fixed-variant": "#304865",
        "background": "#faf9f5",
        "secondary-fixed": "#d2e4ff",
        "secondary-fixed-dim": "#b0c8eb",
        "primary-fixed-dim": "#b6c4ff",
        "outline": "#747686",
        "inverse-on-surface": "#f2f1ed",
        "primary": "#0038ae",
        "error-container": "#ffdad6",
        "surface-dim": "#dbdad6",
        "on-background": "#1b1c1a",
        "surface": "#faf9f5",
        "surface-bright": "#faf9f5",
        "tertiary-fixed": "#ffdf9d",
        "surface-container-lowest": "#ffffff",
        "tertiary-fixed-dim": "#f7be29",
        "on-primary-fixed": "#001550",
        "on-secondary": "#ffffff",
        "on-primary-container": "#cbd4ff",
        "on-primary": "#ffffff",
        "on-tertiary-container": "#ffcf65",
        "primary-fixed": "#dce1ff",
        "surface-variant": "#e3e2df",
        "on-error-container": "#93000a",
        "error": "#ba1a1a",
        "tertiary-container": "#765800",
        "surface-tint": "#1e51da",
        "secondary": "#48607e",
        "inverse-surface": "#2f312e",
        "surface-container": "#efeeea",
        "on-tertiary-fixed": "#251a00",
        "on-secondary-fixed": "#001c37",
        "surface-container-high": "#e9e8e4",
        "on-surface": "#1b1c1a",
        "on-primary-fixed-variant": "#003ab2",
        "on-tertiary": "#ffffff",
        "on-surface-variant": "#434655",
        "on-tertiary-fixed-variant": "#5b4300",
        "primary-container": "#1a4fd8",
        "surface-container-low": "#f4f4f0",
        // Alias heredados de componentes existentes (ver mapeo arriba)
        "terracotta": "#0038ae",
        "deep-sea": "#001550",
        "olive": "#48607e",
        "warm-sand": "#f4f4f0",
        "crisp-white": "#ffffff",
        "accent-gold": "#f7be29"
      },
      borderRadius: {
        "none": "0px",
        "DEFAULT": "0px",
        "sm": "0px",
        "md": "0px",
        "lg": "0px",
        "xl": "0px",
        "2xl": "0px",
        "full": "9999px"
      },
      spacing: {
        "gutter": "16px",
        "stack-lg": "48px",
        "stack-sm": "8px",
        "margin-mobile": "20px",
        "stack-md": "24px",
        "margin-desktop": "64px",
        "container-max": "1280px",
        "base": "8px"
      },
      fontFamily: {
        "display-xl": ["Newsreader"],
        "display-lg": ["Newsreader"],
        "headline-md": ["Newsreader"],
        "body-md": ["Inter"],
        "body-lg": ["Inter"],
        "label-caps": ["Archivo Narrow"],
        "mono-badge": ["Space Mono"],
        "label-lg": ["Inter"],
        "label-md": ["Inter"],
        "label-sm": ["Inter"],
        "headline-lg": ["Newsreader"],
        "headline-lg-mobile": ["Newsreader"],
        "headline-sm": ["Newsreader"]
      },
      fontSize: {
        "headline-md": ["28px", { "lineHeight": "32px", "fontWeight": "500" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "label-caps": ["12px", { "lineHeight": "16px", "letterSpacing": "0.12em", "fontWeight": "600" }],
        "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
        "display-xl": ["48px", { "lineHeight": "52px", "letterSpacing": "-0.03em", "fontWeight": "600" }],
        "display-lg": ["36px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "500" }],
        "mono-badge": ["11px", { "lineHeight": "12px", "fontWeight": "700" }],
        "label-lg": ["16px", { "lineHeight": "1.3", "letterSpacing": "0.01em", "fontWeight": "600" }],
        "label-md": ["14px", { "lineHeight": "1.3", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "label-sm": ["12px", { "lineHeight": "1.3", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "headline-lg": ["32px", { "lineHeight": "1.15", "letterSpacing": "-0.01em", "fontWeight": "500" }],
        "headline-lg-mobile": ["26px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "500" }],
        "headline-sm": ["18px", { "lineHeight": "1.3", "fontWeight": "500" }]
      }
    }
  },
  plugins: [],
}
