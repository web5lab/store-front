import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from '@/store';
import { ConfirmProvider } from '@/components/ui/Confirm';
import './index.css';
import App from './App.jsx';

/* Below the desktop breakpoint, toasts sit centred above the bottom tab bar. */
const phone = window.matchMedia?.('(max-width: 1023px)').matches;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </BrowserRouter>
        <Toaster
          position={phone ? 'bottom-center' : 'bottom-right'}
          containerStyle={phone ? { bottom: 'calc(84px + env(safe-area-inset-bottom))' } : undefined}
          toastOptions={{
            duration: 3500,
            style: { background: '#14213D', color: '#fff', borderRadius: '12px', fontSize: '13.5px', fontWeight: 500, padding: '10px 14px' },
            success: { iconTheme: { primary: '#5ee0a8', secondary: '#14213D' } },
            error: { duration: 5000, iconTheme: { primary: '#ff8a80', secondary: '#14213D' } },
          }}
        />
      </PersistGate>
    </Provider>
  </StrictMode>
);
