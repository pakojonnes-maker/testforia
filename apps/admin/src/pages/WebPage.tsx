import { useState } from 'react';
import {
    Box,
    Container,
    Typography,
} from '@mui/material';
import LandingSectionsBuilder from '../components/web/LandingSectionsBuilder';
import LandingStyling from '../components/web/LandingStyling';
import ReelsStyling from '../components/web/ReelsStyling';

export default function WebPage() {
    const [activeTab, setActiveTab] = useState('sections');

    // Styles for the tab navigation - Dark Theme
    const styles = {
        tabsContainer: { display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid rgba(255, 255, 255, 0.1)', marginTop: '2rem' },
        tab: { padding: '1rem 1.5rem', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', fontSize: '1rem', fontWeight: '500', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '-2px' },
        tabActive: { color: '#3B82F6', borderBottom: '2px solid #3B82F6' },
        tabIcon: { fontSize: '1.25rem' },
        content: { backgroundColor: '#1e293b', borderRadius: '12px', padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.05)' },
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
            <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                    Configuración Web
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Gestiona tu landing page y el estilo de tus reels
                </Typography>

                <div style={styles.tabsContainer}>
                    <button onClick={() => setActiveTab('sections')} style={{ ...styles.tab, ...(activeTab === 'sections' ? styles.tabActive : {}) }}>
                        <span style={styles.tabIcon}>🏗️</span><span>Secciones</span>
                    </button>
                    <button onClick={() => setActiveTab('landing')} style={{ ...styles.tab, ...(activeTab === 'landing' ? styles.tabActive : {}) }}>
                        <span style={styles.tabIcon}>🎨</span><span>Landing</span>
                    </button>
                    <button onClick={() => setActiveTab('reels')} style={{ ...styles.tab, ...(activeTab === 'reels' ? styles.tabActive : {}) }}>
                        <span style={styles.tabIcon}>🎬</span><span>Reels</span>
                    </button>
                </div>

                <div style={styles.content}>
                    {activeTab === 'sections' && <LandingSectionsBuilder />}
                    {activeTab === 'landing' && <LandingStyling />}
                    {activeTab === 'reels' && <ReelsStyling />}
                </div>
            </Container>
        </Box>
    );
}
