import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Today', icon: '📅' },
  { path: '/medications', label: 'Medications', icon: '💊' },
  { path: '/adherence', label: 'Adherence', icon: '📊' },
  { path: '/caregiver', label: 'Caregiver', icon: '👥' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">💊</span>
            <span className="font-bold text-xl text-gray-900">MedReminder</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
