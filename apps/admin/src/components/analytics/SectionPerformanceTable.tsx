// apps/admin/src/components/analytics/SectionPerformanceTable.tsx
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    LinearProgress,
    Box,
} from '@mui/material';

interface Section {
    section_id: string;
    name: string;
    views: number;
    dish_views: number;
}

interface Props {
    sections: Section[];
}

export default function SectionPerformanceTable({ sections }: Props) {
    const maxViews = Math.max(...sections.map(s => s.views), 1);

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Rendimiento por Secciones
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Sección</TableCell>
                                <TableCell align="right">Vistas</TableCell>
                                <TableCell align="right">Platos Vistos</TableCell>
                                <TableCell align="right">Rendimiento</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sections.map((section, index) => {
                                const performance = (section.views / maxViews) * 100;
                                return (
                                    <TableRow key={section.section_id || index}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={600}>
                                                {section.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Chip label={(section?.views || 0).toLocaleString()} size="small" color="primary" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">{section?.dish_views || 0}</TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={performance}
                                                    sx={{ width: 80, height: 6, borderRadius: 3 }}
                                                    color="primary"
                                                />
                                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 45 }}>
                                                    {performance.toFixed(0)}%
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}
