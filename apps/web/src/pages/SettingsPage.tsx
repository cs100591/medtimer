import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function SettingsPage() {
  const [language, setLanguage] = useState('en');
  const [fontSize, setFontSize] = useState('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

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
              onChange={(e) => setLanguage(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="zh">中文</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Font Size</p>
              <p className="text-sm text-gray-500">Adjust text size</p>
            </div>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
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
              <p className="text-sm text-gray-500">Increase visibility</p>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="w-5 h-5"
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
              <p className="text-sm text-gray-500">Receive reminder alerts</p>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              className="w-5 h-5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card className="mb-4">
        <CardTitle>Data & Privacy</CardTitle>
        <CardContent className="space-y-4 mt-4">
          <Button variant="secondary" className="w-full">📥 Export My Data</Button>
          <Button variant="danger" className="w-full">🗑️ Delete All Data</Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardTitle>About</CardTitle>
        <CardContent className="mt-4">
          <p className="text-gray-600">Version 1.0.0</p>
          <a href="#" className="text-blue-600 hover:underline text-sm">Privacy Policy</a>
        </CardContent>
      </Card>
    </div>
  );
}
