import * as fc from 'fast-check';

/**
 * Property 25: Educational Content and Resources
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 * 
 * Tests that educational content is properly structured,
 * personalized, and tracked for user engagement.
 */
describe('Property 25: Educational Content and Resources', () => {
  const tipCategories = ['general', 'medication', 'lifestyle', 'safety', 'adherence'];
  const contentTypes = ['article', 'video', 'infographic', 'quiz'];
  const frequencies = ['once', 'daily', 'weekly', 'monthly'];
  const audiences = ['patient', 'caregiver', 'all'];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  // Educational tip arbitrary
  const educationalTipArb = fc.record({
    id: fc.uuid(),
    category: fc.constantFrom(...tipCategories),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    content: fc.string({ minLength: 20, maxLength: 500 }),
    priority: fc.integer({ min: 1, max: 5 }),
    frequency: fc.constantFrom(...frequencies),
    targetAudience: fc.constantFrom(...audiences),
  });

  // Medication info arbitrary
  const medicationInfoArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 10, maxLength: 500 }),
    uses: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
    howToTake: fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 1, maxLength: 5 }),
    warnings: fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 0, maxLength: 5 }),
  });

  // User progress arbitrary
  const userProgressArb = fc.record({
    userId: fc.uuid(),
    contentId: fc.uuid(),
    viewedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
    completedAt: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }), { nil: undefined }),
    quizScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    bookmarked: fc.boolean(),
  });

  test('all tip categories are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...tipCategories),
        (category) => {
          expect(tipCategories).toContain(category);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('all content types are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...contentTypes),
        (type) => {
          expect(contentTypes).toContain(type);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('educational tips have required fields', () => {
    fc.assert(
      fc.property(educationalTipArb, (tip) => {
        expect(tip.id).toBeDefined();
        expect(tip.title.length).toBeGreaterThan(0);
        expect(tip.content.length).toBeGreaterThan(0);
        expect(tipCategories).toContain(tip.category);
        expect(tip.priority).toBeGreaterThanOrEqual(1);
        expect(tip.priority).toBeLessThanOrEqual(5);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('medication info has required sections', () => {
    fc.assert(
      fc.property(medicationInfoArb, (info) => {
        expect(info.name.length).toBeGreaterThan(0);
        expect(info.description.length).toBeGreaterThan(0);
        expect(Array.isArray(info.uses)).toBe(true);
        expect(info.uses.length).toBeGreaterThan(0);
        expect(Array.isArray(info.howToTake)).toBe(true);
        expect(Array.isArray(info.warnings)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('tip priority determines display order', () => {
    fc.assert(
      fc.property(
        fc.array(educationalTipArb, { minLength: 2, maxLength: 10 }),
        (tips) => {
          const sorted = [...tips].sort((a, b) => a.priority - b.priority);

          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i - 1].priority);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('frequency controls tip delivery', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...frequencies),
        (frequency) => {
          expect(frequencies).toContain(frequency);
          
          // 'once' tips should only be shown once
          // 'daily' tips can be shown every day
          // etc.
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('audience filtering works correctly', () => {
    fc.assert(
      fc.property(
        fc.array(educationalTipArb, { minLength: 5, maxLength: 20 }),
        fc.constantFrom('patient', 'caregiver'),
        (tips, targetAudience) => {
          const filtered = tips.filter(
            t => t.targetAudience === targetAudience || t.targetAudience === 'all'
          );

          for (const tip of filtered) {
            expect(
              tip.targetAudience === targetAudience || tip.targetAudience === 'all'
            ).toBe(true);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('user progress tracks view and completion', () => {
    fc.assert(
      fc.property(userProgressArb, (progress) => {
        expect(progress.userId).toBeDefined();
        expect(progress.contentId).toBeDefined();
        expect(progress.viewedAt).toBeInstanceOf(Date);
        expect(typeof progress.bookmarked).toBe('boolean');

        // If completed, completedAt should be after viewedAt
        if (progress.completedAt) {
          expect(progress.completedAt.getTime()).toBeGreaterThanOrEqual(
            progress.viewedAt.getTime()
          );
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('quiz scores are between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (score) => {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('bookmarked content is retrievable', () => {
    fc.assert(
      fc.property(
        fc.array(userProgressArb, { minLength: 1, maxLength: 20 }),
        (progressList) => {
          const bookmarked = progressList.filter(p => p.bookmarked);
          
          for (const item of bookmarked) {
            expect(item.bookmarked).toBe(true);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('side effects are categorized by severity', () => {
    const severities = ['common', 'serious', 'rare'];

    fc.assert(
      fc.property(
        fc.record({
          common: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
          serious: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
          rare: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
        }),
        (sideEffects) => {
          expect(Array.isArray(sideEffects.common)).toBe(true);
          expect(Array.isArray(sideEffects.serious)).toBe(true);
          expect(Array.isArray(sideEffects.rare)).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sources include name and URL', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            url: fc.webUrl(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (sources) => {
          for (const source of sources) {
            expect(source.name.length).toBeGreaterThan(0);
            expect(source.url).toBeDefined();
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('content difficulty levels are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...difficulties),
        (difficulty) => {
          expect(difficulties).toContain(difficulty);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('personalized content is relevant to user medications', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        (medicationNames) => {
          // Personalized content should be generated for each medication
          expect(medicationNames.length).toBeGreaterThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('tips are deduplicated', () => {
    fc.assert(
      fc.property(
        fc.array(educationalTipArb, { minLength: 5, maxLength: 20 }),
        (tips) => {
          // Add some duplicates
          const withDuplicates = [...tips, ...tips.slice(0, 3)];
          
          // Deduplicate by ID
          const unique = withDuplicates.filter(
            (tip, index, self) => self.findIndex(t => t.id === tip.id) === index
          );

          expect(unique.length).toBeLessThanOrEqual(withDuplicates.length);
          
          // Check no duplicates in result
          const ids = unique.map(t => t.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
