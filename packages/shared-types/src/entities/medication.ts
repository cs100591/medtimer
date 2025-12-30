import { DosageUnit, MedicationForm, InteractionSeverity } from '../enums';

export interface Dosage {
  amount: number;
  unit: DosageUnit;
  strength?: string;
}

export interface MedicationImage {
  id: string;
  url: string;
  isPrimary: boolean;
  source: 'barcode' | 'user' | 'database';
}

export interface DrugInteraction {
  interactingDrugId: string;
  interactingDrugName: string;
  severity: InteractionSeverity;
  description: string;
  recommendation: string;
  resourceUrl?: string;
}

export interface FoodInteraction {
  food: string;
  severity: InteractionSeverity;
  description: string;
  recommendation: string;
}

export interface SideEffect {
  name: string;
  frequency: 'common' | 'uncommon' | 'rare';
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
}

export interface RefillInfo {
  currentSupply: number;
  lowSupplyThreshold: number;
  lastRefillDate?: Date;
  nextRefillDate?: Date;
  pharmacyName?: string;
  pharmacyPhone?: string;
  prescriptionNumber?: string;
}

export interface CostTracking {
  costPerUnit: number;
  currency: string;
  insuranceCopay?: number;
  lastPurchaseDate?: Date;
  lastPurchaseAmount?: number;
}

export interface MedicationHistory {
  id: string;
  action: 'started' | 'stopped' | 'dosage_changed' | 'frequency_changed';
  previousValue?: string;
  newValue?: string;
  reason?: string;
  changedAt: Date;
  changedBy: string;
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  genericName?: string;
  dosage: Dosage;
  form: MedicationForm;
  manufacturer?: string;
  ndc?: string;
  rxcui?: string;
  images: MedicationImage[];
  purpose?: string;
  instructions?: string;
  userNotes?: string;
  sideEffects: SideEffect[];
  drugInteractions: DrugInteraction[];
  foodInteractions: FoodInteraction[];
  refillInfo?: RefillInfo;
  costTracking?: CostTracking;
  history: MedicationHistory[];
  isCritical: boolean;
  isRescueMedication: boolean;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMedicationInput {
  name: string;
  genericName?: string;
  dosage: Dosage;
  form: MedicationForm;
  manufacturer?: string;
  ndc?: string;
  purpose?: string;
  instructions?: string;
  userNotes?: string;
  isCritical?: boolean;
  isRescueMedication?: boolean;
  startDate?: Date;
  endDate?: Date;
  refillInfo?: Partial<RefillInfo>;
  costTracking?: Partial<CostTracking>;
}

export interface UpdateMedicationInput {
  name?: string;
  genericName?: string;
  dosage?: Partial<Dosage>;
  form?: MedicationForm;
  purpose?: string;
  instructions?: string;
  userNotes?: string;
  isCritical?: boolean;
  isRescueMedication?: boolean;
  isActive?: boolean;
  endDate?: Date;
  refillInfo?: Partial<RefillInfo>;
  costTracking?: Partial<CostTracking>;
}
