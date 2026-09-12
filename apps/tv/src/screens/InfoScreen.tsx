import { Focusable } from '../lib/spatialNav'
import { CoverImage } from '../components/CoverImage'
import { NoPhoto } from '../components/NoPhoto'
import { isDoorCode } from '../lib/infoKeys'
import { getTvString } from '../lib/i18n'
import type { GuidebookData } from '../lib/api'

type InfoItem = GuidebookData['apartment']['info'][number]

/**
 * Información de la casa: rejilla de FOTOS, no de fichas de texto.
 *
 * Un alojamiento tiene diez o quince apartados (basura, aire, parking, normas…)
 * y en una fila horizontal el huésped no sabe cuántos hay ni encuentra el que
 * busca. En rejilla los ve todos y va directo con el mando. Cada tesela es sólo
 * foto + categoría — el texto completo vive en la ficha (InfoDetailScreen), no
 * aquí: apretado en la tesela era ilegible, y repetir el patrón de "portada +
 * detalle" que ya usan las recomendaciones (DetailScreen) es más consistente
 * que inventar un tercer tratamiento.
 *
 * Tesela = mismo recorte en arco que `apps/guide` (InfoSection.tsx), no el
 * rectángulo redondeado de antes: .arch-mask solo da un arco de verdad en un
 * contenedor retrato, así que la tesela pasó de una fila de alto fijo (210px,
 * apaisada) a aspect-[4/5] — más alta que ancha y "todo lo grande que se
 * pueda" dentro de 4 columnas. El texto sigue sobreimpreso abajo con velo,
 * como ya hacía esta pantalla — eso no lo toca el cambio de forma.
 */

function InfoCard({ item, autoFocus, onSelect }: { item: InfoItem; autoFocus?: boolean; onSelect: () => void }) {
  // Foto propia del apartado (subida por el anfitrión) o, si no hay, la foto
  // de stock de su categoría (migración 0083) — en ese orden, porque la propia
  // es más específica. Sólo cuando NINGUNA de las dos existe cae al icono +
  // color de siempre: la mayoría de categorías aún no tienen foto de stock al
  // lanzamiento, y la tesela no puede quedarse sin imagen.
  const photo = item.media?.[0]?.url || item.category_image_url || null

  return (
    <Focusable id={`info-${item.id}`} autoFocus={autoFocus} onSelect={onSelect} className="arch-mask">
      <div
        className="arch-mask relative aspect-[4/5] w-full overflow-hidden"
        style={{ background: 'var(--tv-surface)', border: '1px solid var(--tv-line)' }}
      >
        <CoverImage src={photo} fallback={<NoPhoto tint={item.color} />} />

        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(0deg, rgba(4,16,22,0.92) 0%, rgba(4,16,22,0.28) 55%, rgba(4,16,22,0) 80%)' }}
        />

        <h3 className="t-display clamp-2 tv-card absolute inset-x-5 bottom-4 font-bold leading-tight" style={{ color: '#fff' }}>
          {item.title}
        </h3>
      </div>
    </Focusable>
  )
}

export function InfoScreen({ data, lang, onOpen }: { data: GuidebookData; lang: string; onOpen: (item: InfoItem) => void }) {
  const items = data.apartment.info.filter(i => i.key.toLowerCase() !== 'wifi')
  const door = items.find(i => isDoorCode(i.key))
  const rest = items.filter(i => i !== door)

  return (
    <div className="screen-in flex h-full flex-col">
      <div className="shrink-0 pb-6">
        {/* Sin hoja debajo, como CollectionScreen: rejilla de fichas con
            foto. El título va sobreimpreso en la pared. */}
        <h2 className="t-display tv-overprint tv-hero font-bold" style={{ color: 'var(--tv-ink)' }}>
          {getTvString('quick_guides', lang)}
        </h2>
      </div>

      {/* focus-gutter/bleed: hueco para el anillo de foco, que se pinta fuera
          de la caja de la tarjeta y lo recortaba el scroll (ver index.css). El
          margen negativo devuelve la rejilla bajo el título en vez de dejarla
          entrada 20 px. */}
      <div className="col-scroll focus-gutter-x focus-gutter-y focus-bleed-x min-h-0 flex-1">
        <div className="grid grid-cols-4 gap-8">
          {door && (
            <Focusable id={`info-${door.id}`} autoFocus className="rounded-[1.25rem]">
              <div
                className="flex h-full flex-col justify-between p-6"
                style={{
                  borderRadius: '1.25rem',
                  // Terracota fija, no la marca: es la única tesela de esta
                  // pantalla que NO es una foto sino un DATO grande (el código),
                  // y necesita leerse distinta del resto a tres metros. Lo que
                  // cambia respecto de antes es que ya no compite con cuatro
                  // colores primarios al lado.
                  background: 'linear-gradient(150deg, var(--color-terracotta), var(--color-ink))',
                }}
              >
                <div className="t-label" style={{ color: 'rgba(255,255,255,0.85)' }}>{door.title}</div>
                <div
                  className="t-display text-5xl font-bold tabular-nums"
                  style={{ color: '#fff', letterSpacing: '0.12em' }}
                >
                  {door.content}
                </div>
              </div>
            </Focusable>
          )}

          {rest.map((item, i) => (
            <InfoCard key={item.id} item={item} autoFocus={!door && i === 0} onSelect={() => onOpen(item)} />
          ))}
        </div>
      </div>
    </div>
  )
}
