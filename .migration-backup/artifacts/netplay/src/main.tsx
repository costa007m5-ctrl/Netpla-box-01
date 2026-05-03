import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './lib/firebase';

const basePath = import.meta.env.BASE_URL || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basePath.endsWith('/') ? basePath.slice(0, -1) : basePath}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
