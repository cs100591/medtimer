import React from 'react';
import { ReminderCard } from '../components/ReminderCard';
import type { Reminder } from '../types';

// Sample data - in real app, this comes from Redux store
const sampleReminders: Reminder[] = [
  { id: '1', medicationId: 'm1', medicationName: 'Lisinopril', dosage: '10mg tablet', scheduledTime: '8:00 AM', status: 'pending', isCritical: false },
  { id: '2', medicationId: 'm2', medicationName: 'Metformin', dosage: '500mg tablet', scheduledTime: '12:00 PM', status: 'pending', isCritical: false },
  { id: '3', medicationId: 'm3', medicationName: 'Aspirin', dosage: '81mg tablet', scheduledTime: '6:00 AM', status: 'completed', isCritical: true },
];

export function HomePage() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const completed = sampleReminders.filter(r => r.status === 'completed').length;
  const total = sampleReminders.length;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Today</h1>
        <p className="text-gray-600">{dateStr}</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Today's Progress</p>
            <p className="text-2xl font-bold">{completed} of {total} taken</p>
          </div>
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" strokeWidth="3"
                strokeDasharray={`${progress} 100`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Reminders */}
      <h2 className="text-lg font-semibold mb-4">Upcoming Reminders</h2>
      <div className="space-y-4">
        {sampleReminders.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            onTake={() => console.log('Take', reminder.id)}
            onSkip={() => console.log('Skip', reminder.id)}
            onSnooze={() => console.log('Snooze', reminder.id)}
          />
        ))}
      </div>
    </div>
  );
}
