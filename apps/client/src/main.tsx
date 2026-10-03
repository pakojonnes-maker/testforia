// src/main.tsx
// Sin React.StrictMode, a propósito: evita la doble ejecución de efectos en desarrollo.
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
