import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MigrationProvider } from './context/MigrationContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <MigrationProvider>
      <App />
    </MigrationProvider>
);
