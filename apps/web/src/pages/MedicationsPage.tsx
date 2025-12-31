import { useState, useEffect } from 'react';
import { MedicationCard } from '../components/MedicationCard';
import { Button } from '../components/ui/Button';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import type { Medication } from '../types';
import api from '../services/api';
import { useTranslation } from '../i18n/TranslationContext';

// Frequency mode: 24h = full day, 12h = waking hours only (8AM-8PM)
type FrequencyMode = '24h' | '12h';

// Helper to calculate schedule times based on frequency, first dose time, and mode
function calculateScheduleTimes(firstTime: string, frequency: number, mode: FrequencyMode = '24h'): string[] {
  const times: string[] = [firstTime];
  if (frequency <= 1) return times;
  
  const [hours, minutes] = firstTime.split(':').map(Number);
  // 24h mode = spread over 24 hours, 12h mode = spread over 12 waking hours
  const totalHours = mode === '24h' ? 24 : 12;
  const intervalHours = Math.floor(totalHours / frequency);
  
  for (let i = 1; i < frequency; i++) {
    let newHours = hours + (intervalHours * i);
    // For 12h mode, cap at reasonable evening time (8PM = 20:00)
    if (mode === '12h' && newHours > 20) {
      newHours = 20;
    }
    newHours = newHours % 24;
    const period = newHours >= 12 ? 'PM' : 'AM';
    const displayHours = newHours > 12 ? newHours - 12 : (newHours === 0 ? 12 : newHours);
    times.push(`${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);
  }
  return times;
}

type DosageUnit = 'tablet' | 'ml';

export function MedicationsPage() {
  const { t } = useTranslation();
  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('medications');
    if (saved) {
      try { return JSON.parse(saved); } 
      catch { return []; }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ongoing'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    amount: 1,
    unit: 'tablet' as DosageUnit,
    instructions: '',
    frequency: 1,
    frequencyMode: '12h' as FrequencyMode, // Default to waking hours
    firstDoseTime: '08:00',
    durationDays: 0,
  });

  useEffect(() => {
    localStorage.setItem('medications', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => { loadMedications(); }, []);

  const loadMedications = async () => {
    setLoading(true);
    try {
      const response = await api.getMedications();
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setMedications(response.data);
      }
    } catch (err) { console.log('Using local medications'); }
    finally { setLoading(false); }
  };

  const handleAddMedication = async () => {
    if (!newMed.name) { alert(t('fillAllFields')); return; }

    const scheduleTimes = calculateScheduleTimes(newMed.firstDoseTime, newMed.frequency, newMed.frequencyMode);
    
    const newMedication: Medication = {
      id: `m${Date.now()}`,
      userId: 'demo',
      name: newMed.name,
      dosage: `${newMed.amount} ${newMed.unit}${newMed.unit === 'tablet' && newMed.amount > 1 ? 's' : ''}`,
      form: newMed.unit === 'tablet' ? 'tablet' : 'liquid',
      instructions: newMed.instructions,
      isCritical: false,
      isActive: true,
      frequency: newMed.frequency,
      firstDoseTime: newMed.firstDoseTime,
      scheduleTimes: scheduleTimes,
      durationDays: newMed.durationDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMedications(prev => [...prev, newMedication]);
    setShowAddForm(false);
    setNewMed({ name: '', amount: 1, unit: 'tablet', instructions: '', frequency: 1, frequencyMode: '12h', firstDoseTime: '08:00', durationDays: 0 });

    try { await api.createMedication(newMedication); } 
    catch (err) { console.log('Saved locally'); }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDelete'))) {
      setMedications(prev => prev.filter(m => m.id !== id));
      try { await api.deleteMedication(id); } 
      catch (err) { console.log('Deleted locally'); }
    }
  };

  const filteredMeds = medications.filter(m => {
    if (filter === 'ongoing') return m.durationDays === 0 || m.durationDays === undefined;
    return true;
  });

  const intervalHours = newMed.frequencyMode === '24h' 
    ? Math.floor(24 / newMed.frequency) 
    : Math.floor(12 / newMed.frequency);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('myMedications')}</h1>
        <Button onClick={() => setShowAddForm(true)}>+ {t('addMedication')}</Button>
      </div>

      {showAddForm && (
        <Card className="mb-6">
          <CardTitle>{t('addNewMedication')}</CardTitle>
          <CardContent className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('medicationName')} *</label>
              <input type="text" value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Lisinopril" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">💊 {t('dosage')}</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setNewMed({ ...newMed, unit: 'tablet' })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    newMed.unit === 'tablet' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}>
                  💊 {t('tablet')}
                </button>
                <button type="button" onClick={() => setNewMed({ ...newMed, unit: 'ml' })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    newMed.unit === 'ml' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}>
                  💧 {t('ml')}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max={newMed.unit === 'tablet' ? 10 : 50} value={newMed.amount}
                  onChange={(e) => setNewMed({ ...newMed, amount: parseInt(e.target.value) })} className="flex-1" />
                <span className="text-lg font-semibold w-24 text-center">{newMed.amount} {newMed.unit === 'tablet' ? '💊' : 'ml'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">⏰ {t('firstDoseTime')}</label>
              <input type="time" value={newMed.firstDoseTime} onChange={(e) => setNewMed({ ...newMed, firstDoseTime: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">📅 {t('frequencyPerDay')}</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[1, 2, 3, 4].map((freq) => (
                  <button key={freq} type="button" onClick={() => setNewMed({ ...newMed, frequency: freq })}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      newMed.frequency === freq ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}>
                    {freq}x {t('daily')}
                  </button>
                ))}
              </div>
              
              {/* Frequency Mode Selection */}
              {newMed.frequency > 1 && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">🌙 {t('frequencyMode')}</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setNewMed({ ...newMed, frequencyMode: '12h' })}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        newMed.frequencyMode === '12h' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}>
                      ☀️ {t('wakingHours')} (12h)
                    </button>
                    <button type="button" onClick={() => setNewMed({ ...newMed, frequencyMode: '24h' })}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        newMed.frequencyMode === '24h' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}>
                      🌙 {t('fullDay')} (24h)
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {newMed.frequencyMode === '12h' ? t('wakingHoursDesc') : t('fullDayDesc')}
                  </p>
                </div>
              )}

              {newMed.frequency > 1 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">{t('scheduledTimes')}:</p>
                  <p className="text-sm text-blue-600">
                    {calculateScheduleTimes(newMed.firstDoseTime, newMed.frequency, newMed.frequencyMode).join(' → ')}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    ({t('everyHours').replace('{hours}', String(intervalHours))})
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">📆 {t('duration')} ({t('days')})</label>
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="text-lg font-bold">{newMed.durationDays === 0 ? t('ongoing') : `${newMed.durationDays} ${t('days')}`}</p>
                  <p className="text-xs text-gray-500">{newMed.durationDays === 0 ? t('noEndDate') : t('fixedDuration')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setNewMed({ ...newMed, durationDays: Math.max(0, newMed.durationDays - 1) })}
                    disabled={newMed.durationDays === 0}
                    className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-xl font-bold hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">−</button>
                  <span className="w-12 text-center text-xl font-bold">{newMed.durationDays}</span>
                  <button type="button" onClick={() => setNewMed({ ...newMed, durationDays: Math.min(99, newMed.durationDays + 1) })}
                    disabled={newMed.durationDays === 99}
                    className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-xl font-bold hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('instructions')}</label>
              <textarea value={newMed.instructions} onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                className="w-full border rounded-lg px-3 py-2" placeholder="e.g., Take with food" rows={2} />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddMedication}>{t('saveMedication')}</Button>
              <Button variant="secondary" onClick={() => setShowAddForm(false)}>{t('cancel')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-6">
        {(['all', 'ongoing'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f === 'all' ? t('all') : `♾️ ${t('ongoing')}`}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">{t('loading')}</p>}

      <div className="space-y-4">
        {filteredMeds.length === 0 ? (
          <Card><CardContent className="text-center py-8 text-gray-500">{t('noMedications')}</CardContent></Card>
        ) : (
          filteredMeds.map((med) => (
            <MedicationCard key={med.id} medication={med} onDelete={() => handleDelete(med.id)} />
          ))
        )}
      </div>
    </div>
  );
}
