import { describe, it, expect } from 'vitest';
import { extractCarbonFootprintData } from '../../src/lib/templates/extractors/carbon-footprint';
import type { Submodel } from '../../src/shared/types';

describe('extractCarbonFootprintData', () => {
  it('extracts PCF total value', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:pcf',
      submodelElements: [
        {
          modelType: 'SubmodelElementCollection',
          idShort: 'ProductCarbonFootprint',
          value: [
            {
              modelType: 'Property',
              idShort: 'PCFGoodsAddressHandover',
              valueType: 'xs:string',
              value: 'Germany',
            },
            {
              modelType: 'Property',
              idShort: 'PCFCO2eq',
              valueType: 'xs:double',
              value: '12.5',
            },
          ],
        },
      ],
    };

    const data = extractCarbonFootprintData(submodel);
    expect(data.pcfTotal).toBe(12.5);
  });

  it('extracts calculation method', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:pcf',
      submodelElements: [
        {
          modelType: 'SubmodelElementCollection',
          idShort: 'ProductCarbonFootprint',
          value: [
            {
              modelType: 'Property',
              idShort: 'PCFCalculationMethod',
              valueType: 'xs:string',
              value: 'GHG Protocol',
            },
          ],
        },
      ],
    };

    const data = extractCarbonFootprintData(submodel);
    expect(data.pcfCalculationMethod).toBe('GHG Protocol');
  });

  it('returns empty object for empty submodel', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:empty',
    };

    const data = extractCarbonFootprintData(submodel);
    expect(data).toEqual({});
  });

  // Edge case tests
  describe('edge cases', () => {
    it('handles PCFCO2eq as integer string', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ProductCarbonFootprint',
            value: [
              {
                modelType: 'Property',
                idShort: 'PCFCO2eq',
                valueType: 'xs:double',
                value: '100',
              },
            ],
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.pcfTotal).toBe(100);
      expect(typeof data.pcfTotal).toBe('number');
    });

    it('handles PCFCO2eq as number with high precision', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ProductCarbonFootprint',
            value: [
              {
                modelType: 'Property',
                idShort: 'PCFCO2eq',
                valueType: 'xs:double',
                value: '12.123456789',
              },
            ],
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.pcfTotal).toBeCloseTo(12.123456789, 8);
    });

    it('handles PCFTotal as alternative to PCFCO2eq', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ProductCarbonFootprint',
            value: [
              {
                modelType: 'Property',
                idShort: 'PCFTotal',
                valueType: 'xs:double',
                value: '50.5',
              },
            ],
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.pcfTotal).toBe(50.5);
    });

    it('handles invalid/non-numeric PCFCO2eq gracefully', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ProductCarbonFootprint',
            value: [
              {
                modelType: 'Property',
                idShort: 'PCFCO2eq',
                valueType: 'xs:double',
                value: 'not-a-number',
              },
            ],
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.pcfTotal).toBeUndefined();
    });

    it('handles empty string PCFCO2eq gracefully', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ProductCarbonFootprint',
            value: [
              {
                modelType: 'Property',
                idShort: 'PCFCO2eq',
                valueType: 'xs:double',
                value: '',
              },
            ],
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.pcfTotal).toBeUndefined();
    });

    it('handles nested collection structure', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'CarbonFootprint',
            value: [
              {
                modelType: 'SubmodelElementCollection',
                idShort: 'ProductCarbonFootprint',
                value: [
                  {
                    modelType: 'Property',
                    idShort: 'PCFCO2eq',
                    valueType: 'xs:double',
                    value: '25.0',
                  },
                ],
              },
            ],
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.pcfTotal).toBe(25.0);
    });

    it('extracts date fields when present', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ProductCarbonFootprint',
            value: [
              {
                modelType: 'Property',
                idShort: 'PublicationDate',
                valueType: 'xs:date',
                value: '2024-01-15',
              },
              {
                modelType: 'Property',
                idShort: 'ExpirationDate',
                valueType: 'xs:date',
                value: '2025-01-15',
              },
            ],
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.publicationDate).toBe('2024-01-15');
      expect(data.expirationDate).toBe('2025-01-15');
    });

    it('sets default unit when pcfTotal is present', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ProductCarbonFootprint',
            value: [
              {
                modelType: 'Property',
                idShort: 'PCFCO2eq',
                valueType: 'xs:double',
                value: '10.0',
              },
            ],
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.pcfUnit).toBe('kg CO2e');
    });

    it('handles PCF values at top level (without collection wrapper)', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'Property',
            idShort: 'PCFCO2eq',
            valueType: 'xs:double',
            value: '15.0',
          },
          {
            modelType: 'Property',
            idShort: 'PCFCalculationMethod',
            valueType: 'xs:string',
            value: 'ISO 14067',
          },
        ],
      };

      const data = extractCarbonFootprintData(submodel);
      expect(data.pcfTotal).toBe(15.0);
      expect(data.pcfCalculationMethod).toBe('ISO 14067');
    });

    it('handles missing value in collection', () => {
      const submodel: Submodel = {
        modelType: 'Submodel',
        id: 'urn:example:pcf',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ProductCarbonFootprint',
            // missing value array
          },
        ],
      };

      // Should not throw
      const data = extractCarbonFootprintData(submodel);
      expect(data).toBeDefined();
    });
  });
});
