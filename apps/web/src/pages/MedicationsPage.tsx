import { useState, useEffect } from 'react';
import { MedicationCard } from '../components/MedicationCard';
import { Button } from '../components/ui/Button';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import type { Medication } from '../types';
import api from '../services/api';

// Helper to calculate schedule times based on frequency and first dose time
function calculateScheduleTimes(firstTime: string, frequency: number): string[] {
  const times: string[] = [firstTime];
  if (frequency <= 1) return times;
  
  const [hours, minutes] = firstTime.split(':').map(Number);
  const intervalHours = Math.floor(24 / frequency);
  
  for (let i = 1; i < frequency; i++) {
    let newHours = (hours + (intervalHours * i)) % 24;
    const period = newHours >= 12 ? 'PM' : 'AM';
    const displayHours = newHours > 12 ? newHours - 12 : (newHours === 0 ? 12 : newHours);
    times.push(`${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);
  }
  return times;
}

// Format time for display
function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Sample data for demo
const sampleMedications: Medication[] = [
  { id: 'm1', userId: 'demo', name: 'Lisinopril', dosage: '2 droplets', form: 'drops', instructions: 'Take once daily in the morning', isCritical: true, isActive: true, currentSupply: 25, lowSupplyThreshold: 7, frequency: 1, firstDoseTime: '08:00', scheduleTimes: ['8:00 AM'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm2', userId: 'demo', name: 'Metformin', dosage: '3 droplets', form: 'drops', instructions: 'Take with meals', isCritical: false, isActive: true, currentSupply: 60, lowSupplyThreshold: 10, frequency: 2, firstDoseTime: '08:00', scheduleTimes: ['8:00 AM', '8:00 PM'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm3', userId: 'demo', name: 'Aspirin', dosage: '1 droplet', form: 'drops', instructions: 'Take daily for heart health', isCritical: false, isActive: true, currentSupply: 5, lowSupplyThreshold: 7, frequency: 1, firstDoseTime: '09:00', scheduleTimes: ['9:00 AM'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('medications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return sampleMedications;
      }
    }
    return sampleMedications;
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'lowSupply'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    droplets: 1,
    instructions: '',
    isCritical: false,
    frequency: 1,
    firstDoseTime: '08:00',
  });

  // Save to localStorage whenever medications change
  useEffect(() => {
    localStorage.setItem('medications', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    setLoading(true);
    try {
      const response = await api.getMedications();
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setMedications(response.data);
      }
    } catch (err) {
      console.log('Using local medications');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (!newMed.name) {
      alert('Please fill in medication name');
      return;
    }

    const scheduleTimes = calculateScheduleTimes(newMed.firstDoseTime, newMed.frequency);
    
    const newMedication: Medication = {
      id: `m${Date.now()}`,
      userId: 'demo',
      name: newMed.name,
      dosage: `${newMed.droplets} droplet${newMed.droplets > 1 ? 's' : ''}`,
      form: 'drops',
      instructions: newMed.instructions,
      isCritical: newMed.isCritical,
      isActive: true,
      currentSupply: 30,
      lowSupplyThreshold: 7,
      frequency: newMed.frequency,
      firstDoseTime: newMed.firstDoseTime,
      scheduleTimes: scheduleTimes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add locally first
    setMedications(prev => [...prev, newMedication]);
    setShowAddForm(false);
    setNewMed({ name: '', droplets: 1, instructions: '', isCritical: false, frequency: 1, firstDoseTime: '08:00' });

    // Try API call
    try {
      await api.createMedication(newMedication);
    } catch (err) {
      console.log('Saved locally');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this medication?')) {
      setMedications(prev => prev.filter(m => m.id !== id));
      try {
        await api.deleteMedication(id);
      } catch (err) {
        console.log('Deleted locally');
      }
    }
  };

  const handleTakeDose = (id: string) => {
    setMedications(prev => 
      prev.map(m => {
        if (m.id === id && m.currentSupply !== undefined && m.currentSupply > 0) {
          return { ...m, currentSupply: m.currentSupply - 1 };
        }
        return m;
      })
    );
  };

  const filteredMeds = medications.filter(m => {
    if (filter === 'critical') return m.isCritical;
    if (filter === 'lowSupply') return (m.currentSupply || 0) <= (m.lowSupplyThreshold || 7);
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Medications</h1>
        <Button onClick={() => setShowAddForm(true)}>+ Add Medication</Button>
      </div>

      {/* Add Medication Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardTitle>Add New Medication</CardTitle>
          <CardContent className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Medication Name *</label>
              <input
                type="text"
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., Lisinopril"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">💧 Droplets per dose</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newMed.droplets}
                  onChange={(e) => setNewMed({ ...newMed, droplets: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-lg font-semibold w-20 text-center">
                  {newMed.droplets} 💧
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">⏰ First dose time</label>
              <input
                type="time"
                value={newMed.firstDoseTime}
                onChange={(e) => setNewMed({ ...newMed, firstDoseTime: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">📅 Frequency per day</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setNewMed({ ...newMed, frequency: freq })}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      newMed.frequency === freq 
                        ? 'bg-blue-100 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {freq}x daily
                  </button>
                ))}
              </div>
              {newMed.frequency > 1 && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">Scheduled times:</p>
                  <p className="text-sm text-blue-600">
                    {calculateScheduleTimes(newMed.firstDoseTime, newMed.frequency).join(' → ')}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    (Every {Math.floor(24 / newMed.frequency)} hours)
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Instructions</label>
              <textarea
                value={newMed.instructions}
                onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., Take with food"
                rows={2}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newMed.isCritical}
                onChange={(e) => setNewMed({ ...newMed, isCritical: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm">⚠️ Mark as critical medication</label>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddMedication}>Save Medication</Button>
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'critical', 'lowSupply'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'critical' ? '⚠️ Critical' : '💧 Low Supply'}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">Loading medications...</p>}

      {/* Medication List */}
      <div className="space-y-4">
        {filteredMeds.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              No medications found. Click "Add Medication" to get started.
            </CardContent>
          </Card>
        ) : (
          filteredMeds.map((med) => (
            <MedicationCard 
              key={med.id} 
              medication={med} 
              onTakeDose={() => handleTakeDose(med.id)}
              onDelete={() => handleDelete(med.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
