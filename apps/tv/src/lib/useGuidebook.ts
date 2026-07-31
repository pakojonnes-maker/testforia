import { useEffect, useState } from 'react'
import { fetchTvConfig, fetchGuideBySlug, setReferralCookie, type GuidebookData } from './api'
import { MOCK_GUIDE } from './mockGuide'

/**
 * Carga los datos del guidebook para la TV. Dos formas de identificarse,
 * comprobadas en este orden:
 *  1. Hash de la URL (p.ej. tv.visualtastes.com/#TEST42) — TV realmente
 *     emparejada. Va contra /guide/tv/config/:code, con tracking.
 *  2. Slug en el path (p.ej. tv.visualtastes.com/paloma-park-benalmadena) —
 *     modo preview/demo del guidebook, sin dispositivo emparejado. Va contra
 *     el mismo /guide/:slug que usa apps/guide. Sin pairingCode, así que
 *     lib/tracking.ts no emite eventos (no hay sesión de TV real que medir).
 * Si no hay ninguno de los dos, o el fetch falla, cae a datos mock para que
 * el prototipo siempre renderice (demos, desarrollo sin backend).
 */
export function useGuidebook(lang = 'es') {
  const [data, setData] = useState<GuidebookData | null>(null)
  const [usingMock, setUsingMock] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  // Identificador (código o slug) que se intentó resolver, aunque el fetch
  // fallara. Sirve para distinguir "demo intencional sin nada en la URL" de
  // "alguien puso un código/slug y el backend no respondió", que antes eran
  // visualmente indistinguibles.
  const [identifierAttempted, setIdentifierAttempted] = useState<string | null>(null)

  useEffect(() => {
    const code = window.location.hash.replace(/^#/, '').trim()
    const slug = window.location.pathname.replace(/^\/+|\/+$/g, '').trim()
    let cancelled = false

    if (code) {
      setPairingCode(code)
      setIdentifierAttempted(code)
      fetchTvConfig(code, lang)
        .then(res => {
          if (!cancelled) {
            setData(res)
            setUsingMock(false)
            if (res?.apartment?.id) setReferralCookie(res.apartment.id)
          }
        })
        .catch(() => { if (!cancelled) { setData(MOCK_GUIDE); setUsingMock(true) } })
      return () => { cancelled = true }
    }

    if (slug) {
      setIdentifierAttempted(slug)
      fetchGuideBySlug(slug, lang)
        .then(res => {
          if (!cancelled) {
            setData(res)
            setUsingMock(false)
            if (res?.apartment?.id) setReferralCookie(res.apartment.id)
          }
        })
        .catch(() => { if (!cancelled) { setData(MOCK_GUIDE); setUsingMock(true) } })
      return () => { cancelled = true }
    }

    setData(MOCK_GUIDE)
    setUsingMock(true)
    return undefined
    // `lang` es dependencia a propósito: el guidebook viene ya traducido del
    // backend, así que cambiar de idioma exige recargar los datos. Lo que ya NO
    // ocurre es que ese refetch cuente como una impresión nueva (el backend dejó
    // de registrarla en /config; la emite la app una vez por sesión de TV).
  }, [lang])

  return { data, usingMock, pairingCode, identifierAttempted }
}
