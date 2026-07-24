// Iconos de línea, tamaño heredado (24px por defecto). Trazo grueso para verse a 3 m.
type P = { size?: number }
const S = (size = 24) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const })

export const HomeIcon = ({ size }: P) => (
  <svg {...S(size)}><path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
export const WifiIcon = ({ size }: P) => (
  <svg {...S(size)}><path d="M2 8.5C7.5 3.5 16.5 3.5 22 8.5M5 12c4-3.6 10-3.6 14 0M8 15.4c2.3-2 5.7-2 8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="19" r="1.4" fill="currentColor" /></svg>
)
export const GuideIcon = ({ size }: P) => (
  <svg {...S(size)}><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5zM20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)
export const MapIcon = ({ size }: P) => (
  <svg {...S(size)}><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4zM9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)
export const InfoIcon = ({ size }: P) => (
  <svg {...S(size)}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" /><path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
)
export const ArrowRightIcon = ({ size }: P) => (
  <svg {...S(size)}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
