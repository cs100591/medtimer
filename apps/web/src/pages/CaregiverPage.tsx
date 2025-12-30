import React, { useState } from 'react';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface CaregiverAccess {
  id: string;
  patientName: string;
  patientEmail: string;
  permissionLevel: 'view' | 'manage';
  status: 'active' | 'pending';
  lastActivity?: string;
}

// Sample data
const sampleAccess: CaregiverAccess[] = [
  { id: '1', patientName: 'John Smith', patientEmail: 'john@example.com', permissionLevel: 'manage', status: 'active', lastActivity: '2 hours ago' },
  { id: '2', patientName: 'Mary Johnson', patientEmail: 'mary@example.com', permissionLevel: 'view', status: 'active', lastActivity: '1 day ago' },
];

export function CaregiverPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caregiver Portal</h1>
          <p className="text-gray-600">Monitor and support your loved ones</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>+ Add Patient</Button>
      </div>

      {/* Patient Cards */}
      <div className="space-y-4">
        {sampleAccess.map((access) => (
          <Card key={access.id} className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{access.patientName}</h3>
                  <p className="text-sm text-gray-500">{access.patientEmail}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  access.permissionLevel === 'manage' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {access.permissionLevel === 'manage' ? '🔧 Co-manage' : '👁️ View only'}
                </span>
                {access.lastActivity && (
                  <p className="text-xs text-gray-400 mt-1">Active {access.lastActivity}</p>
                )}
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">92%</div>
                <div className="text-xs text-gray-500">Adherence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">5</div>
                <div className="text-xs text-gray-500">Medications</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">1</div>
                <div className="text-xs text-gray-500">Missed Today</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="sm" className="flex-1">
                📊 View Report
              </Button>
              <Button variant="secondary" size="sm" className="flex-1">
                💊 Medications
              </Button>
              <Button variant="ghost" size="sm">
                ⚙️
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Peace of Mind Notifications */}
      <Card className="mt-6">
        <CardTitle>🔔 Recent Notifications</CardTitle>
        <CardContent className="mt-4 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <span className="text-green-500">✓</span>
            <div className="flex-1">
              <p className="text-sm font-medium">John took morning medications</p>
              <p className="text-xs text-gray-500">Today at 8:15 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
            <span className="text-orange-500">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Mary missed afternoon dose</p>
              <p className="text-xs text-gray-500">Yesterday at 2:00 PM</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-blue-500">📦</span>
            <div className="flex-1">
              <p className="text-sm font-medium">John's Lisinopril running low</p>
              <p className="text-xs text-gray-500">5 days supply remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardTitle>Invite Patient</CardTitle>
            <CardContent className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Patient Email</label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="patient@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Permission Level</label>
                <select className="w-full border rounded-lg px-3 py-2">
                  <option value="view">View Only - See medications and adherence</option>
                  <option value="manage">Co-manage - Edit medications and schedules</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">
                The patient will receive an invitation and must approve your access request.
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowInviteModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={() => setShowInviteModal(false)} className="flex-1">
                  Send Invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
