import { describe, it, expect } from 'vitest';
import { extractNameplateData } from '../../src/lib/templates/extractors/nameplate';
import type { Submodel } from '../../src/shared/types';

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
});
