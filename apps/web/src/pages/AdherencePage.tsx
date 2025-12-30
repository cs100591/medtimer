import React, { useState } from 'react';
import { AdherenceChart } from '../components/AdherenceChart';
import type { AdherenceStats } from '../types';

const sampleStats: AdherenceStats = {
  totalDoses: 50,
  takenDoses: 42,
  missedDoses: 5,
  skippedDoses: 3,
  adherenceRate: 0.84,
  period: { start: '2025-12-23', end: '2025-12-30' },
};

export function AdherencePage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Adherence</h1>
        <div className="flex gap-2">
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Share">📤</button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Export">📥</button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              period === p ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <AdherenceChart stats={sampleStats} />

      {/* By Medication */}
      <h2 className="text-lg font-semibold mt-8 mb-4">By Medication</h2>
      <div className="space-y-3">
        {[
          { name: 'Lisinopril', rate: 0.95 },
          { name: 'Metformin', rate: 0.82 },
          { name: 'Aspirin', rate: 0.78 },
        ].map((med) => (
          <div key={med.name} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{med.name}</span>
              <span className={`font-bold ${med.rate >= 0.8 ? 'text-green-600' : 'text-orange-500'}`}>
                {Math.round(med.rate * 100)}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${med.rate >= 0.8 ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${med.rate * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
