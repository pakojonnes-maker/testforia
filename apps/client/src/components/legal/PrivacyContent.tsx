import React from 'react';
import { Box, Typography, Alert, Link } from '@mui/material';
import { LEGAL_IDENTITY, SUBPROCESSORS, hasPendingFields, formattedLastUpdated } from '../../legal/identity';

// Política de privacidad de la carta digital.
//
// ⚠️ Este texto describe lo que el código hace DE VERDAD. Si cambias el tracking
// (apps/client/src/providers/TrackingAndPushProvider.tsx o workerTracking.js),
// actualiza esto en el mismo commit: una política que promete menos de lo que el
// código hace es una infracción autónoma de los arts. 5.1.a, 12 y 13 RGPD, y es
// prueba documental en contra en un procedimiento de la AEPD.
//
// La versión anterior afirmaba "no usamos cookies persistentes" y "estadísticas
// anónimas" mientras el código escribía vt_visitor_id con TTL de 365 días y
// registraba eventos por plato ligados a ese id. Eso es lo que se corrige aquí.

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box component="section">
        <Typography variant="h6" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
            {title}
        </Typography>
        {/* `as any`: MUI v5 arrastra los tipos de React 18 y React 19 añadió
            bigint a ReactNode, así que Box rechaza un ReactNode legítimo. Mismo
            apaño que ya usaba la versión anterior de este archivo. */}
        <Box sx={{ color: '#aaa', lineHeight: 1.7, typography: 'body1' }}>{children as any}</Box>
    </Box>
);

const Table = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
    <Box sx={{ overflowX: 'auto', my: 2 }}>
        <Box
            component="table"
            sx={{
                width: '100%',
                minWidth: 520,
                borderCollapse: 'collapse',
                fontSize: '0.875rem',
                '& th, & td': {
                    border: '1px solid rgba(255,255,255,0.12)',
                    p: 1.25,
                    textAlign: 'left',
                    verticalAlign: 'top',
                },
                '& th': { color: '#fff', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.04)' },
            }}
        >
            <thead>
                <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
                ))}
            </tbody>
        </Box>
    </Box>
);

export const PrivacyContent = () => {
    const mail = (addr: string) => (
        <Link href={`mailto:${addr}`} sx={{ color: '#FFD700' }}>{addr}</Link>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {hasPendingFields() && (
                <Alert severity="error" variant="outlined">
                    <strong>Este documento no está listo para publicarse.</strong> Faltan la razón
                    social, el NIF y el domicilio del responsable, que son obligatorios (art. 10 LSSI
                    y art. 13.1.a RGPD). Complétalos en <code>apps/client/src/legal/identity.ts</code>.
                </Alert>
            )}

            <Typography variant="body2" sx={{ color: '#888' }}>
                Última actualización: {formattedLastUpdated()}
            </Typography>

            <Section title="1. Quién trata tus datos">
                Esta carta digital la presta <strong>{LEGAL_IDENTITY.companyName}</strong> (en
                adelante, «{LEGAL_IDENTITY.brand}»), NIF {LEGAL_IDENTITY.taxId}, con domicilio en{' '}
                {LEGAL_IDENTITY.address}. Puedes escribirnos a {mail(LEGAL_IDENTITY.privacyEmail)}.
                <Box component="p" sx={{ mt: 1.5 }}>
                    Hay <strong>dos responsables distintos</strong> según el dato, y es importante que
                    sepas cuál es cuál:
                </Box>
                <ul>
                    <li>
                        <strong>El restaurante</strong> cuya carta estás viendo es el responsable de
                        los datos que tú le facilitas: reservas, pedidos a domicilio, tarjeta de
                        fidelización y comunicaciones comerciales suyas. {LEGAL_IDENTITY.brand} actúa
                        ahí como <strong>encargado del tratamiento</strong> (art. 28 RGPD): tratamos
                        esos datos siguiendo sus instrucciones y no los usamos para fines propios.
                    </li>
                    <li>
                        <strong>{LEGAL_IDENTITY.brand}</strong> es responsable de la analítica de uso
                        de la plataforma y de su seguridad, porque somos nosotros quienes decidimos
                        qué se mide y cómo.
                    </li>
                </ul>
                Puedes dirigirte a cualquiera de los dos para ejercer tus derechos; si te
                equivocas de destinatario, lo redirigimos nosotros.
            </Section>

            <Section title="2. Qué datos tratamos y por qué">
                <Table
                    head={['Finalidad', 'Datos', 'Base jurídica', 'Conservación']}
                    rows={[
                        [
                            'Mostrarte la carta',
                            'Idioma elegido, preferencias de visualización y datos técnicos mínimos de la petición.',
                            <>Interés legítimo (art. 6.1.f): sin esto no hay servicio.</>,
                            'Mientras dura la visita.',
                        ],
                        [
                            'Analítica de uso',
                            <>
                                Identificador de visitante (UUID aleatorio), platos vistos, tiempo de
                                visionado, secciones, profundidad de scroll, favoritos, valoraciones
                                y sus comentarios, tipo de dispositivo, sistema operativo, navegador,
                                idioma, país y ciudad aproximados, origen de la visita (QR, campaña o
                                guía de alojamiento).
                            </>,
                            <><strong>Tu consentimiento</strong> (art. 6.1.a). Si no lo das, no se crea ninguna sesión ni se envía ningún evento.</>,
                            'Hasta 12 meses desde tu última visita.',
                        ],
                        [
                            'Reservas',
                            'Nombre, teléfono, correo electrónico, número de comensales, fecha y hora, y las peticiones especiales que escribas.',
                            <>Ejecución del contrato o medidas precontractuales (art. 6.1.b). <strong>No es consentimiento</strong>: sin estos datos no se puede gestionar la reserva.</>,
                            'El plazo que fije el restaurante; por defecto, 24 meses.',
                        ],
                        [
                            'Pedidos a domicilio y recogida',
                            'Nombre, teléfono, dirección de entrega y contenido del pedido.',
                            'Ejecución del contrato (art. 6.1.b) y obligaciones fiscales y contables (art. 6.1.c).',
                            'El pedido, mientras se tramita; los justificantes con efectos fiscales, los plazos legales aplicables.',
                        ],
                        [
                            'Notificaciones push',
                            'Identificador técnico de suscripción de tu navegador y tipo de dispositivo.',
                            <>Tu consentimiento (art. 6.1.a y art. 21 LSSI). Revocable en cualquier momento.</>,
                            'Hasta que te des de baja o la suscripción caduque.',
                        ],
                        [
                            'Tarjeta de fidelización',
                            'Identificador de visitante y sellos acumulados.',
                            'Ejecución del contrato del programa (art. 6.1.b).',
                            'Mientras participes en el programa.',
                        ],
                        [
                            'Seguridad y prevención del abuso',
                            'Dirección IP transformada en un código que rota cada 24 horas, y registros de eventos de seguridad.',
                            'Interés legítimo (art. 6.1.f).',
                            '12 meses.',
                        ],
                    ]}
                />
            </Section>

            <Section title="3. Qué guardamos en tu dispositivo">
                La ley exige tu permiso para guardar o leer información en tu dispositivo, y eso
                incluye el almacenamiento local del navegador, no solo las cookies (art. 22.2 LSSI
                y art. 5.3 de la Directiva 2002/58/CE). Esto es todo lo que usamos:
                <Table
                    head={['Nombre', 'Tipo', 'Para qué', 'Duración']}
                    rows={[
                        [
                            <code>vt_consent_analytics</code>,
                            'Almacenamiento local',
                            'Recordar si aceptaste o rechazaste la analítica. Necesaria: sin ella tendríamos que volver a preguntarte en cada visita.',
                            '12 meses',
                        ],
                        [
                            <code>vt_visitor_id</code>,
                            'Almacenamiento local',
                            'Identificador aleatorio para reconocer visitas repetidas y sostener tu tarjeta de fidelización. Requiere consentimiento.',
                            '12 meses',
                        ],
                        [
                            <code>vt_offline_events</code>,
                            'Almacenamiento local',
                            'Cola temporal de eventos que no se pudieron enviar (por ejemplo, si perdiste cobertura). Requiere consentimiento.',
                            'Hasta el siguiente envío correcto',
                        ],
                        [
                            <code>vt_guide_ref</code>,
                            'Cookie propia',
                            'La escribe la guía del alojamiento o la TV para saber que vienes de allí. Requiere consentimiento.',
                            '30 días',
                        ],
                        [
                            <code>vt_push_pending</code>,
                            'Almacenamiento local',
                            'Recordar que pediste activar notificaciones antes de instalar la app en iOS.',
                            'Hasta que se completa la activación',
                        ],
                    ]}
                />
                <strong>No usamos cookies de terceros, ni publicidad, ni redes sociales, ni
                creamos huellas digitales de tu dispositivo con fines publicitarios.</strong> Tampoco
                vendemos ni cedemos tus datos a terceros para que te hagan publicidad.
                <Box component="p" sx={{ mt: 1.5 }}>
                    Puedes cambiar de opinión cuando quieras desde{' '}
                    <strong>Configuración de Privacidad</strong>, en el menú de la aplicación. Al
                    revocar el permiso dejamos de enviar datos inmediatamente y pedimos al servidor
                    que desvincule de tu identificador las sesiones ya registradas.
                </Box>
            </Section>

            <Section title="4. Una aclaración honesta sobre el anonimato">
                Verás que llamamos «anónimos» a muy pocos datos, y es a propósito. El identificador
                de visitante es un número aleatorio que no contiene tu nombre ni tu correo, pero
                mientras dura permite reconocer que una misma persona ha vuelto. Eso, técnicamente,
                es un <strong>dato seudonimizado, no anónimo</strong>, y por eso lo tratamos con
                todas las garantías del RGPD en lugar de escudarnos en la palabra «anónimo».
                <Box component="p" sx={{ mt: 1.5 }}>
                    Sí es cierto que tu dirección IP nunca se almacena tal cual: se transforma
                    mediante un código que cambia cada 24 horas, de modo que no puede usarse para
                    reconstruir tu navegación entre días distintos.
                </Box>
            </Section>

            <Section title="5. Quién más ve tus datos">
                Para prestar el servicio nos apoyamos en los siguientes proveedores, que actúan como
                encargados nuestros y solo tratan los datos para lo que les encomendamos:
                <Table
                    head={['Proveedor', 'Para qué', 'Ubicación']}
                    rows={SUBPROCESSORS.map((s) => [s.name, s.purpose, s.location])}
                />
                Además, tus datos se comunican <strong>al restaurante</strong> cuya carta estás
                usando, que es quien gestiona tu reserva o tu pedido.
                <Box component="p" sx={{ mt: 1.5 }}>
                    <strong>Transferencias internacionales.</strong> Algunos de estos proveedores
                    son empresas estadounidenses y pueden tratar datos fuera del Espacio Económico
                    Europeo. Esas transferencias se amparan en las Cláusulas Contractuales Tipo
                    aprobadas por la Comisión Europea y, cuando el proveedor está certificado, en el
                    Marco de Privacidad de Datos UE-EE. UU. Puedes pedirnos copia de estas garantías
                    escribiendo a {mail(LEGAL_IDENTITY.privacyEmail)}.
                </Box>
            </Section>

            <Section title="6. Tus derechos">
                Puedes ejercer en cualquier momento los derechos de <strong>acceso, rectificación,
                supresión, oposición, limitación del tratamiento y portabilidad</strong>, así como
                retirar el consentimiento que hayas dado, sin que ello afecte a la licitud del
                tratamiento previo.
                <Box component="p" sx={{ mt: 1.5 }}>
                    Escribe a {mail(LEGAL_IDENTITY.privacyEmail)} indicando qué derecho quieres
                    ejercer. Te responderemos en el plazo máximo de un mes. No te pediremos una
                    copia del DNI de entrada: solo verificaremos tu identidad si hay una duda
                    razonable, como exige el RGPD.
                </Box>
                <Box component="p" sx={{ mt: 1.5 }}>
                    Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la{' '}
                    <Link href={LEGAL_IDENTITY.supervisoryAuthority.url} target="_blank" rel="noopener noreferrer" sx={{ color: '#FFD700' }}>
                        {LEGAL_IDENTITY.supervisoryAuthority.name}
                    </Link>.
                </Box>
            </Section>

            <Section title="7. Menores">
                Este servicio no está dirigido a menores de 14 años y no les pedimos datos a
                propósito. Si detectamos que hemos recogido datos de un menor de esa edad sin el
                consentimiento de quien ejerce su patria potestad o tutela, los eliminaremos.
            </Section>

            <Section title="8. Decisiones automatizadas">
                No tomamos decisiones automatizadas con efectos jurídicos sobre ti ni elaboramos
                perfiles que te afecten significativamente. La analítica se usa para que el
                restaurante entienda qué platos funcionan, no para clasificarte a ti.
            </Section>

            <Section title="9. Alérgenos y precios: quién responde de qué">
                La información de alérgenos, ingredientes y precios que ves en esta carta{' '}
                <strong>la introduce y actualiza el restaurante</strong>, que es el operador de
                empresa alimentaria responsable de su exactitud conforme al Reglamento (UE)
                1169/2011. {LEGAL_IDENTITY.brand} es el soporte técnico que la muestra.
                <Box component="p" sx={{ mt: 1.5 }}>
                    <strong>Si tienes una alergia o intolerancia, confírmalo siempre con el
                    personal antes de pedir.</strong> Los platos se elaboran en cocinas donde se
                    manipulan todos los alérgenos, por lo que no puede descartarse la presencia de
                    trazas. El restaurante debe poder facilitarte esta información también por una
                    vía no digital si la necesitas.
                </Box>
            </Section>

            <Section title="10. Cambios en esta política">
                Si cambiamos cómo tratamos tus datos, actualizaremos este documento y su fecha. Si
                el cambio es sustancial y afecta a un tratamiento basado en tu consentimiento, te lo
                volveremos a pedir.
            </Section>
        </Box>
    );
};
