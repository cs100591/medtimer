import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setReminders, markTaken, markSkipped, setLoading } from '../store/reminderSlice';
import type { RootState } from '../store';
import type { Reminder, Medication } from '../types';
import api from '../services/api';
import { useTranslation } from '../i18n/TranslationContext';

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
  return reminders.sort((a, b) => parseTime(a.scheduledTime) - parseTime(b.scheduledTime));
}

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

interface ReminderGroup {
  time: string;
  reminders: Reminder[];
}

function groupRemindersByTime(reminders: Reminder[]): ReminderGroup[] {
  const groups: Map<string, Reminder[]> = new Map();
  reminders.forEach(reminder => {
    const time = reminder.scheduledTime;
    if (!groups.has(time)) groups.set(time, []);
    groups.get(time)!.push(reminder);
  });
  return Array.from(groups.entries())
    .map(([time, reminders]) => ({ time, reminders }))
    .sort((a, b) => parseTime(a.time) - parseTime(b.time));
}

export function HomePage() {
  const { t, lang } = useTranslation();
  const isZh = lang === 'zh';
  const dispatch = useDispatch();
  const { reminders, loading } = useSelector((state: RootState) => state.reminders);
  const [localReminders, setLocalReminders] = useState<Reminder[]>([]);
  const [snoozeId, setSnoozeId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (time: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(time)) next.delete(time);
      else next.add(time);
      return next;
    });
  };

  useEffect(() => { loadRemindersFromMedications(); }, []);

  const loadRemindersFromMedications = async () => {
    dispatch(setLoading(true));
    const savedMeds = localStorage.getItem('medications');
    if (savedMeds) {
      try {
        const medications: Medication[] = JSON.parse(savedMeds);
        const generatedReminders = generateRemindersFromMedications(medications);
        const savedStatuses = localStorage.getItem('reminderStatuses');
        const statuses: Record<string, 'pending' | 'completed' | 'missed'> = savedStatuses ? JSON.parse(savedStatuses) : {};
        const remindersWithStatus = generatedReminders.map(r => ({ ...r, status: statuses[r.id] || 'pending' }));
        setLocalReminders(remindersWithStatus);
        dispatch(setReminders(remindersWithStatus));
      } catch (e) { console.log('Error parsing medications'); }
    }
    try {
      const response = await api.getPendingReminders();
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        dispatch(setReminders(response.data));
      }
    } catch (err) { console.log('Using local reminders'); }
    finally { dispatch(setLoading(false)); }
  };

  const displayReminders = reminders.length > 0 ? reminders : localReminders;

  const saveReminderStatuses = (updatedReminders: Reminder[]) => {
    const statuses: Record<string, string> = {};
    updatedReminders.forEach(r => { statuses[r.id] = r.status; });
    localStorage.setItem('reminderStatuses', JSON.stringify(statuses));
  };

  const handleTake = async (id: string) => {
    const updatedReminders = localReminders.map(r => r.id === id ? { ...r, status: 'completed' as const } : r);
    setLocalReminders(updatedReminders);
    dispatch(markTaken(id));
    saveReminderStatuses(updatedReminders);
    const reminder = displayReminders.find(r => r.id === id);
    if (reminder) { try { await api.markTaken(reminder.medicationId); } catch (err) { console.log('Saved locally'); } }
  };

  const handleSkip = async (id: string) => {
    const updatedReminders = localReminders.map(r => r.id === id ? { ...r, status: 'missed' as const } : r);
    setLocalReminders(updatedReminders);
    dispatch(markSkipped(id));
    saveReminderStatuses(updatedReminders);
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
          if (minutes >= 60) { minutes -= 60; hours += 1; }
          let newPeriod = period;
          if (hours === 12 && period === 'AM') newPeriod = 'PM';
          if (hours > 12) { hours -= 12; if (period === 'AM') newPeriod = 'PM'; }
          return { ...r, scheduledTime: `${hours}:${minutes.toString().padStart(2, '0')} ${newPeriod}` };
        }
      }
      return r;
    });
    setLocalReminders(updatedReminders);
    setTimeout(() => setSnoozeId(null), 2000);
  };

  const handleReset = () => { localStorage.removeItem('reminderStatuses'); loadRemindersFromMedications(); };

  const today = new Date();
  const dateStr = today.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const completed = displayReminders.filter(r => r.status === 'completed').length;
  const total = displayReminders.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pendingReminders = displayReminders.filter(r => r.status === 'pending');
  const completedReminders = displayReminders.filter(r => r.status === 'completed');
  const pendingGroups = groupRemindersByTime(pendingReminders);
  const completedGroups = groupRemindersByTime(completedReminders);

  const progressColor = progress >= 80 ? 'var(--success)' : progress >= 50 ? 'var(--warning)' : 'var(--primary)';

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24">
      {/* Header */}
      <header className="mb-8 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary-600 mb-1 uppercase tracking-wider">{dateStr}</p>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{isZh ? '今日提醒' : "Today's Reminders"}</h1>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl shadow-soft-md flex items-center justify-center border border-slate-100">
            <span className="text-2xl">📅</span>
          </div>
        </div>
      </header>

      {/* Progress Card - Premium Glass Style */}
      <div className="glass-card p-6 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100/50 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2" />

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-5xl font-bold text-slate-900 font-mono tracking-tighter">
                {completed}
                <span className="text-2xl text-slate-400 font-normal">/{total}</span>
              </h2>
            </div>
            <p className="text-slate-500 font-medium">{isZh ? '剂药物已服用' : 'Doses taken today'}</p>

            {completed === total && total > 0 ? (
              <div className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-xl inline-flex items-center gap-2 font-semibold shadow-sm border border-green-100">
                <span>🎉</span>
                {isZh ? '全部完成！' : 'All caught up!'}
              </div>
            ) : (
              <div className="mt-4 px-4 py-2 bg-blue-50 text-primary-700 rounded-xl inline-flex items-center gap-2 font-semibold shadow-sm border border-blue-100">
                <span>💪</span>
                {isZh ? '继续保持！' : 'Keep going!'}
              </div>
            )}
          </div>

          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-lg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={progressColor}
                strokeWidth="8"
                strokeDasharray={`${progress * 2.64} 264`}
                strokeLinecap="round"
                className="progress-ring"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-slate-900">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Snooze Toast */}
      {snoozeId && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-scale-in">
          <span className="text-xl">😴</span>
          <span className="font-medium">{t('snoozed')}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {total === 0 && !loading && (
        <div className="glass-card p-10 text-center border-dashed border-2 border-slate-200">
          <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">💊</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{t('noMedicationsToday')}</h3>
          <p className="text-slate-500">{t('addMedicationsHint')}</p>
        </div>
      )}

      {/* Pending Reminders */}
      {pendingGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
            </span>
            {t('upcomingReminders')}
          </h2>
          <div className="space-y-4 animate-enter-staggered">
            {pendingGroups.map((group) => (
              <TimeGroupCard
                key={group.time}
                group={group}
                isExpanded={expandedGroups.has(group.time) || pendingGroups.length === 1}
                onToggle={() => toggleGroup(group.time)}
                onTake={handleTake}
                onSkip={handleSkip}
                onSnooze={handleSnooze}
                isPending={true}
                isZh={isZh}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Reminders */}
      {completedGroups.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            {t('completed')}
          </h2>
          <div className="space-y-4 opacity-60 hover:opacity-100 transition-opacity duration-300">
            {completedGroups.map((group) => (
              <TimeGroupCard
                key={group.time}
                group={group}
                isExpanded={expandedGroups.has(group.time)}
                onToggle={() => toggleGroup(group.time)}
                isPending={false}
                isZh={isZh}
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reset Button */}
      {completed > 0 && (
        <div className="text-center pb-8">
          <button onClick={handleReset} className="btn-ghost text-sm text-slate-400 hover:text-slate-600">
            {t('resetReminders')}
          </button>
        </div>
      )}
    </div>
  );
}

function TimeGroupCard({ group, isExpanded, onToggle, onTake, onSkip, onSnooze, isPending, isZh, t }: {
  group: ReminderGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onTake?: (id: string) => void;
  onSkip?: (id: string) => void;
  onSnooze?: (id: string) => void;
  isPending: boolean;
  isZh: boolean;
  t: (key: string) => string;
}) {
  const allCompleted = group.reminders.every(r => r.status === 'completed');

  return (
    <div className={`glass-card overflow-hidden transition-all duration-300 transform ${isExpanded ? 'scale-[1.01] shadow-soft-lg ring-1 ring-primary-50' : 'hover:scale-[1.01]'}`}>
      <button onClick={onToggle} className="w-full px-5 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${allCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-primary-600'}`}>
            <span className="text-2xl font-mono font-bold tracking-tight">{group.time.replace(/\s*[AP]M/, '')}</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${allCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-primary-700'}`}>
                {group.time.includes('AM') ? 'Morning' : 'Evening'}
              </span>
            </div>
            <p className="text-slate-500 font-medium">
              {group.reminders.length} {group.reminders.length > 1 ? t('medicationsPlural') : t('medication')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!isExpanded && (
            <div className="flex -space-x-3">
              {group.reminders.slice(0, 3).map((r) => (
                <div key={r.id} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm transform transition-transform hover:translate-y-[-2px] ${r.status === 'completed' ? 'bg-green-500 text-white' : 'bg-white text-slate-700'
                  }`}>
                  {r.medicationName.charAt(0)}
                </div>
              ))}
              {group.reminders.length > 3 && (
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold border-2 border-white text-slate-500">
                  +{group.reminders.length - 3}
                </div>
              )}
            </div>
          )}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all duration-300 ${isExpanded ? 'rotate-180 bg-slate-100' : ''}`}>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50/50">
          {group.reminders.map((reminder) => (
            <MedicationItem
              key={reminder.id}
              reminder={reminder}
              onTake={isPending && onTake ? () => onTake(reminder.id) : undefined}
              onSkip={isPending && onSkip ? () => onSkip(reminder.id) : undefined}
              onSnooze={isPending && onSnooze ? () => onSnooze(reminder.id) : undefined}
              isZh={isZh}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MedicationItem({ reminder, onTake, onSkip, onSnooze, isZh, t }: {
  reminder: Reminder;
  onTake?: () => void;
  onSkip?: () => void;
  onSnooze?: () => void;
  isZh: boolean;
  t: (key: string) => string;
}) {
  const isCompleted = reminder.status === 'completed';

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md ${isCompleted ? 'opacity-70 bg-slate-50' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${isCompleted ? 'bg-green-100' : 'bg-primary-50'}`}>
            💊
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg leading-tight">{reminder.medicationName}</h3>
            <p className="text-slate-500 font-medium">{reminder.dosage}</p>
          </div>
        </div>
        {isCompleted && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">
            {isZh ? '已服用' : 'Taken'}
          </span>
        )}
      </div>

      {!isCompleted && onTake && (
        <div className="flex gap-3">
          <button onClick={onTake} className="btn-primary flex-1 py-3 text-sm font-bold shadow-lg shadow-primary-500/20">
            {t('takeDose')}
          </button>
          <div className="flex gap-2">
            <button onClick={onSnooze} className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100 shadow-sm" title="Snooze">
              <span className="text-lg">😴</span>
            </button>
            <button onClick={onSkip} className="px-4 py-2 bg-white text-slate-400 rounded-xl hover:bg-slate-50 hover:text-slate-600 transition-colors border border-slate-200" title={t('skip')}>
              <span className="text-lg">✕</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
