import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ReminderCard } from '../components/ReminderCard';
import { Card, CardContent } from '../components/ui/Card';
import { setReminders, markTaken, markSkipped, setLoading } from '../store/reminderSlice';
import type { RootState } from '../store';
import type { Reminder, Medication } from '../types';
import api from '../services/api';

// Generate today's reminders from medications
function generateRemindersFromMedications(medications: Medication[]): Reminder[] {
  const reminders: Reminder[] = [];
  
  medications.forEach(med => {
    if (!med.isActive) return;
    
    const scheduleTimes = med.scheduleTimes || ['8:00 AM'];
    scheduleTimes.forEach((time, index) => {
      reminders.push({
        id: `${med.id}-${index}`,
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        scheduledTime: time,
        status: 'pending',
        isCritical: med.isCritical,
      });
    });
  });
  
  // Sort by time
  return reminders.sort((a, b) => {
    const timeA = parseTime(a.scheduledTime);
    const timeB = parseTime(b.scheduledTime);
    return timeA - timeB;
  });
}

// Parse time string to minutes for sorting
function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3]?.toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

export function HomePage() {
  const dispatch = useDispatch();
  const { reminders, loading } = useSelector((state: RootState) => state.reminders);
  const [localReminders, setLocalReminders] = useState<Reminder[]>([]);
  const [snoozeId, setSnoozeId] = useState<string | null>(null);

  // Load medications and generate reminders
  useEffect(() => {
    loadRemindersFromMedications();
  }, []);

  const loadRemindersFromMedications = async () => {
    dispatch(setLoading(true));
    
    // First try to load from localStorage medications
    const savedMeds = localStorage.getItem('medications');
    if (savedMeds) {
      try {
        const medications: Medication[] = JSON.parse(savedMeds);
        const generatedReminders = generateRemindersFromMedications(medications);
        
        // Load saved reminder statuses
        const savedStatuses = localStorage.getItem('reminderStatuses');
        const statuses: Record<string, 'pending' | 'completed' | 'missed'> = savedStatuses ? JSON.parse(savedStatuses) : {};
        
        // Apply saved statuses
        const remindersWithStatus = generatedReminders.map(r => ({
          ...r,
          status: statuses[r.id] || 'pending'
        }));
        
        setLocalReminders(remindersWithStatus);
        dispatch(setReminders(remindersWithStatus));
      } catch (e) {
        console.log('Error parsing medications');
      }
    }
    
    // Try API call
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

  // Use local reminders if Redux store is empty
  const displayReminders = reminders.length > 0 ? reminders : localReminders;

  // Save reminder statuses to localStorage
  const saveReminderStatuses = (updatedReminders: Reminder[]) => {
    const statuses: Record<string, string> = {};
    updatedReminders.forEach(r => {
      statuses[r.id] = r.status;
    });
    localStorage.setItem('reminderStatuses', JSON.stringify(statuses));
  };

  const handleTake = async (id: string) => {
    const updatedReminders = localReminders.map(r => 
      r.id === id ? { ...r, status: 'completed' as const } : r
    );
    setLocalReminders(updatedReminders);
    dispatch(markTaken(id));
    saveReminderStatuses(updatedReminders);

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
    const updatedReminders = localReminders.map(r => 
      r.id === id ? { ...r, status: 'missed' as const } : r
    );
    setLocalReminders(updatedReminders);
    dispatch(markSkipped(id));
    saveReminderStatuses(updatedReminders);

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
    
    const updatedReminders = localReminders.map(r => {
      if (r.id === id) {
        const match = r.scheduledTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          let hours = parseInt(match[1]);
          let minutes = parseInt(match[2]);
          const period = match[3] || '';
          
          minutes += 15;
          if (minutes >= 60) {
            minutes -= 60;
            hours += 1;
          }
          
          let newPeriod = period;
          if (hours === 12 && period === 'AM') newPeriod = 'PM';
          if (hours > 12) {
            hours -= 12;
            if (period === 'AM') newPeriod = 'PM';
          }
          
          const newTime = `${hours}:${minutes.toString().padStart(2, '0')} ${newPeriod}`;
          return { ...r, scheduledTime: newTime };
        }
      }
      return r;
    });
    
    setLocalReminders(updatedReminders);

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
    localStorage.removeItem('reminderStatuses');
    loadRemindersFromMedications();
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

      {/* No medications message */}
      {total === 0 && !loading && (
        <Card className="mb-6">
          <CardContent className="text-center py-8">
            <span className="text-4xl mb-4 block">💊</span>
            <p className="text-gray-600 mb-2">No medications scheduled for today</p>
            <p className="text-sm text-gray-500">Add medications in the Medications tab to see reminders here</p>
          </CardContent>
        </Card>
      )}

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
              Reset today's reminders
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
