import { useState, useEffect } from 'react';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const STORAGE_KEYS = {
  LANGUAGE: 'app_language',
  FONT_SIZE: 'app_font_size',
  HIGH_CONTRAST: 'app_high_contrast',
  NOTIFICATIONS: 'app_notifications',
};

export function SettingsPage() {
  const [language, setLanguage] = useState(() => localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem(STORAGE_KEYS.FONT_SIZE) || 'normal');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true');
  const [notifications, setNotifications] = useState(() => localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) !== 'false');
  const [saved, setSaved] = useState(false);

  // Apply settings on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, fontSize);
    const scale = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : fontSize === 'extraLarge' ? '20px' : '16px';
    document.documentElement.style.fontSize = scale;
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, String(highContrast));
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, String(notifications));
  }, [notifications]);

  const handleClearData = () => {
    if (confirm('Are you sure you want to delete all your data? This cannot be undone.')) {
      // Clear all localStorage
      localStorage.clear();
      // Clear auth token
      sessionStorage.clear();
      // Show confirmation
      alert('All data has been cleared. The page will reload.');
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const data = {
      settings: {
        language,
        fontSize,
        highContrast,
        notifications,
      },
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {saved && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg mb-4">
          Settings saved!
        </div>
      )}

      {/* Accessibility */}
      <Card className="mb-4">
        <CardTitle>Accessibility</CardTitle>
        <CardContent className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Language</p>
              <p className="text-sm text-gray-500">Select your preferred language</p>
            </div>
            <select
              value={language}
              onChange={(e) => { setLanguage(e.target.value); showSavedMessage(); }}
              className="border rounded-lg px-3 py-2"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="zh">中文</option>
              <option value="hi">हिन्दी</option>
              <option value="ar">العربية</option>
              <option value="fr">Français</option>
              <option value="pt">Português</option>
              <option value="ru">Русский</option>
              <option value="ja">日本語</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Font Size</p>
              <p className="text-sm text-gray-500">Adjust text size for better readability</p>
            </div>
            <select
              value={fontSize}
              onChange={(e) => { setFontSize(e.target.value); showSavedMessage(); }}
              className="border rounded-lg px-3 py-2"
            >
              <option value="small">Small</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
              <option value="extraLarge">Extra Large</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">High Contrast</p>
              <p className="text-sm text-gray-500">Increase visibility for better accessibility</p>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => { setHighContrast(e.target.checked); showSavedMessage(); }}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="mb-4">
        <CardTitle>Notifications</CardTitle>
        <CardContent className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-500">Receive medication reminder alerts</p>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => { setNotifications(e.target.checked); showSavedMessage(); }}
              className="w-5 h-5 cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card className="mb-4">
        <CardTitle>Data & Privacy</CardTitle>
        <CardContent className="space-y-4 mt-4">
          <Button variant="secondary" className="w-full" onClick={handleExportData}>
            📥 Export My Data
          </Button>
          <Button variant="danger" className="w-full" onClick={handleClearData}>
            🗑️ Delete All Data
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardTitle>About</CardTitle>
        <CardContent className="mt-4">
          <p className="text-gray-600">Medication Reminder App</p>
          <p className="text-gray-600">Version 1.0.0</p>
          <p className="text-sm text-gray-500 mt-2">
            A comprehensive medication management system with AI-powered reminders.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
