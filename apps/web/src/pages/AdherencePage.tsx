import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { useTranslation } from '../i18n/TranslationContext';
import type { Medication } from '../types';

interface ReminderRecord {
  odId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  status: 'taken' | 'missed' | 'skipped' | 'pending' | 'snoozed';
  actionTime?: string;
  date: string;
}

interface DailyStats {
  date: string;
  taken: number;
  missed: number;
  skipped: number;
  total: number;
}

export function AdherencePage() {
  const { t, lang } = useTranslation();
  const isZh = lang === 'zh';
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  
  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('medications');
    if (saved) {
      try { return JSON.parse(saved); } 
      catch { return []; }
    }
    return [];
  });

  const [reminderHistory, setReminderHistory] = useState<ReminderRecord[]>(() => {
    const saved = localStorage.getItem('reminder_history');
    if (saved) {
      try { return JSON.parse(saved); } 
      catch { return []; }
    }
    return [];
  });

  // Generate history if none exists (for demo purposes)
  useEffect(() => {
    if (reminderHistory.length === 0 && medications.length > 0) {
      const history: ReminderRecord[] = [];
      const today = new Date();
      
      // Generate 30 days of history
      for (let d = 0; d < 30; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - d);
        const dateStr = date.toISOString().split('T')[0];
        
        medications.forEach(med => {
          const times = med.scheduleTimes || ['8:00 AM'];
          times.forEach((time, idx) => {
            // Random status with 85% taken, 10% missed, 5% skipped
            const rand = Math.random();
            let status: 'taken' | 'missed' | 'skipped' = 'taken';
            if (rand > 0.95) status = 'skipped';
            else if (rand > 0.85) status = 'missed';
            
            history.push({
              odId: `${dateStr}-${med.id}-${idx}`,
              medicationId: med.id,
              medicationName: med.name,
              scheduledTime: time,
              status: d === 0 && idx >= times.length - 1 ? 'pending' : status,
              actionTime: status !== 'missed' ? new Date(date.getTime() + Math.random() * 3600000).toISOString() : undefined,
              date: dateStr,
            });
          });
        });
      }
      
      setReminderHistory(history);
      localStorage.setItem('reminder_history', JSON.stringify(history));
    }
  }, [medications, reminderHistory.length]);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setDate(end.getDate() - 30);
        break;
      case 'year':
        start.setDate(end.getDate() - 365);
        break;
    }
    
    return { start, end };
  }, [period]);

  // Filter history by date range
  const filteredHistory = useMemo(() => {
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];
    
    return reminderHistory.filter(r => r.date >= startStr && r.date <= endStr);
  }, [reminderHistory, dateRange]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const taken = filteredHistory.filter(r => r.status === 'taken').length;
    const missed = filteredHistory.filter(r => r.status === 'missed').length;
    const skipped = filteredHistory.filter(r => r.status === 'skipped').length;
    const total = taken + missed + skipped;
    const rate = total > 0 ? taken / total : 0;
    
    return { taken, missed, skipped, total, rate };
  }, [filteredHistory]);

  // Calculate per-medication stats
  const medicationStats = useMemo(() => {
    const statsMap: Record<string, { name: string; taken: number; total: number; rate: number }> = {};
    
    filteredHistory.forEach(r => {
      if (!statsMap[r.medicationId]) {
        statsMap[r.medicationId] = { name: r.medicationName, taken: 0, total: 0, rate: 0 };
      }
      if (r.status !== 'pending' && r.status !== 'snoozed') {
        statsMap[r.medicationId].total++;
        if (r.status === 'taken') {
          statsMap[r.medicationId].taken++;
        }
      }
    });
    
    Object.values(statsMap).forEach(s => {
      s.rate = s.total > 0 ? s.taken / s.total : 0;
    });
    
    return Object.values(statsMap).sort((a, b) => b.rate - a.rate);
  }, [filteredHistory]);

  // Calculate daily stats for chart
  const dailyStats = useMemo(() => {
    const days: DailyStats[] = [];
    const numDays = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      if (period === 'year') {
        date.setMonth(date.getMonth() - i);
      } else {
        date.setDate(date.getDate() - i);
      }
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
    const data = {
      period,
      dateRange: {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0],
      },
      overall: stats,
      byMedication: medicationStats,
      daily: dailyStats,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adherence-report-${period}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = isZh 
      ? `我的服药依从率: ${Math.round(stats.rate * 100)}% (${period === 'week' ? '本周' : period === 'month' ? '本月' : '本年'})`
      : `My medication adherence: ${Math.round(stats.rate * 100)}% (this ${period})`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Adherence Report', text });
      } catch (e) {
        navigator.clipboard.writeText(text);
        alert(isZh ? '已复制到剪贴板' : 'Copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(text);
      alert(isZh ? '已复制到剪贴板' : 'Copied to clipboard');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === 'year') {
      return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { month: 'short' });
    }
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', { weekday: 'short', day: 'numeric' });
  };

  const rateColor = stats.rate >= 0.8 ? 'text-green-600' : stats.rate >= 0.6 ? 'text-orange-500' : 'text-red-500';
  const ringColor = stats.rate >= 0.8 ? '#22c55e' : stats.rate >= 0.6 ? '#f97316' : '#ef4444';

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('adherence')}</h1>
        <div className="flex gap-2">
          <button onClick={handleShare} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title={isZh ? '分享' : 'Share'}>📤</button>
          <button onClick={handleExport} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title={isZh ? '导出' : 'Export'}>📥</button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              period === p ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t(p)}
          </button>
        ))}
      </div>

      {/* Overview Card */}
      <Card className="mb-6">
        <CardContent>
          <h3 className="font-semibold text-gray-700 mb-4">{isZh ? '依从性概览' : 'Adherence Overview'}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className={`text-5xl font-bold ${rateColor}`}>
                {Math.round(stats.rate * 100)}%
              </div>
              <div className="text-gray-500 text-sm">{t('adherenceRate')}</div>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.taken}</div>
                  <div className="text-xs text-gray-500">{t('takenDoses')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{stats.missed}</div>
                  <div className="text-xs text-gray-500">{t('missedDoses')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">{stats.skipped}</div>
                  <div className="text-xs text-gray-500">{t('skippedDoses')}</div>
                </div>
              </div>
            </div>
            
            {/* Circular Progress */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                <circle cx="64" cy="64" r="56" stroke={ringColor} strokeWidth="12" fill="none"
                  strokeDasharray={`${stats.rate * 352} 352`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold ${rateColor}`}>{Math.round(stats.rate * 100)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Chart */}
      <Card className="mb-6">
        <CardContent>
          <h3 className="font-semibold text-gray-700 mb-4">{isZh ? '每日趋势' : 'Daily Trend'}</h3>
          <div className="flex items-end gap-1 h-32">
            {dailyStats.map((day, i) => {
              const rate = day.total > 0 ? day.taken / day.total : 0;
              const height = Math.max(rate * 100, 5);
              const color = rate >= 0.8 ? 'bg-green-500' : rate >= 0.6 ? 'bg-orange-500' : 'bg-red-500';
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className={`w-full ${color} rounded-t transition-all`} style={{ height: `${height}%` }} 
                    title={`${formatDate(day.date)}: ${Math.round(rate * 100)}%`} />
                  <div className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                    {period === 'week' ? formatDate(day.date).split(' ')[0] : 
                     period === 'month' ? new Date(day.date).getDate() : 
                     formatDate(day.date)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> ≥80%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded" /> 60-79%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> &lt;60%</span>
          </div>
        </CardContent>
      </Card>

      {/* By Medication */}
      <h2 className="text-lg font-semibold mb-4">{t('byMedication')}</h2>
      {medicationStats.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            {isZh ? '暂无药物数据。请先添加药物。' : 'No medication data. Add medications first.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {medicationStats.map((med) => (
            <Card key={med.name}>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{med.name}</span>
                  <span className={`font-bold ${med.rate >= 0.8 ? 'text-green-600' : med.rate >= 0.6 ? 'text-orange-500' : 'text-red-500'}`}>
                    {Math.round(med.rate * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    med.rate >= 0.8 ? 'bg-green-500' : med.rate >= 0.6 ? 'bg-orange-500' : 'bg-red-500'
                  }`} style={{ width: `${med.rate * 100}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {med.taken} / {med.total} {isZh ? '剂' : 'doses'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Streak & Tips */}
      <Card className="mt-6">
        <CardContent>
          <h3 className="font-semibold text-gray-700 mb-3">💡 {isZh ? '提示' : 'Tips'}</h3>
          <div className="space-y-2 text-sm text-gray-600">
            {stats.rate >= 0.9 ? (
              <p>🎉 {isZh ? '太棒了！保持这个好习惯！' : 'Excellent! Keep up the great work!'}</p>
            ) : stats.rate >= 0.8 ? (
              <p>👍 {isZh ? '做得很好！再努力一点就能达到90%！' : 'Good job! A little more effort to reach 90%!'}</p>
            ) : stats.rate >= 0.6 ? (
              <p>💪 {isZh ? '继续加油！设置提醒可以帮助您记住服药。' : 'Keep going! Setting reminders can help you remember.'}</p>
            ) : (
              <p>⚠️ {isZh ? '您的依从率较低。请考虑设置更多提醒或咨询医生。' : 'Your adherence is low. Consider setting more reminders or consulting your doctor.'}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
