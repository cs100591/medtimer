import type { Medication } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface MedicationCardProps {
  medication: Medication;
  onTakeDose?: () => void;
  onClick?: () => void;
  onDelete?: () => void;
}

export function MedicationCard({ medication, onTakeDose, onClick, onDelete }: MedicationCardProps) {
  const isLowSupply = medication.currentSupply !== undefined && 
    medication.lowSupplyThreshold !== undefined &&
    medication.currentSupply <= medication.lowSupplyThreshold;

  // Extract droplet count from dosage
  const dropletMatch = medication.dosage.match(/(\d+)\s*droplet/i);
  const dropletCount = dropletMatch ? parseInt(dropletMatch[1]) : 1;

  return (
    <Card className={medication.isCritical ? 'border-l-4 border-red-500' : ''} onClick={onClick}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${medication.isCritical ? 'bg-red-100' : 'bg-blue-100'}`}>
          <span className="text-2xl">💧</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{medication.name}</h3>
            {medication.isCritical && (
              <span className="text-red-500" title="Critical medication">⚠️</span>
            )}
          </div>
          
          {/* Droplets display */}
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: Math.min(dropletCount, 5) }).map((_, i) => (
              <span key={i} className="text-blue-500">💧</span>
            ))}
            {dropletCount > 5 && <span className="text-sm text-gray-500">+{dropletCount - 5}</span>}
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
          
          {medication.currentSupply !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm ${isLowSupply ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                💧 {medication.currentSupply} remaining
              </span>
              {isLowSupply && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                  Low supply
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {(onTakeDose || onDelete) && (
        <div className="mt-4 pt-4 border-t flex gap-2">
          {onTakeDose && (
            <Button onClick={(e) => { e.stopPropagation(); onTakeDose(); }} className="flex-1">
              ✓ Take Dose
            </Button>
          )}
          {onDelete && (
            <Button variant="danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              🗑️ Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
