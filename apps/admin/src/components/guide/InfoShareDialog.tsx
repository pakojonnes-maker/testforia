// src/components/guide/InfoShareDialog.tsx
// «Compartir con otros pisos» de un bloque de la guía (migración 0112): los pisos
// de la agencia con una casilla cada uno. El bloque es el mismo en todos, no una
// copia: por eso el aviso de arriba.
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Alert,
  Checkbox, FormControlLabel, Stack, CircularProgress, Chip, Box,
} from '@mui/material';
import { fetchInfoShares, saveInfoShares, type InfoShareApartment } from '../../lib/guideInfoShares';

interface InfoShareDialogProps {
  open: boolean;
  /** Piso de origen del bloque: el que va en sus rutas. */
  ownerApartmentId: string;
  infoId: string;
  blockTitle: string;
  onClose: () => void;
  onSaved: () => void;
}

export const InfoShareDialog = ({ open, ownerApartmentId, infoId, blockTitle, onClose, onSaved }: InfoShareDialogProps) => {
  const [apartments, setApartments] = useState<InfoShareApartment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchInfoShares(ownerApartmentId, infoId)
      .then(list => {
        if (cancelled) return;
        setApartments(list);
        setSelected(new Set(list.filter(a => a.included).map(a => a.id)));
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, ownerApartmentId, infoId]);

  const toggle = (aptId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(aptId)) next.delete(aptId); else next.add(aptId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveInfoShares(ownerApartmentId, infoId, [...selected]);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const onlyOne = apartments.length <= 1;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Compartir «{blockTitle}»</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Es el mismo bloque en todos los pisos marcados, no una copia: si lo editas o lo traduces desde
          cualquiera de ellos, cambia en todos.
        </Alert>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
        ) : onlyOne ? (
          <Typography variant="body2" color="text.secondary">
            Esta agencia solo tiene este piso. Cuando haya más, podrás compartir el bloque con ellos desde aquí.
          </Typography>
        ) : (
          <Stack>
            {apartments.map(apt => (
              <FormControlLabel
                key={apt.id}
                control={<Checkbox checked={selected.has(apt.id)} onChange={() => toggle(apt.id)} disabled={saving} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{apt.name}</span>
                    {apt.is_owner && <Chip label="origen" size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
                    {!apt.is_active && <Chip label="inactivo" size="small" sx={{ height: 20, fontSize: 11 }} />}
                  </Box>
                }
              />
            ))}
          </Stack>
        )}
        {selected.size === 0 && !loading && !onlyOne && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            El bloque tiene que salir al menos en un piso. Para quitarlo de todos, bórralo.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading || onlyOne || selected.size === 0}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
