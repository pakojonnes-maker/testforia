// apps/admin/src/components/analytics/UserBehaviorFlow.tsx
import React from 'react';
import { Card, CardContent, Typography, Box, Stack, Chip } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Flow {
    from_entity_type: string;
    to_entity_type: string;
    count: number;
}

interface Props {
    flows: Flow[];
}

export default function UserBehaviorFlow({ flows }: Props) {
    const topFlows = flows.slice(0, 10);

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Flujo de Navegación de Usuarios
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Caminos más comunes que siguen tus visitantes
                </Typography>

                <Box>
                    {topFlows.map((flow, index) => (
                        <Stack
                            key={index}
                            direction="row"
                            alignItems="center"
                            spacing={2}
                            sx={{
                                p: 2,
                                mb: 1.5,
                                bgcolor: 'grey.50',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'grey.200',
                            }}
                        >
                            <Chip label={flow.from_entity_type} color="primary" size="small" />
                            <ArrowForwardIcon color="action" />
                            <Chip label={flow.to_entity_type} color="secondary" size="small" />
                            <Box sx={{ flex: 1 }} />
                            <Chip label={`${flow.count} veces`} variant="outlined" size="small" />
                        </Stack>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}
