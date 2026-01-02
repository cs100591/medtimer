import { useState, useEffect } from 'react';
import type { Medication } from '../types';
import api from '../services/api';
import { useTranslation } from '../i18n/TranslationContext';

type FrequencyMode = '24h' | '12h';
type DosageUnit = 'tablet' | 'ml';

function calculateScheduleTimes(firstTime: string, frequency: number, mode: FrequencyMode = '24h'): string[] {
  const times: string[] = [firstTime];
  if (frequency <= 1) return times;
  
  const [hours, minutes] = firstTime.split(':').map(Number);
  const totalHours = mode === '24h' ? 24 : 12;
  const intervalHours = Math.floor(totalHours / frequency);
  
  for (let i = 1; i < frequency; i++) {
    let newHours = hours + (intervalHours * i);
    if (mode === '12h' && newHours > 20) newHours = 20;
    newHours = newHours % 24;
    const period = newHours >= 12 ? 'PM' : 'AM';
    const displayHours = newHours > 12 ? newHours - 12 : (newHours === 0 ? 12 : newHours);
    times.push(`${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`);
  }
  return times;
}

export function MedicationsPage() {
  const { t, lang } = useTranslation();
  const isZh = lang === 'zh';
  const [medications, setMedications] = useState<Medication[]>(() => {
    const saved = localStorage.getItem('medications');
    if (saved) { try { return JSON.parse(saved); } catch { return []; } }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ongoing'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [newMed, setNewMed] = useState({
    name: '', amount: 1, unit: 'tablet' as DosageUnit, instructions: '',
    frequency: 1, frequencyMode: '12h' as FrequencyMode, firstDoseTime: '08:00', durationDays: 0,
  });

  useEffect(() => { localStorage.setItem('medications', JSON.stringify(medications)); }, [medications]);
  useEffect(() => { loadMedications(); }, []);

  const loadMedications = async () => {
    setLoading(true);
    try {
      const response = await api.getMedications();
      if (response.data && Array.isArray(response.data) && response.data.length > 0) setMedications(response.data);
    } catch (err) { console.log('Using local medications'); }
    finally { setLoading(false); }
  };

  const handleAddMedication = async () => {
    if (!newMed.name) { alert(t('fillAllFields')); return; }
    const scheduleTimes = calculateScheduleTimes(newMed.firstDoseTime, newMed.frequency, newMed.frequencyMode);
    
    const newMedication: Medication = {
      id: `m${Date.now()}`, userId: 'demo', name: newMed.name,
      dosage: `${newMed.amount} ${newMed.unit}${newMed.unit === 'tablet' && newMed.amount > 1 ? 's' : ''}`,
      form: newMed.unit === 'tablet' ? 'tablet' : 'liquid', instructions: newMed.instructions,
      isCritical: false, isActive: true, frequency: newMed.frequency, firstDoseTime: newMed.firstDoseTime,
      scheduleTimes, durationDays: newMed.durationDays,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    setMedications(prev => [...prev, newMedication]);
    setShowAddForm(false);
    setNewMed({ name: '', amount: 1, unit: 'tablet', instructions: '', frequency: 1, frequencyMode: '12h', firstDoseTime: '08:00', durationDays: 0 });
    try { await api.createMedication(newMedication); } catch (err) { console.log('Saved locally'); }
  };

  const handleEditMedication = async () => {
    if (!editingMed || !newMed.name) { alert(t('fillAllFields')); return; }
    const scheduleTimes = calculateScheduleTimes(newMed.firstDoseTime, newMed.frequency, newMed.frequencyMode);
    
    const updatedMedication: Medication = {
      ...editingMed,
      name: newMed.name,
      dosage: `${newMed.amount} ${newMed.unit}${newMed.unit === 'tablet' && newMed.amount > 1 ? 's' : ''}`,
      form: newMed.unit === 'tablet' ? 'tablet' : 'liquid',
      instructions: newMed.instructions,
      frequency: newMed.frequency,
      firstDoseTime: newMed.firstDoseTime,
      scheduleTimes,
      durationDays: newMed.durationDays,
      updatedAt: new Date().toISOString(),
    };

    setMedications(prev => prev.map(m => m.id === editingMed.id ? updatedMedication : m));
    setEditingMed(null);
    setNewMed({ name: '', amount: 1, unit: 'tablet', instructions: '', frequency: 1, frequencyMode: '12h', firstDoseTime: '08:00', durationDays: 0 });
    try { await api.updateMedication(editingMed.id, updatedMedication); } catch (err) { console.log('Updated locally'); }
  };

  const startEditMedication = (med: Medication) => {
    // Parse dosage to get amount and unit
    const dosageMatch = med.dosage.match(/(\d+)\s*(tablet|ml)/i);
    const amount = dosageMatch ? parseInt(dosageMatch[1]) : 1;
    const unit = med.form === 'liquid' || med.dosage.toLowerCase().includes('ml') ? 'ml' : 'tablet';
    
    setEditingMed(med);
    setNewMed({
      name: med.name,
      amount,
      unit: unit as DosageUnit,
      instructions: med.instructions || '',
      frequency: med.frequency || 1,
      frequencyMode: '12h',
      firstDoseTime: med.firstDoseTime || '08:00',
      durationDays: med.durationDays || 0,
    });
  };

  const cancelEdit = () => {
    setEditingMed(null);
    setNewMed({ name: '', amount: 1, unit: 'tablet', instructions: '', frequency: 1, frequencyMode: '12h', firstDoseTime: '08:00', durationDays: 0 });
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDelete'))) {
      setMedications(prev => prev.filter(m => m.id !== id));
      try { await api.deleteMedication(id); } catch (err) { console.log('Deleted locally'); }
    }
  };

  const filteredMeds = medications.filter(m => {
    if (filter === 'ongoing') return m.durationDays === 0 || m.durationDays === undefined;
    return true;
  });

  const intervalHours = newMed.frequencyMode === '24h' ? Math.floor(24 / newMed.frequency) : Math.floor(12 / newMed.frequency);
  const isEditing = editingMed !== null;
  const showForm = showAddForm || isEditing;

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{t('myMedications')}</h1>
        <button onClick={() => setShowAddForm(true)} className="btn-primary">+ {t('addMedication')}</button>
      </div>

      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {isEditing ? (isZh ? '编辑药物' : 'Edit Medication') : t('addNewMedication')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('medicationName')} *</label>
              <input type="text" value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                className="input" placeholder="e.g., Lisinopril" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">💊 {t('dosage')}</label>
              <div className="segmented-control mb-3">
                <button type="button" onClick={() => setNewMed({ ...newMed, unit: 'tablet' })}
                  className={`segmented-item ${newMed.unit === 'tablet' ? 'active' : ''}`}>�' {t('tablet')}</button>
                <button type="button" onClick={() => setNewMed({ ...newMed, unit: 'ml' })}
                  className={`segmented-item ${newMed.unit === 'ml' ? 'active' : ''}`}>💧 {t('ml')}</button>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max={newMed.unit === 'tablet' ? 10 : 50} value={newMed.amount}
                  onChange={(e) => setNewMed({ ...newMed, amount: parseInt(e.target.value) })} className="flex-1 accent-[var(--primary)]" />
                <span className="text-lg font-semibold w-24 text-center font-mono">{newMed.amount} {newMed.unit === 'tablet' ? '💊' : 'ml'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">⏰ {t('firstDoseTime')}</label>
              <input type="time" value={newMed.firstDoseTime} onChange={(e) => setNewMed({ ...newMed, firstDoseTime: e.target.value })}
                className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">📅 {t('frequencyPerDay')}</label>
              <div className="segmented-control mb-3">
                {[1, 2, 3, 4].map((freq) => (
                  <button key={freq} type="button" onClick={() => setNewMed({ ...newMed, frequency: freq })}
                    className={`segmented-item ${newMed.frequency === freq ? 'active' : ''}`}>{freq}x</button>
                ))}
              </div>
              
              {newMed.frequency > 1 && (
                <>
                  <div className="segmented-control mb-3">
                    <button type="button" onClick={() => setNewMed({ ...newMed, frequencyMode: '12h' })}
                      className={`segmented-item ${newMed.frequencyMode === '12h' ? 'active' : ''}`}>☀️ {t('wakingHours')}</button>
                    <button type="button" onClick={() => setNewMed({ ...newMed, frequencyMode: '24h' })}
                      className={`segmented-item ${newMed.frequencyMode === '24h' ? 'active' : ''}`}>🌙 {t('fullDay')}</button>
                  </div>
                  <div className="p-3 bg-[rgba(0,122,255,0.08)] rounded-[var(--radius-md)]">
                    <p className="text-sm text-[var(--primary)] font-medium">{t('scheduledTimes')}:</p>
                    <p className="text-sm text-[var(--primary)] font-mono">
                      {calculateScheduleTimes(newMed.firstDoseTime, newMed.frequency, newMed.frequencyMode).join(' → ')}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">({t('everyHours').replace('{hours}', String(intervalHours))})</p>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">📆 {t('duration')}</label>
              <div className="flex items-center gap-4 p-4 bg-[var(--surface-secondary)] rounded-[var(--radius-md)]">
                <div className="flex-1">
                  <p className="text-lg font-semibold text-[var(--text-primary)]">{newMed.durationDays === 0 ? t('ongoing') : `${newMed.durationDays} ${t('days')}`}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{newMed.durationDays === 0 ? t('noEndDate') : t('fixedDuration')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setNewMed({ ...newMed, durationDays: Math.max(0, newMed.durationDays - 1) })}
                    disabled={newMed.durationDays === 0}
                    className="w-10 h-10 rounded-full bg-[var(--primary)] text-white text-xl font-bold hover:opacity-90 disabled:opacity-30">−</button>
                  <span className="w-12 text-center text-xl font-bold font-mono">{newMed.durationDays}</span>
                  <button type="button" onClick={() => setNewMed({ ...newMed, durationDays: Math.min(99, newMed.durationDays + 1) })}
                    disabled={newMed.durationDays === 99}
                    className="w-10 h-10 rounded-full bg-[var(--primary)] text-white text-xl font-bold hover:opacity-90 disabled:opacity-30">+</button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('instructions')}</label>
              <textarea value={newMed.instructions} onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                className="input min-h-[80px]" placeholder="e.g., Take with food" />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button onClick={isEditing ? handleEditMedication : handleAddMedication} className="btn-primary flex-1">
                {isEditing ? (isZh ? '保存更改' : 'Save Changes') : t('saveMedication')}
              </button>
              <button onClick={isEditing ? cancelEdit : () => setShowAddForm(false)} className="btn-secondary flex-1">{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="segmented-control mb-6">
        {(['all', 'ongoing'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`segmented-item ${filter === f ? 'active' : ''}`}>
            {f === 'all' ? t('all') : `♾️ ${t('ongoing')}`}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {filteredMeds.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-[rgba(0,122,255,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💊</span>
            </div>
            <p className="text-[var(--text-secondary)]">{t('noMedications')}</p>
          </div>
        ) : (
          filteredMeds.map((med) => (
            <MedicationCard key={med.id} medication={med} onDelete={() => handleDelete(med.id)} onEdit={() => startEditMedication(med)} isZh={isZh} t={t} />
          ))
        )}
      </div>
    </div>
  );
}

function MedicationCard({ medication, onDelete, onEdit, isZh, t }: { medication: Medication; onDelete: () => void; onEdit: () => void; isZh: boolean; t: (key: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[rgba(0,122,255,0.12)] rounded-[var(--radius-md)] flex items-center justify-center">
            <span className="text-2xl">💊</span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-[var(--text-primary)]">{medication.name}</p>
            <p className="text-sm text-[var(--text-secondary)]">{medication.dosage}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`pill ${medication.durationDays === 0 ? 'pill-primary' : 'pill-warning'}`}>
            {medication.durationDays === 0 ? '♾️' : `${medication.durationDays}d`}
          </span>
          <svg className={`w-5 h-5 text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {expanded && (
        <div className="border-t border-[var(--divider)] p-4 bg-[var(--surface-secondary)]">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">{isZh ? '频率' : 'Frequency'}</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{medication.frequency}x {isZh ? '每日' : 'daily'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">{isZh ? '时间' : 'Times'}</p>
              <p className="text-sm font-medium text-[var(--text-primary)] font-mono">{medication.scheduleTimes?.join(', ') || medication.firstDoseTime}</p>
            </div>
          </div>
          {medication.instructions && (
            <div className="mb-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">{t('instructions')}</p>
              <p className="text-sm text-[var(--text-primary)]">{medication.instructions}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onEdit} className="btn-primary flex-1">✏️ {isZh ? '编辑' : 'Edit'}</button>
            <button onClick={onDelete} className="btn-danger flex-1">🗑️ {isZh ? '删除' : 'Delete'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
