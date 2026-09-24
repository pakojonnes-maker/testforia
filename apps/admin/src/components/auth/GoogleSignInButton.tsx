import { useEffect, useRef, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { apiClient } from '../../lib/apiClient';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

// Tipos mínimos de Google Identity Services: solo lo que se usa aquí.
interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonOptions {
  type: 'standard';
  theme: 'outline' | 'filled_blue' | 'filled_black';
  size: 'large' | 'medium' | 'small';
  text: 'signin_with' | 'signin' | 'continue_with' | 'signup_with';
  shape: 'rectangular' | 'pill';
  width: number;
  locale: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (!gisScriptPromise) {
    gisScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Se libera la promesa para poder reintentar si fue un corte puntual de red.
        gisScriptPromise = null;
        script.remove();
        reject(new Error('No se pudo cargar Google Identity Services'));
      };
      document.head.appendChild(script);
    });
  }
  return gisScriptPromise;
};

interface GoogleSignInButtonProps {
  /** Recibe el ID token de Google cuando el usuario elige su cuenta. */
  onCredential: (credential: string) => void;
  disabled?: boolean;
}

/**
 * Botón "Entrar con Google". Se apaga solo: si el backend no tiene Google
 * configurado, o Google no carga, no se ve nada y el login por contraseña
 * queda como única vía.
 */
export const GoogleSignInButton = ({ onCredential, disabled = false }: GoogleSignInButtonProps) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [ready, setReady] = useState(false);

  // GIS guarda el callback al inicializar y no admite cambiarlo después: la ref
  // lo mantiene al día sin tener que reinicializar Google en cada render.
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const config = await apiClient.getGoogleLoginConfig();
        if (cancelled || !config.enabled || !config.clientId) {
          return;
        }
        await loadGoogleScript();
        const container = buttonRef.current;
        if (cancelled || !container || !window.google) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: config.clientId,
          callback: (response) => {
            if (response.credential) {
              onCredentialRef.current(response.credential);
            }
          },
        });
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: Math.min(400, Math.max(200, container.clientWidth || 320)),
          locale: 'es',
        });
        setReady(true);
      } catch (error) {
        console.warn('[GoogleSignIn] No disponible:', error);
      }
    };

    void setup();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        // Montado siempre, con altura 0, para poder medir el ancho antes de que
        // Google pinte el botón; hasta entonces no se ve ni ocupa sitio.
        height: ready ? 'auto' : 0,
        overflow: 'hidden',
        visibility: ready ? 'visible' : 'hidden',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          o
        </Typography>
      </Divider>
      <Box ref={buttonRef} sx={{ display: 'flex', justifyContent: 'center' }} />
    </Box>
  );
};
