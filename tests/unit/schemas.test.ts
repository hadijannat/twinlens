/**
 * Schema Validation Tests
 * Tests Zod schemas against various AAS data structures
 */

import { describe, it, expect } from 'vitest';
import { AASEnvironmentSchema } from '../../src/shared/schemas';

describe('AASEnvironmentSchema', () => {
  it('validates a minimal valid environment', () => {
    const minimalEnv = {
      assetAdministrationShells: [],
      submodels: [],
    };

    const result = AASEnvironmentSchema.safeParse(minimalEnv);
    expect(result.success).toBe(true);
  });

  it('validates an environment with a shell', () => {
    const envWithShell = {
      assetAdministrationShells: [
        {
          modelType: 'AssetAdministrationShell',
          id: 'urn:example:aas:1',
          idShort: 'ExampleAAS',
          assetInformation: {
            assetKind: 'Instance',
            globalAssetId: 'urn:example:asset:1',
          },
        },
      ],
      submodels: [],
    };

    const result = AASEnvironmentSchema.safeParse(envWithShell);
    expect(result.success).toBe(true);
  });

  it('validates an environment with submodels', () => {
    const envWithSubmodels = {
      assetAdministrationShells: [],
      submodels: [
        {
          modelType: 'Submodel',
          id: 'urn:example:submodel:1',
          idShort: 'TechnicalData',
          submodelElements: [
            {
              modelType: 'Property',
              idShort: 'MaxTemperature',
              valueType: 'xs:double',
              value: '85.0',
            },
          ],
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(envWithSubmodels);
    expect(result.success).toBe(true);
  });

  it('validates nested SubmodelElementCollections', () => {
    const envWithNestedElements = {
      assetAdministrationShells: [],
      submodels: [
        {
          modelType: 'Submodel',
          id: 'urn:example:submodel:nested',
          submodelElements: [
            {
              modelType: 'SubmodelElementCollection',
              idShort: 'Dimensions',
              value: [
                {
                  modelType: 'Property',
                  idShort: 'Width',
                  valueType: 'xs:double',
                  value: '100',
                },
                {
                  modelType: 'Property',
                  idShort: 'Height',
                  valueType: 'xs:double',
                  value: '50',
                },
              ],
            },
          ],
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(envWithNestedElements);
    expect(result.success).toBe(true);
  });

  it('rejects environment missing required fields', () => {
    const invalidEnv = {
      assetAdministrationShells: [
        {
          modelType: 'AssetAdministrationShell',
          // Missing 'id' and 'assetInformation'
        },
      ],
      submodels: [],
    };

    const result = AASEnvironmentSchema.safeParse(invalidEnv);
    expect(result.success).toBe(false);
  });

  it('rejects invalid modelType', () => {
    const invalidModelType = {
      assetAdministrationShells: [],
      submodels: [
        {
          modelType: 'InvalidType',
          id: 'urn:example:submodel:1',
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(invalidModelType);
    expect(result.success).toBe(false);
  });

  it('validates MultiLanguageProperty', () => {
    const envWithMLP = {
      assetAdministrationShells: [],
      submodels: [
        {
          modelType: 'Submodel',
          id: 'urn:example:submodel:mlp',
          submodelElements: [
            {
              modelType: 'MultiLanguageProperty',
              idShort: 'ProductName',
              value: [
                { language: 'en', text: 'Widget' },
                { language: 'de', text: 'Gerät' },
              ],
            },
          ],
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(envWithMLP);
    expect(result.success).toBe(true);
  });

  it('validates Range element', () => {
    const envWithRange = {
      assetAdministrationShells: [],
      submodels: [
        {
          modelType: 'Submodel',
          id: 'urn:example:submodel:range',
          submodelElements: [
            {
              modelType: 'Range',
              idShort: 'OperatingTemperature',
              valueType: 'xs:double',
              min: '-20',
              max: '85',
            },
          ],
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(envWithRange);
    expect(result.success).toBe(true);
  });

  it('validates File element', () => {
    const envWithFile = {
      assetAdministrationShells: [],
      submodels: [
        {
          modelType: 'Submodel',
          id: 'urn:example:submodel:file',
          submodelElements: [
            {
              modelType: 'File',
              idShort: 'Manual',
              contentType: 'application/pdf',
              value: '/aasx/documents/manual.pdf',
            },
          ],
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(envWithFile);
    expect(result.success).toBe(true);
  });

  it('validates concept descriptions', () => {
    const envWithCD = {
      assetAdministrationShells: [],
      submodels: [],
      conceptDescriptions: [
        {
          modelType: 'ConceptDescription',
          id: 'urn:example:cd:1',
          idShort: 'MaxTemperature',
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(envWithCD);
    expect(result.success).toBe(true);
  });

  it('collects multiple validation errors', () => {
    const multipleErrors = {
      assetAdministrationShells: [
        {
          modelType: 'AssetAdministrationShell',
          // Missing id
          assetInformation: {
            assetKind: 'InvalidKind', // Invalid enum value
          },
        },
      ],
      submodels: [
        {
          modelType: 'Submodel',
          // Missing id
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(multipleErrors);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(1);
    }
  });

  it('validates AnnotatedRelationshipElement with annotations', () => {
    const envWithAnnotatedRel = {
      assetAdministrationShells: [],
      submodels: [
        {
          modelType: 'Submodel',
          id: 'urn:example:submodel:annotated',
          submodelElements: [
            {
              modelType: 'AnnotatedRelationshipElement',
              idShort: 'Rel1',
              first: {
                type: 'ModelReference',
                keys: [{ type: 'Submodel', value: 'urn:example:submodel:1' }],
              },
              second: {
                type: 'ModelReference',
                keys: [{ type: 'Submodel', value: 'urn:example:submodel:2' }],
              },
              annotations: [
                {
                  modelType: 'Property',
                  idShort: 'Note',
                  valueType: 'xs:string',
                  value: 'hello',
                },
              ],
            },
          ],
        },
      ],
    };

    const result = AASEnvironmentSchema.safeParse(envWithAnnotatedRel);
    expect(result.success).toBe(true);
  });
});
