import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert, Box, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Tooltip, Typography,
} from '@mui/material';
import { Panel } from '../common/Panel';

export interface MetricColumn<T> {
  id: Extract<keyof T, string>;
  label: string;
  align?: 'left' | 'right';
  tooltip?: string;
  render?: (row: T) => ReactNode;
}

interface MetricsTableProps<T> {
  title: string;
  subtitle: string;
  icon: ReactNode;
  rows: T[] | undefined;
  columns: MetricColumn<T>[];
  rowKey: (row: T) => string;
  initialSort: Extract<keyof T, string>;
  loading: boolean;
  error: boolean;
}

/** Tabla ordenable por columna de las pestañas Platos y Secciones de Estadísticas. */
export function MetricsTable<T extends Record<string, unknown>>({
  title, subtitle, icon, rows, columns, rowKey, initialSort, loading, error,
}: MetricsTableProps<T>) {
  const [orderBy, setOrderBy] = useState<Extract<keyof T, string>>(initialSort);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const list = [...(rows ?? [])];
    const sign = order === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const x = a[orderBy] ?? 0;
      const y = b[orderBy] ?? 0;
      if (typeof x === 'string' || typeof y === 'string') return sign * String(x).localeCompare(String(y), 'es');
      return sign * (Number(x) - Number(y));
    });
  }, [rows, orderBy, order]);

  const sortBy = (id: Extract<keyof T, string>) => {
    setOrder(orderBy === id && order === 'desc' ? 'asc' : 'desc');
    setOrderBy(id);
  };

  return (
    <Panel flush icon={icon} title={title} subtitle={subtitle}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error" sx={{ m: 3 }}>No se pudieron cargar los datos</Alert>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                  <TableCell key={col.id} align={col.align ?? 'left'} sortDirection={orderBy === col.id ? order : false}>
                    <Tooltip title={col.tooltip ?? ''} disableHoverListener={!col.tooltip}>
                      <TableSortLabel active={orderBy === col.id} direction={orderBy === col.id ? order : 'desc'} onClick={() => sortBy(col.id)}>
                        {col.label}
                      </TableSortLabel>
                    </Tooltip>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={rowKey(row)} hover>
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align ?? 'left'}>
                      {col.render ? col.render(row) : String(row[col.id] ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No hay datos para este periodo</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Panel>
  );
}
