import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/TranslationContext';
import { LoginPrompt } from '../components/LoginPrompt';

interface Patient {
  id: string; name: string; email: string; permissionLevel: 'view' | 'manage'; status: 'active' | 'pending';
  addedAt: string; lastActivity?: string; adherenceRate: number; medicationCount: number; missedToday: number;
}

interface Notification {
  id: string; patientId: string; patientName: string; message: string; type: 'success' | 'warning' | 'info'; timestamp: string;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function getQRCodeUrl(data: string, size: number = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function CaregiverPage() {
  const { t, lang } = useTranslation();
  const isZh = lang === 'zh';
  
  // Check if user is anonymous
  const isAnonymous = localStorage.getItem('is_anonymous_user') === 'true';
  
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('caregiver_patients');
    if (saved) { try { return JSON.parse(saved); } catch { return []; } }
    return [];
  });
  
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('caregiver_notifications');
    if (saved) { try { return JSON.parse(saved); } catch { return []; } }
    return [];
  });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState<Patient | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [newPatient, setNewPatient] = useState({ name: '', email: '', permissionLevel: 'view' as 'view' | 'manage' });

  useEffect(() => { localStorage.setItem('caregiver_patients', JSON.stringify(patients)); }, [patients]);
  useEffect(() => { localStorage.setItem('caregiver_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => {
    if (showInviteModal) {
      const code = generateInviteCode();
      setInviteCode(code);
      setInviteLink(`${window.location.origin}?invite=${code}`);
    }
  }, [showInviteModal]);

  const handleAddPatient = () => {
    if (!newPatient.name.trim()) { alert(isZh ? '请输入患者姓名' : 'Please enter patient name'); return; }
    const patient: Patient = {
      id: `p${Date.now()}`, name: newPatient.name.trim(),
      email: newPatient.email.trim() || `${newPatient.name.toLowerCase().replace(/\s+/g, '')}@patient.local`,
      permissionLevel: newPatient.permissionLevel, status: 'active', addedAt: new Date().toISOString(),
      lastActivity: isZh ? '刚刚' : 'Just now', adherenceRate: Math.floor(Math.random() * 20) + 80,
      medicationCount: Math.floor(Math.random() * 5) + 1, missedToday: Math.floor(Math.random() * 2),
    };
    setPatients(prev => [...prev, patient]);
    setNotifications(prev => [{
      id: `n${Date.now()}`, patientId: patient.id, patientName: patient.name,
      message: isZh ? `${patient.name} 已添加` : `${patient.name} added`, type: 'info' as const, timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 10));
    setShowInviteModal(false);
    setNewPatient({ name: '', email: '', permissionLevel: 'view' });
  };

  const handleRemovePatient = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (confirm(isZh ? `确定要移除 ${patient?.name} 吗？` : `Remove ${patient?.name}?`)) {
      setPatients(prev => prev.filter(p => p.id !== patientId));
      setNotifications(prev => prev.filter(n => n.patientId !== patientId));
      setShowPatientModal(null);
    }
  };

  const handleCopyLink = () => { navigator.clipboard.writeText(inviteLink); alert(isZh ? '已复制！' : 'Copied!'); };
  const handleCopyCode = () => { navigator.clipboard.writeText(inviteCode); alert(isZh ? '已复制！' : 'Copied!'); };

  const formatTime = (timestamp: string) => {
    const diffMs = new Date().getTime() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return isZh ? '刚刚' : 'Just now';
    if (diffMins < 60) return isZh ? `${diffMins}分钟前` : `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return isZh ? `${diffHours}小时前` : `${diffHours}h ago`;
    return isZh ? `${Math.floor(diffMs / 86400000)}天前` : `${Math.floor(diffMs / 86400000)}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Show login prompt for anonymous users */}
      {isAnonymous ? (
        <LoginPrompt
          title={isZh ? '需要登录' : 'Login Required'}
          description={isZh 
            ? '登录以访问护理人员门户，跨设备监控患者的服药依从性。' 
            : 'Sign in to access the Caregiver Portal and monitor your patients\' medication adherence across devices.'}
        />
      ) : (
        <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{t('caregiverPortal')}</h1>
          <p className="text-[var(--text-secondary)] text-sm">{t('monitorSupport')}</p>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="btn-primary">{t('addPatient')}</button>
      </div>

      {patients.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-[rgba(0,122,255,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👥</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{isZh ? '还没有患者' : 'No patients yet'}</h3>
          <p className="text-[var(--text-secondary)] mb-4">{isZh ? '点击"添加患者"开始' : 'Click "Add Patient" to start'}</p>
          <button onClick={() => setShowInviteModal(true)} className="btn-primary">{t('addPatient')}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => (
            <div key={patient.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[rgba(0,122,255,0.12)] rounded-full flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{patient.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{patient.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`pill ${patient.permissionLevel === 'manage' ? 'pill-primary' : 'pill-warning'}`}>
                    {patient.permissionLevel === 'manage' ? `🔧 ${t('coManage')}` : `👁️ ${t('viewOnly')}`}
                  </span>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{t('active')} {patient.lastActivity || formatTime(patient.addedAt)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--divider)]">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color: patient.adherenceRate >= 80 ? 'var(--success)' : 'var(--warning)' }}>{patient.adherenceRate}%</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{t('adherence')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--primary)] font-mono">{patient.medicationCount}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{t('medications')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color: patient.missedToday > 0 ? 'var(--warning)' : 'var(--success)' }}>{patient.missedToday}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{t('missedToday')}</div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowPatientModal(patient)} className="btn-secondary flex-1 py-2">📊 {t('viewReport')}</button>
                <button className="btn-secondary flex-1 py-2">💊 {t('medications')}</button>
                <button onClick={() => handleRemovePatient(patient.id)} className="btn-ghost text-[var(--danger)]">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mt-6">
        <h3 className="font-medium text-[var(--text-primary)] mb-4">🔔 {t('recentNotifications')}</h3>
        {notifications.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-center py-4">{isZh ? '暂无通知' : 'No notifications'}</p>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map((notif) => (
              <div key={notif.id} className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] ${
                notif.type === 'success' ? 'bg-[rgba(50,215,75,0.1)]' : notif.type === 'warning' ? 'bg-[rgba(255,149,0,0.1)]' : 'bg-[rgba(0,122,255,0.1)]'
              }`}>
                <span>{notif.type === 'success' ? '✓' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{notif.message}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatTime(notif.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-elevated w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t('invitePatient')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{isZh ? '患者姓名 *' : 'Patient Name *'}</label>
                <input type="text" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="input" placeholder={isZh ? '例如：张三' : 'e.g., John Smith'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('patientEmail')}</label>
                <input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  className="input" placeholder="patient@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('permissionLevel')}</label>
                <div className="segmented-control">
                  <button type="button" onClick={() => setNewPatient({ ...newPatient, permissionLevel: 'view' })}
                    className={`segmented-item ${newPatient.permissionLevel === 'view' ? 'active' : ''}`}>👁️ {t('viewOnly')}</button>
                  <button type="button" onClick={() => setNewPatient({ ...newPatient, permissionLevel: 'manage' })}
                    className={`segmented-item ${newPatient.permissionLevel === 'manage' ? 'active' : ''}`}>🔧 {t('coManage')}</button>
                </div>
              </div>

              <div className="border-t border-[var(--divider)] pt-4">
                <h4 className="font-medium text-center text-[var(--text-primary)] mb-3">{isZh ? '📱 扫码邀请' : '📱 Scan to Invite'}</h4>
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-white border border-[var(--border)] rounded-[var(--radius-md)]">
                    <img src={getQRCodeUrl(inviteLink, 150)} alt="QR Code" className="w-[150px] h-[150px]" />
                  </div>
                </div>
                <div className="text-center mb-3">
                  <p className="text-xs text-[var(--text-tertiary)] mb-1">{isZh ? '邀请码' : 'Invite Code'}</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-lg font-mono font-bold bg-[var(--surface-secondary)] px-3 py-1 rounded-[var(--radius-sm)]">{inviteCode}</code>
                    <button onClick={handleCopyCode} className="btn-ghost">📋</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[var(--surface-secondary)] rounded-[var(--radius-md)]">
                  <input type="text" value={inviteLink} readOnly className="flex-1 bg-transparent text-xs text-[var(--text-secondary)] outline-none" />
                  <button onClick={handleCopyLink} className="btn-ghost text-sm">{isZh ? '复制' : 'Copy'}</button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInviteModal(false)} className="btn-secondary flex-1">{t('cancel')}</button>
                <button onClick={handleAddPatient} className="btn-primary flex-1">{isZh ? '添加' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-elevated w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">📊 {showPatientModal.name}</h2>
            <div className="text-center mb-4">
              <div className="w-20 h-20 bg-[rgba(0,122,255,0.12)] rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="font-semibold text-lg text-[var(--text-primary)]">{showPatientModal.name}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{showPatientModal.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-[rgba(50,215,75,0.1)] rounded-[var(--radius-md)]">
                <div className="text-2xl font-bold text-[var(--success)] font-mono">{showPatientModal.adherenceRate}%</div>
                <div className="text-xs text-[var(--text-tertiary)]">{t('adherenceRate')}</div>
              </div>
              <div className="text-center p-3 bg-[rgba(0,122,255,0.1)] rounded-[var(--radius-md)]">
                <div className="text-2xl font-bold text-[var(--primary)] font-mono">{showPatientModal.medicationCount}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{t('medications')}</div>
              </div>
            </div>
            <div className="border-t border-[var(--divider)] pt-4 mb-4">
              <h4 className="font-medium text-[var(--text-primary)] mb-2">{isZh ? '本周概览' : 'This Week'}</h4>
              <div className="flex justify-between text-sm">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={day} className="text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${i < 5 ? 'bg-[rgba(50,215,75,0.2)] text-[var(--success)]' : 'bg-[var(--surface-secondary)] text-[var(--text-tertiary)]'}`}>
                      {i < 5 ? '✓' : '-'}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">{isZh ? ['一', '二', '三', '四', '五', '六', '日'][i] : day.charAt(0)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPatientModal(null)} className="btn-secondary flex-1">{t('cancel')}</button>
              <button onClick={() => handleRemovePatient(showPatientModal.id)} className="btn-danger flex-1">🗑️ {isZh ? '移除' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
