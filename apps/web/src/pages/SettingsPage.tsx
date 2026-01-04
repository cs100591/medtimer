import { useState, useEffect } from 'react';
import { useTranslation, Language } from '../i18n/TranslationContext';

const STORAGE_KEYS = {
  LANGUAGE: 'app_language', FONT_SIZE: 'app_font_size', HIGH_CONTRAST: 'app_high_contrast', NOTIFICATIONS: 'app_notifications',
};

export function SettingsPage() {
  const { t, lang, setLang } = useTranslation();
  const isZh = lang === 'zh';
  const [fontSize, setFontSize] = useState(() => localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'normal');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true');
  const [notifications, setNotifications] = useState(() => localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) !== 'false');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
    const scale = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : fontSize === 'extraLarge' ? '20px' : '16px';
    document.documentElement.style.fontSize = scale;
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, String(highContrast));
    if (highContrast) document.body.classList.add('high-contrast');
    else document.body.classList.remove('high-contrast');
  }, [highContrast]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, String(notifications)); }, [notifications]);

  const handleLanguageChange = (newLang: string) => { setLang(newLang as Language); showSavedMessage(); };

  const handleClearData = () => {
    if (confirm(t('confirmDeleteAll'))) {
      localStorage.clear(); sessionStorage.clear();
      alert(t('dataCleared')); window.location.reload();
    }
  };

  const handleExportData = () => {
    const data = { settings: { language: lang, fontSize, highContrast, notifications }, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `medtimer-data-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const showSavedMessage = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">{t('settings')}</h1>

      {saved && (
        <div className="bg-[rgba(50,215,75,0.1)] text-[var(--success)] px-4 py-3 rounded-[var(--radius-md)] mb-4 flex items-center gap-2">
          <span>✓</span> {t('settingsSaved')}
        </div>
      )}

      {/* Accessibility */}
      <div className="card mb-4">
        <div className="p-4 border-b border-[var(--divider)]">
          <h2 className="font-semibold text-[var(--text-primary)]">{t('accessibility')}</h2>
        </div>
        <div className="list-group">
          <div className="list-item justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{t('language')}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t('selectLanguage')}</p>
            </div>
            <div className="segmented-control">
              <button onClick={() => handleLanguageChange('en')} className={`segmented-item ${lang === 'en' ? 'active' : ''}`}>EN</button>
              <button onClick={() => handleLanguageChange('zh')} className={`segmented-item ${lang === 'zh' ? 'active' : ''}`}>中文</button>
            </div>
          </div>
          <div className="list-item justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{t('fontSize')}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t('adjustFontSize')}</p>
            </div>
            <select value={fontSize} onChange={(e) => { setFontSize(e.target.value); showSavedMessage(); }} 
              className="input w-auto min-w-[120px]">
              <option value="small">{t('small')}</option>
              <option value="normal">{t('normal')}</option>
              <option value="large">{t('large')}</option>
              <option value="extraLarge">{t('extraLarge')}</option>
            </select>
          </div>
          <div className="list-item justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{t('highContrast')}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t('increaseVisibility')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={highContrast} onChange={(e) => { setHighContrast(e.target.checked); showSavedMessage(); }} className="sr-only peer" />
              <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card mb-4">
        <div className="p-4 border-b border-[var(--divider)]">
          <h2 className="font-semibold text-[var(--text-primary)]">{t('notifications')}</h2>
        </div>
        <div className="list-group">
          <div className="list-item justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">{t('pushNotifications')}</p>
              <p className="text-sm text-[var(--text-secondary)]">{t('receiveAlerts')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications} onChange={(e) => { setNotifications(e.target.checked); showSavedMessage(); }} className="sr-only peer" />
              <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="card mb-4">
        <div className="p-4 border-b border-[var(--divider)]">
          <h2 className="font-semibold text-[var(--text-primary)]">{t('dataPrivacy')}</h2>
        </div>
        <div className="p-4 space-y-3">
          <button onClick={handleExportData} className="btn-secondary w-full">📥 {t('exportData')}</button>
          <button onClick={handleClearData} className="btn-danger w-full">🗑️ {t('deleteAllData')}</button>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="p-4 border-b border-[var(--divider)]">
          <h2 className="font-semibold text-[var(--text-primary)]">{t('about')}</h2>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-[var(--primary)] rounded-[var(--radius-md)] flex items-center justify-center">
              <span className="text-2xl">💊</span>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">MedTimer</p>
              <p className="text-sm text-[var(--text-secondary)]">{t('version')} 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{t('appDescription')}</p>
        </div>
      </div>
    </div>
  );
}
