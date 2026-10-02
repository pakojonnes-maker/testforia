import { useMemo } from 'react';
import { buildCartaTheme, contrast } from '../../theme/cartaTheme';

interface Props {
    colors: { primary: string; secondary: string; accent: string; text: string; background: string };
}

const SERIF = '"Playfair Display Variable", "Playfair Display", Georgia, serif';
const SANS = '"Montserrat Variable", Montserrat, system-ui, sans-serif';

/**
 * Vista previa de la carta («Carta Mediterránea») con los colores YA corregidos, tal y como
 * los calcula la carta (copia de su theme.ts): lo que se ve aquí es lo que verá el cliente.
 */
export default function CartaPreview({ colors }: Props) {
    const t = useMemo(() => buildCartaTheme({
        primary_color: colors.primary,
        secondary_color: colors.secondary,
        accent_color: colors.accent,
        text_color: colors.text,
        background_color: colors.background,
    }), [colors]);

    const adjusted: string[] = [];
    if (t.fill.toUpperCase() !== colors.primary.slice(0, 7).toUpperCase()) adjusted.push('el color de los botones');
    if (t.mark.toUpperCase() !== colors.accent.slice(0, 7).toUpperCase()) adjusted.push('el acento');
    if (t.sea.toUpperCase() !== colors.secondary.slice(0, 7).toUpperCase()) adjusted.push('el secundario');

    const veil = `linear-gradient(to top, ${t.ink} 0%, ${t.ink}d9 45%, ${t.ink}00 100%)`;

    return (
        <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Vídeo del plato */}
                <div style={{ width: 190, height: 380, borderRadius: 22, overflow: 'hidden', position: 'relative', background: `linear-gradient(160deg, ${t.sea}, ${t.ink})`, color: t.paper, fontFamily: SANS, boxShadow: '0 10px 30px rgba(0,0,0,.25)' }}>
                    <div style={{ position: 'absolute', inset: 0, background: veil }} />
                    <div style={{ position: 'relative', padding: '12px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 15 }}>Restaurante</div>
                        <span style={{ fontSize: 9, fontWeight: 700, border: `1px solid ${t.paper}88`, borderRadius: 99, padding: '4px 8px' }}>Carta</span>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', gap: 10, padding: '10px 12px', fontSize: 9, fontWeight: 600 }}>
                        <span style={{ borderBottom: `2px solid ${t.mark}`, paddingBottom: 3 }}><i style={{ fontFamily: SERIF }}>01</i> Entrantes</span>
                        <span style={{ opacity: 0.7 }}><i style={{ fontFamily: SERIF }}>02</i> Principales</span>
                    </div>
                    <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${t.ink}55`, color: t.heart, fontSize: 15 }}>♥</span>
                        </div>
                        <span style={{ alignSelf: 'flex-start', fontSize: 8, fontWeight: 700, letterSpacing: '.06em', background: t.mark, color: t.onMark, borderRadius: 99, padding: '3px 7px' }}>DESTACADO</span>
                        <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 20, lineHeight: 1.05 }}>Gambas al ajillo</div>
                        <div style={{ fontSize: 9, opacity: 0.9 }}>Gamba blanca, ajo laminado y guindilla.</div>
                        <span style={{ alignSelf: 'flex-start', fontSize: 9, fontWeight: 700, background: t.mark, color: t.onMark, borderRadius: 8, padding: '3px 7px' }}>Lleva crustáceos · lo evitas</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 18 }}>16,00 €</span>
                            <span style={{ background: t.fill, color: t.onFill, borderRadius: 99, padding: '8px 14px', fontSize: 10, fontWeight: 700 }}>Añadir</span>
                        </div>
                    </div>
                </div>
                {/* Hoja de papel */}
                <div style={{ width: 190, height: 380, borderRadius: 22, overflow: 'hidden', background: t.paper, color: t.ink, fontFamily: SANS, padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.14em', color: t.brandText }}>CARTA</span>
                    <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 20 }}>Restaurante</div>
                    {['Gambas al ajillo', 'Tarta de almendra'].map((n, i) => (
                        <div key={n} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', gap: 8, alignItems: 'center', borderTop: `1px solid ${t.ink}22`, paddingTop: 8 }}>
                            <span style={{ width: 34, height: 42, borderRadius: '17px 17px 3px 3px', background: t.sea, color: t.seaMark, display: 'grid', placeItems: 'center', fontFamily: SERIF, fontStyle: 'italic' }}>{n[0]}</span>
                            <span style={{ fontFamily: SERIF, fontSize: 12, fontWeight: 600 }}>{n}</span>
                            <span style={{ fontFamily: SERIF, fontSize: 12, color: t.brandText }}>{i ? '6,00 €' : '16,00 €'}</span>
                        </div>
                    ))}
                    <div style={{ flex: 1 }} />
                    <span style={{ background: t.fill, color: t.onFill, borderRadius: 99, padding: '10px 0', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>Enseñar al camarero</span>
                </div>
            </div>
            <p style={{ fontSize: 12, color: '#4b5563', marginTop: 12, lineHeight: 1.5 }}>
                {adjusted.length
                    ? `La carta ha ajustado ${adjusted.join(', ')} para que se lea bien (botón ${contrast(t.fill, t.onFill).toFixed(1)}:1).`
                    : `Tus colores se usan tal cual (botón ${contrast(t.fill, t.onFill).toFixed(1)}:1).`}
            </p>
        </div>
    );
}
