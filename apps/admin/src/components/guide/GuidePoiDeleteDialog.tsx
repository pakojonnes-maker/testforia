// src/components/guide/GuidePoiDeleteDialog.tsx
// Diálogo de borrado de un lugar / experiencia, usado por GuideCatalogPage
// (que fusionó las antiguas GuidePoisPage y GuideExperiencesPage: desde que
// guide_pois se unificó, las dos pantallas editaban la misma tabla).
//
// Un POI no pertenece a un apartamento: vive en la zona y lo comparten todos.
// Por eso, antes de dejar confirmar, se pide /usage al worker y se enseña a
// cuántos apartamentos (y con qué nombre) va a desaparecer del mapa. Si el POI
// tiene comisiones registradas el worker devuelve 409: ahí no se borra, se
// archiva (is_active = false), que es lo que ofrece el botón secundario.
import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/apiClient';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Alert, Box, Chip, CircularProgress,
} from '@mui/material';
import {
  DeleteForever as DeleteForeverIcon,
  Inventory2 as ArchiveIcon,
} from '@mui/icons-material';

export interface PoiUsage {
  apartments: number;
  media: number;
  translations: number;
  coupons: number;
  clicks: number;
  tv_events: number;
  commissions: number;
  apartment_names: string[];
  deletable: boolean;
}

interface Props {
  open: boolean;
  /** id del POI/experiencia, o null cuando el diálogo está cerrado */
  poiId: string | null;
  /** nombre a mostrar en el título */
  poiName: string;
  /** 'poi' | 'experiencia' — cambia el texto y la frase de confirmación */
  kind: 'poi' | 'experiencia';
  onClose: () => void;
  /** el borrado terminó bien: la página debe quitarlo de su lista */
  onDeleted: (poiId: string) => void;
  /** se archivó en vez de borrarse: la página debe refrescar el estado */
  onArchived?: (poiId: string) => void;
}

export default function GuidePoiDeleteDialog({
  open, poiId, poiName, kind, onClose, onDeleted, onArchived,
}: Props) {
  const [usage, setUsage] = useState<PoiUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmation = `borrar ${kind}`;

  useEffect(() => {
    if (!open || !poiId) return;
    setConfirmText('');
    setError(null);
    setUsage(null);
    setLoadingUsage(true);
    apiClient
      .request(`/guide/admin/pois/${poiId}/usage`)
      .then((res) => setUsage(res.usage))
      .catch((err: any) => setError(err.message || 'No se pudo consultar el uso de este POI'))
      .finally(() => setLoadingUsage(false));
  }, [open, poiId]);

  const handleDelete = async () => {
    if (!poiId) return;
    setWorking(true);
    setError(null);
    try {
      await apiClient.request(`/guide/admin/pois/${poiId}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirm: confirmText }),
      });
      onDeleted(poiId);
      onClose();
    } catch (err: any) {
      setError(err.message || `Error al eliminar ${kind === 'poi' ? 'el POI' : 'la experiencia'}`);
    } finally {
      setWorking(false);
    }
  };

  const handleArchive = async () => {
    if (!poiId) return;
    setWorking(true);
    setError(null);
    try {
      await apiClient.request(`/guide/admin/pois/${poiId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: false }),
      });
      onArchived?.(poiId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al archivar');
    } finally {
      setWorking(false);
    }
  };

  const bloqueadoPorComisiones = usage != null && !usage.deletable;

  return (
    <Dialog open={open} onClose={() => !working && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DeleteForeverIcon color="error" /> Eliminar {poiName}
      </DialogTitle>
      <DialogContent>
        {loadingUsage ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            {usage && usage.apartments > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Está asignado a <strong>{usage.apartments} apartamento{usage.apartments !== 1 ? 's' : ''}</strong> y
                desaparecerá del mapa de {usage.apartments !== 1 ? 'todos ellos' : 'ese apartamento'}.
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {usage.apartment_names.slice(0, 8).map((n) => (
                    <Chip key={n} size="small" label={n} variant="outlined" />
                  ))}
                  {usage.apartments > 8 && (
                    <Chip size="small" label={`+${usage.apartments - 8} más`} variant="outlined" />
                  )}
                </Box>
              </Alert>
            )}

            {bloqueadoPorComisiones ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                Tiene <strong>{usage!.commissions} comisión(es)</strong> registradas. No se puede borrar sin
                alterar la contabilidad de la agencia: archívalo en su lugar (deja de verse en las guías,
                pero conserva el histórico).
              </Alert>
            ) : (
              <Alert severity="error" sx={{ mb: 2 }}>
                Esta acción no se puede deshacer. Se borran sus fotos, sus traducciones
                {usage ? ` (${usage.translations})` : ''}, sus cupones y su histórico de clics.
                Los apartamentos, la zona y los demás POIs no se tocan.
              </Alert>
            )}

            {usage && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                <Chip size="small" label={`${usage.media} foto${usage.media !== 1 ? 's' : ''}`} />
                <Chip size="small" label={`${usage.translations} traducciones`} />
                {usage.coupons > 0 && <Chip size="small" label={`${usage.coupons} cupones`} />}
                {usage.clicks > 0 && <Chip size="small" label={`${usage.clicks} clics`} />}
                {usage.tv_events > 0 && <Chip size="small" label={`${usage.tv_events} eventos TV`} />}
              </Box>
            )}

            {!bloqueadoPorComisiones && (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Escribe <strong>{confirmation}</strong> para confirmar.
                </Typography>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmation}
                  disabled={working}
                />
              </>
            )}

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={working}>Cancelar</Button>
        <Button
          onClick={handleArchive}
          disabled={working || loadingUsage}
          startIcon={<ArchiveIcon />}
        >
          Archivar
        </Button>
        {!bloqueadoPorComisiones && (
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={working || loadingUsage || confirmText.trim().toLowerCase() !== confirmation}
            startIcon={working ? <CircularProgress size={18} color="inherit" /> : <DeleteForeverIcon />}
          >
            {working ? 'Eliminando...' : 'Eliminar definitivamente'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
