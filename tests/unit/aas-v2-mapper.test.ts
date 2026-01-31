/**
 * Tests for AAS 2.0 to 3.0 field mapper
 */

import { describe, it, expect } from 'vitest';
import {
  mapReference,
  mapIdentification,
  mapAssetInformation,
  mapAAS,
  mapSubmodel,
  isAASv2,
  extractFirstKeyValue,
  ensureArray,
  mapValueType,
  mapMultiLanguageValue,
} from '../../src/lib/aas-v2-mapper';

describe('ensureArray', () => {
  it('returns empty array for null/undefined', () => {
    expect(ensureArray(null)).toEqual([]);
    expect(ensureArray(undefined)).toEqual([]);
  });

  it('returns same array if already an array', () => {
    const arr = [1, 2, 3];
    expect(ensureArray(arr)).toBe(arr);
  });

  it('wraps single value in array', () => {
    expect(ensureArray('test')).toEqual(['test']);
    expect(ensureArray(42)).toEqual([42]);
  });
});

describe('mapReference', () => {
  it('handles v2 nested keys.key format', () => {
    const v2Ref = {
      keys: {
        key: [
          { type: 'Submodel', '#text': 'urn:example:submodel:1' },
          { type: 'Property', '#text': 'SomeProperty' },
        ],
      },
    };

    const result = mapReference(v2Ref);

    expect(result).toEqual({
      type: 'ModelReference',
      keys: [
        { type: 'Submodel', value: 'urn:example:submodel:1' },
        { type: 'Property', value: 'SomeProperty' },
      ],
    });
  });

  it('handles v2 single key format', () => {
    const v2Ref = {
      keys: {
        key: { type: 'GlobalReference', '#text': 'http://example.org/semantic' },
      },
    };

    const result = mapReference(v2Ref);

    expect(result).toEqual({
      type: 'ExternalReference',
      keys: [{ type: 'GlobalReference', value: 'http://example.org/semantic' }],
    });
  });

  it('preserves v3 format', () => {
    const v3Ref = {
      type: 'ModelReference',
      keys: [{ type: 'Submodel', value: 'urn:example:submodel:1' }],
    };

    const result = mapReference(v3Ref);

    expect(result).toEqual(v3Ref);
  });

  it('returns undefined for empty/invalid refs', () => {
    expect(mapReference(null)).toBeUndefined();
    expect(mapReference(undefined)).toBeUndefined();
    expect(mapReference({})).toBeUndefined();
    expect(mapReference({ keys: {} })).toBeUndefined();
  });
});

describe('mapIdentification', () => {
  it('returns id if already present', () => {
    const obj = { id: 'urn:example:1' };
    expect(mapIdentification(obj)).toBe('urn:example:1');
  });

  it('extracts id from v2 identification object', () => {
    const obj = {
      identification: {
        id: 'urn:example:1',
        idType: 'IRI',
      },
    };
    expect(mapIdentification(obj)).toBe('urn:example:1');
  });

  it('extracts id from v2 identification with #text', () => {
    const obj = {
      identification: {
        '#text': 'urn:example:1',
        idType: 'IRI',
      },
    };
    expect(mapIdentification(obj)).toBe('urn:example:1');
  });

  it('handles string identification', () => {
    const obj = { identification: 'urn:example:1' };
    expect(mapIdentification(obj)).toBe('urn:example:1');
  });
});

describe('mapAssetInformation', () => {
  it('preserves v3 assetInformation', () => {
    const aas = {
      assetInformation: {
        assetKind: 'Instance',
        globalAssetId: 'urn:example:asset:1',
      },
    };

    const result = mapAssetInformation(aas);

    expect(result).toEqual({
      assetKind: 'Instance',
      globalAssetId: 'urn:example:asset:1',
    });
  });

  it('maps v2 assetRef to assetInformation', () => {
    const aas = {
      kind: 'Instance',
      assetRef: {
        keys: {
          key: { type: 'Asset', '#text': 'urn:example:asset:1' },
        },
      },
    };

    const result = mapAssetInformation(aas);

    expect(result).toEqual({
      assetKind: 'Instance',
      globalAssetId: 'urn:example:asset:1',
    });
  });

  it('defaults assetKind to Instance', () => {
    const aas = {
      assetRef: {
        keys: {
          key: { type: 'Asset', '#text': 'urn:example:asset:1' },
        },
      },
    };

    const result = mapAssetInformation(aas);

    expect(result?.assetKind).toBe('Instance');
  });
});

describe('extractFirstKeyValue', () => {
  it('extracts first key value from v2 reference', () => {
    const ref = {
      keys: {
        key: { type: 'Asset', '#text': 'urn:example:asset:1' },
      },
    };

    expect(extractFirstKeyValue(ref)).toBe('urn:example:asset:1');
  });
});

describe('mapAAS', () => {
  it('maps v2 AAS to v3 format', () => {
    const v2AAS = {
      idShort: 'MyAAS',
      identification: {
        id: 'urn:example:aas:1',
        idType: 'IRI',
      },
      kind: 'Instance',
      assetRef: {
        keys: {
          key: { type: 'Asset', '#text': 'urn:example:asset:1' },
        },
      },
      submodelRefs: {
        submodelRef: {
          keys: {
            key: { type: 'Submodel', '#text': 'urn:example:submodel:1' },
          },
        },
      },
    };

    const result = mapAAS(v2AAS);

    expect(result.id).toBe('urn:example:aas:1');
    expect(result.idShort).toBe('MyAAS');
    expect(result.modelType).toBe('AssetAdministrationShell');
    expect(result.assetInformation).toEqual({
      assetKind: 'Instance',
      globalAssetId: 'urn:example:asset:1',
    });
    expect(result.submodels).toEqual([
      {
        type: 'ModelReference',
        keys: [{ type: 'Submodel', value: 'urn:example:submodel:1' }],
      },
    ]);
    // Should not have legacy fields
    expect(result.identification).toBeUndefined();
    expect(result.assetRef).toBeUndefined();
    expect(result.kind).toBeUndefined();
  });
});

describe('mapSubmodel', () => {
  it('maps v2 submodel to v3 format', () => {
    const v2SM = {
      idShort: 'TechnicalData',
      identification: {
        id: 'urn:example:submodel:1',
        idType: 'IRI',
      },
      semanticId: {
        keys: {
          key: { type: 'GlobalReference', '#text': 'http://example.org/semantic' },
        },
      },
    };

    const result = mapSubmodel(v2SM);

    expect(result.id).toBe('urn:example:submodel:1');
    expect(result.idShort).toBe('TechnicalData');
    expect(result.modelType).toBe('Submodel');
    expect(result.semanticId).toEqual({
      type: 'ExternalReference',
      keys: [{ type: 'GlobalReference', value: 'http://example.org/semantic' }],
    });
    expect(result.identification).toBeUndefined();
  });
});

describe('isAASv2', () => {
  it('detects v2 format with identification field', () => {
    const v2Env = {
      assetAdministrationShells: {
        assetAdministrationShell: [
          { identification: { id: 'urn:example:1' } },
        ],
      },
    };

    expect(isAASv2(v2Env)).toBe(true);
  });

  it('detects v2 format with assetRef field', () => {
    const v2Env = {
      assetAdministrationShells: {
        assetAdministrationShell: [
          { id: 'urn:example:1', assetRef: {} },
        ],
      },
    };

    expect(isAASv2(v2Env)).toBe(true);
  });

  it('returns false for v3 format', () => {
    const v3Env = {
      assetAdministrationShells: {
        assetAdministrationShell: [
          { id: 'urn:example:1', assetInformation: {} },
        ],
      },
    };

    expect(isAASv2(v3Env)).toBe(false);
  });

  it('returns false for empty/null', () => {
    expect(isAASv2(null)).toBe(false);
    expect(isAASv2(undefined)).toBe(false);
    expect(isAASv2({})).toBe(false);
  });
});

// Additional edge case tests for V2/V3 format handling
describe('v2/v3 edge cases', () => {
  it('handles v2 submodelRefs as single object', () => {
    const v2AAS = {
      idShort: 'SingleRefAAS',
      identification: { id: 'urn:example:aas:1' },
      assetRef: {
        keys: { key: { type: 'Asset', '#text': 'urn:example:asset:1' } },
      },
      submodelRefs: {
        submodelRef: {
          keys: { key: { type: 'Submodel', '#text': 'urn:example:sm:1' } },
        },
      },
    };

    const result = mapAAS(v2AAS);
    expect(result.submodels).toBeDefined();
    expect(Array.isArray(result.submodels)).toBe(true);
    expect((result.submodels as unknown[])?.length).toBe(1);
  });

  it('handles v2 submodelRefs as array', () => {
    const v2AAS = {
      idShort: 'MultiRefAAS',
      identification: { id: 'urn:example:aas:1' },
      assetRef: {
        keys: { key: { type: 'Asset', '#text': 'urn:example:asset:1' } },
      },
      submodelRefs: {
        submodelRef: [
          { keys: { key: { type: 'Submodel', '#text': 'urn:example:sm:1' } } },
          { keys: { key: { type: 'Submodel', '#text': 'urn:example:sm:2' } } },
        ],
      },
    };

    const result = mapAAS(v2AAS);
    expect(result.submodels).toBeDefined();
    expect((result.submodels as unknown[])?.length).toBe(2);
  });

  it('handles reference with value field (v3 style) in v2 document', () => {
    // Some v2 files might have already partially converted references
    const mixedRef = {
      keys: [
        { type: 'Submodel', value: 'urn:example:sm:1' },
      ],
    };

    const result = mapReference(mixedRef);
    expect(result?.keys?.[0]?.value).toBe('urn:example:sm:1');
  });

  it('handles missing submodelRefs (returns empty array)', () => {
    const v2AAS = {
      idShort: 'NoRefsAAS',
      identification: { id: 'urn:example:aas:1' },
      assetRef: {
        keys: { key: { type: 'Asset', '#text': 'urn:example:asset:1' } },
      },
      // no submodelRefs - the mapper should not add submodels property
    };

    const result = mapAAS(v2AAS);
    // When no refs are present, submodels isn't added
    expect(result.submodels).toBeUndefined();
  });

  it('maps assetKind from string values correctly', () => {
    const instanceAAS = {
      identification: { id: 'urn:example:aas:1' },
      kind: 'instance', // lowercase
      assetRef: { keys: { key: { type: 'Asset', '#text': 'urn:example:asset:1' } } },
    };

    const result = mapAssetInformation(instanceAAS);
    expect(result?.assetKind).toBe('instance');
  });
});

// Tests for mapValueType helper function
describe('mapValueType', () => {
  it('returns xs:string for empty valueType', () => {
    expect(mapValueType('')).toBe('xs:string');
    expect(mapValueType(null)).toBe('xs:string');
    expect(mapValueType(undefined)).toBe('xs:string');
  });

  it('preserves existing xs: prefix', () => {
    expect(mapValueType('xs:string')).toBe('xs:string');
    expect(mapValueType('xs:double')).toBe('xs:double');
    expect(mapValueType('xs:boolean')).toBe('xs:boolean');
  });

  it('adds xs: prefix to bare type names', () => {
    expect(mapValueType('string')).toBe('xs:string');
    expect(mapValueType('int')).toBe('xs:int');
    expect(mapValueType('double')).toBe('xs:double');
    expect(mapValueType('boolean')).toBe('xs:boolean');
    expect(mapValueType('date')).toBe('xs:date');
    expect(mapValueType('dateTime')).toBe('xs:dateTime');
  });

  it('handles unknown types by adding xs: prefix', () => {
    expect(mapValueType('customType')).toBe('xs:customType');
  });
});

// Tests for mapMultiLanguageValue
describe('mapMultiLanguageValue', () => {
  it('handles v2 langString format', () => {
    const v2Value = {
      langString: [
        { lang: 'en', '#text': 'English text' },
        { lang: 'de', '#text': 'German text' },
      ],
    };

    const result = mapMultiLanguageValue(v2Value);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ language: 'en', text: 'English text' });
    expect(result[1]).toEqual({ language: 'de', text: 'German text' });
  });

  it('handles single langString (not array)', () => {
    const v2Value = {
      langString: { lang: 'en', '#text': 'Single language' },
    };

    const result = mapMultiLanguageValue(v2Value);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ language: 'en', text: 'Single language' });
  });

  it('handles v3 format (already array)', () => {
    const v3Value = [
      { language: 'en', text: 'English' },
      { language: 'de', text: 'German' },
    ];

    const result = mapMultiLanguageValue(v3Value);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for null/undefined', () => {
    expect(mapMultiLanguageValue(null)).toEqual([]);
    expect(mapMultiLanguageValue(undefined)).toEqual([]);
  });

  it('handles numeric text values', () => {
    const v2Value = {
      langString: { lang: 'en', '#text': 42 },
    };

    const result = mapMultiLanguageValue(v2Value);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.text).toBe('42');
  });
});
