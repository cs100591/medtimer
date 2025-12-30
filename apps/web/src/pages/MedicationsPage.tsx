import { useState, useEffect } from 'react';
import { MedicationCard } from '../components/MedicationCard';
import { Button } from '../components/ui/Button';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import type { Medication } from '../types';
import api from '../services/api';

// Sample data for demo
const sampleMedications: Medication[] = [
  { id: 'm1', userId: 'demo', name: 'Lisinopril', dosage: '10mg', form: 'tablet', instructions: 'Take once daily with food', isCritical: true, isActive: true, currentSupply: 25, lowSupplyThreshold: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm2', userId: 'demo', name: 'Metformin', dosage: '500mg', form: 'tablet', instructions: 'Take twice daily with meals', isCritical: false, isActive: true, currentSupply: 45, lowSupplyThreshold: 10, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'm3', userId: 'demo', name: 'Aspirin', dosage: '81mg', form: 'tablet', instructions: 'Take once daily', isCritical: false, isActive: true, currentSupply: 5, lowSupplyThreshold: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('medications');
    return saved ? JSON.parse(saved) : sampleMedications;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'lowSupply'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    form: 'tablet',
    instructions: '',
    isCritical: false,
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
    if (!newMed.name || !newMed.dosage) {
      alert('Please fill in name and dosage');
      return;
    }

    const newMedication: Medication = {
      id: `m${Date.now()}`,
      userId: 'demo',
      name: newMed.name,
      dosage: newMed.dosage,
      form: newMed.form as Medication['form'],
      instructions: newMed.instructions,
      isCritical: newMed.isCritical,
      isActive: true,
      currentSupply: 30,
      lowSupplyThreshold: 7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add locally first
    setMedications(prev => [...prev, newMedication]);
    setShowAddForm(false);
    setNewMed({ name: '', dosage: '', form: 'tablet', instructions: '', isCritical: false });

    // Try API call
    try {
      await api.createMedication(newMedication);
    } catch (err) {
      console.log('Saved locally');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this medication?')) {
      // Delete locally first
      setMedications(prev => prev.filter(m => m.id !== id));

      // Try API call
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
              <label className="block text-sm font-medium mb-1">Dosage *</label>
              <input
                type="text"
                value={newMed.dosage}
                onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., 10mg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Form</label>
              <select
                value={newMed.form}
                onChange={(e) => setNewMed({ ...newMed, form: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="liquid">Liquid</option>
                <option value="injection">Injection</option>
                <option value="inhaler">Inhaler</option>
                <option value="patch">Patch</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Instructions</label>
              <textarea
                value={newMed.instructions}
                onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g., Take once daily with food"
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
              <label className="text-sm">Mark as critical medication</label>
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
            {f === 'all' ? 'All' : f === 'critical' ? '⚠️ Critical' : '📦 Low Supply'}
          </button>
        ))}
      </div>

      {/* Loading/Error States */}
      {loading && <p className="text-gray-500">Loading medications...</p>}
      {error && <p className="text-red-500">{error}</p>}

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
