import React from 'react';
import { Box } from '@mui/material';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Comparison from '../components/landing/Comparison'; // New
import DetailedFeatures from '../components/landing/DetailedFeatures'; // New
import HowItWorks from '../components/landing/HowItWorks'; // New
import CallToAction from '../components/landing/CallToAction';

const HomePage: React.FC = () => {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Hero />
      <Features />
      <Comparison />
      <DetailedFeatures />
      <HowItWorks />
      <CallToAction />

      {/* Simple Footer */}
      <Box sx={{ py: 4, textAlign: 'center', bgcolor: '#000', color: '#666' }}>
        VisualTaste © {new Date().getFullYear()}
      </Box>
    </Box>
  );
};

export default HomePage;
