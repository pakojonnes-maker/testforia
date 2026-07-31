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

  const renderStoreGrid = (items: StoreItem[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {items.map(item => {
        const qty = cart[item.id] || 0;
        const bgImg = item.cover_image_url || 'https://placehold.co/400x300/e5e2dd/55433d?text=' + encodeURIComponent(item.name);
        return (
          <article key={item.id} className="bg-crisp-white rounded-xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] overflow-hidden flex flex-col">
            <div className="relative h-36 overflow-hidden">
              <img className="w-full h-full object-cover" src={bgImg} alt={item.name} />
              {item.owner_type === 'host' && (
                <div className="absolute top-3 left-3 bg-olive/90 text-crisp-white px-2.5 py-1 rounded-full text-label-sm font-label-sm">
                  {getTranslation('host_badge', lang)}
                </div>
              )}
              {item.is_featured && (
                <div className="absolute top-3 right-3 bg-terracotta/90 text-crisp-white px-2.5 py-1 rounded-full text-label-sm font-label-sm">
                  {getTranslation('recommended', lang)}
                </div>
              )}
            </div>
            <div className="p-4 flex flex-col flex-grow gap-2">
              <span className="text-label-sm font-label-sm text-olive uppercase tracking-wider">{getCategoryLabel(item.category, lang)}</span>
              <h4 className="font-headline-sm text-headline-sm text-deep-sea">{item.name}</h4>
              {item.description && <p className="text-body-md font-body-md text-on-surface-variant line-clamp-2">{item.description}</p>}
              <div className="mt-auto pt-2 flex items-center justify-between gap-3">
                <span className="font-body-lg font-bold text-terracotta">{item.price_display}</span>
                {qty === 0 ? (
                  <button
                    onClick={() => addToCart(item)}
                    disabled={!item.in_stock}
                    className="px-4 py-2 rounded-lg bg-deep-sea text-crisp-white font-label-md text-label-md disabled:opacity-40"
                  >
                    {getTranslation('add_to_order', lang)}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-warm-sand rounded-lg px-2 py-1">
                    <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 flex items-center justify-center text-deep-sea font-bold">−</button>
                    <span className="font-label-md text-label-md text-deep-sea min-w-[1.2rem] text-center">{qty}</span>
                    <button onClick={() => addToCart(item)} className="w-7 h-7 flex items-center justify-center text-deep-sea font-bold">+</button>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-10 pb-24">
      <div>
        <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg text-deep-sea mb-2">
          {getTranslation('store_title', lang)}
        </h2>
      </div>

      {hostItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-headline-md font-headline-md text-deep-sea">{getTranslation('host_products_title', lang)}</h3>
          {renderStoreGrid(hostItems)}
        </section>
      )}

      {platformItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-headline-md font-headline-md text-deep-sea">{getTranslation('local_products_title', lang)}</h3>
          {renderStoreGrid(platformItems)}
        </section>
      )}

      {hostItems.length === 0 && platformItems.length === 0 && (
        <div className="text-center py-8 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl opacity-30">storefront</span>
          <p className="mt-2 font-body-md text-body-md">{getTranslation('no_store_items', lang)}</p>
        </div>
      )}

      {experiences.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="text-headline-md font-headline-md text-deep-sea mb-2">{getTranslation('exclusive_promotions', lang)}</h3>
          <p className="text-body-md font-body-md text-on-surface-variant -mt-2 mb-2">
            {getTranslation('services_subtitle', lang).replace('{zone}', zoneName)}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            {experiences.map((exp, idx) => {
              const bgImg = exp.cover_image_url || 'https://placehold.co/600x400/e5e2dd/55433d?text=' + encodeURIComponent(exp.name);
              const hasCuratedFeatured = experiences.some(e => e.is_featured);
              const isFeatured = hasCuratedFeatured ? exp.is_featured : idx === 0;

              return (
                <article key={exp.id} className={`${isFeatured ? 'md:col-span-8' : 'md:col-span-4'} bg-crisp-white rounded-xl shadow-[0px_4px_20px_rgba(201,109,75,0.08)] overflow-hidden flex flex-col ${isFeatured ? 'md:flex-row' : ''} group transition-shadow hover:shadow-[0px_12px_32px_rgba(30,58,95,0.12)]`}>
                  <div className={`relative overflow-hidden ${isFeatured ? 'h-64 md:h-auto md:w-1/2' : 'h-48'}`}>
                    <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={bgImg} alt={exp.name} />
                    {(exp.discount_display || exp.badge_type) && (
                      <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-label-sm font-label-sm uppercase tracking-wider backdrop-blur-sm ${
                        exp.badge_type === 'discount' || exp.discount_display ? 'bg-terracotta/90 text-crisp-white' :
                        exp.badge_type === 'courtesy' ? 'bg-deep-sea/90 text-crisp-white' :
                        exp.badge_type === 'exclusive' ? 'bg-olive/90 text-crisp-white' :
                        'bg-accent-gold/90 text-crisp-white'
                      }`}>
                        {exp.discount_display || (exp.badge_type === 'courtesy' ? getTranslation('badge_courtesy', lang) : exp.badge_type === 'exclusive' ? getTranslation('badge_exclusive', lang) : getTranslation('badge_new', lang))}
                      </div>
                    )}
                  </div>
                  <div className={`p-6 flex flex-col justify-between ${isFeatured ? 'md:w-1/2' : 'flex-grow'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {exp.category && <span className="bg-deep-sea/10 text-deep-sea px-3 py-1 rounded-full text-label-sm font-label-sm">{getCategoryLabel(exp.category, lang)}</span>}
                        {exp.service_subcategory && <span className="bg-olive/10 text-olive px-3 py-1 rounded-full text-label-sm font-label-sm">{getSubcategoryLabel(exp.service_subcategory, lang)}</span>}
                      </div>
                      <h3 className={`${isFeatured ? 'text-headline-md' : 'text-headline-md text-[20px]'} font-headline-md text-deep-sea mb-2`}>{exp.name}</h3>
                      <p className={`text-body-md font-body-md text-on-surface-variant mb-4 ${isFeatured ? '' : 'line-clamp-2'}`}>{exp.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto gap-4">
                      <div className="flex flex-col">
                        {exp.original_price_display && (
                          <span className="font-label-sm text-label-sm text-on-surface-variant line-through">{exp.original_price_display}</span>
                        )}
                        <span className={`${isFeatured ? 'text-body-lg font-body-lg' : 'text-body-md'} font-bold text-terracotta`}>{exp.price_display}</span>
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
          <div className="bg-deep-sea text-crisp-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 max-w-md w-full">
            <div className="flex-1">
              <p className="font-label-md text-label-md">{getTranslation('your_order', lang)} · {cartCount}</p>
              {cartTotal > 0 && <p className="font-body-lg font-bold">{cartTotal.toFixed(2)} €</p>}
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="bg-terracotta text-crisp-white px-4 py-2 rounded-lg font-label-md text-label-md whitespace-nowrap disabled:opacity-60"
            >
              {submitting ? getTranslation('order_sending', lang) : getTranslation('send_order_whatsapp', lang)}
            </button>
          </div>
        </div>
      )}

      {orderResult && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 px-4 flex justify-center">
          <div className={`rounded-2xl shadow-xl px-5 py-4 max-w-md w-full text-center font-body-md text-body-md ${
            orderResult.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-crisp-white text-deep-sea'
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
