import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, ListItemIcon, ListItemText, Menu, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Person as PersonIcon,
  Key as KeyIcon,
  Logout as LogoutIcon,
  Shield as ShieldIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import QRCodeGenerator from '../QRCodeGenerator';

// Debe coincidir con MIN_PASSWORD_LENGTH en workerAuthentication.js.
// Aquí solo evita un viaje al servidor; la validación real está allí.
const MIN_PASSWORD_LENGTH = 12;

const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

function PasswordField({ label, value, onChange, helperText }: {
  label: string; value: string; onChange: (value: string) => void; helperText?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={label}
      type={visible ? 'text' : 'password'}
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={helperText}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => setVisible(!visible)} edge="end" aria-label={visible ? 'Ocultar' : 'Mostrar'}>
              {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const mismatch = form.confirmPassword !== '' && form.newPassword !== form.confirmPassword;

  const close = () => {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError(null);
    setSuccess(false);
    onClose();
  };

  const submit = async () => {
    if (form.newPassword !== form.confirmPassword) return setError('Las contraseñas no coinciden');
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      return setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    try {
      setLoading(true);
      setError(null);
      await apiClient.changePassword(form.currentPassword, form.newPassword);
      setSuccess(true);
      setTimeout(close, 2000);
    } catch (err) {
      setError(errorMessage(err, 'Error al cambiar contraseña'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Cambiar mi contraseña</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Contraseña actualizada.</Alert>}
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <PasswordField label="Contraseña actual" value={form.currentPassword}
            onChange={(v) => setForm({ ...form, currentPassword: v })} />
          <PasswordField label="Nueva contraseña" value={form.newPassword}
            onChange={(v) => setForm({ ...form, newPassword: v })}
            helperText={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres. Una frase que recuerdes es mejor que algo corto y retorcido.`} />
          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            fullWidth
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            error={mismatch}
            helperText={mismatch ? 'Las contraseñas no coinciden' : ''}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>Cancelar</Button>
        <Button
          onClick={submit}
          variant="contained"
          disabled={loading || !form.currentPassword || !form.newPassword || !form.confirmPassword}
        >
          {loading ? <CircularProgress size={20} /> : 'Cambiar contraseña'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MfaSetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<{ secret: string; provisioningUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // Se pide el secreto al abrir (y no antes): cada llamada genera uno nuevo.
  const onEnter = async () => {
    setLoading(true);
    try {
      setData(await apiClient.mfaSetup());
    } catch (err) {
      setError(errorMessage(err, 'No se pudo iniciar la activación de MFA'));
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setData(null);
    setCode('');
    setRecoveryCodes(null);
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!data) return;
    setLoading(true);
    setError(null);
    try {
      const { recoveryCodes } = await apiClient.mfaEnable(data.secret, code.trim());
      setRecoveryCodes(recoveryCodes);
    } catch (err) {
      setError(errorMessage(err, 'Código incorrecto'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth TransitionProps={{ onEnter }}>
      <DialogTitle>Verificación en 2 pasos</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {recoveryCodes ? (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              Activado. Guarda estos códigos de recuperación — cada uno sirve una sola vez
              si pierdes el acceso a tu app de autenticación. No se volverán a mostrar.
            </Alert>
            <Box sx={{
              fontFamily: 'monospace', fontSize: '1rem', display: 'grid',
              gridTemplateColumns: '1fr 1fr', gap: 1, p: 2, bgcolor: 'background.default',
              border: 1, borderColor: 'divider',
            }}>
              {recoveryCodes.map((c) => <div key={c}>{c}</div>)}
            </Box>
            <Button startIcon={<ContentCopyIcon />} sx={{ mt: 2 }}
              onClick={() => navigator.clipboard.writeText(recoveryCodes.join('\n'))}>
              Copiar todos
            </Button>
          </>
        ) : loading && !data ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : data ? (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Escanea este código con Google Authenticator, Authy o similar,
              y escribe el código de 6 dígitos que te muestre.
            </Typography>
            <Box display="flex" justifyContent="center" mb={2}>
              <QRCodeGenerator data={data.provisioningUri} size={200} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, textAlign: 'center' }}>
              ¿No puedes escanear? Clave manual: <code>{data.secret}</code>
            </Typography>
            <TextField
              label="Código de 6 dígitos"
              fullWidth
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading}
              inputProps={{ maxLength: 6, inputMode: 'numeric' }}
            />
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{recoveryCodes ? 'Cerrar' : 'Cancelar'}</Button>
        {!recoveryCodes && data && (
          <Button onClick={confirm} variant="contained" disabled={loading || code.length !== 6}>
            {loading ? <CircularProgress size={20} /> : 'Activar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function MfaDisableDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.mfaDisable(password);
      window.location.reload(); // refresca user.mfaEnabled vía /auth/me
    } catch (err) {
      setError(errorMessage(err, 'Contraseña incorrecta'));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Desactivar verificación en 2 pasos</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" sx={{ mb: 2 }}>Confirma tu contraseña para desactivarla.</Typography>
        <TextField
          label="Contraseña actual"
          type="password"
          fullWidth
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>Cancelar</Button>
        <Button onClick={confirm} variant="contained" color="error" disabled={loading || !password}>
          {loading ? <CircularProgress size={20} /> : 'Desactivar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Avatar de la barra superior con el menú de cuenta (contraseña, MFA, salir). */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<'password' | 'mfa-setup' | 'mfa-disable' | null>(null);

  const open = (which: typeof dialog) => {
    setAnchor(null);
    setDialog(which);
  };

  const onLogout = async () => {
    setAnchor(null);
    await logout();
    navigate('/login');
  };

  return (
    <>
      <Tooltip title="Mi cuenta">
        <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)} sx={{ ml: 1 }} aria-label="Mi cuenta">
          <Avatar src={user?.photo_url} alt={user?.display_name || user?.email} sx={{ width: 32, height: 32 }}>
            <PersonIcon />
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2">{user?.display_name || 'Usuario'}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => open('password')}>
          <ListItemIcon><KeyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Cambiar contraseña</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => open(user?.mfaEnabled ? 'mfa-disable' : 'mfa-setup')}>
          <ListItemIcon><ShieldIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{user?.mfaEnabled ? 'Desactivar verificación en 2 pasos' : 'Activar verificación en 2 pasos'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={onLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Cerrar sesión</ListItemText>
        </MenuItem>
      </Menu>

      <ChangePasswordDialog open={dialog === 'password'} onClose={() => setDialog(null)} />
      <MfaSetupDialog open={dialog === 'mfa-setup'} onClose={() => setDialog(null)} />
      <MfaDisableDialog open={dialog === 'mfa-disable'} onClose={() => setDialog(null)} />
    </>
  );
}
