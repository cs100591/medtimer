import React, { useState } from 'react';
import { MedicationCard } from '../components/MedicationCard';
import { Button } from '../components/ui/Button';
import type { Medication } from '../types';

// Sample data
const sampleMedications: Medication[] = [
  { id: '1', userId: 'u1', name: 'Lisinopril', genericName: 'Lisinopril', dosage: '10mg', form: 'tablet', instructions: 'Take once daily in the morning', isCritical: false, isActive: true, currentSupply: 25, lowSupplyThreshold: 7, createdAt: '', updatedAt: '' },
  { id: '2', userId: 'u1', name: 'Metformin', genericName: 'Metformin HCL', dosage: '500mg', form: 'tablet', instructions: 'Take with meals', isCritical: false, isActive: true, currentSupply: 60, lowSupplyThreshold: 14, createdAt: '', updatedAt: '' },
  { id: '3', userId: 'u1', name: 'Aspirin', genericName: 'Acetylsalicylic acid', dosage: '81mg', form: 'tablet', instructions: 'Take daily for heart health', isCritical: true, isActive: true, currentSupply: 5, lowSupplyThreshold: 7, createdAt: '', updatedAt: '' },
];

export function MedicationsPage() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'lowSupply'>('all');

  const filteredMeds = sampleMedications.filter(m => {
    if (filter === 'critical') return m.isCritical;
    if (filter === 'lowSupply') return m.currentSupply! <= m.lowSupplyThreshold!;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Medications</h1>
        <Button>+ Add Medication</Button>
      </div>

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

      {/* Medication List */}
      <div className="space-y-4">
        {filteredMeds.map((med) => (
          <MedicationCard key={med.id} medication={med} onClick={() => console.log('View', med.id)} />
        ))}
      </div>
    </div>
  );
}
