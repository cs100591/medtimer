import { logger } from '../utils/logger';

export enum InteractionSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  CONTRAINDICATED = 'contraindicated',
}

export interface DrugInteraction {
  id: string;
  drug1: { name: string; rxcui?: string };
  drug2: { name: string; rxcui?: string };
  severity: InteractionSeverity;
  description: string;
  mechanism?: string;
  clinicalEffects?: string[];
  management?: string;
  references?: string[];
}

export interface FoodInteraction {
  id: string;
  drug: { name: string; rxcui?: string };
  food: string;
  severity: InteractionSeverity;
  description: string;
  recommendation?: string;
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  drugInteractions: DrugInteraction[];
  foodInteractions: FoodInteraction[];
  criticalCount: number;
  requiresAcknowledgment: boolean;
}

export interface InteractionAcknowledgment {
  interactionId: string;
  userId: string;
  acknowledgedAt: Date;
  acknowledgedBy: 'patient' | 'caregiver' | 'provider';
  notes?: string;
}

// Mock interaction database (would be replaced with real API integration)
const KNOWN_INTERACTIONS: DrugInteraction[] = [
  {
    id: 'int_001',
    drug1: { name: 'Warfarin', rxcui: '11289' },
    drug2: { name: 'Aspirin', rxcui: '1191' },
    severity: InteractionSeverity.MAJOR,
    description: 'Increased risk of bleeding when warfarin is combined with aspirin.',
    mechanism: 'Both drugs affect blood clotting through different mechanisms.',
    clinicalEffects: ['Increased bleeding risk', 'Prolonged bleeding time'],
    management: 'Monitor INR closely. Consider alternative pain relief.',
  },
  {
    id: 'int_002',
    drug1: { name: 'Metformin', rxcui: '6809' },
    drug2: { name: 'Alcohol', rxcui: '' },
    severity: InteractionSeverity.MODERATE,
    description: 'Alcohol may increase the risk of lactic acidosis with metformin.',
    mechanism: 'Both can affect lactate metabolism.',
    clinicalEffects: ['Lactic acidosis risk', 'Hypoglycemia'],
    management: 'Limit alcohol consumption while taking metformin.',
  },
  {
    id: 'int_003',
    drug1: { name: 'Lisinopril', rxcui: '29046' },
    drug2: { name: 'Potassium supplements', rxcui: '' },
    severity: InteractionSeverity.MODERATE,
    description: 'ACE inhibitors can increase potassium levels.',
    mechanism: 'ACE inhibitors reduce aldosterone, decreasing potassium excretion.',
    clinicalEffects: ['Hyperkalemia'],
    management: 'Monitor potassium levels regularly.',
  },
];

const KNOWN_FOOD_INTERACTIONS: FoodInteraction[] = [
  {
    id: 'food_001',
    drug: { name: 'Warfarin', rxcui: '11289' },
    food: 'Vitamin K rich foods (leafy greens)',
    severity: InteractionSeverity.MODERATE,
    description: 'Vitamin K can reduce the effectiveness of warfarin.',
    recommendation: 'Maintain consistent vitamin K intake. Do not suddenly increase or decrease consumption.',
  },
  {
    id: 'food_002',
    drug: { name: 'Ciprofloxacin', rxcui: '2551' },
    food: 'Dairy products',
    severity: InteractionSeverity.MODERATE,
    description: 'Calcium in dairy can reduce absorption of ciprofloxacin.',
    recommendation: 'Take ciprofloxacin 2 hours before or 6 hours after dairy products.',
  },
  {
    id: 'food_003',
    drug: { name: 'MAO Inhibitors', rxcui: '' },
    food: 'Tyramine-rich foods (aged cheese, cured meats)',
    severity: InteractionSeverity.MAJOR,
    description: 'Can cause dangerous increase in blood pressure.',
    recommendation: 'Avoid tyramine-rich foods while taking MAO inhibitors.',
  },
  {
    id: 'food_004',
    drug: { name: 'Statins', rxcui: '' },
    food: 'Grapefruit',
    severity: InteractionSeverity.MODERATE,
    description: 'Grapefruit can increase statin levels in the blood.',
    recommendation: 'Avoid grapefruit and grapefruit juice while taking statins.',
  },
];

export class InteractionService {
  private acknowledgments: Map<string, InteractionAcknowledgment> = new Map();

  async checkDrugInteractions(
    medications: Array<{ name: string; rxcui?: string }>
  ): Promise<DrugInteraction[]> {
    const interactions: DrugInteraction[] = [];

    // Check all pairs of medications
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];

        const found = this.findDrugInteraction(med1, med2);
        if (found) {
          interactions.push(found);
        }
      }
    }

    logger.info(`Checked ${medications.length} medications, found ${interactions.length} interactions`);
    return interactions;
  }

  async checkFoodInteractions(
    medication: { name: string; rxcui?: string }
  ): Promise<FoodInteraction[]> {
    const interactions = KNOWN_FOOD_INTERACTIONS.filter(
      fi => this.matchesDrug(fi.drug, medication)
    );

    return interactions;
  }

  async checkAllInteractions(
    medications: Array<{ name: string; rxcui?: string }>
  ): Promise<InteractionCheckResult> {
    const drugInteractions = await this.checkDrugInteractions(medications);
    
    const foodInteractions: FoodInteraction[] = [];
    for (const med of medications) {
      const foodInts = await this.checkFoodInteractions(med);
      foodInteractions.push(...foodInts);
    }

    const criticalCount = drugInteractions.filter(
      i => i.severity === InteractionSeverity.MAJOR || 
           i.severity === InteractionSeverity.CONTRAINDICATED
    ).length;

    return {
      hasInteractions: drugInteractions.length > 0 || foodInteractions.length > 0,
      drugInteractions,
      foodInteractions,
      criticalCount,
      requiresAcknowledgment: criticalCount > 0,
    };
  }

  async acknowledgeInteraction(
    interactionId: string,
    userId: string,
    acknowledgedBy: 'patient' | 'caregiver' | 'provider',
    notes?: string
  ): Promise<InteractionAcknowledgment> {
    const acknowledgment: InteractionAcknowledgment = {
      interactionId,
      userId,
      acknowledgedAt: new Date(),
      acknowledgedBy,
      notes,
    };

    const key = `${userId}_${interactionId}`;
    this.acknowledgments.set(key, acknowledgment);

    logger.info(`Interaction ${interactionId} acknowledged by ${acknowledgedBy} for user ${userId}`);
    return acknowledgment;
  }

  isAcknowledged(interactionId: string, userId: string): boolean {
    const key = `${userId}_${interactionId}`;
    return this.acknowledgments.has(key);
  }

  getAcknowledgment(interactionId: string, userId: string): InteractionAcknowledgment | null {
    const key = `${userId}_${interactionId}`;
    return this.acknowledgments.get(key) || null;
  }

  getSeverityLevel(severity: InteractionSeverity): number {
    const levels: Record<InteractionSeverity, number> = {
      [InteractionSeverity.MINOR]: 1,
      [InteractionSeverity.MODERATE]: 2,
      [InteractionSeverity.MAJOR]: 3,
      [InteractionSeverity.CONTRAINDICATED]: 4,
    };
    return levels[severity];
  }

  getSeverityColor(severity: InteractionSeverity): string {
    const colors: Record<InteractionSeverity, string> = {
      [InteractionSeverity.MINOR]: '#4CAF50', // Green
      [InteractionSeverity.MODERATE]: '#FF9800', // Orange
      [InteractionSeverity.MAJOR]: '#F44336', // Red
      [InteractionSeverity.CONTRAINDICATED]: '#9C27B0', // Purple
    };
    return colors[severity];
  }

  private findDrugInteraction(
    med1: { name: string; rxcui?: string },
    med2: { name: string; rxcui?: string }
  ): DrugInteraction | null {
    for (const interaction of KNOWN_INTERACTIONS) {
      if (
        (this.matchesDrug(interaction.drug1, med1) && this.matchesDrug(interaction.drug2, med2)) ||
        (this.matchesDrug(interaction.drug1, med2) && this.matchesDrug(interaction.drug2, med1))
      ) {
        return interaction;
      }
    }
    return null;
  }

  private matchesDrug(
    known: { name: string; rxcui?: string },
    check: { name: string; rxcui?: string }
  ): boolean {
    // Match by RxCUI if available
    if (known.rxcui && check.rxcui && known.rxcui === check.rxcui) {
      return true;
    }

    // Match by name (case-insensitive, partial match)
    const knownName = known.name.toLowerCase();
    const checkName = check.name.toLowerCase();

    return knownName.includes(checkName) || checkName.includes(knownName);
  }

  // Integration with external APIs (placeholder)
  async fetchFromRxNorm(rxcui: string): Promise<any> {
    // TODO: Integrate with RxNorm API
    // https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=XXXXX
    logger.info(`Would fetch interaction data from RxNorm for RXCUI: ${rxcui}`);
    return null;
  }

  async fetchFromFDA(ndc: string): Promise<any> {
    // TODO: Integrate with FDA API
    // https://api.fda.gov/drug/label.json?search=openfda.product_ndc:"XXXXX"
    logger.info(`Would fetch drug data from FDA for NDC: ${ndc}`);
    return null;
  }
}

export const interactionService = new InteractionService();
