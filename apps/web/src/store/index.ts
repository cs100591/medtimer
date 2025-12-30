import { configureStore } from '@reduxjs/toolkit';
import medicationReducer from './medicationSlice';
import adherenceReducer from './adherenceSlice';

export const store = configureStore({
  reducer: {
    medications: medicationReducer,
    adherence: adherenceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
