// apps/admin/src/components/analytics/TechnicalBreakdowns.tsx
import 'react';
import { Card, CardContent, Typography, Grid, Stack, Chip } from '@mui/material';

interface Props {
  breakdowns: {
    os?: Array<{ key: string; count: number }>;
    browsers?: Array<{ key: string; count: number }>;
    networks?: Array<{ key: string; count: number }>;
    languages?: Array<{ key: string; count: number }>;
  };
}

export default function TechnicalBreakdowns({ breakdowns }: Props) {
  const { os = [], browsers = [], networks = [], languages = [] } = breakdowns;

  const sections = [
    { title: 'Sistemas Operativos', data: os },
    { title: 'Navegadores', data: browsers },
    { title: 'Tipos de Red', data: networks },
    { title: 'Idiomas', data: languages },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Desglose Técnico
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {sections.map((section, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {section.title}
              </Typography>
              {section.data.length > 0 ? (
                section.data.slice(0, 5).map((item) => (
                  <Stack
                    key={item.key}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                      {item.key}
                    </Typography>
                    <Chip label={item.count} size="small" sx={{ ml: 1 }} />
                  </Stack>
                ))
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Sin datos
                </Typography>
              )}
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
