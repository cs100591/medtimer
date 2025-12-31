import { useState, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTranslation, Language } from '../i18n/TranslationContext';

const STORAGE_KEYS = {
  LANGUAGE: 'app_language',
  FONT_SIZE: 'app_font_size',
  HIGH_CONTRAST: 'app_high_contrast',
  NOTIFICATIONS: 'app_notifications',
};

export function SettingsPage() {
  const { t, lang, setLang } = useTranslation();
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, String(notifications));
  }, [notifications]);

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang as Language);
    showSavedMessage();
  };

  const handleClearData = () => {
    if (confirm(t('confirmDeleteAll'))) {
      localStorage.clear();
      sessionStorage.clear();
      alert(t('dataCleared'));
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const data = {
      settings: { language: lang, fontSize, highContrast, notifications },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medication-reminder-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showSavedMessage = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings')}</h1>

      {saved && <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg mb-4">{t('settingsSaved')}</div>}

      <Card className="mb-4">
        <CardTitle>{t('accessibility')}</CardTitle>
        <CardContent className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('language')}</p>
              <p className="text-sm text-gray-500">{t('selectLanguage')}</p>
            </div>
            <select value={lang} onChange={(e) => handleLanguageChange(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('fontSize')}</p>
              <p className="text-sm text-gray-500">{t('adjustFontSize')}</p>
            </div>
            <select value={fontSize} onChange={(e) => { setFontSize(e.target.value); showSavedMessage(); }} className="border rounded-lg px-3 py-2">
              <option value="small">{t('small')}</option>
              <option value="normal">{t('normal')}</option>
              <option value="large">{t('large')}</option>
              <option value="extraLarge">{t('extraLarge')}</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('highContrast')}</p>
              <p className="text-sm text-gray-500">{t('increaseVisibility')}</p>
            </div>
            <input type="checkbox" checked={highContrast} onChange={(e) => { setHighContrast(e.target.checked); showSavedMessage(); }} className="w-5 h-5 cursor-pointer" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardTitle>{t('notifications')}</CardTitle>
        <CardContent className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('pushNotifications')}</p>
              <p className="text-sm text-gray-500">{t('receiveAlerts')}</p>
            </div>
            <input type="checkbox" checked={notifications} onChange={(e) => { setNotifications(e.target.checked); showSavedMessage(); }} className="w-5 h-5 cursor-pointer" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardTitle>{t('dataPrivacy')}</CardTitle>
        <CardContent className="space-y-4 mt-4">
          <Button variant="secondary" className="w-full" onClick={handleExportData}>📥 {t('exportData')}</Button>
          <Button variant="danger" className="w-full" onClick={handleClearData}>🗑️ {t('deleteAllData')}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardTitle>{t('about')}</CardTitle>
        <CardContent className="mt-4">
          <p className="text-gray-600">MedReminder</p>
          <p className="text-gray-600">{t('version')} 1.0.0</p>
          <p className="text-sm text-gray-500 mt-2">{t('appDescription')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
