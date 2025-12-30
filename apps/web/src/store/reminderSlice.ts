import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Reminder } from '../types';

interface ReminderState {
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
}

const initialState: ReminderState = {
  reminders: [],
  loading: false,
  error: null,
};

const reminderSlice = createSlice({
  name: 'reminders',
  initialState,
  reducers: {
    setReminders: (state, action: PayloadAction<Reminder[]>) => {
      state.reminders = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    markTaken: (state, action: PayloadAction<string>) => {
      const reminder = state.reminders.find(r => r.id === action.payload);
      if (reminder) {
        reminder.status = 'completed';
      }
    },
    markSkipped: (state, action: PayloadAction<string>) => {
      const reminder = state.reminders.find(r => r.id === action.payload);
      if (reminder) {
        reminder.status = 'missed';
      }
    },
  },
});

export const { setReminders, setLoading, setError, markTaken, markSkipped } = reminderSlice.actions;
export default reminderSlice.reducer;
