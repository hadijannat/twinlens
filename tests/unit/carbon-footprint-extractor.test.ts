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
});
