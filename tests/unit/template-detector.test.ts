import { describe, it, expect } from 'vitest';
import { detectTemplate, TemplateType } from '../../src/lib/templates/detector';
import type { Submodel } from '../../src/shared/types';

describe('detectTemplate', () => {
  it('detects Digital Nameplate template', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nameplate',
      semanticId: {
        type: 'ExternalReference',
        keys: [{ type: 'GlobalReference', value: 'https://admin-shell.io/zvei/nameplate/2/0/Nameplate' }],
      },
    };

    expect(detectTemplate(submodel)).toBe(TemplateType.NAMEPLATE);
  });

  it('detects Carbon Footprint template', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:pcf',
      semanticId: {
        type: 'ExternalReference',
        keys: [{ type: 'GlobalReference', value: 'https://admin-shell.io/idta/CarbonFootprint/ProductCarbonFootprint/0/9' }],
      },
    };

    expect(detectTemplate(submodel)).toBe(TemplateType.CARBON_FOOTPRINT);
  });

  it('returns GENERIC for unknown templates', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:unknown',
      semanticId: {
        type: 'ExternalReference',
        keys: [{ type: 'GlobalReference', value: 'https://example.com/custom/template' }],
      },
    };

    expect(detectTemplate(submodel)).toBe(TemplateType.GENERIC);
  });

  it('returns GENERIC when no semanticId', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nosemantic',
    };

    expect(detectTemplate(submodel)).toBe(TemplateType.GENERIC);
  });
});
