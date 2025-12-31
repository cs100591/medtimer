import { useState, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTranslation } from '../i18n/TranslationContext';

interface Patient {
  id: string;
  name: string;
  email: string;
  permissionLevel: 'view' | 'manage';
  status: 'active' | 'pending';
  addedAt: string;
  lastActivity?: string;
  adherenceRate: number;
  medicationCount: number;
  missedToday: number;
}

interface Notification {
  id: string;
  patientId: string;
  patientName: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  timestamp: string;
}

// Generate a simple invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate QR code URL using a free API
function getQRCodeUrl(data: string, size: number = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function CaregiverPage() {
  const { t, lang } = useTranslation();
  const isZh = lang === 'zh';
  
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('caregiver_patients');
    if (saved) {
      try { return JSON.parse(saved); } 
      catch { return []; }
    }
    return [];
  });
  
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('caregiver_notifications');
    if (saved) {
      try { return JSON.parse(saved); } 
      catch { return []; }
    }
    return [];
  });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState<Patient | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    permissionLevel: 'view' as 'view' | 'manage',
  });

  useEffect(() => {
    localStorage.setItem('caregiver_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('caregiver_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (showInviteModal) {
      const code = generateInviteCode();
      setInviteCode(code);
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}?invite=${code}`);
    }
  }, [showInviteModal]);

  const handleAddPatient = () => {
    if (!newPatient.name.trim()) {
      alert(isZh ? '请输入患者姓名' : 'Please enter patient name');
      return;
    }

    const patient: Patient = {
      id: `p${Date.now()}`,
      name: newPatient.name.trim(),
      email: newPatient.email.trim() || `${newPatient.name.toLowerCase().replace(/\s+/g, '')}@patient.local`,
      permissionLevel: newPatient.permissionLevel,
      status: 'active',
      addedAt: new Date().toISOString(),
      lastActivity: isZh ? '刚刚' : 'Just now',
      adherenceRate: Math.floor(Math.random() * 20) + 80,
      medicationCount: Math.floor(Math.random() * 5) + 1,
      missedToday: Math.floor(Math.random() * 2),
    };

    setPatients(prev => [...prev, patient]);
    
    const notification: Notification = {
      id: `n${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      message: isZh ? `${patient.name} 已添加到您的护理列表` : `${patient.name} has been added to your care list`,
      type: 'info',
      timestamp: new Date().toISOString(),
    };
    setNotifications(prev => [notification, ...prev].slice(0, 10));

    setShowInviteModal(false);
    setNewPatient({ name: '', email: '', permissionLevel: 'view' });
  };

  const handleRemovePatient = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (confirm(isZh ? `确定要移除 ${patient?.name} 吗？` : `Remove ${patient?.name} from your care list?`)) {
      setPatients(prev => prev.filter(p => p.id !== patientId));
      setNotifications(prev => prev.filter(n => n.patientId !== patientId));
      setShowPatientModal(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert(isZh ? '链接已复制！' : 'Link copied!');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    alert(isZh ? '邀请码已复制！' : 'Invite code copied!');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return isZh ? '刚刚' : 'Just now';
    if (diffMins < 60) return isZh ? `${diffMins}分钟前` : `${diffMins}m ago`;
    if (diffHours < 24) return isZh ? `${diffHours}小时前` : `${diffHours}h ago`;
    return isZh ? `${diffDays}天前` : `${diffDays}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('caregiverPortal')}</h1>
          <p className="text-gray-600">{t('monitorSupport')}</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>{t('addPatient')}</Button>
      </div>

      {patients.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {isZh ? '还没有患者' : 'No patients yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {isZh ? '点击"添加患者"开始监护您的亲人' : 'Click "Add Patient" to start monitoring your loved ones'}
          </p>
          <Button onClick={() => setShowInviteModal(true)}>{t('addPatient')}</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {patients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-500">{patient.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    patient.permissionLevel === 'manage' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {patient.permissionLevel === 'manage' ? `🔧 ${t('coManage')}` : `👁️ ${t('viewOnly')}`}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('active')} {patient.lastActivity || formatTime(patient.addedAt)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${patient.adherenceRate >= 80 ? 'text-green-600' : 'text-orange-500'}`}>
                    {patient.adherenceRate}%
                  </div>
                  <div className="text-xs text-gray-500">{t('adherence')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{patient.medicationCount}</div>
                  <div className="text-xs text-gray-500">{t('medications')}</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${patient.missedToday > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                    {patient.missedToday}
                  </div>
                  <div className="text-xs text-gray-500">{t('missedToday')}</div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowPatientModal(patient)}>
                  📊 {t('viewReport')}
                </Button>
                <Button variant="secondary" size="sm" className="flex-1">💊 {t('medications')}</Button>
                <Button variant="ghost" size="sm" onClick={() => handleRemovePatient(patient.id)}>🗑️</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardTitle>🔔 {t('recentNotifications')}</CardTitle>
        <CardContent className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">{isZh ? '暂无通知' : 'No notifications yet'}</p>
          ) : (
            notifications.slice(0, 5).map((notif) => (
              <div key={notif.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                notif.type === 'success' ? 'bg-green-50' : notif.type === 'warning' ? 'bg-orange-50' : 'bg-blue-50'
              }`}>
                <span className={notif.type === 'success' ? 'text-green-500' : notif.type === 'warning' ? 'text-orange-500' : 'text-blue-500'}>
                  {notif.type === 'success' ? '✓' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{notif.message}</p>
                  <p className="text-xs text-gray-500">{formatTime(notif.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardTitle>{t('invitePatient')}</CardTitle>
            <CardContent className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{isZh ? '患者姓名 *' : 'Patient Name *'}</label>
                <input type="text" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" placeholder={isZh ? '例如：张三' : 'e.g., John Smith'} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('patientEmail')} ({isZh ? '可选' : 'optional'})</label>
                <input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" placeholder="patient@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('permissionLevel')}</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewPatient({ ...newPatient, permissionLevel: 'view' })}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      newPatient.permissionLevel === 'view' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}>👁️ {t('viewOnly')}</button>
                  <button type="button" onClick={() => setNewPatient({ ...newPatient, permissionLevel: 'manage' })}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      newPatient.permissionLevel === 'manage' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}>🔧 {t('coManage')}</button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{newPatient.permissionLevel === 'view' ? t('viewOnlyDesc') : t('coManageDesc')}</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-center mb-3">{isZh ? '📱 扫码邀请' : '📱 Scan to Invite'}</h4>
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-white border-2 border-gray-200 rounded-lg">
                    <img src={getQRCodeUrl(inviteLink, 150)} alt="Invite QR Code" className="w-[150px] h-[150px]" />
                  </div>
                </div>
                
                <div className="text-center mb-3">
                  <p className="text-xs text-gray-500 mb-1">{isZh ? '邀请码' : 'Invite Code'}</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-lg font-mono font-bold bg-gray-100 px-3 py-1 rounded">{inviteCode}</code>
                    <button onClick={handleCopyCode} className="text-blue-600 hover:text-blue-800 text-sm">📋</button>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <input type="text" value={inviteLink} readOnly className="flex-1 bg-transparent text-xs text-gray-600 outline-none" />
                  <button onClick={handleCopyLink} className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap">{isZh ? '复制链接' : 'Copy'}</button>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">{t('inviteNote')}</p>
              
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowInviteModal(false)} className="flex-1">{t('cancel')}</Button>
                <Button onClick={handleAddPatient} className="flex-1">{isZh ? '添加患者' : 'Add Patient'}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardTitle>📊 {showPatientModal.name}</CardTitle>
            <CardContent className="mt-4 space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">👤</span>
                </div>
                <h3 className="font-semibold text-lg">{showPatientModal.name}</h3>
                <p className="text-sm text-gray-500">{showPatientModal.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{showPatientModal.adherenceRate}%</div>
                  <div className="text-xs text-gray-500">{t('adherenceRate')}</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{showPatientModal.medicationCount}</div>
                  <div className="text-xs text-gray-500">{t('medications')}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">{isZh ? '本周概览' : 'This Week'}</h4>
                <div className="flex justify-between text-sm">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                    <div key={day} className="text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${i < 5 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {i < 5 ? '✓' : '-'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{isZh ? ['一', '二', '三', '四', '五', '六', '日'][i] : day.charAt(0)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowPatientModal(null)} className="flex-1">{t('cancel')}</Button>
                <Button variant="secondary" onClick={() => handleRemovePatient(showPatientModal.id)} className="flex-1 text-red-600">
                  🗑️ {isZh ? '移除' : 'Remove'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
