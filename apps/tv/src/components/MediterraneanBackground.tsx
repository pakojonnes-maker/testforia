/**
 * Escena mediterránea veraniega hecha 100% con CSS (sin imágenes externas):
 * cielo cálido al atardecer → mar turquesa → profundo, con sol, reflejo y
 * brillo del agua. Todo animado con transform/opacity para no cargar la GPU
 * de las TVs baratas.
 */
export function MediterraneanBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Cielo + mar */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg,' +
            '#fbe7c6 0%,' +   /* horizonte cálido */
            '#f6cfa0 12%,' +  /* melocotón */
            '#bfe3df 30%,' +  /* cielo foam */
            '#5bc4cc 48%,' +  /* mar claro */
            '#1f96ad 66%,' +  /* mar */
            '#0a5a72 84%,' +  /* mar hondo */
            '#06415c 100%)',  /* fondo */
        }}
      />

      {/* Sol */}
      <div
        className="absolute rounded-full"
        style={{
          width: '18vw', height: '18vw',
          left: '50%', top: '16%', transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, #fff4dd 0%, #ffd98a 42%, rgba(246,178,76,0) 72%)',
          animation: 'sun-pulse 6s ease-in-out infinite',
        }}
      />

      {/* Reflejo del sol sobre el agua */}
      <div
        className="absolute"
        style={{
          width: '10vw', height: '46vh',
          left: '50%', top: '46%', transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, rgba(255,240,200,0.55), rgba(255,240,200,0) 80%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Brillo/olas del mar */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '46%', bottom: 0,
          background:
            'repeating-linear-gradient(180deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0) 3px, rgba(255,255,255,0) 22px)',
          animation: 'shimmer 7s ease-in-out infinite',
        }}
      />

      {/* Neblina de horizonte */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '42%', height: '8vh',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0))',
          filter: 'blur(6px)',
        }}
      />

      {/* Viñeta suave para dar profundidad y foco al centro */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 42%, rgba(0,0,0,0) 55%, rgba(4,30,45,0.35) 100%)' }}
      />
    </div>
  )
}
