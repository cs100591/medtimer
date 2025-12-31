import React from 'react';
import type { Reminder } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useTranslation } from '../i18n/TranslationContext';

interface ReminderCardProps {
  reminder: Reminder;
  onTake?: () => void;
  onSkip?: () => void;
  onSnooze?: () => void;
}

export function ReminderCard({ reminder, onTake, onSkip, onSnooze }: ReminderCardProps) {
  const { t } = useTranslation();
  const isPending = reminder.status === 'pending';

  return (
    <Card className={reminder.isCritical ? 'bg-red-50 border-l-4 border-red-500' : ''}>
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${
          isPending 
            ? (reminder.isCritical ? 'bg-red-100' : 'bg-orange-100')
            : 'bg-green-100'
        }`}>
          <span className="text-xl">
            {isPending ? '⏰' : '✅'}
          </span>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{reminder.medicationName}</h4>
          <p className="text-sm text-gray-600">{reminder.dosage}</p>
        </div>
        <div className={`text-lg font-semibold ${isPending ? 'text-blue-600' : 'text-green-600'}`}>
          {reminder.scheduledTime}
        </div>
      </div>
      {isPending && (onTake || onSkip || onSnooze) && (
        <div className="flex gap-2 mt-4 pt-4 border-t">
          {onSnooze && (
            <Button variant="ghost" size="sm" onClick={onSnooze}>
              😴 {t('snooze')}
            </Button>
          )}
          {onSkip && (
            <Button variant="secondary" size="sm" onClick={onSkip}>
              ✕ {t('skip')}
            </Button>
          )}
          {onTake && (
            <Button size="sm" onClick={onTake} className="ml-auto">
              ✓ {t('takeDose')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
