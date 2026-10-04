import { useState } from 'react';
import { Box, Paper, Tab, Tabs } from '@mui/material';
import { Web as WebIcon } from '@mui/icons-material';
import LandingSectionsBuilder from '../components/web/LandingSectionsBuilder';
import LandingStyling from '../components/web/LandingStyling';
import ReelsStyling from '../components/web/ReelsStyling';
import { PageHeader } from '../components/common/PageHeader';

type WebTab = 'sections' | 'landing' | 'reels';

export default function WebPage() {
    const [activeTab, setActiveTab] = useState<WebTab>('sections');

    return (
        <Box>
            <PageHeader icon={<WebIcon />} title="Web" subtitle="Tu landing y los colores de la carta" />
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab value="sections" label="Secciones de la landing" />
                <Tab value="landing" label="Diseño de la landing" />
                <Tab value="reels" label="Colores de la carta" />
            </Tabs>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                {activeTab === 'sections' && <LandingSectionsBuilder />}
                {activeTab === 'landing' && <LandingStyling />}
                {activeTab === 'reels' && <ReelsStyling />}
            </Paper>
        </Box>
    );
}
