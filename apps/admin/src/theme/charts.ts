// Ajustes comunes de Chart.js para el tema del panel: ejes y rejilla en los
// grises del papel, tooltip en "Mar Profundo" y la tipografía del panel.
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale,
  LineElement, PointElement, Tooltip,
} from 'chart.js';
import { DEEP_SEA } from './index';

// Registro único (antes lo hacía AnalyticsPage, y TopCitiesChart dependía de ello).
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = '"Inter", sans-serif';
ChartJS.defaults.color = '#434655';

export const chartTooltip = {
  backgroundColor: DEEP_SEA,
  titleColor: '#FFFFFF',
  bodyColor: 'rgba(255,255,255,0.85)',
  cornerRadius: 0,
  padding: 12,
  displayColors: true,
  boxWidth: 8,
  boxHeight: 8,
  usePointStyle: true,
  titleFont: { size: 13, weight: 'bold' as const },
  bodyFont: { size: 12 },
};

export const chartGrid = { color: 'rgba(8, 36, 63, 0.08)' };
export const chartTicks = { color: '#434655', font: { size: 11 } };

/** Color con transparencia: hex6 + alfa (0–1). */
export function withAlpha(hex: string, alpha: number): string {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}
