import { useState } from 'react';
import { getTranslation } from '../lib/i18n';
import { parseWifi } from '../lib/wifi';
import { codeSize } from '../lib/text';
import { isRealImage } from './MediaPlaceholder';
import { ArchGlyph } from './GuideStates';
import EntryCodeModal from './EntryCodeModal';
import PhonesModal, { PhoneEntry } from './PhonesModal';
import GuideDetailModal, { type InfoItem } from './GuideDetailModal';

interface InfoSectionProps {
  infoItems: InfoItem[];
  phones?: PhoneEntry[];
  lang: string;
}

// Las teselas sin foto ruedan por estas cuatro caras (marca, arena, secundario, papel) con su numeral.
const TILE_FACES = ['brand', 'arena', 'sea', 'paper'] as const;

function GuideTile({ item, index, eyebrow, image, onOpen }: { item: InfoItem; index: number; eyebrow: string | null; image?: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const photo = isRealImage(image) && !failed;
  const label = (
    <span className="g-gtx">
      {eyebrow && <span className="g-gte">{eyebrow}</span>}
      <span className="g-gtt">{item.title}</span>
    </span>
  );
  if (photo) {
    return (
      <button type="button" className="g-gt" onClick={onOpen}>
        <img src={image} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        <span className="g-veil" />
        {label}
      </button>
    );
  }
  return (
    <button type="button" className={`g-gt ${TILE_FACES[index % TILE_FACES.length]}`} onClick={onOpen}>
      <span className="g-n" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      {label}
    </button>
  );
}

export default function InfoSection({ infoItems, phones = [], lang }: InfoSectionProps) {
  const [selectedItem, setSelectedItem] = useState<InfoItem | null>(null);
  const [showEntryCode, setShowEntryCode] = useState(false);
  const [showPhones, setShowPhones] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1800);
      })
      .catch(() => {});
  };
  const copyLabel = (key: string) => (copiedKey === key ? getTranslation('copied', lang) : getTranslation('copy_btn', lang));

  if (infoItems.length === 0 && phones.length === 0) {
    return (
      <div className="g-empty" style={{ margin: '44px 20px 0' }}>
        <ArchGlyph width={46} />
        <p>{getTranslation('no_info', lang)}</p>
      </div>
    );
  }

  const eyebrowFor = (item: InfoItem) => (item.category_name && item.category_name !== item.title ? item.category_name : null);
  const imageFor = (item: InfoItem) => item.media?.[0]?.url || item.category_image_url || undefined;

  const wifiItem = infoItems.find(item => item.key.toLowerCase() === 'wifi');
  const doorCodeItem = infoItems.find(item => item.key.toLowerCase() === 'door_code');
  const guideItems = infoItems.filter(item => item.key.toLowerCase() !== 'wifi' && item.key.toLowerCase() !== 'door_code');

  const wifi = wifiItem ? parseWifi(wifiItem.content) : null;
  const hasWifi = !!wifi && (wifi.rows.length > 0 || !!wifi.note);
  const hasCode = !!doorCodeItem?.content?.trim();
  const hasPhones = phones.length > 0;
  const codeHasDetail = !!(doorCodeItem?.pickup_instructions || (doorCodeItem?.latitude != null && doorCodeItem?.longitude != null) || doorCodeItem?.media?.[0]?.url);
  const phoneNames = Array.from(new Set(phones.map(p => p.name))).slice(0, 2).join(' · ');

  return (
    <>
      {(hasWifi || hasCode || hasPhones) && (
        <div className="g-bento">
          {hasWifi && wifi && (
            <div className="g-t g-wifi wide">
              <h2 className="g-tt">{getTranslation('wifi_title', lang)}</h2>
              {wifi.rows.map(row => (
                <div className="g-cred" key={row.label + row.value}>
                  <span className="g-k">{row.label}</span>
                  <b dir="ltr">{row.value}</b>
                </div>
              ))}
              {wifi.note && <p className="g-tnote">{wifi.note}</p>}
              <button type="button" className="g-pill inv" onClick={() => copyToClipboard(wifi.copyValue, 'wifi')}>
                {copyLabel('wifi')}
              </button>
            </div>
          )}

          {hasCode && doorCodeItem && (
            <div className={`g-t g-code${hasPhones ? '' : ' wide'}`}>
              {codeHasDetail && (
                <button type="button" className="g-t-open" aria-label={getTranslation('door_code_title', lang)} onClick={() => setShowEntryCode(true)} />
              )}
              <span className="g-k">{getTranslation('door_code_title', lang)}</span>
              <span className={`g-digits ${codeSize(doorCodeItem.content)}`} dir="ltr">{doorCodeItem.content.trim()}</span>
              <button type="button" className="g-pill inv-fill" onClick={() => copyToClipboard(doorCodeItem.content.trim(), 'door_code')}>
                {copyLabel('door_code')}
              </button>
            </div>
          )}

          {hasPhones && (
            <button type="button" className={`g-t g-phones${hasCode ? '' : ' wide'}`} onClick={() => setShowPhones(true)}>
              <h3 className="g-h3">{getTranslation('phones_title', lang)}</h3>
              <span className="g-meta">{phoneNames}</span>
            </button>
          )}
        </div>
      )}

      {guideItems.length > 0 && (
        <section className="g-sec">
          <h2 className="g-h2">{getTranslation('quick_guides', lang)}</h2>
          <div className="g-guides">
            {guideItems.map((item, i) => (
              <GuideTile key={item.id} item={item} index={i} eyebrow={eyebrowFor(item)} image={imageFor(item)} onOpen={() => setSelectedItem(item)} />
            ))}
          </div>
        </section>
      )}

      {showEntryCode && doorCodeItem && (
        <EntryCodeModal
          code={doorCodeItem.content.trim()}
          pickupInstructions={doorCodeItem.pickup_instructions}
          latitude={doorCodeItem.latitude}
          longitude={doorCodeItem.longitude}
          image={doorCodeItem.media?.[0]?.url}
          lang={lang}
          onClose={() => setShowEntryCode(false)}
        />
      )}
      {showPhones && <PhonesModal phones={phones} lang={lang} onClose={() => setShowPhones(false)} />}
      {selectedItem && (
        <GuideDetailModal
          item={selectedItem}
          image={imageFor(selectedItem)}
          eyebrow={eyebrowFor(selectedItem)}
          lang={lang}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
