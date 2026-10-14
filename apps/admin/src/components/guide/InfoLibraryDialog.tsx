// src/components/guide/InfoLibraryDialog.tsx
// «Añadir bloque de otro piso» (migración 0112): los bloques de los demás pisos
// de la agencia que este aún no tiene, agrupados por piso. Añadir uno lo comparte
// (mismo bloque, no copia), que es lo que evita escribir y traducir diez veces
// el «Acceso al edificio» de un mismo portal.
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Alert,
  Stack, CircularProgress, Box, Paper,
} from '@mui/material';
import { fetchInfoLibrary, toggleInfoInApartment, type InfoLibraryBlock } from '../../lib/guideInfoShares';

interface InfoLibraryDialogProps {
  open: boolean;
  apartmentId: string;
  onClose: () => void;
  onAdded: () => void;
}

export const InfoLibraryDialog = ({ open, apartmentId, onClose, onAdded }: InfoLibraryDialogProps) => {
  const [blocks, setBlocks] = useState<InfoLibraryBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchInfoLibrary(apartmentId)
      .then(list => { if (!cancelled) setBlocks(list); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, apartmentId]);

  const byApartment = useMemo(() => {
    const groups = new Map<string, InfoLibraryBlock[]>();
    for (const b of blocks) {
      const list = groups.get(b.owner_apartment_name) || [];
      list.push(b);
      groups.set(b.owner_apartment_name, list);
    }
    return [...groups.entries()];
  }, [blocks]);

  const handleAdd = async (block: InfoLibraryBlock) => {
    setAdding(block.id);
    setError(null);
    try {
      await toggleInfoInApartment(block.owner_apartment_id, block.id, apartmentId, true);
      setBlocks(prev => prev.filter(b => b.id !== block.id));
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo añadir el bloque');
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onClose={adding ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Añadir bloque de otro piso</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Se añade el mismo bloque, con sus fotos y sus traducciones, no una copia: si lo editas desde cualquier
          piso, cambia en todos los que lo tienen. Entra al final de la guía; luego puedes moverlo con las flechas.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
        ) : blocks.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay bloques de otros pisos de esta agencia que este piso no tenga ya.
          </Typography>
        ) : (
          <Stack spacing={3}>
            {byApartment.map(([aptName, list]) => (
              <Box key={aptName}>
                <Typography variant="overline" color="text.secondary">{aptName}</Typography>
                <Stack spacing={1}>
                  {list.map(block => (
                    <Paper key={block.id} variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: block.category_color || 'primary.main' }} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2">{block.resolved_title || block.info_key}</Typography>
                        {block.excerpt && (
                          <Typography variant="body2" color="text.secondary" noWrap>{block.excerpt}</Typography>
                        )}
                        {block.share_count > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Ya sale en {block.share_count + 1} pisos
                          </Typography>
                        )}
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={adding !== null}
                        onClick={() => handleAdd(block)}
                      >
                        {adding === block.id ? 'Añadiendo…' : 'Añadir'}
                      </Button>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={adding !== null}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};
