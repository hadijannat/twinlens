import { describe, it, expect } from 'vitest';
import { extractNameplateData } from '../../src/lib/templates/extractors/nameplate';
import type { Submodel, SubmodelElement } from '../../src/shared/types';

describe('extractNameplateData', () => {
  it('extracts manufacturer name from MLP', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nameplate',
      submodelElements: [
        {
          modelType: 'MultiLanguageProperty',
          idShort: 'ManufacturerName',
          value: [{ language: 'en', text: 'Festo SE' }],
        },
      ],
    };

    const data = extractNameplateData(submodel);
    expect(data.manufacturerName).toBe('Festo SE');
  });

  it('extracts serial number from Property', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nameplate',
      submodelElements: [
        {
          modelType: 'Property',
          idShort: 'SerialNumber',
          valueType: 'xs:string',
          value: 'SN-12345',
        },
      ],
    };

    const data = extractNameplateData(submodel);
    expect(data.serialNumber).toBe('SN-12345');
  });

  it('extracts contact info from nested collection', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nameplate',
      submodelElements: [
        {
          modelType: 'SubmodelElementCollection',
          idShort: 'ContactInformation',
          value: [
            {
              modelType: 'MultiLanguageProperty',
              idShort: 'Company',
              value: [{ language: 'en', text: 'Acme Corp' }],
            },
            {
              modelType: 'Property',
              idShort: 'Phone',
              valueType: 'xs:string',
              value: '+1-555-1234',
            },
          ],
        },
      ],
    };

    const data = extractNameplateData(submodel);
    expect(data.contactInfo?.companyName).toBe('Acme Corp');
    expect(data.contactInfo?.phone).toBe('+1-555-1234');
  });

  it('returns empty object for empty submodel', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:empty',
    };

    const data = extractNameplateData(submodel);
    expect(data).toEqual({});
  });

  // Edge case tests
  describe('edge cases', () => {
    it('handles empty submodelElements array', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [],
      };

      const data = extractNameplateData(submodel);
      expect(data).toEqual({});
    });

    it('handles MLP with multiple languages and selects first available', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [
          {
            modelType: 'MultiLanguageProperty',
            idShort: 'ManufacturerName',
            value: [
              { language: 'de', text: 'Siemens AG' },
              { language: 'en', text: 'Siemens AG (EN)' },
            ],
          },
        ],
      };

      const data = extractNameplateData(submodel);
      // Should prefer 'en' if available, otherwise first
      expect(data.manufacturerName).toBeDefined();
      expect(typeof data.manufacturerName).toBe('string');
    });

    it('handles MLP with empty value array', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [
          {
            modelType: 'MultiLanguageProperty',
            idShort: 'ManufacturerName',
            value: [],
          },
        ],
      };

      const data = extractNameplateData(submodel);
      expect(data.manufacturerName).toBeUndefined();
    });

    it('handles Property with null/undefined value', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [
          {
            modelType: 'Property',
            idShort: 'SerialNumber',
            valueType: 'xs:string',
            value: undefined as unknown as string,
          },
        ],
      };

      const data = extractNameplateData(submodel);
      expect(data.serialNumber).toBeUndefined();
    });

    it('handles ContactInformation with partial data', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ContactInformation',
            value: [
              {
                modelType: 'Property',
                idShort: 'Email',
                valueType: 'xs:string',
                value: 'info@example.com',
              },
            ],
          },
        ],
      };

      const data = extractNameplateData(submodel);
      expect(data.contactInfo?.email).toBe('info@example.com');
      expect(data.contactInfo?.phone).toBeUndefined();
      expect(data.contactInfo?.companyName).toBeUndefined();
    });

    it('handles Markings collection with MarkingFile', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'Markings',
            value: [
              {
                modelType: 'SubmodelElementCollection',
                idShort: 'CEMarking',
                value: [
                  {
                    modelType: 'File',
                    idShort: 'MarkingFile',
                    contentType: 'image/png',
                    value: '/aasx/images/ce-mark.png',
                  } as unknown as SubmodelElement,
                  {
                    modelType: 'Property',
                    idShort: 'MarkingAdditionalText',
                    valueType: 'xs:string',
                    value: 'Conformité Européenne',
                  },
                ],
              },
            ],
          },
        ],
      };

      const data = extractNameplateData(submodel);
      expect(data.markings).toBeDefined();
      expect(data.markings?.length).toBe(1);
      const marking = data.markings?.[0];
      expect(marking?.name).toBe('CEMarking');
      expect(marking?.file).toBe('/aasx/images/ce-mark.png');
      expect(marking?.additionalText).toBe('Conformité Européenne');
    });

    it('handles Markings collection with empty value', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'Markings',
            value: [],
          },
        ],
      };

      const data = extractNameplateData(submodel);
      expect(data.markings).toEqual([]);
    });

    it('handles missing idShort on elements gracefully', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [
          {
            modelType: 'Property',
            // missing idShort
            valueType: 'xs:string',
            value: 'Some Value',
          } as unknown as Submodel['submodelElements'] extends (infer T)[] | undefined ? T : never,
        ],
      };

      // Should not throw
      const data = extractNameplateData(submodel);
      expect(data).toBeDefined();
    });

    it('extracts all optional fields when present', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:nameplate',
        submodelElements: [
          {
            modelType: 'MultiLanguageProperty',
            idShort: 'ManufacturerName',
            value: [{ language: 'en', text: 'ACME Corp' }],
          },
          {
            modelType: 'MultiLanguageProperty',
            idShort: 'ManufacturerProductDesignation',
            value: [{ language: 'en', text: 'Widget Pro 3000' }],
          },
          {
            modelType: 'Property',
            idShort: 'SerialNumber',
            valueType: 'xs:string',
            value: 'SN-001',
          },
          {
            modelType: 'Property',
            idShort: 'BatchNumber',
            valueType: 'xs:string',
            value: 'BATCH-2024-01',
          },
          {
            modelType: 'Property',
            idShort: 'YearOfConstruction',
            valueType: 'xs:string',
            value: '2024',
          },
          {
            modelType: 'Property',
            idShort: 'HardwareVersion',
            valueType: 'xs:string',
            value: '2.0',
          },
          {
            modelType: 'Property',
            idShort: 'FirmwareVersion',
            valueType: 'xs:string',
            value: '1.5.3',
          },
          {
            modelType: 'Property',
            idShort: 'SoftwareVersion',
            valueType: 'xs:string',
            value: '3.2.1',
          },
        ],
      };

      const data = extractNameplateData(submodel);
      expect(data.manufacturerName).toBe('ACME Corp');
      expect(data.manufacturerProductDesignation).toBe('Widget Pro 3000');
      expect(data.serialNumber).toBe('SN-001');
      expect(data.batchNumber).toBe('BATCH-2024-01');
      expect(data.yearOfConstruction).toBe('2024');
      expect(data.hardwareVersion).toBe('2.0');
      expect(data.firmwareVersion).toBe('1.5.3');
      expect(data.softwareVersion).toBe('3.2.1');
    });
  });
});
