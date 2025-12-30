import React from 'react';
import type { AdherenceStats } from '../types';

interface AdherenceChartProps {
  stats: AdherenceStats;
}

export function AdherenceChart({ stats }: AdherenceChartProps) {
  const rate = Math.round(stats.adherenceRate * 100);
  const color = rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-orange-500' : 'text-red-500';
  const bgColor = rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Adherence Overview</h3>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${color}`}>{rate}%</span>
            <span className="text-gray-500">adherence rate</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-green-600">{stats.takenDoses}</div>
              <div className="text-sm text-gray-500">Taken</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-red-600">{stats.missedDoses}</div>
              <div className="text-sm text-gray-500">Missed</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-orange-500">{stats.skippedDoses}</div>
              <div className="text-sm text-gray-500">Skipped</div>
            </div>
          </div>
        </div>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="16" fill="none"
              stroke="currentColor" strokeWidth="3"
              strokeDasharray={`${rate} 100`}
              className={color}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${color}`}>{rate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
