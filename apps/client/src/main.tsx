// src/main.tsx - SIN React.StrictMode para evitar doble ejecución
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import '@fontsource-variable/fraunces/index.css'

// 🚨 QUITAR React.StrictMode para evitar doble ejecución en desarrollo
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
