import { useEffect, useRef, useState } from 'react';
import type { CartaAllergen, CartaMedia } from './model';
import { allergenIcon, allergenName, initialOf, isVideo } from './model';

const HEART_PATH = 'M12 20.2s-7.6-4.6-7.6-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.6 2.8c0 5.6-7.6 10.2-7.6 10.2z';

export const HeartIcon = ({ fill = false }: { fill?: boolean }) => (
  <svg className={fill ? 'ic fill' : 'ic'} viewBox="0 0 24 24" aria-hidden="true">
    <path d={HEART_PATH} />
  </svg>
);

/** Alérgeno con el icono y el nombre que manda el servidor. Si el icono no carga, su inicial. */
export const AllergenChip = ({ a, warn = false, iconOnly = false }: { a: CartaAllergen; warn?: boolean; iconOnly?: boolean }) => {
  const [broken, setBroken] = useState(false);
  const name = allergenName(a);
  const icon = broken
    ? <span className="ini" aria-hidden="true">{initialOf(name)}</span>
    : <img src={allergenIcon(a)} alt="" loading="lazy" draggable={false} onError={() => setBroken(true)} />;
  if (iconOnly) {
    return <span className={warn ? 'warn' : ''} title={name}>{icon}<span className="vh">{name}</span></span>;
  }
  return <span className={warn ? 'ach warn' : 'ach'}>{icon}{name}</span>;
};

export const AllergenIcon = ({ a }: { a: CartaAllergen }) => {
  const [broken, setBroken] = useState(false);
  return broken
    ? <span className="ini" aria-hidden="true">{initialOf(allergenName(a))}</span>
    : <img src={allergenIcon(a)} alt="" loading="lazy" draggable={false} onError={() => setBroken(true)} />;
};

const portraitOf = (w?: number | null, h?: number | null): boolean | null => (w && h ? h / w >= 1.15 : null);

interface DishMediaProps {
  /** Todas las fotos y vídeos del plato: si una no carga, se prueba la siguiente. */
  list: CartaMedia[];
  /** Plato en pantalla: reproduce y anima. */
  playing: boolean;
  /** Plato vecino: precarga ligera. */
  near: boolean;
  secNo: string;
  noVideoLabel: string;
  onError?: (type: string, url?: string) => void;
}

/**
 * Foto o vídeo a pantalla completa. Lo vertical va a sangre; lo apaisado (casi todo lo que
 * suben hoy los restaurantes) se ve entero en el tercio alto, sobre un fondo desenfocado de
 * sí mismo, para que el plato no quede recortado ni tapado por el texto.
 */
export const DishMedia = ({ list, playing, near, secNo, noVideoLabel, onError }: DishMediaProps) => {
  const [pos, setPos] = useState(0);
  const media: CartaMedia | null = list[pos] || null;
  const [portrait, setPortrait] = useState<boolean | null>(() => portraitOf(media?.width, media?.height));
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const video = isVideo(media);

  useEffect(() => {
    setPortrait(portraitOf(media?.width, media?.height));
    setFailed(false);
  }, [media?.url, media?.width, media?.height]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.play().catch(() => { /* el navegador puede bloquear el autoplay: se queda en el primer fotograma */ });
    } else {
      v.pause();
      if (!near) v.currentTime = 0;
    }
  }, [playing, near, failed]);

  // Fondo de un vídeo apaisado: el fotograma en un lienzo diminuto, ampliado y desenfocado.
  useEffect(() => {
    if (!video || portrait !== false || !playing) return;
    const draw = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2) return;
      try { c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height); } catch { /* sin fotograma aún */ }
    };
    draw();
    const id = window.setInterval(draw, 600);
    return () => window.clearInterval(id);
  }, [video, portrait, playing]);

  if (!media || failed) {
    return (
      <div className="nomedia">
        <div className="arc"><span className="serif">{secNo}</span></div>
        <p>{noVideoLabel}</p>
      </div>
    );
  }

  const fail = (type: string) => {
    onError?.(type, media.url);
    if (pos + 1 < list.length) setPos(pos + 1);
    else setFailed(true);
  };
  const landscape = portrait === false;

  if (video) {
    const el = (
      <video
        ref={videoRef}
        className="media"
        src={media.url}
        muted
        loop
        playsInline
        preload={playing ? 'auto' : near ? 'metadata' : 'none'}
        onLoadedMetadata={(e) => setPortrait(portraitOf(e.currentTarget.videoWidth, e.currentTarget.videoHeight))}
        onError={() => fail('video_load_failed')}
      />
    );
    return (
      <div className="mwrap">
        {landscape ? (
          <>
            <canvas ref={canvasRef} className="backdrop" width={24} height={42} aria-hidden="true" />
            <div className="mfit">{el}</div>
          </>
        ) : el}
      </div>
    );
  }

  const img = (cls: string) => (
    <img
      className={cls}
      src={media.url}
      alt=""
      draggable={false}
      decoding="async"
      onLoad={(e) => setPortrait(portraitOf(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))}
      onError={() => fail('image_load_failed')}
    />
  );
  return (
    <div className="mwrap">
      {landscape ? (
        <>
          <img className="backdrop" src={media.url} alt="" aria-hidden="true" draggable={false} />
          <div className="mfit">{img(playing ? 'media kb' : 'media')}</div>
        </>
      ) : img(playing ? 'media kb' : 'media')}
    </div>
  );
};

function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/** Miniatura en arco: foto, primer fotograma del vídeo (solo cuando entra en pantalla) o la inicial. */
export const Thumb = ({ list, name, small = false }: { list: CartaMedia[] | undefined; name: string; small?: boolean }) => {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const usable = (list || []).filter((m) => m?.url);
  const [pos, setPos] = useState(0);
  const media = usable[pos];
  const next = () => setPos((x) => x + 1);
  let inner: React.ReactNode = <span className="serif">{initialOf(name)}</span>;
  if (media && seen) {
    inner = isVideo(media)
      ? <video key={media.url} src={`${media.url}#t=0.1`} preload="metadata" muted playsInline onError={next} />
      : <img key={media.url} src={media.url} alt="" loading="lazy" draggable={false} onError={next} />;
  }
  return <span ref={ref} className={small ? 'thumb sm' : 'thumb'}>{inner}</span>;
};

/** Arco grande de la ficha y de la casa. */
export const ArchMedia = ({ list, fallback, size = 'big' }: { list: CartaMedia[] | undefined; fallback: string; size?: 'big' | 'mid' }) => {
  const usable = (list || []).filter((m) => m?.url);
  const [pos, setPos] = useState(0);
  const media = usable[pos];
  const setFailed = () => setPos((x) => x + 1);
  if (!media) {
    return <div className={`arch ${size} sea`}><span className="serif">{fallback}</span></div>;
  }
  return (
    <div className={`arch ${size}`}>
      {isVideo(media)
        ? <video key={media.url} src={media.url} muted loop playsInline autoPlay preload="auto" onError={setFailed} />
        : <img key={media.url} src={media.url} alt="" draggable={false} onError={setFailed} />}
    </div>
  );
};
