import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import globalReducer from './global.Slice';

/* redux-persist's bundled storage is CommonJS and loses its default export
   under Vite, so localStorage is wrapped here directly. */
const storage = {
  getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve(window.localStorage.setItem(key, value)),
  removeItem: (key) => Promise.resolve(window.localStorage.removeItem(key)),
};

const persistConfig = {
  key: 'stockbook',
  storage,
  /* Only the session. The token itself lives in localStorage under authToken. */
  whitelist: ['logedIn', 'user'],
};

export const store = configureStore({
  reducer: {
    global: persistReducer(persistConfig, globalReducer),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'] },
    }),
});

export const persistor = persistStore(store);
