// src/components/guide/GuideCatalogTable.tsx
// Vista densa del catálogo: la tabla que tenía la pantalla de Experiencias,
// ampliada a los dos tipos de fila. Es la vista útil cuando una zona tiene
// cientos de sitios y hay que ordenar, activar/desactivar o localizar algo
// rápido; la rejilla de tarjetas es para revisar fotos y textos.
import { useMemo, useState } from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination, Avatar, Chip, IconButton, Switch, Typography, Box, Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  DeleteForever as DeleteForeverIcon,
  Star as StarIcon,
  LocalActivity as LocalActivityIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import { CatalogItem, BADGE_LABELS, isExperience, isTrue, priceLabel, displayName } from './catalogTypes';

type SortKey = 'name' | 'category' | 'order' | 'type';

interface Props {
  items: CatalogItem[];
  onEdit: (item: CatalogItem) => void;
  onDelete: (item: CatalogItem) => void;
  onToggleActive: (item: CatalogItem) => void;
}

export default function GuideCatalogTable({ items, onEdit, onDelete, onToggleActive }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let diff = 0;
      if (sortKey === 'name') diff = displayName(a).localeCompare(displayName(b), 'es');
      else if (sortKey === 'category') diff = (a.category || '').localeCompare(b.category || '', 'es');
      else if (sortKey === 'type') diff = Number(isExperience(a)) - Number(isExperience(b));
      else diff = (a.order_index ?? 0) - (b.order_index ?? 0);
      return sortAsc ? diff : -diff;
    });
    return copy;
  }, [items, sortKey, sortAsc]);

  const visible = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const headCell = (key: SortKey, label: string) => (
    <TableCell sortDirection={sortKey === key ? (sortAsc ? 'asc' : 'desc') : false}>
      <TableSortLabel
        active={sortKey === key}
        direction={sortKey === key && !sortAsc ? 'desc' : 'asc'}
        onClick={() => handleSort(key)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 60 }} />
              {headCell('name', 'Nombre')}
              {headCell('type', 'Tipo')}
              {headCell('category', 'Categoría')}
              <TableCell>Precio</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell>Badge</TableCell>
              {headCell('order', 'Orden')}
              <TableCell align="center">Estado</TableCell>
              <TableCell align="right">Opciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map(item => {
              const experience = isExperience(item);
              const active = isTrue(item.is_active);
              const badge = item.badge_type && item.badge_type !== 'none' ? item.badge_type : null;
              return (
                <TableRow key={item.id} hover sx={{ opacity: active ? 1 : 0.55 }}>
                  <TableCell>
                    <Avatar variant="rounded" src={item.cover_image_url || undefined} sx={{ width: 42, height: 42 }}>
                      {experience ? <LocalActivityIcon fontSize="small" /> : <PlaceIcon fontSize="small" />}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>{displayName(item)}</Typography>
                      {isTrue(item.is_featured) && (
                        <Tooltip title="Destacado">
                          <StarIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
                        </Tooltip>
                      )}
                    </Box>
                    {item.address && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 260 }}>
                        {item.address}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={experience ? 'Experiencia' : 'Lugar'}
                      color={experience ? 'secondary' : 'default'}
                      variant={experience ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{priceLabel(item)}</Typography>
                    {item.original_price_display && (
                      <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                        {item.original_price_display}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.action_type && (
                      <Chip
                        size="small"
                        label={item.action_type}
                        color={item.action_type === 'WHATSAPP' ? 'success' : 'primary'}
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {badge && <Chip size="small" label={BADGE_LABELS[badge] || badge} />}
                  </TableCell>
                  <TableCell>{item.order_index ?? 0}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={active ? 'Visible para los huéspedes' : 'Archivado'}>
                      <Switch size="small" checked={active} onChange={() => onToggleActive(item)} />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onEdit(item)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => onDelete(item)}>
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No hay nada que coincida con estos filtros.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={items.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[25, 50, 100]}
        labelRowsPerPage="Filas por página"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </Paper>
  );
}
