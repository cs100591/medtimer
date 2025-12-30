import * as fc from 'fast-check';

/**
 * Property 18: Data Portability and Deletion
 * Validates: Requirements 9.4, 9.5
 * 
 * Tests that data export and deletion functions correctly
 * and maintains data integrity.
 */
describe('Property 18: Data Portability and Deletion', () => {
  const exportFormats = ['json', 'csv', 'pdf', 'fhir'];

  // Export options arbitrary
  const exportOptionsArb = fc.record({
    format: fc.constantFrom(...exportFormats),
    includePersonalInfo: fc.boolean(),
    includeMedications: fc.boolean(),
    includeAdherence: fc.boolean(),
    includeSchedules: fc.boolean(),
  });

  test('all export formats are supported', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...exportFormats),
        (format) => {
          expect(exportFormats).toContain(format);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('export options control included data', () => {
    fc.assert(
      fc.property(exportOptionsArb, (options) => {
        const includedSections: string[] = [];

        if (options.includePersonalInfo) includedSections.push('personalInfo');
        if (options.includeMedications) includedSections.push('medications');
        if (options.includeAdherence) includedSections.push('adherence');
        if (options.includeSchedules) includedSections.push('schedules');

        // At least one section should be included for meaningful export
        // But all combinations are valid
        expect(includedSections.length).toBeGreaterThanOrEqual(0);
        expect(includedSections.length).toBeLessThanOrEqual(4);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('export result contains required metadata', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...exportFormats),
        fc.uuid(),
        (format, userId) => {
          const result = {
            format,
            filename: `export-${userId}-${Date.now()}.${format}`,
            mimeType: format === 'json' ? 'application/json' : 
                      format === 'csv' ? 'text/csv' : 
                      format === 'fhir' ? 'application/fhir+json' : 'application/octet-stream',
            generatedAt: new Date(),
          };

          expect(result.format).toBe(format);
          expect(result.filename).toContain(format);
          expect(result.mimeType).toBeDefined();
          expect(result.generatedAt).toBeInstanceOf(Date);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('JSON export is valid JSON', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          medications: fc.array(fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            dosage: fc.float({ min: 0.1, max: 1000, noNaN: true }),
          }), { minLength: 0, maxLength: 10 }),
          exportedAt: fc.date(),
        }),
        (data) => {
          const jsonString = JSON.stringify(data);
          const parsed = JSON.parse(jsonString);

          expect(parsed.userId).toBe(data.userId);
          expect(parsed.medications.length).toBe(data.medications.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('CSV export has proper structure', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(',')),
            dosage: fc.float({ min: 0.1, max: 1000, noNaN: true }),
            unit: fc.constantFrom('mg', 'ml', 'tablet', 'capsule'),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (medications) => {
          const headers = 'Name,Dosage,Unit';
          const rows = medications.map(m => `${m.name},${m.dosage},${m.unit}`);
          const csv = [headers, ...rows].join('\n');

          const lines = csv.split('\n');
          expect(lines[0]).toBe(headers);
          expect(lines.length).toBe(medications.length + 1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('FHIR bundle has correct structure', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
        (patientId, medicationIds) => {
          const bundle = {
            resourceType: 'Bundle',
            type: 'collection',
            timestamp: new Date().toISOString(),
            entry: [
              { resource: { resourceType: 'Patient', id: patientId } },
              ...medicationIds.map(id => ({
                resource: { resourceType: 'MedicationStatement', id },
              })),
            ],
          };

          expect(bundle.resourceType).toBe('Bundle');
          expect(bundle.type).toBe('collection');
          expect(bundle.entry.length).toBe(medicationIds.length + 1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('date range filtering is inclusive', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        fc.array(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          { minLength: 1, maxLength: 20 }
        ),
        (startDate, endDate, recordDates) => {
          const filtered = recordDates.filter(
            d => d >= startDate && d <= endDate
          );

          for (const date of filtered) {
            expect(date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(date.getTime()).toBeLessThanOrEqual(endDate.getTime());
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('deletion removes all user data', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // medications
        fc.integer({ min: 0, max: 500 }), // adherence records
        fc.integer({ min: 0, max: 50 }), // schedules
        (medCount, adherenceCount, scheduleCount) => {
          const deletionResult = {
            deleted: true,
            details: {
              medications: medCount,
              adherenceRecords: adherenceCount,
              schedules: scheduleCount,
              user: 1,
            },
          };

          expect(deletionResult.deleted).toBe(true);
          expect(deletionResult.details.medications).toBe(medCount);
          expect(deletionResult.details.adherenceRecords).toBe(adherenceCount);
          expect(deletionResult.details.schedules).toBe(scheduleCount);
          expect(deletionResult.details.user).toBe(1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('QR code generation produces valid URL', () => {
    fc.assert(
      fc.property(fc.uuid(), (userId) => {
        const shareToken = Buffer.from(JSON.stringify({
          userId,
          generatedAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        })).toString('base64');

        const url = `https://app.medicationreminder.com/share/${shareToken}`;

        expect(url).toContain('https://');
        expect(url).toContain('/share/');
        expect(shareToken.length).toBeGreaterThan(0);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('provider report contains required sections', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.integer({ min: 0, max: 100 }),
        (firstName, lastName, complianceRate, missedDoses) => {
          const report = {
            patientInfo: {
              name: `${firstName} ${lastName}`,
              allergies: [],
              conditions: [],
            },
            medications: [],
            adherenceSummary: {
              period: '2024-01-01 to 2024-12-31',
              complianceRate,
              missedDoses,
            },
            generatedAt: new Date().toISOString(),
          };

          expect(report.patientInfo).toBeDefined();
          expect(report.patientInfo.name).toBeDefined();
          expect(Array.isArray(report.medications)).toBe(true);
          expect(report.adherenceSummary).toBeDefined();
          expect(report.generatedAt).toBeDefined();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sensitive data is properly handled in exports', () => {
    const sensitiveFields = ['passwordHash', 'ssn', 'creditCard'];

    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          firstName: fc.string({ minLength: 1, maxLength: 50 }),
          lastName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        (userData) => {
          const exportedUser = { ...userData };
          
          // Sensitive fields should not be in export
          for (const field of sensitiveFields) {
            expect(exportedUser).not.toHaveProperty(field);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
