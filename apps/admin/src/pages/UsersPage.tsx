import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    Tooltip,
    InputAdornment
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Person as PersonIcon,
    Key as KeyIcon,
    ContentCopy as CopyIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface User {
    id: string;
    email: string;
    display_name: string;
    photo_url: string;
    role: string;
    is_active: number;
    created_at: string;
}

const ROLES = [
    { value: 'owner', label: 'Propietario' },
    { value: 'manager', label: 'Gerente' },
    { value: 'staff', label: 'Personal' }
];

const UsersPage: React.FC = () => {
    const { currentRestaurant } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Add user dialog
    const [openDialog, setOpenDialog] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', name: '', role: 'staff' });
    const [actionLoading, setActionLoading] = useState(false);

    // Password reveal dialog
    const [credentialsDialog, setCredentialsDialog] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState<{
        email: string;
        password: string;
        isReset?: boolean;
    } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (currentRestaurant?.id) {
            loadUsers();
        }
    }, [currentRestaurant]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getRestaurantUsers(currentRestaurant.id);
            setUsers(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        try {
            setActionLoading(true);
            setError(null);
            const response = await apiClient.addRestaurantUser(currentRestaurant.id, newUser);

            // If we got a generated password, show it in the credentials dialog
            if (response.generatedPassword) {
                setGeneratedCredentials({
                    email: newUser.email,
                    password: response.generatedPassword,
                    isReset: false
                });
                setCredentialsDialog(true);
            } else {
                setSuccessMessage('Usuario existente añadido al restaurante');
            }

            await loadUsers();
            setOpenDialog(false);
            setNewUser({ email: '', name: '', role: 'staff' });
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error al añadir usuario');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async (user: User) => {
        if (!window.confirm(`¿Estás seguro de que quieres resetear la contraseña de ${user.display_name || user.email}?`)) return;

        try {
            setActionLoading(true);
            setError(null);
            const response = await apiClient.resetUserPassword(currentRestaurant.id, user.id);

            if (response.generatedPassword) {
                setGeneratedCredentials({
                    email: user.email,
                    password: response.generatedPassword,
                    isReset: true
                });
                setCredentialsDialog(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error al resetear contraseña');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

        try {
            setActionLoading(true);
            setError(null);
            await apiClient.removeRestaurantUser(currentRestaurant.id, userId);
            await loadUsers();
            setSuccessMessage('Usuario eliminado correctamente');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error al eliminar usuario');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCopyCredentials = async () => {
        if (!generatedCredentials) return;

        const text = `Email: ${generatedCredentials.email}\nContraseña: ${generatedCredentials.password}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCloseCredentialsDialog = () => {
        setCredentialsDialog(false);
        setGeneratedCredentials(null);
        setShowPassword(false);
        setCopied(false);
    };

    const getRoleLabel = (role: string) => {
        const found = ROLES.find(r => r.value === role);
        return found ? found.label : role;
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'owner': return 'primary';
            case 'manager': return 'secondary';
            default: return 'default';
        }
    };

    if (loading && users.length === 0) {
        return <Box p={3} display="flex" justifyContent="center"><CircularProgress /></Box>;
    }

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Gestión de Usuarios
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                    disabled={users.length >= 5}
                >
                    Añadir Usuario ({users.length}/5)
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
                    {successMessage}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Rol</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Avatar src={user.photo_url} alt={user.display_name}>
                                            <PersonIcon />
                                        </Avatar>
                                        <Typography variant="body1">{user.display_name || 'Sin nombre'}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={getRoleLabel(user.role)}
                                        color={getRoleColor(user.role) as any}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.is_active ? "Activo" : "Inactivo"}
                                        color={user.is_active ? "success" : "default"}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Resetear contraseña">
                                        <IconButton
                                            color="warning"
                                            onClick={() => handleResetPassword(user)}
                                            disabled={actionLoading}
                                            size="small"
                                        >
                                            <KeyIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Eliminar usuario">
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDeleteUser(user.id)}
                                            disabled={actionLoading}
                                            size="small"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No hay usuarios registrados aparte de ti.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add User Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Email"
                            type="email"
                            fullWidth
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        />
                        <TextField
                            label="Nombre (Opcional)"
                            fullWidth
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        />
                        <TextField
                            select
                            label="Rol"
                            fullWidth
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        >
                            {ROLES.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button
                        onClick={handleAddUser}
                        variant="contained"
                        disabled={!newUser.email || actionLoading}
                    >
                        {actionLoading ? 'Añadiendo...' : 'Añadir'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Credentials Reveal Dialog */}
            <Dialog
                open={credentialsDialog}
                onClose={handleCloseCredentialsDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <KeyIcon color="warning" />
                    {generatedCredentials?.isReset
                        ? 'Contraseña Reseteada'
                        : 'Usuario Creado'}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
                        <strong>¡Importante!</strong> Guarda estas credenciales.
                        La contraseña no se volverá a mostrar.
                    </Alert>

                    <Box display="flex" flexDirection="column" gap={2}>
                        <TextField
                            label="Email"
                            value={generatedCredentials?.email || ''}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Contraseña"
                            type={showPassword ? 'text' : 'password'}
                            value={generatedCredentials?.password || ''}
                            fullWidth
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Comparte estas credenciales con el usuario de forma segura
                        (en persona, WhatsApp, etc.). El usuario puede cambiar su
                        contraseña desde su perfil después del primer login.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleCopyCredentials}
                        startIcon={<CopyIcon />}
                        color={copied ? 'success' : 'primary'}
                    >
                        {copied ? '¡Copiado!' : 'Copiar Credenciales'}
                    </Button>
                    <Button onClick={handleCloseCredentialsDialog} variant="contained">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UsersPage;
