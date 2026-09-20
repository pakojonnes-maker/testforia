import { useEffect, useState } from 'react';
import { getTranslation, getCategoryLabel, getSubcategoryLabel } from '../lib/i18n';
import type { CtaActionType } from '../lib/types';
import { submitStoreOrder } from '../lib/api';
import { formatMoney } from '../lib/text';
import CTAButton from './CTAButton';
import PhotoFigure from './PhotoFigure';
import { LanguageSwitcher } from './Header';

interface Experience {
  id: string;
  name: string;
  description: string;
  category: string;
  service_subcategory: string | null;
  // Canal ya resuelto por el worker: si la experiencia tiene CTA secundario
  // relleno, esto es el secundario y el enlace de afiliado no llega siquiera.
  action_type: CtaActionType;
  action_data: string;
  prefilled_message: string;
  /** 'affiliate' = el enlace de este botón es retribuido. */
  cta_source?: 'affiliate' | 'direct';
  price_display: string;
  is_featured: boolean;
  is_promoted?: boolean;
  cta_label: string;
  cover_image_url?: string;
  discount_display?: string;
  original_price_display?: string;
  badge_type?: 'discount' | 'courtesy' | 'exclusive' | 'new';
}

export interface StoreItem {
  id: string;
  owner_type: 'host' | 'agency' | 'platform';
  category: string;
  name: string;
  description: string;
  price_amount: number | null;
  price_currency: string;
  price_display: string;
  cover_image_url?: string | null;
  is_featured: boolean;
  is_promoted?: boolean;
  in_stock: boolean;
}

interface ServicesSectionProps {
  experiences: Experience[];
  storeItems: StoreItem[];
  zoneName: string;
  apartmentId: string;
  apartmentName: string;
  sessionId: string | null;
  lang: string;
  onLanguageChange?: (lang: string) => void;
  onIntent: (type: 'experience' | 'product', id: string, action: string) => void;
}

// Tienda: los productos del anfitrión y los locales en una rejilla de dos columnas, con un pedido ligero que
// se envía por WhatsApp, y debajo las experiencias de la zona. El pedido vive en una tarjeta oscura fija sobre la
// barra inferior que se despliega en sus líneas.
export default function ServicesSection({ experiences, storeItems, zoneName, apartmentId, sessionId, lang, onLanguageChange, onIntent }: ServicesSectionProps) {
  // Carrito ligero en memoria: no se persiste entre visitas a propósito — es un
  // pedido de la estancia actual, no un carrito de e-commerce.
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ status: 'success' | 'no_contact' | 'error' } | null>(null);
  // La barra del carrito arranca colapsada (contador + total + botón de pedir) y
  // se despliega en un resumen con las líneas: el huésped tiene que poder ver
  // QUÉ va a pedir antes de saltar a WhatsApp, sin volver a recorrer la lista.
  const [orderOpen, setOrderOpen] = useState(false);
  // Un pedido puede repartirse entre varios vendedores (anfitrión y plataforma),
  // pero el navegador solo deja pasar el primer window.open de la tanda: el
  // resto se abre a petición explícita desde el aviso.
  const [pendingOrders, setPendingOrders] = useState<string[]>([]);

  // Dos grupos, no tres: al huésped le da igual si un producto es de su piso o
  // del catálogo de la agencia —en los dos casos se lo sirve el anfitrión—, y
  // lo que sí cambia es el catálogo de VisualTaste, que lo sirve la plataforma.
  // Por eso 'agency' cae del lado del anfitrión y el filtro pregunta por
  // 'platform', que es el único ámbito que no lo es.
  const hostItems = storeItems.filter(i => i.owner_type !== 'platform');
  const platformItems = storeItems.filter(i => i.owner_type === 'platform');
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = storeItems.find(i => i.id === itemId);
    return sum + (item?.price_amount ? item.price_amount * qty : 0);
  }, 0);
  // Todos los importes de un pedido llevan la moneda del primer producto con precio (en la práctica, euros).
  const currency = storeItems.find(i => i.price_amount && cart[i.id])?.price_currency || 'EUR';

  // El aviso del pedido se descarta solo, salvo que queden vendedores por abrir
  // (ahí el huésped tiene que poder pulsar el botón cuando le venga bien).
  useEffect(() => {
    if (!orderResult || pendingOrders.length > 0) return;
    const t = setTimeout(() => setOrderResult(null), 6000);
    return () => clearTimeout(t);
  }, [orderResult, pendingOrders.length]);

  const addToCart = (item: StoreItem) => {
    const wasEmpty = !cart[item.id];
    setOrderResult(null);
    setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    if (wasEmpty) onIntent('product', item.id, 'add_to_order');
  };

  const removeFromCart = (itemId: string) => {
    setOrderResult(null);
    setCart(prev => {
      const next = { ...prev };
      const qty = (next[itemId] || 0) - 1;
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  };

  const handleSubmitOrder = async () => {
    if (cartCount === 0 || submitting) return;
    setSubmitting(true);
    setOrderResult(null);
    const result = await submitStoreOrder({
      apartmentId,
      sessionId,
      items: Object.entries(cart).map(([itemId, quantity]) => ({ itemId, quantity })),
    });
    setSubmitting(false);

    if (!result.success || !result.orders) {
      setOrderResult({ status: 'error' });
      return;
    }

    const urls = result.orders.map(o => o.whatsappUrl).filter((u): u is string => !!u);
    // Solo el primero en caliente: abrir varios seguidos hace que el navegador
    // bloquee todos menos uno y el pedido se pierda sin que nadie se entere.
    if (urls.length > 0) window.open(urls[0], '_blank', 'noopener,noreferrer');
    setPendingOrders(urls.slice(1));
    setOrderResult({ status: urls.length > 0 ? 'success' : 'no_contact' });
    setOrderOpen(false);
    setCart({});
  };

  // Una tarjeta de producto: foto cuadrada (o la inicial), «Recomendado» sobre la foto, nombre, precio y el
  // botón «Añadir al pedido», que con unidades pedidas pasa a ser el contador − n +.
  const renderStoreList = (items: StoreItem[]) => (
    <div className="g-prods">
      {items.map(item => {
        const qty = cart[item.id] || 0;
        return (
          <article key={item.id} className="g-prod">
            <PhotoFigure className="g-ph" src={item.cover_image_url} alt="" name={item.name}>
              {item.is_featured && <span className="g-badge ov tag">{getTranslation('recommended', lang)}</span>}
            </PhotoFigure>
            <h3 className="g-h3">{item.name}</h3>
            {item.price_display && <p className="g-price"><bdi>{item.price_display}</bdi></p>}
            {item.description && <p className="g-meta g-clamp2">{item.description}</p>}
            {qty === 0 ? (
              <button
                type="button"
                onClick={() => addToCart(item)}
                disabled={!item.in_stock}
                className="g-pill line"
              >
                {getTranslation('add_to_order', lang)}
              </button>
            ) : (
              <div className="g-stepq">
                <button type="button" aria-label={getTranslation('remove_one', lang)} onClick={() => removeFromCart(item.id)}>−</button>
                <b aria-live="polite">{qty}</b>
                <button type="button" aria-label={getTranslation('add_one', lang)} onClick={() => addToCart(item)}>+</button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );

  const badgeFor = (exp: Experience): { label: string; className: string } | null => {
    const label = exp.discount_display
      || (exp.badge_type === 'courtesy' ? getTranslation('badge_courtesy', lang)
        : exp.badge_type === 'exclusive' ? getTranslation('badge_exclusive', lang)
        : exp.badge_type === 'new' ? getTranslation('badge_new', lang) : null);
    if (!label) return null;
    // Cortesía va con el secundario de la agencia (no cuesta nada); el resto —descuento, exclusivo, nuevo—, con su acento.
    return { label, className: exp.badge_type === 'courtesy' && !exp.discount_display ? 'g-badge book' : 'g-badge ov paid' };
  };

  const hasItems = hostItems.length > 0 || platformItems.length > 0;
  const overlayOpen = cartCount > 0 || !!orderResult;

  return (
    <>
      <div className="g-titlebar">
        <h1 className="g-h1">{getTranslation('store_title', lang)}</h1>
        <LanguageSwitcher lang={lang} onLanguageChange={onLanguageChange} />
      </div>
      <p className="g-p g-sub">{getTranslation('store_subtitle', lang)}</p>

      {hostItems.length > 0 && (
        <>
          <div className="g-sub2"><h2 className="g-h3">{getTranslation('host_products_title', lang)}</h2></div>
          {renderStoreList(hostItems)}
        </>
      )}

      {platformItems.length > 0 && (
        <>
          <div className="g-sub2"><h2 className="g-h3">{getTranslation('local_products_title', lang)}</h2></div>
          {renderStoreList(platformItems)}
        </>
      )}

      {!hasItems && (
        <div className="g-empty g-empty-page">
          <p>{getTranslation('no_store_items', lang)}</p>
        </div>
      )}

      {experiences.length > 0 && (
        <>
          <div className="g-sub2">
            <h2 className="g-h3">{getTranslation('exclusive_promotions', lang)}</h2>
            <p className="g-p">{getTranslation('services_subtitle', lang).replace('{zone}', zoneName)}</p>
            {/* El aviso de publicidad se movió a la TARJETA que lo necesita.
                Aquí daba por retribuidas TODAS las experiencias, y desde que
                una experiencia puede llevar el contacto directo del partner en
                vez del enlace de afiliado (migración 0091) eso ya no es cierto:
                avisar de más también desinforma. */}
          </div>
          <div className="g-exps">
            {experiences.map(exp => {
              const badge = badgeFor(exp);
              return (
                <article key={exp.id} className="g-exp">
                  <PhotoFigure className="g-ph" src={exp.cover_image_url} alt="" name={exp.name}>
                    {badge && <span className={badge.className}>{badge.label}</span>}
                  </PhotoFigure>
                  <div className="g-exp-in">
                    {(exp.category || exp.service_subcategory) && (
                      <span className="g-kd">
                        {exp.category && getCategoryLabel(exp.category, lang)}
                        {exp.category && exp.service_subcategory && ' · '}
                        {exp.service_subcategory && getSubcategoryLabel(exp.service_subcategory, lang)}
                      </span>
                    )}
                    <h3 className="g-h3">{exp.name}</h3>
                    {exp.description && <p className="g-p">{exp.description}</p>}
                    <div className="g-exp-row">
                      <div className="g-exp-price">
                        {exp.original_price_display && <s><bdi>{exp.original_price_display}</bdi></s>}
                        {exp.price_display && <b><bdi>{exp.price_display}</bdi></b>}
                      </div>
                      <CTAButton experience={exp} lang={lang} onIntent={(action) => onIntent('experience', exp.id, action)} />
                    </div>
                    {/* Sólo bajo el botón que de verdad lleva un enlace
                        retribuido (Directiva 2005/29/CE, anexo I.11). */}
                    {(exp.cta_source === 'affiliate' || exp.is_promoted) && (
                      <p className="g-disc">{getTranslation('affiliate_disclosure', lang)}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Hueco para que lo último de la página pueda subir por encima de la barra del pedido. */}
      {overlayOpen && <div className="g-cart-space" aria-hidden="true" />}

      {/* Barra de pedido. Fija sobre la barra inferior (encima, no debajo: --g-nav-h + un margen) y dentro de
          la columna de 480 px; el envoltorio no captura toques, solo la tarjeta. */}
      {cartCount > 0 && !orderResult && (
        <div className="g-cartwrap">
          <div className="g-cartc">
            {orderOpen && (
              <div className="lines">
                {Object.entries(cart).map(([itemId, qty]) => {
                  const item = storeItems.find(i => i.id === itemId);
                  if (!item) return null;
                  return (
                    <div key={itemId} className="g-cl">
                      <div>
                        <b>{item.name}</b>
                        {item.price_display && <span><bdi>{item.price_display}</bdi></span>}
                      </div>
                      <div className="g-qty">
                        <button type="button" aria-label={getTranslation('remove_one', lang)} onClick={() => removeFromCart(itemId)}>−</button>
                        <b>{qty}</b>
                        <button type="button" aria-label={getTranslation('add_one', lang)} onClick={() => addToCart(item)}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bar">
              <button type="button" className="g-cart-tog" onClick={() => setOrderOpen(v => !v)} aria-expanded={orderOpen}>
                <b>{getTranslation(orderOpen ? 'your_order' : 'view_order', lang)} · {cartCount}</b>
                {cartTotal > 0 && <span>{formatMoney(cartTotal, currency, lang)}</span>}
              </button>
              <button type="button" className="g-pill" onClick={handleSubmitOrder} disabled={submitting}>
                {submitting ? getTranslation('order_sending', lang) : getTranslation('send_order_whatsapp', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {orderResult && (
        <div className="g-cartwrap">
          <div className={`g-notice${orderResult.status === 'error' ? ' err' : ''}`} role={orderResult.status === 'error' ? 'alert' : 'status'}>
            {orderResult.status === 'success' && getTranslation('order_sent_success', lang)}
            {orderResult.status === 'no_contact' && getTranslation('order_no_contact', lang)}
            {orderResult.status === 'error' && getTranslation('order_error', lang)}
            {pendingOrders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const [next, ...rest] = pendingOrders;
                  window.open(next, '_blank', 'noopener,noreferrer');
                  setPendingOrders(rest);
                }}
                className="g-pill fill"
              >
                {getTranslation('send_order_whatsapp', lang)} ({pendingOrders.length})
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
