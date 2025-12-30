import { configureStore } from '@reduxjs/toolkit';
import medicationReducer from './medicationSlice';
import adherenceReducer from './adherenceSlice';
import reminderReducer from './reminderSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    medications: medicationReducer,
    adherence: adherenceReducer,
    reminders: reminderReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
