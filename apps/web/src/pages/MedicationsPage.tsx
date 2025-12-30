import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MedicationCard } from '../components/MedicationCard';
import { Button } from '../components/ui/Button';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import type { RootState } from '../store';
import api from '../services/api';

export function MedicationsPage() {
  const { medications, loading, error } = useSelector((state: RootState) => state.medications);
  const [filter, setFilter] = useState<'all' | 'critical' | 'lowSupply'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    form: 'tablet',
    instructions: '',
    isCritical: false,
  });

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const response = await api.getMedications();
      if (response.data) {
        // Update store with fetched medications
      }
    } catch (err) {
      console.error('Failed to load medications:', err);
    }
  };

  const handleAddMedication = async () => {
    if (!newMed.name || !newMed.dosage) {
      alert('Please fill in name and dosage');
      return;
    }

    try {
      const response = await api.createMedication({
        ...newMed,
        userId: 'current-user',
        isActive: true,
        currentSupply: 30,
        lowSupplyThreshold: 7,
      });
      
      if (response.data) {
        setShowAddForm(false);
        setNewMed({ name: '', dosage: '', form: 'tablet', instructions: '', isCritical: false });
        loadMedications();
      } else {
        alert(response.error || 'Failed to add medication');
      }
    } catch (err) {
      alert('Failed to add medication');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this medication?')) {
      try {
        await api.deleteMedication(id);
        loadMedications();
      } catch (err) {
        alert('Failed to delete medication');
      }
    }
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
              onClick={() => console.log('View', med.id)}
              onDelete={() => handleDelete(med.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
