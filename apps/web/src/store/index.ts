import { configureStore } from '@reduxjs/toolkit';
import medicationReducer from './medicationSlice';
import adherenceReducer from './adherenceSlice';
import reminderReducer from './reminderSlice';

export const store = configureStore({
  reducer: {
    medications: medicationReducer,
    adherence: adherenceReducer,
    reminders: reminderReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
