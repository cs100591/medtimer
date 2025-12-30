import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ReminderCard } from '../components/ReminderCard';
import { Card, CardContent } from '../components/ui/Card';
import { setReminders, markTaken, markSkipped, setLoading } from '../store/reminderSlice';
import type { RootState } from '../store';
import type { Reminder } from '../types';
import api from '../services/api';

// Sample data for demo when API is not available
const sampleReminders: Reminder[] = [
  { id: '1', medicationId: 'm1', medicationName: 'Lisinopril', dosage: '10mg tablet', scheduledTime: '8:00 AM', status: 'pending', isCritical: true },
  { id: '2', medicationId: 'm2', medicationName: 'Metformin', dosage: '500mg tablet', scheduledTime: '12:00 PM', status: 'pending', isCritical: false },
  { id: '3', medicationId: 'm3', medicationName: 'Aspirin', dosage: '81mg tablet', scheduledTime: '6:00 PM', status: 'pending', isCritical: false },
];

export function HomePage() {
  const dispatch = useDispatch();
  const { reminders, loading } = useSelector((state: RootState) => state.reminders);
  const [localReminders, setLocalReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('reminders');
    return saved ? JSON.parse(saved) : sampleReminders;
  });
  const [snoozeId, setSnoozeId] = useState<string | null>(null);

  // Use local reminders if Redux store is empty
  const displayReminders = reminders.length > 0 ? reminders : localReminders;

  useEffect(() => {
    // Try to load from API, fall back to local storage
    loadReminders();
  }, []);

  // Save to localStorage whenever localReminders change
  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(localReminders));
  }, [localReminders]);

  const loadReminders = async () => {
    dispatch(setLoading(true));
    try {
      const response = await api.getPendingReminders();
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        dispatch(setReminders(response.data));
      }
    } catch (err) {
      console.log('Using local reminders');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleTake = async (id: string) => {
    // Update local state immediately for responsiveness
    setLocalReminders(prev => 
      prev.map(r => r.id === id ? { ...r, status: 'completed' as const } : r)
    );
    dispatch(markTaken(id));

    // Try API call
    const reminder = displayReminders.find(r => r.id === id);
    if (reminder) {
      try {
        await api.markTaken(reminder.medicationId);
      } catch (err) {
        console.log('Saved locally');
      }
    }
  };

  const handleSkip = async (id: string) => {
    // Update local state immediately
    setLocalReminders(prev => 
      prev.map(r => r.id === id ? { ...r, status: 'missed' as const } : r)
    );
    dispatch(markSkipped(id));

    // Try API call
    const reminder = displayReminders.find(r => r.id === id);
    if (reminder) {
      try {
        await api.markSkipped(reminder.medicationId, 'User skipped');
      } catch (err) {
        console.log('Saved locally');
      }
    }
  };

  const handleSnooze = async (id: string) => {
    setSnoozeId(id);
    
    // Snooze for 15 minutes - update the scheduled time
    setLocalReminders(prev => 
      prev.map(r => {
        if (r.id === id) {
          const [time, period] = r.scheduledTime.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let newMinutes = minutes + 15;
          let newHours = hours;
          if (newMinutes >= 60) {
            newMinutes -= 60;
            newHours += 1;
          }
          const newTime = `${newHours}:${newMinutes.toString().padStart(2, '0')} ${period}`;
          return { ...r, scheduledTime: newTime };
        }
        return r;
      })
    );

    // Try API call
    const reminder = displayReminders.find(r => r.id === id);
    if (reminder) {
      try {
        await api.snooze(reminder.medicationId, 15);
      } catch (err) {
        console.log('Snoozed locally');
      }
    }

    setTimeout(() => setSnoozeId(null), 2000);
  };

  const handleReset = () => {
    const resetReminders = sampleReminders.map(r => ({ ...r, status: 'pending' as const }));
    setLocalReminders(resetReminders);
    dispatch(setReminders(resetReminders));
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const completed = displayReminders.filter(r => r.status === 'completed').length;
  const total = displayReminders.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const pendingReminders = displayReminders.filter(r => r.status === 'pending');
  const completedReminders = displayReminders.filter(r => r.status === 'completed');

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
        {completed === total && total > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg text-green-700 text-center">
            🎉 Great job! All medications taken for today!
          </div>
        )}
      </div>

      {/* Snooze notification */}
      {snoozeId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
          😴 Reminder snoozed for 15 minutes
        </div>
      )}

      {loading && <p className="text-gray-500 mb-4">Loading...</p>}

      {/* Pending Reminders */}
      {pendingReminders.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">Upcoming Reminders</h2>
          <div className="space-y-4 mb-6">
            {pendingReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onTake={() => handleTake(reminder.id)}
                onSkip={() => handleSkip(reminder.id)}
                onSnooze={() => handleSnooze(reminder.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Completed Reminders */}
      {completedReminders.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4 text-green-700">✓ Completed</h2>
          <div className="space-y-4 mb-6 opacity-75">
            {completedReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
              />
            ))}
          </div>
        </>
      )}

      {/* Reset button for demo */}
      {completed > 0 && (
        <Card className="mt-6">
          <CardContent className="text-center py-4">
            <button 
              onClick={handleReset}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Reset demo reminders
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
