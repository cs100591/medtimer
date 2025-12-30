import { logger } from '../utils/logger';

export interface MedicationInfo {
  rxcui?: string;
  name: string;
  genericName?: string;
  drugClass?: string;
  description: string;
  uses: string[];
  howToTake: string[];
  sideEffects: {
    common: string[];
    serious: string[];
    rare: string[];
  };
  warnings: string[];
  interactions: string[];
  storage: string;
  missedDose: string;
  overdose: string;
  sources: Array<{ name: string; url: string }>;
  lastUpdated: Date;
}

export interface EducationalTip {
  id: string;
  category: 'general' | 'medication' | 'lifestyle' | 'safety' | 'adherence';
  title: string;
  content: string;
  relevantMedications?: string[];
  priority: number;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  targetAudience?: 'patient' | 'caregiver' | 'all';
}

export interface EducationalContent {
  id: string;
  type: 'article' | 'video' | 'infographic' | 'quiz';
  title: string;
  summary: string;
  content: string;
  mediaUrl?: string;
  duration?: number; // minutes for video
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sources: Array<{ name: string; url: string }>;
  createdAt: Date;
}

export interface UserEducationProgress {
  userId: string;
  contentId: string;
  viewedAt: Date;
  completedAt?: Date;
  quizScore?: number;
  bookmarked: boolean;
}

// Pre-defined educational tips
const EDUCATIONAL_TIPS: EducationalTip[] = [
  {
    id: 'tip_timing_1',
    category: 'adherence',
    title: 'Consistent Timing Matters',
    content: 'Taking your medications at the same time each day helps maintain steady levels in your body and improves effectiveness.',
    priority: 1,
    frequency: 'weekly',
    targetAudience: 'all',
  },
  {
    id: 'tip_water_1',
    category: 'general',
    title: 'Stay Hydrated',
    content: 'Drink a full glass of water when taking most medications. This helps with absorption and reduces stomach irritation.',
    priority: 2,
    frequency: 'weekly',
    targetAudience: 'patient',
  },
  {
    id: 'tip_food_1',
    category: 'medication',
    title: 'Food Interactions',
    content: 'Some medications work better with food, while others should be taken on an empty stomach. Check your medication instructions.',
    priority: 1,
    frequency: 'once',
    targetAudience: 'patient',
  },
  {
    id: 'tip_storage_1',
    category: 'safety',
    title: 'Proper Storage',
    content: 'Store medications in a cool, dry place away from direct sunlight. Avoid keeping them in the bathroom where humidity is high.',
    priority: 3,
    frequency: 'monthly',
    targetAudience: 'all',
  },
  {
    id: 'tip_refill_1',
    category: 'adherence',
    title: 'Plan Ahead for Refills',
    content: 'Request refills at least a week before running out to avoid gaps in your medication routine.',
    priority: 2,
    frequency: 'monthly',
    targetAudience: 'patient',
  },
  {
    id: 'tip_caregiver_1',
    category: 'general',
    title: 'Communication is Key',
    content: 'Regular check-ins with your care recipient about how they feel can help identify medication issues early.',
    priority: 1,
    frequency: 'weekly',
    targetAudience: 'caregiver',
  },
  {
    id: 'tip_side_effects_1',
    category: 'safety',
    title: 'Track Side Effects',
    content: 'Keep a log of any side effects you experience. This information is valuable for your healthcare provider.',
    priority: 2,
    frequency: 'weekly',
    targetAudience: 'patient',
  },
  {
    id: 'tip_travel_1',
    category: 'lifestyle',
    title: 'Traveling with Medications',
    content: 'When traveling, keep medications in their original containers and carry them in your carry-on bag.',
    priority: 3,
    frequency: 'monthly',
    targetAudience: 'patient',
  },
];

// Mock medication database
const MEDICATION_INFO_DB: Map<string, MedicationInfo> = new Map([
  ['metformin', {
    name: 'Metformin',
    genericName: 'Metformin Hydrochloride',
    drugClass: 'Biguanide',
    description: 'Metformin is used to treat type 2 diabetes by helping control blood sugar levels.',
    uses: ['Type 2 diabetes', 'Polycystic ovary syndrome (off-label)'],
    howToTake: [
      'Take with meals to reduce stomach upset',
      'Swallow tablets whole with water',
      'Take at the same time each day',
    ],
    sideEffects: {
      common: ['Nausea', 'Diarrhea', 'Stomach upset', 'Metallic taste'],
      serious: ['Lactic acidosis (rare)', 'Vitamin B12 deficiency'],
      rare: ['Allergic reactions'],
    },
    warnings: [
      'Avoid excessive alcohol consumption',
      'Tell your doctor before any surgery or imaging tests with contrast dye',
      'Monitor kidney function regularly',
    ],
    interactions: ['Alcohol', 'Contrast dyes', 'Certain heart medications'],
    storage: 'Store at room temperature away from moisture and heat',
    missedDose: 'Take as soon as you remember, unless it\'s almost time for your next dose',
    overdose: 'Seek emergency medical attention if overdose is suspected',
    sources: [
      { name: 'FDA', url: 'https://www.fda.gov' },
      { name: 'MedlinePlus', url: 'https://medlineplus.gov' },
    ],
    lastUpdated: new Date(),
  }],
]);

export class EducationService {
  private userProgress: Map<string, UserEducationProgress[]> = new Map();
  private deliveredTips: Map<string, Set<string>> = new Map();

  async getMedicationInfo(medicationName: string): Promise<MedicationInfo | null> {
    const normalizedName = medicationName.toLowerCase().trim();
    return MEDICATION_INFO_DB.get(normalizedName) || null;
  }

  async searchMedicationInfo(query: string): Promise<MedicationInfo[]> {
    const results: MedicationInfo[] = [];
    const normalizedQuery = query.toLowerCase();

    for (const [key, info] of MEDICATION_INFO_DB) {
      if (
        key.includes(normalizedQuery) ||
        info.name.toLowerCase().includes(normalizedQuery) ||
        info.genericName?.toLowerCase().includes(normalizedQuery)
      ) {
        results.push(info);
      }
    }

    return results;
  }

  async getEducationalTips(
    userId: string,
    options?: {
      category?: string;
      audience?: 'patient' | 'caregiver' | 'all';
      limit?: number;
    }
  ): Promise<EducationalTip[]> {
    let tips = [...EDUCATIONAL_TIPS];

    // Filter by category
    if (options?.category) {
      tips = tips.filter(t => t.category === options.category);
    }

    // Filter by audience
    if (options?.audience && options.audience !== 'all') {
      tips = tips.filter(
        t => t.targetAudience === options.audience || t.targetAudience === 'all'
      );
    }

    // Filter out already delivered tips based on frequency
    const delivered = this.deliveredTips.get(userId) || new Set();
    tips = tips.filter(t => {
      if (t.frequency === 'once' && delivered.has(t.id)) {
        return false;
      }
      return true;
    });

    // Sort by priority
    tips.sort((a, b) => a.priority - b.priority);

    // Limit results
    if (options?.limit) {
      tips = tips.slice(0, options.limit);
    }

    return tips;
  }

  async markTipDelivered(userId: string, tipId: string): Promise<void> {
    const delivered = this.deliveredTips.get(userId) || new Set();
    delivered.add(tipId);
    this.deliveredTips.set(userId, delivered);
  }

  async getDailyTip(userId: string): Promise<EducationalTip | null> {
    const tips = await this.getEducationalTips(userId, {
      limit: 1,
    });

    if (tips.length === 0) return null;

    const tip = tips[0];
    await this.markTipDelivered(userId, tip.id);

    return tip;
  }

  async getRelevantTipsForMedication(
    medicationName: string
  ): Promise<EducationalTip[]> {
    const info = await this.getMedicationInfo(medicationName);
    if (!info) return [];

    // Return tips relevant to the medication's characteristics
    const relevantTips: EducationalTip[] = [];

    // Add food-related tip if medication has food interactions
    if (info.interactions.some(i => i.toLowerCase().includes('food'))) {
      const foodTip = EDUCATIONAL_TIPS.find(t => t.id === 'tip_food_1');
      if (foodTip) relevantTips.push(foodTip);
    }

    // Add storage tip
    const storageTip = EDUCATIONAL_TIPS.find(t => t.id === 'tip_storage_1');
    if (storageTip) relevantTips.push(storageTip);

    return relevantTips;
  }

  async trackContentView(
    userId: string,
    contentId: string
  ): Promise<UserEducationProgress> {
    const progress: UserEducationProgress = {
      userId,
      contentId,
      viewedAt: new Date(),
      bookmarked: false,
    };

    const userProgressList = this.userProgress.get(userId) || [];
    const existingIndex = userProgressList.findIndex(p => p.contentId === contentId);

    if (existingIndex >= 0) {
      userProgressList[existingIndex].viewedAt = new Date();
    } else {
      userProgressList.push(progress);
    }

    this.userProgress.set(userId, userProgressList);
    logger.info(`User ${userId} viewed content ${contentId}`);

    return progress;
  }

  async markContentCompleted(
    userId: string,
    contentId: string,
    quizScore?: number
  ): Promise<UserEducationProgress | null> {
    const userProgressList = this.userProgress.get(userId) || [];
    const progress = userProgressList.find(p => p.contentId === contentId);

    if (!progress) return null;

    progress.completedAt = new Date();
    if (quizScore !== undefined) {
      progress.quizScore = quizScore;
    }

    this.userProgress.set(userId, userProgressList);
    return progress;
  }

  async toggleBookmark(userId: string, contentId: string): Promise<boolean> {
    const userProgressList = this.userProgress.get(userId) || [];
    let progress = userProgressList.find(p => p.contentId === contentId);

    if (!progress) {
      progress = {
        userId,
        contentId,
        viewedAt: new Date(),
        bookmarked: true,
      };
      userProgressList.push(progress);
    } else {
      progress.bookmarked = !progress.bookmarked;
    }

    this.userProgress.set(userId, userProgressList);
    return progress.bookmarked;
  }

  async getUserProgress(userId: string): Promise<UserEducationProgress[]> {
    return this.userProgress.get(userId) || [];
  }

  async getBookmarkedContent(userId: string): Promise<UserEducationProgress[]> {
    const progress = await this.getUserProgress(userId);
    return progress.filter(p => p.bookmarked);
  }

  async getCompletedContent(userId: string): Promise<UserEducationProgress[]> {
    const progress = await this.getUserProgress(userId);
    return progress.filter(p => p.completedAt !== undefined);
  }

  // Generate personalized educational content based on user's medications
  async getPersonalizedContent(
    userId: string,
    medicationNames: string[]
  ): Promise<{
    tips: EducationalTip[];
    medicationInfo: MedicationInfo[];
  }> {
    const tips: EducationalTip[] = [];
    const medicationInfo: MedicationInfo[] = [];

    for (const name of medicationNames) {
      const info = await this.getMedicationInfo(name);
      if (info) {
        medicationInfo.push(info);
      }

      const relevantTips = await this.getRelevantTipsForMedication(name);
      tips.push(...relevantTips);
    }

    // Add general tips
    const generalTips = await this.getEducationalTips(userId, { limit: 3 });
    tips.push(...generalTips);

    // Remove duplicates
    const uniqueTips = tips.filter(
      (tip, index, self) => self.findIndex(t => t.id === tip.id) === index
    );

    return {
      tips: uniqueTips,
      medicationInfo,
    };
  }
}

export const educationService = new EducationService();
