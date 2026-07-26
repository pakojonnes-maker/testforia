import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Restaurant as RestaurantIcon } from '@mui/icons-material';
import { apiClient } from '../lib/apiClient';

type InvitationInfo = {
  email: string;
  role: string;
  restaurantName: string | null;
  valid: boolean;
  expired: boolean;
  used: boolean;
};

/**
 * Pantalla pública (sin sesión) donde alguien invitado, o alguien que pidió
 * resetear su contraseña, fija su contraseña. Sustituye al antiguo patrón de
 * "generar una contraseña y mostrarla en el panel del admin".
 */
export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loadingInfo, setLoadingInfo] = useState(true);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoadingInfo(false);
      return;
    }
    apiClient.getInvitation(token)
      .then((res: any) => setInvitation(res.invitation))
      .catch(() => setInvitation(null))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiClient.acceptInvitation(token, password);
      if (response.token) {
        localStorage.setItem('auth_token', response.token);
        if (response.user) localStorage.setItem('user_data', JSON.stringify(response.user));
      }
      // Recarga para que AuthContext arranque limpio con el token ya guardado.
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se ha podido completar la invitación.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  let content: React.ReactNode;
  if (!token) {
    content = <Alert severity="error">Este enlace no es válido: falta el token de invitación.</Alert>;
  } else if (loadingInfo) {
    content = <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>;
  } else if (!invitation || !invitation.valid) {
    content = (
      <Alert severity="error">
        {invitation?.used
          ? 'Este enlace ya se ha usado.'
          : invitation?.expired
          ? 'Este enlace ha caducado. Pide uno nuevo.'
          : 'Este enlace no es válido.'}
      </Alert>
    );
  } else {
    content = (
      <>
        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
          {invitation.restaurantName
            ? <>Te han invitado a <strong>{invitation.restaurantName}</strong> como <strong>{invitation.role}</strong>.</>
            : 'Elige tu nueva contraseña.'}
          <br />
          <Typography component="span" variant="body2" color="text.secondary">{invitation.email}</Typography>
        </Typography>

        {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Nueva contraseña"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            helperText="Mínimo 12 caracteres"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Repite la contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            error={confirmPassword !== '' && password !== confirmPassword}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={submitting || !password || !confirmPassword}
          >
            {submitting ? 'Guardando...' : 'Aceptar y entrar'}
          </Button>
        </Box>
      </>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <RestaurantIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            VisualTaste Admin
          </Typography>
          {content}
        </Paper>
      </Box>
    </Container>
  );
}
