import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AdherenceRecord, AdherenceStats } from '../types';

interface AdherenceState {
  records: AdherenceRecord[];
  stats: AdherenceStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: AdherenceState = {
  records: [],
  stats: null,
  loading: false,
  error: null,
};

export const fetchAdherenceRecords = createAsyncThunk(
  'adherence/fetchRecords',
  async ({ medicationId, startDate, endDate }: { 
    medicationId: string; 
    startDate: string; 
    endDate: string;
  }) => {
    const response = await fetch(
      `/api/v1/adherence?medicationId=${medicationId}&start=${startDate}&end=${endDate}`
    );
    return response.json();
  }
);

export const logAdherence = createAsyncThunk(
  'adherence/log',
  async (record: Omit<AdherenceRecord, 'id' | 'createdAt'>) => {
    const response = await fetch('/api/v1/adherence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return response.json();
  }
);

export const fetchAdherenceStats = createAsyncThunk(
  'adherence/fetchStats',
  async ({ userId, period }: { userId: string; period: 'week' | 'month' | 'year' }) => {
    const response = await fetch(`/api/v1/adherence/stats?userId=${userId}&period=${period}`);
    return response.json();
  }
);

const adherenceSlice = createSlice({
  name: 'adherence',
  initialState,
  reducers: {
    clearRecords: (state) => {
      state.records = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdherenceRecords.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdherenceRecords.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload;
      })
      .addCase(fetchAdherenceRecords.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch records';
      })
      .addCase(logAdherence.fulfilled, (state, action) => {
        state.records.push(action.payload);
      })
      .addCase(fetchAdherenceStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { clearRecords } = adherenceSlice.actions;
export default adherenceSlice.reducer;
