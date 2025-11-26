// apps/admin/src/components/dashboard/AlertsSection.tsx

import React from 'react';
import {
    Box,
    Alert,
    AlertTitle,
    Button,
    Skeleton,
    Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Alert as DashboardAlert } from '../../types/dashboard';

interface AlertsSectionProps {
    alerts: DashboardAlert[];
    loading?: boolean;
}

export function AlertsSection({ alerts, loading }: AlertsSectionProps) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <Stack spacing={2}>
                {[1, 2].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                ))}
            </Stack>
        );
    }

    if (alerts.length === 0) {
        return <Alert severity="success">✨ Todo está en orden. No hay alertas pendientes.</Alert>;
    }

    return (
        <Stack spacing={2}>
            {alerts.map((alert) => (
                <Alert
                    key={alert.id}
                    severity={alert.type}
                    action={
                        alert.action ? (
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => navigate(alert.action!.href)}
                                sx={{ whiteSpace: 'nowrap' }}
                            >
                                {alert.action.label}
                            </Button>
                        ) : undefined
                    }
                    sx={{
                        '& .MuiAlert-message': {
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center'
                        }
                    }}
                >
                    <Box>
                        <AlertTitle sx={{ mb: 0, fontWeight: 600 }}>
                            {alert.priority === 'high' && '🔴 '}
                            {alert.priority === 'medium' && '🟡 '}
                            {alert.message}
                        </AlertTitle>
                    </Box>
                </Alert>
            ))}
        </Stack>
    );
}
