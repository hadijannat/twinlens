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
