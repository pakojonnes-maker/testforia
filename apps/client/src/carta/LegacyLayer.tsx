// Diálogos que la carta hereda de la versión anterior (MUI): pedido a domicilio, tarjeta de
// sellos, oferta de bienvenida, valoración e instrucciones para instalar en iPhone. Van en
// este módulo aparte para que MUI y framer-motion solo se descarguen cuando se abre uno.
//
// Antes se pintaban fuera de cualquier TranslationProvider y salían siempre en español: aquí
// reciben los textos de D1 en el idioma del cliente (context 'reels', migración 0102).
import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import { ThemeProvider } from '@mui/material';
import { createCustomTheme } from '../components/muiTheme';
import '@fontsource-variable/fraunces/index.css'; // títulos de los diálogos de sellos y oferta
import { TranslationProvider } from '../contexts/TranslationContext';
import DeliveryModal from '../components/delivery/DeliveryModal';
import type { DeliveryModalProps } from '../components/delivery/DeliveryModal';
import LoyaltyCardModal from '../components/loyalty/LoyaltyCardModal';
import type { LoyaltyCardModalProps } from '../components/loyalty/LoyaltyCardModal';
import WelcomeModal from '../components/reels/WelcomeModal';
import RatingModal from '../components/ui/RatingModal';
import type { RatingModalProps } from '../components/ui/RatingModal';
import { IOSInstallPrompt } from '../components/IOSInstallPrompt';

type WelcomeProps = ComponentProps<typeof WelcomeModal>;

interface Props {
  translations: Record<string, string>;
  lang: string;
  delivery: Omit<DeliveryModalProps, 'currentLanguage'>;
  loyalty: LoyaltyCardModalProps;
  welcome: WelcomeProps;
  rating: RatingModalProps;
  ios: { open: boolean; onClose: () => void };
}

const LegacyLayer = ({ translations, lang, delivery, loyalty, welcome, rating, ios }: Props) => {
  // Los diálogos se pintan en un portal bajo <body>: idioma y dirección les llegan de <html>,
  // que pone CartaApp (useDocumentMeta). El tema es el oscuro de cuando App.tsx envolvía toda la app en MUI.
  const theme = useMemo(() => createCustomTheme(), []);
  return (
    <ThemeProvider theme={theme}>
      <TranslationProvider translations={translations}>
        <DeliveryModal {...delivery} currentLanguage={lang} />
        <LoyaltyCardModal {...loyalty} />
        <WelcomeModal {...welcome} />
        <RatingModal {...rating} />
        <IOSInstallPrompt open={ios.open} onClose={ios.onClose} />
      </TranslationProvider>
    </ThemeProvider>
  );
};

export default LegacyLayer;
