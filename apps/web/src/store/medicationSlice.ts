import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Medication } from '../types';

interface MedicationState {
  medications: Medication[];
  selectedMedication: Medication | null;
  loading: boolean;
  error: string | null;
}

const initialState: MedicationState = {
  medications: [],
  selectedMedication: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchMedications = createAsyncThunk(
  'medications/fetchAll',
  async (userId: string) => {
    // In real app, this would call the API
    const response = await fetch(`/api/v1/medications?userId=${userId}`);
    return response.json();
  }
);

export const createMedication = createAsyncThunk(
  'medications/create',
  async (medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>) => {
    const response = await fetch('/api/v1/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medication),
    });
    return response.json();
  }
);

export const updateMedication = createAsyncThunk(
  'medications/update',
  async ({ id, updates }: { id: string; updates: Partial<Medication> }) => {
    const response = await fetch(`/api/v1/medications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.json();
  }
);

export const deleteMedication = createAsyncThunk(
  'medications/delete',
  async (id: string) => {
    await fetch(`/api/v1/medications/${id}`, { method: 'DELETE' });
    return id;
  }
);


const medicationSlice = createSlice({
  name: 'medications',
  initialState,
  reducers: {
    selectMedication: (state, action: PayloadAction<string | null>) => {
      state.selectedMedication = action.payload 
        ? state.medications.find(m => m.id === action.payload) || null
        : null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMedications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMedications.fulfilled, (state, action) => {
        state.loading = false;
        state.medications = action.payload;
      })
      .addCase(fetchMedications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch medications';
      })
      .addCase(createMedication.fulfilled, (state, action) => {
        state.medications.push(action.payload);
      })
      .addCase(updateMedication.fulfilled, (state, action) => {
        const index = state.medications.findIndex(m => m.id === action.payload.id);
        if (index !== -1) state.medications[index] = action.payload;
      })
      .addCase(deleteMedication.fulfilled, (state, action) => {
        state.medications = state.medications.filter(m => m.id !== action.payload);
      });
  },
});

export const { selectMedication, clearError } = medicationSlice.actions;
export default medicationSlice.reducer;
