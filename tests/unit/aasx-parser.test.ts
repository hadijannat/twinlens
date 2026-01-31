/**
 * AASX Parser Tests
 * Tests the parser against various AASX file structures
 */

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseAASX } from '../../src/lib/aasx-parser';

// Helper to create a minimal valid AASX file
async function createTestAASX(options: {
  aasSpec?: unknown;
  useXml?: boolean;
  includeThumbnail?: boolean;
  supplementaryFiles?: Array<{ path: string; content: string }>;
  originAtRoot?: boolean;
}): Promise<ArrayBuffer> {
  const zip = new JSZip();

  const aasSpec = options.aasSpec ?? {
    assetAdministrationShells: [
      {
        modelType: 'AssetAdministrationShell',
        id: 'urn:test:aas:1',
        idShort: 'TestAAS',
        assetInformation: {
          assetKind: 'Instance',
          globalAssetId: 'urn:test:asset:1',
        },
      },
    ],
    submodels: [
      {
        modelType: 'Submodel',
        id: 'urn:test:submodel:1',
        idShort: 'TestSubmodel',
        submodelElements: [
          {
            modelType: 'Property',
            idShort: 'TestProperty',
            valueType: 'xs:string',
            value: 'test value',
          },
        ],
      },
    ],
  };

  // Add root relationships
  const originTarget = options.originAtRoot ? '/aasx-origin' : '/aasx/aasx-origin';
  const rootRels = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://admin-shell.io/aasx/relationships/aasx-origin" Target="${originTarget}" Id="rId1" />
</Relationships>`;
  zip.file('_rels/.rels', rootRels);

  // Add aasx-origin and its relationships
  const originPath = options.originAtRoot ? 'aasx-origin' : 'aasx/aasx-origin';
  zip.file(originPath, '');

  const specFileName = options.useXml ? 'aas-spec.xml' : 'aas-spec.json';
  const originRels = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://admin-shell.io/aasx/relationships/aas-spec" Target="/${specFileName}" Id="rId1" />
</Relationships>`;
  const originRelsPath = options.originAtRoot ? '_rels/aasx-origin.rels' : 'aasx/_rels/aasx-origin.rels';
  zip.file(originRelsPath, originRels);

  // Add the AAS spec file
  if (options.useXml) {
    // Simplified XML format for testing
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<aasenv>
  <assetAdministrationShells>
    <assetAdministrationShell>
      <id>${(aasSpec as { assetAdministrationShells: Array<{ id: string }> }).assetAdministrationShells[0]?.id}</id>
    </assetAdministrationShell>
  </assetAdministrationShells>
  <submodels></submodels>
</aasenv>`;
    zip.file(specFileName, xmlContent);
  } else {
    zip.file(specFileName, JSON.stringify(aasSpec, null, 2));
  }

  // Add thumbnail if requested
  if (options.includeThumbnail) {
    // Minimal PNG (1x1 transparent pixel)
    const pngData = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);
    zip.file('aasx/thumbnail.png', pngData);
  }

  // Add supplementary files
  if (options.supplementaryFiles) {
    for (const file of options.supplementaryFiles) {
      zip.file(file.path, file.content);
    }
  }

  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('parseAASX', () => {
  it('parses a minimal valid AASX file', async () => {
    const aasxData = await createTestAASX({});

    const result = await parseAASX(aasxData);

    expect(result.environment.assetAdministrationShells).toHaveLength(1);
    expect(result.environment.assetAdministrationShells[0]?.id).toBe('urn:test:aas:1');
    expect(result.environment.submodels).toHaveLength(1);
    expect(result.validationErrors).toHaveLength(0);
  });

  it('handles root-level aasx-origin relationships', async () => {
    const aasxData = await createTestAASX({ originAtRoot: true });

    const result = await parseAASX(aasxData);

    expect(result.environment.assetAdministrationShells).toHaveLength(1);
    expect(result.environment.submodels).toHaveLength(1);
  });

  it('extracts submodel elements', async () => {
    const aasxData = await createTestAASX({});

    const result = await parseAASX(aasxData);

    const submodel = result.environment.submodels[0];
    expect(submodel?.submodelElements).toHaveLength(1);
    expect(submodel?.submodelElements?.[0]).toMatchObject({
      modelType: 'Property',
      idShort: 'TestProperty',
      value: 'test value',
    });
  });

  it('extracts thumbnail', async () => {
    const aasxData = await createTestAASX({ includeThumbnail: true });

    const result = await parseAASX(aasxData);

    expect(result.thumbnail).toBeDefined();
    expect(result.thumbnail).toMatch(/^data:image\/png;base64,/);
  });

  it('collects supplementary files', async () => {
    const aasxData = await createTestAASX({
      supplementaryFiles: [
        { path: 'documents/manual.pdf', content: 'fake pdf content' },
        { path: 'images/photo.jpg', content: 'fake jpg content' },
      ],
    });

    const result = await parseAASX(aasxData);

    expect(result.supplementaryFiles.length).toBeGreaterThanOrEqual(2);
    const paths = result.supplementaryFiles.map((f) => f.path);
    expect(paths).toContain('documents/manual.pdf');
    expect(paths).toContain('images/photo.jpg');
  });

  it('reports validation errors for invalid data', async () => {
    const invalidSpec = {
      assetAdministrationShells: [
        {
          // Missing required fields
          modelType: 'AssetAdministrationShell',
        },
      ],
      submodels: [],
    };

    const aasxData = await createTestAASX({ aasSpec: invalidSpec });

    const result = await parseAASX(aasxData);

    expect(result.validationErrors.length).toBeGreaterThan(0);
    // Should still return something usable
    expect(result.environment).toBeDefined();
  });

  it('throws error for missing relationships file', async () => {
    const zip = new JSZip();
    zip.file('some-file.json', '{}');
    const aasxData = await zip.generateAsync({ type: 'arraybuffer' });

    await expect(parseAASX(aasxData)).rejects.toThrow('Missing _rels/.rels');
  });

  it('handles nested SubmodelElementCollections', async () => {
    const nestedSpec = {
      assetAdministrationShells: [
        {
          modelType: 'AssetAdministrationShell',
          id: 'urn:test:aas:nested',
          assetInformation: {
            assetKind: 'Instance',
          },
        },
      ],
      submodels: [
        {
          modelType: 'Submodel',
          id: 'urn:test:submodel:nested',
          submodelElements: [
            {
              modelType: 'SubmodelElementCollection',
              idShort: 'Level1',
              value: [
                {
                  modelType: 'SubmodelElementCollection',
                  idShort: 'Level2',
                  value: [
                    {
                      modelType: 'Property',
                      idShort: 'DeepProperty',
                      valueType: 'xs:string',
                      value: 'deep value',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const aasxData = await createTestAASX({ aasSpec: nestedSpec });

    const result = await parseAASX(aasxData);

    const submodel = result.environment.submodels[0];
    const level1 = submodel?.submodelElements?.[0];
    expect(level1?.modelType).toBe('SubmodelElementCollection');

    if (level1?.modelType === 'SubmodelElementCollection') {
      const level2 = level1.value?.[0];
      expect(level2?.modelType).toBe('SubmodelElementCollection');

      if (level2?.modelType === 'SubmodelElementCollection') {
        const deepProp = level2.value?.[0];
        expect(deepProp).toMatchObject({
          idShort: 'DeepProperty',
          value: 'deep value',
        });
      }
    }
  });

  it('handles multiple shells and submodels', async () => {
    const multiSpec = {
      assetAdministrationShells: [
        {
          modelType: 'AssetAdministrationShell',
          id: 'urn:test:aas:1',
          assetInformation: { assetKind: 'Instance' },
        },
        {
          modelType: 'AssetAdministrationShell',
          id: 'urn:test:aas:2',
          assetInformation: { assetKind: 'Type' },
        },
      ],
      submodels: [
        {
          modelType: 'Submodel',
          id: 'urn:test:submodel:1',
        },
        {
          modelType: 'Submodel',
          id: 'urn:test:submodel:2',
        },
        {
          modelType: 'Submodel',
          id: 'urn:test:submodel:3',
        },
      ],
    };

    const aasxData = await createTestAASX({ aasSpec: multiSpec });

    const result = await parseAASX(aasxData);

    expect(result.environment.assetAdministrationShells).toHaveLength(2);
    expect(result.environment.submodels).toHaveLength(3);
  });
});
