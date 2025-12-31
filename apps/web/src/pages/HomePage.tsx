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
    <div className="max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--primary)] mb-1">{dateStr}</p>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{isZh ? '今日提醒' : "Today's Reminders"}</h1>
      </div>

      {/* Progress Card - iOS Style */}
      <div className="card-elevated p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">{t('todaysProgress')}</p>
            <p className="text-4xl font-bold text-[var(--text-primary)] font-mono">{completed}<span className="text-[var(--text-tertiary)]">/{total}</span></p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">{isZh ? '剂药物已服用' : 'doses taken'}</p>
            {completed === total && total > 0 && (
              <div className="mt-3 pill pill-success">
                <span className="mr-1">🎉</span>
                {isZh ? '全部完成！' : 'All done!'}
              </div>
            )}
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={progressColor} strokeWidth="8" 
                strokeDasharray={`${progress * 2.64} 264`} strokeLinecap="round" className="progress-ring" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold font-mono" style={{ color: progressColor }}>{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Snooze Toast */}
      {snoozeId && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[var(--warning)] text-white px-6 py-3 rounded-[var(--radius-lg)] shadow-lg flex items-center gap-2 z-50">
          <span className="text-xl">😴</span>
          <span className="font-medium">{t('snoozed')}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {total === 0 && !loading && (
        <div className="card p-8 text-center">
          <div className="w-20 h-20 bg-[rgba(0,122,255,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💊</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t('noMedicationsToday')}</h3>
          <p className="text-[var(--text-secondary)] text-sm">{t('addMedicationsHint')}</p>
        </div>
      )}

      {/* Pending Reminders */}
      {pendingGroups.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" />
            {t('upcomingReminders')}
          </h2>
          <div className="space-y-3">
            {pendingGroups.map((group) => (
              <TimeGroupCard 
                key={group.time} 
                group={group} 
                isExpanded={expandedGroups.has(group.time)}
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
        <div className="mb-6">
          <h2 className="text-base font-semibold text-[var(--success)] mb-3 flex items-center gap-2">
            <span>✓</span>
            {t('completed')}
          </h2>
          <div className="space-y-3 opacity-70">
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
        <div className="text-center pb-4">
          <button onClick={handleReset} className="btn-ghost text-sm">
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
    <div className={`card overflow-hidden transition-all duration-200 ${isExpanded ? 'shadow-md' : ''}`}>
      <button onClick={onToggle} className="w-full px-4 py-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center ${allCompleted ? 'bg-[rgba(50,215,75,0.12)]' : 'bg-[rgba(0,122,255,0.12)]'}`}>
            <span className="text-2xl">{allCompleted ? '✅' : '⏰'}</span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-[var(--text-primary)] text-lg font-mono">{group.time}</p>
            <p className="text-sm text-[var(--text-secondary)]">
              {group.reminders.length} {group.reminders.length > 1 ? t('medicationsPlural') : t('medication')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {group.reminders.slice(0, 3).map((r) => (
              <div key={r.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-[var(--surface)] ${
                r.status === 'completed' ? 'bg-[var(--success)] text-white' : 'bg-[var(--primary)] text-white'
              }`}>
                {r.medicationName.charAt(0)}
              </div>
            ))}
            {group.reminders.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-xs font-semibold border-2 border-[var(--surface)]">
                +{group.reminders.length - 3}
              </div>
            )}
          </div>
          <svg className={`w-5 h-5 text-[var(--text-tertiary)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-[var(--divider)] px-4 py-3 space-y-3 bg-[var(--surface-secondary)]">
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
    <div className={`bg-[var(--surface)] rounded-[var(--radius-md)] p-4 ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center ${isCompleted ? 'bg-[rgba(50,215,75,0.12)]' : 'bg-[rgba(0,122,255,0.12)]'}`}>
            <span className="text-xl">💊</span>
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{reminder.medicationName}</p>
            <p className="text-sm text-[var(--text-secondary)]">{reminder.dosage}</p>
          </div>
        </div>
        {isCompleted && (
          <span className="pill pill-success">✓ {isZh ? '已服用' : 'Taken'}</span>
        )}
      </div>
      
      {!isCompleted && onTake && (
        <div className="flex gap-2">
          <button onClick={onTake} className="btn-success flex-1 py-2.5">
            ✓ {t('takeDose')}
          </button>
          <button onClick={onSnooze} className="px-4 py-2.5 bg-[rgba(255,149,0,0.12)] hover:bg-[rgba(255,149,0,0.2)] text-[var(--warning)] font-medium rounded-[var(--radius-md)] transition-colors">
            😴
          </button>
          <button onClick={onSkip} className="btn-secondary px-4 py-2.5">
            {t('skip')}
          </button>
        </div>
      )}
    </div>
  );
}
