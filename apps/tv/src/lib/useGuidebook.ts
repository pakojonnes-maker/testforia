import { useEffect, useState } from 'react'
import { fetchTvConfig, type GuidebookData } from './api'
import { MOCK_GUIDE } from './mockGuide'

/**
 * Carga los datos del guidebook para la TV a partir de su código de
 * emparejamiento (hash de la URL, p.ej. tv.visualtastes.com/#TEST42 — en
 * producción vendrá pre-cargado en la app instalada, no visible al huésped).
 * Si no hay código o el fetch falla, usa datos mock para que el prototipo
 * siempre renderice (demos, desarrollo sin backend).
 */
export function useGuidebook(lang = 'es') {
  const [data, setData] = useState<GuidebookData | null>(null)
  const [usingMock, setUsingMock] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)

  useEffect(() => {
    const code = window.location.hash.replace(/^#/, '').trim()
    let cancelled = false

    if (!code) {
      setData(MOCK_GUIDE)
      setUsingMock(true)
      return
    }

    setPairingCode(code)
    fetchTvConfig(code, lang)
      .then(res => { if (!cancelled) { setData(res); setUsingMock(false) } })
      .catch(() => { if (!cancelled) { setData(MOCK_GUIDE); setUsingMock(true) } })

    return () => { cancelled = true }
    // `lang` es dependencia a propósito: el guidebook viene ya traducido del
    // backend, así que cambiar de idioma exige recargar los datos. Lo que ya NO
    // ocurre es que ese refetch cuente como una impresión nueva (el backend dejó
    // de registrarla en /config; la emite la app una vez por sesión de TV).
  }, [lang])

  return { data, usingMock, pairingCode }
}
