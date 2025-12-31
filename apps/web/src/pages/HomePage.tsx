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

// Group reminders by time
interface ReminderGroup {
  time: string;
  reminders: Reminder[];
}

function groupRemindersByTime(reminders: Reminder[]): ReminderGroup[] {
  const groups: Map<string, Reminder[]> = new Map();
  
  reminders.forEach(reminder => {
    const time = reminder.scheduledTime;
    if (!groups.has(time)) {
      groups.set(time, []);
    }
    groups.get(time)!.push(reminder);
  });
  
  return Array.from(groups.entries())
    .map(([time, reminders]) => ({ time, reminders }))
    .sort((a, b) => parseTime(a.time) - parseTime(b.time));
}

// Expandable Time Group Component
function TimeGroup({ 
  group, 
  expandedGroups, 
  toggleGroup, 
  onTake, 
  onSkip, 
  onSnooze,
  isPending 
}: { 
  group: ReminderGroup;
  expandedGroups: Set<string>;
  toggleGroup: (time: string) => void;
  onTake?: (id: string) => void;
  onSkip?: (id: string) => void;
  onSnooze?: (id: string) => void;
  isPending: boolean;
}) {
  const isExpanded = expandedGroups.has(group.time);
  const hasCritical = group.reminders.some(r => r.isCritical);
  const allCompleted = group.reminders.every(r => r.status === 'completed');
  
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden mb-3 ${hasCritical ? 'border-l-4 border-red-500' : ''}`}>
      {/* Header - always visible */}
      <button
        onClick={() => toggleGroup(group.time)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${allCompleted ? 'bg-green-100' : 'bg-blue-100'}`}>
            <span className="text-lg">{allCompleted ? '✅' : '⏰'}</span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">{group.time}</p>
            <p className="text-sm text-gray-500">
              {group.reminders.length} medication{group.reminders.length > 1 ? 's' : ''}
              {hasCritical && <span className="text-red-500 ml-1">⚠️</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Medication pills preview */}
          <div className="flex -space-x-2">
            {group.reminders.slice(0, 3).map((r, i) => (
              <div 
                key={r.id}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ${
                  r.status === 'completed' ? 'bg-green-100 text-green-700' : 
                  r.isCritical ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}
                title={r.medicationName}
              >
                {r.medicationName.charAt(0)}
              </div>
            ))}
            {group.reminders.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold border-2 border-white">
                +{group.reminders.length - 3}
              </div>
            )}
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-gray-50">
          {group.reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onTake={isPending && onTake ? () => onTake(reminder.id) : undefined}
              onSkip={isPending && onSkip ? () => onSkip(reminder.id) : undefined}
              onSnooze={isPending && onSnooze ? () => onSnooze(reminder.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const dispatch = useDispatch();
  const { reminders, loading } = useSelector((state: RootState) => state.reminders);
  const [localReminders, setLocalReminders] = useState<Reminder[]>([]);
  const [snoozeId, setSnoozeId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (time: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(time)) {
        next.delete(time);
      } else {
        next.add(time);
      }
      return next;
    });
  };

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
  
  // Group reminders by time
  const pendingGroups = groupRemindersByTime(pendingReminders);
  const completedGroups = groupRemindersByTime(completedReminders);

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

      {/* Pending Reminders - Grouped by Time */}
      {pendingGroups.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">Upcoming Reminders</h2>
          <p className="text-sm text-gray-500 mb-3">Tap a time slot to expand and see all medications</p>
          <div className="mb-6">
            {pendingGroups.map((group) => (
              <TimeGroup
                key={group.time}
                group={group}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                onTake={handleTake}
                onSkip={handleSkip}
                onSnooze={handleSnooze}
                isPending={true}
              />
            ))}
          </div>
        </>
      )}

      {/* Completed Reminders - Grouped by Time */}
      {completedGroups.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4 text-green-700">✓ Completed</h2>
          <div className="mb-6 opacity-75">
            {completedGroups.map((group) => (
              <TimeGroup
                key={group.time}
                group={group}
                expandedGroups={expandedGroups}
                toggleGroup={toggleGroup}
                isPending={false}
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
