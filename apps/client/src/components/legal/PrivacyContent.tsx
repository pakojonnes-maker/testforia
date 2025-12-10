import React from 'react';
import { Box, Typography } from '@mui/material';

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Box>
        <Typography variant="h6" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
            {title}
        </Typography>
        <Box sx={{ color: '#aaa', lineHeight: 1.6, typography: 'body1' }}>
            {(children as any)}
        </Box>
    </Box>
);

export const PrivacyContent = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Section title="1. Introducción">
                En VisualTaste ("nosotros"), priorizamos tu privacidad. Esta política explica cómo gestionamos la información cuando utilizas nuestra carta digital.
                Diseñamos nuestro sistema para ser <strong>Privado por Diseño</strong>.
            </Section>

            <Section title="2. No utilizamos Cookies de Rastreo">
                A diferencia de otras webs, <strong>NO utilizamos cookies persistentes</strong> para rastrear tu identidad a través de diferentes sitios o sesiones.
                <ul>
                    <li>No almacenamos identificadores personales en tu navegador.</li>
                    <li>No vendemos tus datos a terceros.</li>
                    <li>No realizamos "fingerprinting" (huella digital) invasiva.</li>
                </ul>
            </Section>

            <Section title="3. Datos que Analizamos (Anonimización)">
                Para ayudar a los restaurantes a mejorar su servicio, recopilamos estadísticas <strong>anónimas y agregadas</strong>:
                <ul>
                    <li>Qué platos son los más vistos.</li>
                    <li>Tiempos medios de visualización.</li>
                    <li>Interacciones generales (clics en "Me gusta" o "Añadir").</li>
                </ul>
                Para contar visitantes únicos de forma privada, utilizamos un sistema de <strong>Hashing Diario</strong> en nuestros servidores. Este proceso convierte tu IP y Agente de Usuario en un código cifrado que rota cada 24 horas. Esto hace matemáticamente imposible reconstruir tu historial de navegación días después.
            </Section>

            <Section title="4. Almacenamiento Local">
                Utilizamos el almacenamiento local de tu dispositivo estrictamente para preferencias de usuario (por ejemplo, recordar si ya has cerrado un aviso de bienvenida). Estos datos nunca salen de tu dispositivo.
            </Section>

            <Section title="5. Tus Derechos">
                Dado que no almacenamos datos personales vinculados a ti de forma persistente, generalmente no "tenemos" datos tuyos que borrar pasadas 24 horas. Sin embargo, si nos proporcionas datos voluntarios (como tu email para una oferta), tienes derecho a solicitar su borrado contactando con el restaurante o con nosotros.
            </Section>

            <Section title="6. Contacto">
                Si tienes dudas sobre nuestra tecnología de privacidad, contáctanos en legal@visualtaste.app.
            </Section>
        </Box>
    );
};
