import React from 'react';
import { Box, Typography, Alert, Link } from '@mui/material';
import { LEGAL_IDENTITY, hasPendingFields, formattedLastUpdated } from '../../legal/identity';

// Aviso legal — art. 10 de la Ley 34/2002 (LSSI-CE).
//
// Es obligatorio para todo prestador de servicios de la sociedad de la información
// y hasta ahora no existía en ninguna de las apps. Los datos identificativos salen
// de legal/identity.ts para no tenerlos repartidos por el código.

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box component="section">
        <Typography variant="h6" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
            {title}
        </Typography>
        {/* `as any` por el choque de tipos React 19 / MUI v5 — ver PrivacyContent.tsx */}
        <Box sx={{ color: '#aaa', lineHeight: 1.7, typography: 'body1' }}>{children as any}</Box>
    </Box>
);

export const LegalNoticeContent = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {hasPendingFields() && (
            <Alert severity="error" variant="outlined">
                <strong>Este documento no está listo para publicarse.</strong> El art. 10 LSSI exige
                denominación social, NIF y domicilio. Complétalos en{' '}
                <code>apps/client/src/legal/identity.ts</code>.
            </Alert>
        )}

        <Typography variant="body2" sx={{ color: '#888' }}>
            Última actualización: {formattedLastUpdated()}
        </Typography>

        <Section title="1. Datos identificativos del prestador">
            En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la
            información y de comercio electrónico:
            <ul>
                <li><strong>Titular:</strong> {LEGAL_IDENTITY.companyName}</li>
                <li><strong>NIF:</strong> {LEGAL_IDENTITY.taxId}</li>
                <li><strong>Domicilio:</strong> {LEGAL_IDENTITY.address}</li>
                <li>
                    <strong>Correo electrónico:</strong>{' '}
                    <Link href={`mailto:${LEGAL_IDENTITY.contactEmail}`} sx={{ color: '#FFD700' }}>
                        {LEGAL_IDENTITY.contactEmail}
                    </Link>
                </li>
                <li><strong>Nombre comercial:</strong> {LEGAL_IDENTITY.brand}</li>
                {LEGAL_IDENTITY.registryData && (
                    <li><strong>Datos registrales:</strong> {LEGAL_IDENTITY.registryData}</li>
                )}
            </ul>
        </Section>

        <Section title="2. Qué es este servicio">
            {LEGAL_IDENTITY.brand} es una plataforma que permite a bares y restaurantes publicar su
            carta en formato digital y, cuando el establecimiento lo activa, gestionar reservas y
            pedidos. <strong>El contenido de cada carta —platos, fotografías, ingredientes,
            alérgenos y precios— lo introduce y mantiene el propio establecimiento</strong>, que es
            su único responsable. {LEGAL_IDENTITY.brand} no elabora, sirve ni vende alimentos.
        </Section>

        <Section title="3. Precios">
            Los precios mostrados los fija el establecimiento y deben entenderse como{' '}
            <strong>precio final con impuestos incluidos</strong>, conforme al Real Decreto
            3423/2000. Cualquier suplemento aplicable (terraza, cubierto, servicio o gastos de
            envío) debe aparecer indicado antes de confirmar el pedido. Si detectas una
            discrepancia entre lo mostrado aquí y lo cobrado en el establecimiento, prevalece lo
            que el establecimiento te informe en el momento y te agradeceremos que nos lo comuniques.
        </Section>

        <Section title="4. Pedidos a domicilio y recogida">
            Cuando el establecimiento tiene activado el módulo de pedidos, el{' '}
            <strong>contrato de compraventa se celebra entre tú y el establecimiento</strong>, no
            con {LEGAL_IDENTITY.brand}, que actúa únicamente como soporte técnico. El
            establecimiento es responsable de la preparación, la entrega, la facturación y la
            atención de reclamaciones.
            <Box component="p" sx={{ mt: 1.5 }}>
                Conforme al artículo 103 del texto refundido de la Ley General para la Defensa de
                los Consumidores y Usuarios, <strong>no existe derecho de desistimiento</strong> en
                el suministro de alimentos preparados para consumo inmediato ni de bienes que
                puedan deteriorarse con rapidez.
            </Box>
        </Section>

        <Section title="5. Propiedad intelectual">
            El software, el diseño y la marca {LEGAL_IDENTITY.brand} son titularidad de{' '}
            {LEGAL_IDENTITY.companyName}. Las fotografías, vídeos, textos y logotipos de cada
            establecimiento pertenecen a su titular, que nos concede una licencia para mostrarlos
            dentro del servicio. Queda prohibida su reproducción sin autorización.
        </Section>

        <Section title="6. Responsabilidad">
            Trabajamos para que el servicio esté disponible de forma continua, pero no podemos
            garantizar que no se produzcan interrupciones por mantenimiento, fallos de red o causas
            ajenas. No respondemos de la exactitud del contenido que publica cada establecimiento
            ni del contenido de los sitios de terceros a los que se enlace.
        </Section>

        {/* Ojo: NO enlazar aquí la plataforma ODR europea. Dejó de operar el 20 de
            julio de 2025, cuando el Reglamento (UE) 2024/3228 derogó el 524/2013.
            Muchas plantillas de aviso legal que circulan por ahí siguen citándola. */}
        <Section title="7. Resolución de conflictos">
            Esta relación se rige por la legislación española. Si eres consumidor, puedes dirigir
            tu reclamación a{' '}
            <Link href={`mailto:${LEGAL_IDENTITY.contactEmail}`} sx={{ color: '#FFD700' }}>
                {LEGAL_IDENTITY.contactEmail}
            </Link>{' '}
            y, si no queda resuelta, acudir a la oficina municipal de información al consumidor o
            al órgano de consumo de tu comunidad autónoma, así como al Sistema Arbitral de Consumo.
            Conservas en todo caso el derecho a acudir a los juzgados de tu domicilio.
        </Section>
    </Box>
);
