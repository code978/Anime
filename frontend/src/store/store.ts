import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import generationSlice from './slices/generationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    ui: uiSlice,
    generation: generationSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;