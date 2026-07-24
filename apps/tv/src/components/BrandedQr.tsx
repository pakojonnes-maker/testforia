import { useEffect, useRef } from 'react'
import QRCodeStyling from 'qr-code-styling'

// QR branded mediterráneo (misma librería que el admin). Reutilizado por la
// pantalla de WiFi y por las direcciones de los POIs en Alrededores.
export function BrandedQr({ data, size = 260 }: { data: string; size?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const qr = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    qr.current = new QRCodeStyling({
      width: size, height: size, type: 'svg', data,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: {
        type: 'rounded',
        gradient: { type: 'linear', rotation: 0.8, colorStops: [
          { offset: 0, color: '#34c2c9' }, { offset: 1, color: '#0a5a72' },
        ] },
      },
      cornersSquareOptions: { type: 'extra-rounded', color: '#06415c' },
      cornersDotOptions: { type: 'dot', color: '#e07a5f' },
      backgroundOptions: { color: '#ffffff' },
    })
    if (box.current) { box.current.innerHTML = ''; qr.current.append(box.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  useEffect(() => { qr.current?.update({ data }) }, [data])

  return <div ref={box} style={{ width: size, height: size }} />
}
