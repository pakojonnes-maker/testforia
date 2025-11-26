// apps/admin/src/components/analytics/QRAttribution.tsx
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
} from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode';

interface Props {
    qrData: Array<{
        qr_code_id: string;
        location: string;
        scans: number;
    }>;
}

export default function QRAttribution({ qrData }: Props) {
    const totalScans = qrData.reduce((sum, qr) => sum + qr.scans, 0);

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QrCodeIcon color="primary" />
                    Atribución por Códigos QR
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Total de escaneos: <strong>{(totalScans || 0).toLocaleString()}</strong>
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Ubicación</TableCell>
                                <TableCell align="right">Escaneos</TableCell>
                                <TableCell align="right">% del Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {qrData.map((qr, index) => {
                                const percentage = totalScans > 0 ? (((qr?.scans || 0) / totalScans) * 100).toFixed(1) : '0';
                                return (
                                    <TableRow key={qr.qr_code_id || index}>
                                        <TableCell>{qr.location || 'Sin ubicación'}</TableCell>
                                        <TableCell align="right">
                                            <Chip label={(qr?.scans || 0).toLocaleString()} size="small" color="primary" />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" color="text.secondary">
                                                {percentage}%
                                            </Typography>
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
