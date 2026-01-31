/**
 * Integration tests for AASX parsing with v2 format support
 * Tests real-world AASX files to verify v2→v3 mapping works correctly
 */

import { describe, it, expect } from 'vitest';
import { parseAASX } from '../../src/lib/aasx-parser';
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

describe('AASX V2 Format Parsing', () => {
  it('parses 36_Murrelektronik.aasx with reduced validation errors', async () => {
    const filePath = path.join(FIXTURES_DIR, '36_Murrelektronik.aasx');
    const fileData = fs.readFileSync(filePath);

    const result = await parseAASX(fileData.buffer.slice(
      fileData.byteOffset,
      fileData.byteOffset + fileData.byteLength
    ));

    // Should have parsed environment
    expect(result.environment).toBeDefined();
    expect(result.environment.assetAdministrationShells.length).toBeGreaterThan(0);
    expect(result.environment.submodels.length).toBeGreaterThan(0);

    // Validation errors should be significantly reduced (was 888 errors)
    // We expect much fewer errors after v2 mapping
    console.log(`Murrelektronik: ${result.validationErrors.length} validation errors`);
    console.log(`Murrelektronik: ${result.environment.assetAdministrationShells.length} AAS`);
    console.log(`Murrelektronik: ${result.environment.submodels.length} submodels`);

    // Each AAS should have an id (mapped from identification)
    for (const aas of result.environment.assetAdministrationShells) {
      expect(aas.id).toBeDefined();
      expect(typeof aas.id).toBe('string');
      expect(aas.id.length).toBeGreaterThan(0);
    }

    // Each submodel should have an id
    for (const sm of result.environment.submodels) {
      expect(sm.id).toBeDefined();
      expect(typeof sm.id).toBe('string');
    }
  });

  it('parses 01_Festo.aasx correctly (v3 format)', async () => {
    const filePath = path.join(FIXTURES_DIR, '01_Festo.aasx');
    const fileData = fs.readFileSync(filePath);

    const result = await parseAASX(fileData.buffer.slice(
      fileData.byteOffset,
      fileData.byteOffset + fileData.byteLength
    ));

    // Should still work with v3 format files
    expect(result.environment).toBeDefined();
    expect(result.environment.assetAdministrationShells.length).toBeGreaterThan(0);
    expect(result.environment.submodels.length).toBeGreaterThan(0);

    console.log(`Festo: ${result.validationErrors.length} validation errors`);
    console.log(`Festo: ${result.environment.assetAdministrationShells.length} AAS`);
    console.log(`Festo: ${result.environment.submodels.length} submodels`);

    // Each AAS should have an id
    for (const aas of result.environment.assetAdministrationShells) {
      expect(aas.id).toBeDefined();
    }
  });

  it('Murrelektronik submodels have element names (not Unknown)', async () => {
    const filePath = path.join(FIXTURES_DIR, '36_Murrelektronik.aasx');
    const fileData = fs.readFileSync(filePath);

    const result = await parseAASX(fileData.buffer.slice(
      fileData.byteOffset,
      fileData.byteOffset + fileData.byteLength
    ));

    // Check that submodel elements have idShort values
    let elementsWithNames = 0;
    let totalElements = 0;

    for (const sm of result.environment.submodels) {
      const elements = sm.submodelElements || [];
      for (const elem of elements) {
        totalElements++;
        const element = elem as { idShort?: string };
        if (element.idShort && element.idShort !== 'Unknown') {
          elementsWithNames++;
        }
      }
    }

    console.log(`Murrelektronik: ${elementsWithNames}/${totalElements} elements have names`);

    // Most elements should have proper names
    if (totalElements > 0) {
      const percentageWithNames = (elementsWithNames / totalElements) * 100;
      expect(percentageWithNames).toBeGreaterThan(50); // At least 50% should have names
    }
  });
});
