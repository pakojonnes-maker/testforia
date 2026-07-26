import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Restaurant as RestaurantIcon } from '@mui/icons-material';
import { useEffect } from 'react';

/** Forma mínima del error de axios que nos interesa aquí. */
interface ApiErrorShape {
  response?: {
    status?: number;
    data?: { message?: string; retryAfter?: number };
  };
}

/**
 * El backend limita los intentos de login (5 por cuenta cada 15 min, 30 por IP
 * cada hora) y también el desafío de MFA (5 por ticket). Sin este caso, un
 * 429 se mostraba como "credenciales incorrectas", que es justo lo contrario
 * de lo que pasa.
 */
function describeApiError(err: unknown, fallback: string): string {
  const status = (err as ApiErrorShape)?.response?.status;
  if (status !== 429) {
    return fallback;
  }
  const retryAfter = (err as ApiErrorShape)?.response?.data?.retryAfter;
  if (typeof retryAfter === 'number' && retryAfter > 0) {
    const minutos = Math.ceil(retryAfter / 60);
    return `Demasiados intentos fallidos. Vuelve a intentarlo en ${minutos} ${
      minutos === 1 ? 'minuto' : 'minutos'
    }.`;
  }
  return 'Demasiados intentos fallidos. Inténtalo de nuevo más tarde.';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithMfa, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Si la cuenta tiene MFA, el login no termina aún: el backend devuelve un
  // ticket de un solo uso y hay que pedir el código de la app de 2FA.
  const [mfaTicket, setMfaTicket] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      if (response?.mfaRequired) {
        setMfaTicket(response.ticket);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(describeApiError(err, 'Credenciales incorrectas. Por favor, inténtalo de nuevo.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!mfaTicket) return;
      await loginWithMfa(mfaTicket, mfaCode.trim());
      navigate('/');
    } catch (err) {
      setError(describeApiError(err, 'Código incorrecto. Comprueba tu app de autenticación.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <RestaurantIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            VisualTaste Admin
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {mfaTicket ? (
            <Box component="form" onSubmit={handleMfaSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Introduce el código de tu app de autenticación, o uno de tus
                códigos de recuperación.
              </Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                autoFocus
                label="Código de verificación"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                disabled={loading}
                inputProps={{ inputMode: 'text', maxLength: 9 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 1, py: 1.5 }}
                disabled={loading || !mfaCode}
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </Button>
              <Button
                fullWidth
                onClick={() => { setMfaTicket(null); setMfaCode(''); setError(''); }}
                disabled={loading}
              >
                Volver
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={loading}
              >
                {loading ? 'Accediendo...' : 'Acceder'}
              </Button>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
