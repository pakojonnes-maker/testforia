import { useEffect, useRef, useState } from 'react';
import { useCarta } from './context';
import { allergenName, dishName, hasHalf, initialOf, priceOf, yes } from './model';
import { AllergenChip, AllergenIcon, ArchMedia, HeartIcon, Thumb } from './parts';

const BackBar = ({ label, onClick, end }: { label: string; onClick: () => void; end?: React.ReactNode }) => (
  <div className="bar">
    <button className="back" onClick={onClick}>{label}</button>
    {end || <span />}
  </div>
);

/** Lleva el foco a la pantalla nueva: un lector de pantalla no se queda en el vídeo de debajo. */
function useFocusOnOpen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return ref;
}

// ---------------------------------------------------------------- ficha
export const Ficha = () => {
  const c = useCarta();
  const { t, money } = c;
  const d = c.current.dish;
  const half = hasHalf(d);
  const price = priceOf(d);
  const [portion, setPortion] = useState<'full' | 'half'>('full');
  const [qty, setQty] = useState(1);
  const name = dishName(d, t('dish_untitled'));
  const liked = c.isLiked(d.id);
  const avoided = c.avoidedIn(d);
  const unit = portion === 'half' && half ? (d.half_price as number) : price.now;
  const ref = useFocusOnOpen<HTMLDivElement>();

  const badges: string[] = [];
  if (yes(d.is_featured)) badges.push(t('carta_badge_featured'));
  if (yes(d.is_new)) badges.push(t('carta_badge_new'));
  if (yes(d.is_vegan)) badges.push(t('carta_badge_vegan'));
  else if (yes(d.is_vegetarian)) badges.push(t('carta_badge_vegetarian'));
  if (yes(d.is_gluten_free)) badges.push(t('carta_badge_gluten_free'));

  return (
    <div className="paper" ref={ref} tabIndex={-1} role="dialog" aria-label={name}>
      <BackBar label={t('carta_back_videos')} onClick={c.back} />
      <ArchMedia list={d.media} fallback={String(c.current.si + 1).padStart(2, '0')} />
      <div className="head">
        {badges.length > 0 && <div className="badges">{badges.map((b) => <span key={b} className="badge">{b}</span>)}</div>}
        <h1 className="serif">{name}</h1>
        <div className="prow">
          <bdi className="pr serif">{price.before != null && <s>{money(price.before)}</s>}{money(price.now)}</bdi>
          <button className={liked ? 'likep on' : 'likep'} aria-pressed={liked} aria-label={t('likes_label')} onClick={() => c.toggleLike(d)}>
            <HeartIcon /><span>{c.likeCount(d)}</span>
          </button>
        </div>
        {avoided.length > 0 && (
          <p className="warn paperw">
            <AllergenChip a={avoided[0]} iconOnly />
            <span>{t('carta_contains')} {avoided.map((a) => allergenName(a)).join(', ')} · {t('carta_avoid_warn')}</span>
          </p>
        )}
      </div>
      <div className="body">
        {d.description && <p>{d.description}</p>}
        {half && (
          <div>
            <div className="lbl">{t('carta_choose_portion')}</div>
            <div className="opts">
              <button className={portion === 'half' ? 'opt on' : 'opt'} aria-pressed={portion === 'half'} onClick={() => setPortion('half')}>
                <span className="l">{t('half_portion_label')}</span><bdi className="v serif">{money(d.half_price as number)}</bdi>
              </button>
              <button className={portion === 'full' ? 'opt on' : 'opt'} aria-pressed={portion === 'full'} onClick={() => setPortion('full')}>
                <span className="l">{t('carta_full_portion')}</span><bdi className="v serif">{money(price.now)}</bdi>
              </button>
            </div>
          </div>
        )}
        <div>
          <div className="lbl">{t('carta_quantity')}</div>
          <div className="stepper">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label={t('carta_minus')}>−</button>
            <b>{qty}</b>
            <button onClick={() => setQty(qty + 1)} aria-label={t('carta_plus')}>+</button>
          </div>
        </div>
        {d.ingredients && <div><div className="lbl">{t('ingredients')}</div><p>{d.ingredients}</p></div>}
        <div>
          <div className="lbl">{t('allergens')}</div>
          <div className="algs">
            {(d.allergens || []).length === 0
              ? <span className="ach solo">{t('carta_no_allergens')}</span>
              : (d.allergens || []).map((a) => <AllergenChip key={a.id} a={a} warn={avoided.some((x) => x.id === a.id)} />)}
          </div>
          <button className="back small" onClick={() => c.open('alergenos')}>{t('carta_see_allergens')}</button>
        </div>
      </div>
      <div className="dock abs">
        <button className="cta" onClick={() => { c.addDish(d, half ? portion : 'full', qty); c.back(); }}>
          <bdi>{t('button_add')} · {money(unit * qty)}</bdi>
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- carta en lista
export const CartaList = () => {
  const c = useCarta();
  const { t, money } = c;
  const ref = useFocusOnOpen<HTMLDivElement>();
  const top = [...c.items]
    .filter((it) => (it.dish.favorite_count || 0) > 0)
    .sort((a, b) => (b.dish.favorite_count || 0) - (a.dish.favorite_count || 0))
    .slice(0, 3);
  const showTop = top.length > 0 && (top[0].dish.favorite_count || 0) >= 3;
  const scrollTo = (id: string) => ref.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth' });
  const openDish = (index: number) => { c.jumpTo(index); c.back(); };

  return (
    <div className="paper" ref={ref} tabIndex={-1} role="dialog" aria-label={t('carta_menu')}>
      <BackBar label={t('carta_back_videos')} onClick={c.back} />
      <div className="chead">
        <span className="kick">{t('carta_menu')}</span>
        <h1 className="serif">{c.restaurant.name}</h1>
        <p>{t('carta_menu_count', { n: c.items.length })}</p>
      </div>
      {showTop && (
        <section className="top3">
          <div className="kick">{t('carta_top_liked')}</div>
          <p className="sub">{t('carta_top_liked_sub')}</p>
          {top.map((it, i) => {
            const name = dishName(it.dish, t('dish_untitled'));
            return (
              <button key={it.dish.id} className="trow" onClick={() => openDish(it.index)}>
                <span className="rk serif">{i + 1}</span>
                <Thumb list={it.dish.media} name={name} />
                <span className="n serif">{name}</span>
                <span className="lks"><HeartIcon fill />{c.likeCount(it.dish)}</span>
              </button>
            );
          })}
        </section>
      )}
      <nav className="ctabs">
        {c.sections.map((s, si) => (
          <button key={s.id} onClick={() => scrollTo(`c-${si}`)}>
            <span className="no">{String(si + 1).padStart(2, '0')}</span>{s.name || ''}
          </button>
        ))}
      </nav>
      {c.sections.map((s, si) => (
        <section key={s.id} className="csec" id={`c-${si}`}>
          <h2 className="serif"><span className="no">{String(si + 1).padStart(2, '0')}</span>{s.name || ''}</h2>
          {c.items.filter((it) => it.si === si).map((it) => {
            const d = it.dish;
            const name = dishName(d, t('dish_untitled'));
            const avoided = c.avoidedIn(d);
            const count = c.likeCount(d);
            return (
              <button key={d.id} className="crow" onClick={() => openDish(it.index)}>
                <Thumb list={d.media} name={name} />
                <span>
                  <span className="n serif">{name}</span>
                  {d.description && <span className="s">{d.description}</span>}
                  {(d.allergens || []).length > 0 && (
                    <span className="icons">
                      {(d.allergens || []).map((a) => <AllergenChip key={a.id} a={a} iconOnly warn={avoided.some((x) => x.id === a.id)} />)}
                    </span>
                  )}
                  {avoided.length > 0 && (
                    <span className="tgw">{t('carta_contains')} {avoided.map((a) => allergenName(a)).join(', ')}</span>
                  )}
                </span>
                <bdi className="p serif">
                  {money(priceOf(d).now)}
                  {count > 0 && <small><span className="lks"><HeartIcon fill />{count}</span></small>}
                </bdi>
              </button>
            );
          })}
        </section>
      ))}
      <div className="dock"><button className="inkbtn" onClick={c.back}>{t('carta_back_videos')}</button></div>
    </div>
  );
};

// ---------------------------------------------------------------- tu selección
export const Seleccion = () => {
  const c = useCarta();
  const { t, money } = c;
  const ref = useFocusOnOpen<HTMLElement>();
  const pedir = c.selTab === 'pedir';

  return (
    <>
      <div className="dim" onClick={c.back} />
      <section className="sheet" ref={ref} tabIndex={-1} role="dialog" aria-label={t('carta_selection')}>
        <div className="grab" />
        <h2 className="serif">{t('carta_selection')}</h2>
        <div className="segs" role="tablist">
          <button className={pedir ? 'seg on' : 'seg'} role="tab" aria-selected={pedir} onClick={() => c.setSelTab('pedir')}>
            {t('carta_to_order')} · {c.cartCount}
          </button>
          <button className={!pedir ? 'seg on' : 'seg'} role="tab" aria-selected={!pedir} onClick={() => c.setSelTab('gusta')}>
            <HeartIcon fill />{t('likes_label')} · {c.likedDishes.length}
          </button>
        </div>

        {pedir ? (
          <div className="tabbody">
            {c.cart.length === 0 && <p className="sub">{t('carta_empty')}</p>}
            {c.cart.length > 0 && (
              <>
                <div>
                  {c.cart.map((it) => (
                    <div key={`${it.dishId}-${it.portion}`} className="line">
                      <div>
                        <div className="n serif">{it.name.replace(/\s*\(½\)$/, '')}</div>
                        <div className="k">{it.portion === 'half' ? t('half_portion_label') : t('carta_full_portion')}</div>
                      </div>
                      <bdi className="lp serif">{money(it.price * it.quantity)}</bdi>
                      <div className="stepper">
                        <button onClick={() => c.setQty(it, it.quantity - 1)} aria-label={t('carta_minus')}>−</button>
                        <b>{it.quantity}</b>
                        <button onClick={() => c.setQty(it, it.quantity + 1)} aria-label={t('carta_plus')}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sum"><span>{t('carta_total')}</span><bdi className="serif">{money(c.cartTotal)}</bdi></div>
                <p className="note">{t('carta_staff_note')}</p>
                <button className="cta" onClick={() => c.open('camarero')}>{t('carta_show_waiter')}</button>
              </>
            )}
            <button className="textbtn" onClick={c.back}>{t('carta_keep_browsing')}</button>
          </div>
        ) : (
          <div className="tabbody">
            {c.likedDishes.length === 0 && <p className="sub">{t('carta_likes_empty')}</p>}
            {c.likedDishes.length > 0 && (
              <div>
                {c.likedDishes.map((it) => {
                  const name = dishName(it.dish, t('dish_untitled'));
                  return (
                    <div key={it.dish.id} className="frow">
                      <Thumb list={it.dish.media} name={name} small />
                      <span><span className="n serif">{name}</span><bdi className="k">{money(priceOf(it.dish).now)}</bdi></span>
                      <span className="fact">
                        <button className="mini" onClick={() => c.addDish(it.dish, 'full', 1)}>{t('button_add')}</button>
                        <button className="heart sm on" aria-pressed="true" aria-label={t('likes_label')} onClick={() => c.toggleLike(it.dish)}>
                          <HeartIcon />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="sub">{t('carta_likes_note')}</p>
            {c.likedDishes.length > 0 && (
              <button
                className="cta"
                onClick={() => {
                  for (const it of c.likedDishes) {
                    if (!c.cart.some((l) => l.dishId === it.dish.id)) c.addDish(it.dish, 'full', 1);
                  }
                  c.setSelTab('pedir');
                }}
              >
                {t('carta_add_all')}
              </button>
            )}
            {c.push.supported && !c.push.enabled && (
              <div className="ask">
                <p>{t('carta_notif_ask')}</p>
                <button className="mini ink" onClick={() => c.open('avisos')}>{t('carta_notif_on')}</button>
              </div>
            )}
            <button className="textbtn" onClick={c.back}>{t('carta_keep_browsing')}</button>
          </div>
        )}
      </section>
    </>
  );
};

// ---------------------------------------------------------------- para el camarero
/** Siempre en español: es lo que lee el personal. El nombre en el idioma del cliente, debajo. */
const esMoney = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export const Camarero = () => {
  const c = useCarta();
  const es = c.esT;
  const ref = useFocusOnOpen<HTMLDivElement>();
  return (
    <div className="paper" ref={ref} tabIndex={-1} role="dialog" aria-label={c.t('carta_for_waiter')}>
      <BackBar label={c.t('carta_back')} onClick={c.back} />
      <div className="waiter" dir="ltr" lang="es">
        <span className="kick">{es('carta_for_waiter')}</span>
        <h1 className="serif">{c.restaurant.name}</h1>
        {c.cart.map((it) => {
          const guest = it.name.replace(/\s*\(½\)$/, '');
          const esName = c.esName(it.dishId, guest);
          return (
            <div key={`${it.dishId}-${it.portion}`} className="wl">
              <span className="q serif">{it.quantity}</span>
              <div>
                <div className="n serif">{esName}</div>
                <div className="k">{it.portion === 'half' ? es('half_portion_label') : es('carta_full_portion')} · {esMoney(it.price * it.quantity)}</div>
                {c.lang !== 'es' && guest !== esName && <div className="g"><bdi>{guest}</bdi></div>}
              </div>
            </div>
          );
        })}
        <div className="wsum"><span>{es('carta_total')}</span><b className="serif">{esMoney(c.cartTotal)}</b></div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- la casa
export const Casa = () => {
  const c = useCarta();
  const { t } = c;
  const ref = useFocusOnOpen<HTMLDivElement>();
  // Portada del restaurante; si no hay o no carga, las fotos de los platos en orden.
  const media = [
    ...[c.restaurant.cover_image_url, c.restaurant.logo_url].filter((u): u is string => !!u).map((url) => ({ url, type: 'image' })),
    ...c.items.flatMap((it) => (it.dish.media || []).filter((m) => m.type !== 'video')),
  ].slice(0, 8);
  const langName = c.languages.find((l) => l.code === c.lang)?.native_name || c.lang.toUpperCase();

  return (
    <div className="paper" ref={ref} tabIndex={-1} role="dialog" aria-label={c.restaurant.name}>
      <BackBar label={t('carta_back_videos')} onClick={c.back} />
      <div className="casa-h">
        <ArchMedia list={media} fallback={initialOf(c.restaurant.name)} size="mid" />
        <h1 className="serif">{c.restaurant.name}</h1>
      </div>
      <div className="idx">
        {c.casaActions.map((a, i) => {
          const inner = (
            <>
              <span className="no serif">{String(i + 1).padStart(2, '0')}</span>
              <span><span className="tt serif">{a.title}</span>{a.sub && <span className="sb">{a.sub}</span>}</span>
            </>
          );
          return a.href
            ? <a key={a.key} className="irow" href={a.href} target="_blank" rel="noopener noreferrer">{inner}</a>
            : <button key={a.key} className="irow" onClick={a.onClick}>{inner}</button>;
        })}
      </div>
      <div className="foot">
        <button onClick={() => c.open('idioma')}>{t('carta_language')} · {langName}</button>
        <a href={c.privacyHref}>{t('carta_privacy')}</a>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- idioma
export const Idioma = () => {
  const c = useCarta();
  const ref = useFocusOnOpen<HTMLDivElement>();
  return (
    <div className="paper" ref={ref} tabIndex={-1} role="dialog" aria-label={c.t('carta_language')}>
      <BackBar label={c.t('carta_back')} onClick={c.back} />
      <h1 className="ltitle serif">{c.t('carta_language')}</h1>
      <div className="llist">
        {c.languages.map((l) => (
          <button
            key={l.code}
            className={l.code === c.lang ? 'lrow on' : 'lrow'}
            aria-current={l.code === c.lang}
            onClick={() => { c.setLang(l.code); c.back(); }}
          >
            <span dir={l.code === 'ar' ? 'rtl' : 'ltr'} lang={l.code}>{l.native_name || l.name || l.code}</span>
            <small>{l.code === c.lang ? c.t('carta_current') : l.code.toUpperCase()}</small>
          </button>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- alérgenos
export const Alergenos = ({ fromDish }: { fromDish: boolean }) => {
  const c = useCarta();
  const { t } = c;
  const ref = useFocusOnOpen<HTMLDivElement>();
  const d = c.current.dish;
  const avoided = c.avoidedIn(d);
  return (
    <div className="paper" ref={ref} tabIndex={-1} role="dialog" aria-label={t('carta_avoid_title')}>
      <BackBar label={t('carta_back')} onClick={c.back} />
      <div className="ahead">
        <h1 className="serif">{t('carta_avoid_title')}</h1>
        <p>{t('carta_avoid_sub')}</p>
      </div>
      {fromDish && (
        <div className="indish">
          <div className="lbl">{t('carta_this_dish')} · {dishName(d, t('dish_untitled'))}</div>
          <div className="algs">
            {(d.allergens || []).length === 0
              ? <span className="ach solo">{t('carta_no_allergens')}</span>
              : (d.allergens || []).map((a) => <AllergenChip key={a.id} a={a} warn={avoided.some((x) => x.id === a.id)} />)}
          </div>
        </div>
      )}
      <div className="agrid">
        {c.menuAllergens.length === 0 && <p className="note">{t('carta_no_menu_allergens')}</p>}
        {c.menuAllergens.length > 0 && <div className="lbl">{t('carta_menu_allergens')}</div>}
        <div className="ag">
          {c.menuAllergens.map((a) => {
            const on = c.avoid.includes(a.id);
            return (
              <button key={a.id} className={on ? 'agt on' : 'agt'} aria-pressed={on} onClick={() => c.toggleAvoid(a.id)}>
                <AllergenIcon a={a} />
                <span className="nm">{allergenName(a)}</span>
                <span className="st">{on ? t('carta_avoid_on') : ''}</span>
              </button>
            );
          })}
        </div>
        {c.menuAllergens.length > 0 && <p className="note">{t('carta_ask_waiter')}</p>}
      </div>
      <div className="dock abs"><button className="inkbtn" onClick={c.back}>{t('carta_done')}</button></div>
    </div>
  );
};

// ---------------------------------------------------------------- avisos
export const Avisos = () => {
  const c = useCarta();
  const { t } = c;
  const ref = useFocusOnOpen<HTMLDivElement>();
  const items = [1, 2, 3] as const;
  return (
    <div className="paper" ref={ref} tabIndex={-1} role="dialog" aria-label={t('carta_notif_title')}>
      <BackBar label={t('carta_back')} onClick={c.back} />
      <div className="ahead">
        <span className="kick">{t('carta_notif_title')} · {c.restaurant.name}</span>
        <h1 className="serif">{t('carta_notif_lead')}</h1>
      </div>
      <div className="idx">
        {items.map((n) => (
          <div key={n} className="irow">
            <span className="no serif">{String(n).padStart(2, '0')}</span>
            <span>
              <span className="tt serif">{t(`carta_notif_${n}`)}</span>
              <span className="sb">{t(`carta_notif_${n}_sub`)}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="nact">
        {c.push.enabled ? (
          <>
            <p className="onstate"><span className="dot" />{t('carta_notif_active')}</p>
            <button className="textbtn" onClick={c.push.disable}>{t('carta_notif_off')}</button>
          </>
        ) : (
          <button className="cta" onClick={c.push.enable}>{t('carta_notif_on')}</button>
        )}
        <p className="sub">{t('carta_notif_note')}</p>
        {c.push.ios && <p className="sub">{t('carta_notif_ios')}</p>}
      </div>
    </div>
  );
};
