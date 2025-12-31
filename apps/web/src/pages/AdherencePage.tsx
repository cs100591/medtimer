import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n/TranslationContext';
import type { Medication } from '../types';

interface ReminderRecord {
  odId: string; medicationId: string; medicationName: string; scheduledTime: string;
  status: 'taken' | 'missed' | 'skipped' | 'pending' | 'snoozed'; actionTime?: string; date: string;
}

interface DailyStats { date: string; taken: number; missed: number; skipped: number; total: number; }

export function AdherencePage() {
  const { t, lang } = useTranslation();
  const isZh = lang === 'zh';
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  
  const [medications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('medications');
    if (saved) { try { return JSON.parse(saved); } catch { return []; } }
    return [];
  });

  const [reminderHistory, setReminderHistory] = useState<ReminderRecord[]>(() => {
    const saved = localStorage.getItem('reminder_history');
    if (saved) { try { return JSON.parse(saved); } catch { return []; } }
    return [];
  });

  useEffect(() => {
    if (reminderHistory.length === 0 && medications.length > 0) {
      const history: ReminderRecord[] = [];
      const today = new Date();
      for (let d = 0; d < 30; d++) {
        const date = new Date(today); date.setDate(date.getDate() - d);
        const dateStr = date.toISOString().split('T')[0];
        medications.forEach(med => {
          const times = med.scheduleTimes || ['8:00 AM'];
          times.forEach((time, idx) => {
            const rand = Math.random();
            let status: 'taken' | 'missed' | 'skipped' = rand > 0.95 ? 'skipped' : rand > 0.85 ? 'missed' : 'taken';
            history.push({
              odId: `${dateStr}-${med.id}-${idx}`, medicationId: med.id, medicationName: med.name,
              scheduledTime: time, status: d === 0 && idx >= times.length - 1 ? 'pending' : status,
              actionTime: status !== 'missed' ? new Date(date.getTime() + Math.random() * 3600000).toISOString() : undefined, date: dateStr,
            });
          });
        });
      }
      setReminderHistory(history);
      localStorage.setItem('reminder_history', JSON.stringify(history));
    }
  }, [medications, reminderHistory.length]);

  const dateRange = useMemo(() => {
    const end = new Date(); const start = new Date();
    if (period === 'week') start.setDate(end.getDate() - 7);
    else if (period === 'month') start.setDate(end.getDate() - 30);
    else start.setDate(end.getDate() - 365);
    return { start, end };
  }, [period]);

  const filteredHistory = useMemo(() => {
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];
    return reminderHistory.filter(r => r.date >= startStr && r.date <= endStr);
  }, [reminderHistory, dateRange]);

  const stats = useMemo(() => {
    const taken = filteredHistory.filter(r => r.status === 'taken').length;
    const missed = filteredHistory.filter(r => r.status === 'missed').length;
    const skipped = filteredHistory.filter(r => r.status === 'skipped').length;
    const total = taken + missed + skipped;
    return { taken, missed, skipped, total, rate: total > 0 ? taken / total : 0 };
  }, [filteredHistory]);

  const medicationStats = useMemo(() => {
    const statsMap: Record<string, { name: string; taken: number; total: number; rate: number }> = {};
    filteredHistory.forEach(r => {
      if (!statsMap[r.medicationId]) statsMap[r.medicationId] = { name: r.medicationName, taken: 0, total: 0, rate: 0 };
      if (r.status !== 'pending' && r.status !== 'snoozed') {
        statsMap[r.medicationId].total++;
        if (r.status === 'taken') statsMap[r.medicationId].taken++;
      }
    });
    Object.values(statsMap).forEach(s => { s.rate = s.total > 0 ? s.taken / s.total : 0; });
    return Object.values(statsMap).sort((a, b) => b.rate - a.rate);
  }, [filteredHistory]);

  const dailyStats = useMemo(() => {
    const days: DailyStats[] = [];
    const numDays = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      if (period === 'year') date.setMonth(date.getMonth() - i);
      else date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayRecords = period === 'year' 
        ? filteredHistory.filter(r => r.date.startsWith(dateStr.substring(0, 7)))
        : filteredHistory.filter(r => r.date === dateStr);
      days.push({
        date: dateStr,
        taken: dayRecords.filter(r => r.status === 'taken').length,
        missed: dayRecords.filter(r => r.status === 'missed').length,
        skipped: dayRecords.filter(r => r.status === 'skipped').length,
        total: dayRecords.filter(r => r.status !== 'pending' && r.status !== 'snoozed').length,
      });
    }
    return days;
  }, [filteredHistory, period]);

  const handleExport = () => {
    const data = { period, dateRange: { start: dateRange.start.toISOString().split('T')[0], end: dateRange.end.toISOString().split('T')[0] }, overall: stats, byMedication: medicationStats, daily: dailyStats };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `adherence-report-${period}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = isZh ? `我的服药依从率: ${Math.round(stats.rate * 100)}%` : `My medication adherence: ${Math.round(stats.rate * 100)}%`;
    if (navigator.share) { try { await navigator.share({ title: 'Adherence Report', text }); } catch { navigator.clipboard.writeText(text); alert(isZh ? '已复制' : 'Copied'); } }
    else { navigator.clipboard.writeText(text); alert(isZh ? '已复制' : 'Copied'); }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === 'year') return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: 'short' });
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { weekday: 'short', day: 'numeric' });
  };

  const rateColor = stats.rate >= 0.8 ? 'var(--success)' : stats.rate >= 0.6 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{t('adherence')}</h1>
        <div className="flex gap-2">
          <button onClick={handleShare} className="btn-ghost" title={isZh ? '分享' : 'Share'}>📤</button>
          <button onClick={handleExport} className="btn-ghost" title={isZh ? '导出' : 'Export'}>📥</button>
        </div>
      </div>

      <div className="segmented-control mb-6">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`segmented-item capitalize ${period === p ? 'active' : ''}`}>{t(p)}</button>
        ))}
      </div>

      {/* Overview Card */}
      <div className="card-elevated p-6 mb-6">
        <h3 className="font-medium text-[var(--text-secondary)] mb-4">{isZh ? '依从性概览' : 'Adherence Overview'}</h3>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-5xl font-bold font-mono" style={{ color: rateColor }}>{Math.round(stats.rate * 100)}%</div>
            <div className="text-[var(--text-secondary)] text-sm">{t('adherenceRate')}</div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--success)] font-mono">{stats.taken}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{t('takenDoses')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--danger)] font-mono">{stats.missed}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{t('missedDoses')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--warning)] font-mono">{stats.skipped}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{t('skippedDoses')}</div>
              </div>
            </div>
          </div>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="64" cy="64" r="56" stroke="var(--border)" strokeWidth="12" fill="none" />
              <circle cx="64" cy="64" r="56" stroke={rateColor} strokeWidth="12" fill="none"
                strokeDasharray={`${stats.rate * 352} 352`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold font-mono" style={{ color: rateColor }}>{Math.round(stats.rate * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="card p-6 mb-6">
        <h3 className="font-medium text-[var(--text-secondary)] mb-4">{isZh ? '每日趋势' : 'Daily Trend'}</h3>
        <div className="flex items-end gap-1 h-32">
          {dailyStats.map((day, i) => {
            const rate = day.total > 0 ? day.taken / day.total : 0;
            const height = Math.max(rate * 100, 5);
            const color = rate >= 0.8 ? 'var(--success)' : rate >= 0.6 ? 'var(--warning)' : 'var(--danger)';
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full rounded-t-[var(--radius-sm)] transition-all" style={{ height: `${height}%`, backgroundColor: color }} 
                  title={`${formatDate(day.date)}: ${Math.round(rate * 100)}%`} />
                <div className="text-xs text-[var(--text-tertiary)] mt-1 truncate w-full text-center">
                  {period === 'week' ? formatDate(day.date).split(' ')[0] : period === 'month' ? new Date(day.date).getDate() : formatDate(day.date)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[var(--success)] rounded" /> ≥80%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[var(--warning)] rounded" /> 60-79%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[var(--danger)] rounded" /> &lt;60%</span>
        </div>
      </div>

      {/* By Medication */}
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">{t('byMedication')}</h2>
      {medicationStats.length === 0 ? (
        <div className="card p-8 text-center text-[var(--text-secondary)]">{isZh ? '暂无药物数据' : 'No medication data'}</div>
      ) : (
        <div className="space-y-3">
          {medicationStats.map((med) => (
            <div key={med.name} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-[var(--text-primary)]">{med.name}</span>
                <span className="font-bold font-mono" style={{ color: med.rate >= 0.8 ? 'var(--success)' : med.rate >= 0.6 ? 'var(--warning)' : 'var(--danger)' }}>
                  {Math.round(med.rate * 100)}%
                </span>
              </div>
              <div className="h-2 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${med.rate * 100}%`, backgroundColor: med.rate >= 0.8 ? 'var(--success)' : med.rate >= 0.6 ? 'var(--warning)' : 'var(--danger)' }} />
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">{med.taken} / {med.total} {isZh ? '剂' : 'doses'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="card p-4 mt-6">
        <h3 className="font-medium text-[var(--text-secondary)] mb-2">💡 {isZh ? '提示' : 'Tips'}</h3>
        <p className="text-sm text-[var(--text-primary)]">
          {stats.rate >= 0.9 ? (isZh ? '🎉 太棒了！保持这个好习惯！' : '🎉 Excellent! Keep up the great work!') :
           stats.rate >= 0.8 ? (isZh ? '👍 做得很好！' : '👍 Good job!') :
           stats.rate >= 0.6 ? (isZh ? '💪 继续加油！' : '💪 Keep going!') :
           (isZh ? '⚠️ 请考虑设置更多提醒' : '⚠️ Consider setting more reminders')}
        </p>
      </div>
    </div>
  );
}
