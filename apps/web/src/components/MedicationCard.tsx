import type { Medication } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface MedicationCardProps {
  medication: Medication;
  onClick?: () => void;
  onDelete?: () => void;
}

export function MedicationCard({ medication, onClick, onDelete }: MedicationCardProps) {
  // Extract dosage amount and unit from dosage string
  const tabletMatch = medication.dosage.match(/(\d+)\s*tablet/i);
  const mlMatch = medication.dosage.match(/(\d+)\s*ml/i);
  const dosageAmount = tabletMatch ? parseInt(tabletMatch[1]) : (mlMatch ? parseInt(mlMatch[1]) : 1);
  const isTablet = tabletMatch !== null;
  const isMl = mlMatch !== null;
  
  // Check if ongoing or fixed duration
  const isOngoing = medication.durationDays === 0 || medication.durationDays === undefined;
  const durationDisplay = isOngoing ? 'Ongoing' : `${medication.durationDays} days`;

  return (
    <Card className={medication.isCritical ? 'border-l-4 border-red-500' : ''} onClick={onClick}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${medication.isCritical ? 'bg-red-100' : 'bg-blue-100'}`}>
          <span className="text-2xl">{isTablet ? '💊' : '💧'}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{medication.name}</h3>
            {medication.isCritical && (
              <span className="text-red-500" title="Critical medication">⚠️</span>
            )}
          </div>
          
          {/* Dosage display */}
          <div className="flex items-center gap-1 mt-1">
            {isTablet ? (
              <>
                {Array.from({ length: Math.min(dosageAmount, 5) }).map((_, i) => (
                  <span key={i} className="text-blue-500">💊</span>
                ))}
                {dosageAmount > 5 && <span className="text-sm text-gray-500">+{dosageAmount - 5}</span>}
              </>
            ) : isMl ? (
              <span className="text-blue-500 font-medium">{dosageAmount} ml 💧</span>
            ) : (
              <span className="text-blue-500">{medication.dosage}</span>
            )}
            <span className="text-sm text-gray-600 ml-1">({medication.dosage})</span>
          </div>

          {/* Schedule times */}
          {medication.scheduleTimes && medication.scheduleTimes.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-sm text-gray-500">⏰</span>
              {medication.scheduleTimes.map((time, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {time}
                </span>
              ))}
              {medication.frequency && medication.frequency > 1 && (
                <span className="text-xs text-gray-400">
                  ({medication.frequency}x daily)
                </span>
              )}
            </div>
          )}

          {medication.instructions && (
            <p className="text-sm text-gray-500 mt-2">{medication.instructions}</p>
          )}
          
          {/* Duration display */}
          <div className="flex items-center gap-2 mt-2">
            {isOngoing ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                ♾️ Ongoing
              </span>
            ) : (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                📅 {durationDisplay}
              </span>
            )}
          </div>
        </div>
      </div>
      {onDelete && (
        <div className="mt-4 pt-4 border-t flex gap-2">
          <Button variant="danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            🗑️ Delete
          </Button>
        </div>
      )}
    </Card>
  );
}
