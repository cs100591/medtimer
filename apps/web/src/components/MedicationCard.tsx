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

  return (
    <Card className={medication.isCritical ? 'border-l-4 border-red-500' : ''} onClick={onClick}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${medication.isCritical ? 'bg-red-100' : 'bg-blue-100'}`}>
          <MedicationIcon form={medication.form} critical={medication.isCritical} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{medication.name}</h3>
            {medication.isCritical && (
              <span className="text-red-500" title="Critical medication">⚠️</span>
            )}
          </div>
          <p className="text-sm text-gray-600">{medication.dosage} • {medication.form}</p>
          {medication.instructions && (
            <p className="text-sm text-gray-500 mt-1">{medication.instructions}</p>
          )}
          {medication.currentSupply !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm ${isLowSupply ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                📦 {medication.currentSupply} remaining
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

function MedicationIcon({ form, critical }: { form: string; critical?: boolean }) {
  const color = critical ? 'text-red-600' : 'text-blue-600';
  const icons: Record<string, string> = {
    tablet: '💊', capsule: '💊', liquid: '🧴', injection: '💉',
    inhaler: '🌬️', cream: '🧴', drops: '💧', patch: '🩹',
  };
  return <span className={`text-2xl ${color}`}>{icons[form] || '💊'}</span>;
}
