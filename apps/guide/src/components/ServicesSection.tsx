import React, { useState } from 'react';
import { getTranslation, getCategoryLabel, getSubcategoryLabel } from '../lib/i18n';
import { submitStoreOrder } from '../lib/api';
import CTAButton from './CTAButton';

interface Experience {
  id: string;
  name: string;
  description: string;
  category: string;
  service_subcategory: string | null;
  action_type: string;
  action_data: string;
  prefilled_message: string;
  price_display: string;
  is_featured: boolean;
  cta_label: string;
  cover_image_url?: string;
  discount_display?: string;
  original_price_display?: string;
  badge_type?: 'discount' | 'courtesy' | 'exclusive' | 'new';
}

export interface StoreItem {
  id: string;
  owner_type: 'host' | 'platform';
  category: string;
  name: string;
  description: string;
  price_amount: number | null;
  price_currency: string;
  price_display: string;
  cover_image_url?: string | null;
  is_featured: boolean;
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
  onIntent: (type: 'experience' | 'product', id: string, action: string) => void;
}

// Badge helper: stamped rotation alternates 1/2/3 per index so a row of cards
// doesn't read as identical stickers.
const STAMP_CLASSES = ['stamped-badge-1', 'stamped-badge-2', 'stamped-badge-3'];

export default function ServicesSection({ experiences, storeItems, zoneName, apartmentId, sessionId, lang, onIntent }: ServicesSectionProps) {
  // Carrito ligero en memoria: no se persiste entre visitas a propósito — es un
  // pedido de la estancia actual, no un carrito de e-commerce.
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ status: 'success' | 'no_contact' | 'error' } | null>(null);

  const hostItems = storeItems.filter(i => i.owner_type === 'host');
  const platformItems = storeItems.filter(i => i.owner_type === 'platform');
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [itemId, qty]) => {
    const item = storeItems.find(i => i.id === itemId);
    return sum + (item?.price_amount ? item.price_amount * qty : 0);
  }, 0);

  const addToCart = (item: StoreItem) => {
    const wasEmpty = !cart[item.id];
    setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    if (wasEmpty) onIntent('product', item.id, 'add_to_order');
  };

  const removeFromCart = (itemId: string) => {
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

    const opened = result.orders.filter(o => o.whatsappUrl);
    for (const order of opened) {
      window.open(order.whatsappUrl!, '_blank');
    }
    setOrderResult({ status: opened.length > 0 ? 'success' : 'no_contact' });
    setCart({});
  };

  // "The Shop — Vertical Layout" (Stitch): tarjetas de producto apiladas a
  // todo el ancho (no una rejilla), imagen con arco, precio como stamped
  // badge, contenido centrado, CTA a todo el ancho.
  const renderStoreList = (items: StoreItem[]) => (
    <div className="flex flex-col gap-stack-lg max-w-2xl mx-auto w-full">
      {items.map((item, idx) => {
        const qty = cart[item.id] || 0;
        const bgImg = item.cover_image_url || 'https://placehold.co/600x600/e3e2df/434655?text=' + encodeURIComponent(item.name);
        const stamp = STAMP_CLASSES[idx % STAMP_CLASSES.length];
        return (
          <article key={item.id} className="bg-surface-container-lowest border border-on-background/10 flex flex-col relative w-full">
            <div className="relative w-full h-[280px] p-4">
              <img className="w-full h-full object-cover arch-mask" src={bgImg} alt={item.name} />
              {item.price_display && (
                <div className={`absolute top-6 right-6 bg-tertiary-fixed-dim text-on-tertiary-fixed font-mono-badge text-mono-badge px-3 py-2 border border-on-background/20 ${stamp}`}>
                  {item.price_display}
                </div>
              )}
              {item.owner_type === 'host' && (
                <div className="absolute top-6 left-6 bg-secondary text-on-secondary font-mono-badge text-mono-badge px-3 py-2 border border-on-background/20 stamped-badge-2 uppercase">
                  {getTranslation('host_badge', lang)}
                </div>
              )}
              {item.is_featured && (
                <div className="absolute bottom-6 left-6 bg-primary text-on-primary font-mono-badge text-mono-badge px-3 py-2 border border-on-background/20 stamped-badge-3 uppercase">
                  {getTranslation('recommended', lang)}
                </div>
              )}
            </div>
            <div className="p-6 flex flex-col flex-grow text-center items-center">
              <span className="font-label-caps text-label-caps text-primary mb-2 uppercase tracking-widest">{getCategoryLabel(item.category, lang)}</span>
              <h3 className="font-headline-md text-headline-md text-on-background mb-3">{item.name}</h3>
              {item.description && <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-md">{item.description}</p>}

              {qty === 0 ? (
                <button
                  onClick={() => addToCart(item)}
                  disabled={!item.in_stock}
                  className="w-full max-w-sm bg-primary text-on-primary font-label-caps text-label-caps uppercase py-4 flex justify-center items-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-40"
                >
                  {getTranslation('add_to_order', lang)}
                </button>
              ) : (
                <div className="flex items-center gap-4 border border-primary px-4 py-2 w-full max-w-sm justify-between">
                  <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-primary font-mono-badge text-lg">−</button>
                  <span className="font-mono-badge text-mono-badge text-on-background">{qty}</span>
                  <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center text-primary font-mono-badge text-lg">+</button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-stack-lg pb-24">
      <div>
        <h2 className="font-display-xl text-display-xl text-on-background uppercase tracking-tighter mb-2">
          {getTranslation('store_title', lang)}
        </h2>
      </div>

      {hostItems.length > 0 && (
        <section className="flex flex-col gap-stack-md">
          <h3 className="font-headline-md text-headline-md text-on-background border-b border-on-background/10 pb-2">{getTranslation('host_products_title', lang)}</h3>
          {renderStoreList(hostItems)}
        </section>
      )}

      {platformItems.length > 0 && (
        <section className="flex flex-col gap-stack-md">
          <h3 className="font-headline-md text-headline-md text-on-background border-b border-on-background/10 pb-2">{getTranslation('local_products_title', lang)}</h3>
          {renderStoreList(platformItems)}
        </section>
      )}

      {hostItems.length === 0 && platformItems.length === 0 && (
        <div className="text-center py-8 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl opacity-30">storefront</span>
          <p className="mt-2 font-body-md text-body-md">{getTranslation('no_store_items', lang)}</p>
        </div>
      )}

      {experiences.length > 0 && (
        <section className="flex flex-col gap-stack-md">
          <div className="border-b border-on-background/10 pb-2">
            <h3 className="font-headline-md text-headline-md text-on-background">{getTranslation('exclusive_promotions', lang)}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              {getTranslation('services_subtitle', lang).replace('{zone}', zoneName)}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-gutter gap-y-stack-lg">
            {experiences.map((exp, idx) => {
              const bgImg = exp.cover_image_url || 'https://placehold.co/600x400/e3e2df/434655?text=' + encodeURIComponent(exp.name);
              const hasCuratedFeatured = experiences.some(e => e.is_featured);
              const isFeatured = hasCuratedFeatured ? exp.is_featured : idx === 0;
              const stamp = STAMP_CLASSES[idx % STAMP_CLASSES.length];

              const badgeLabel = exp.discount_display
                || (exp.badge_type === 'courtesy' ? getTranslation('badge_courtesy', lang)
                  : exp.badge_type === 'exclusive' ? getTranslation('badge_exclusive', lang)
                  : exp.badge_type === 'new' ? getTranslation('badge_new', lang) : null);
              const badgeBg = exp.badge_type === 'discount' || exp.discount_display ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed'
                : exp.badge_type === 'courtesy' ? 'bg-secondary text-on-secondary'
                : exp.badge_type === 'exclusive' ? 'bg-primary text-on-primary'
                : 'bg-tertiary-fixed-dim text-on-tertiary-fixed';

              return (
                <article key={exp.id} className={`${isFeatured ? 'md:col-span-8' : 'md:col-span-4'} bg-surface-container-lowest border border-on-background/10 overflow-hidden flex flex-col ${isFeatured ? 'md:flex-row' : ''} group`}>
                  <div className={`relative overflow-hidden shrink-0 ${isFeatured ? 'h-64 md:h-auto md:w-1/2 p-2' : 'h-48 p-2'}`}>
                    <img className="w-full h-full object-cover arch-mask transition-transform duration-500 group-hover:scale-105" src={bgImg} alt={exp.name} />
                    {badgeLabel && (
                      <div className={`absolute top-5 left-5 px-3 py-1 font-mono-badge text-mono-badge uppercase border border-on-background/20 ${badgeBg} ${stamp}`}>
                        {badgeLabel}
                      </div>
                    )}
                  </div>
                  <div className={`p-6 flex flex-col justify-between ${isFeatured ? 'md:w-1/2' : 'flex-grow'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {exp.category && <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">{getCategoryLabel(exp.category, lang)}</span>}
                        {exp.service_subcategory && <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">· {getSubcategoryLabel(exp.service_subcategory, lang)}</span>}
                      </div>
                      <h3 className={`${isFeatured ? 'font-headline-md text-headline-md' : 'font-headline-md text-[20px]'} text-on-background mb-2`}>{exp.name}</h3>
                      <p className={`font-body-md text-body-md text-on-surface-variant mb-4 ${isFeatured ? '' : 'line-clamp-2'}`}>{exp.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto gap-4 border-t border-on-background/10 pt-4">
                      <div className="flex flex-col">
                        {exp.original_price_display && (
                          <span className="font-label-sm text-label-sm text-on-surface-variant line-through">{exp.original_price_display}</span>
                        )}
                        <span className={`${isFeatured ? 'font-body-lg text-body-lg' : 'font-body-md text-body-md'} font-bold text-primary`}>{exp.price_display}</span>
                      </div>
                      <div className={isFeatured ? 'w-auto' : 'flex-shrink-0'}>
                        <CTAButton experience={exp} lang={lang} onIntent={(action) => onIntent('experience', exp.id, action)} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {cartCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 px-4 flex justify-center">
          <div className="bg-on-primary-fixed text-crisp-white border border-on-background/10 px-5 py-4 flex items-center gap-4 max-w-md w-full">
            <div className="flex-1">
              <p className="font-label-caps text-label-caps uppercase">{getTranslation('your_order', lang)} · {cartCount}</p>
              {cartTotal > 0 && <p className="font-mono-badge text-mono-badge mt-1">{cartTotal.toFixed(2)} €</p>}
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="bg-primary text-on-primary px-4 py-3 font-label-caps text-label-caps uppercase whitespace-nowrap disabled:opacity-60 hover:bg-primary-container transition-colors"
            >
              {submitting ? getTranslation('order_sending', lang) : getTranslation('send_order_whatsapp', lang)}
            </button>
          </div>
        </div>
      )}

      {orderResult && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 px-4 flex justify-center">
          <div className={`border px-5 py-4 max-w-md w-full text-center font-body-md text-body-md ${
            orderResult.status === 'error' ? 'bg-error-container text-on-error-container border-on-error-container/30' : 'bg-surface-container-lowest text-on-background border-on-background/10'
          }`}>
            {orderResult.status === 'success' && getTranslation('order_sent_success', lang)}
            {orderResult.status === 'no_contact' && getTranslation('order_no_contact', lang)}
            {orderResult.status === 'error' && getTranslation('order_error', lang)}
          </div>
        </div>
      )}
    </div>
  );
}
