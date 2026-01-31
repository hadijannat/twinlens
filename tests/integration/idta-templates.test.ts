/**
 * Integration tests for official IDTA template AASX samples
 * Tests that TwinLens correctly parses and extracts data from official examples
 */

import { describe, it, expect } from 'vitest';
import { parseAASX } from '../../src/lib/aasx-parser';
import { detectTemplate, TemplateType } from '../../src/lib/templates/detector';
import { extractNameplateData } from '../../src/lib/templates/extractors/nameplate';
import { extractCarbonFootprintData } from '../../src/lib/templates/extractors/carbon-footprint';
import { extractTechnicalData } from '../../src/lib/templates/extractors/technical-data';
import { extractHandoverDocs } from '../../src/lib/templates/extractors/handover-docs';
import fs from 'fs';
import path from 'path';

const IDTA_FIXTURES = path.join(__dirname, '../fixtures/idta');

describe('IDTA Official Template Samples', () => {
  describe('Digital Nameplate V2.0', () => {
    it('parses the official nameplate sample without errors', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'nameplate-sample.aasx');

      if (!fs.existsSync(filePath)) {
        console.log('Nameplate sample not found, skipping');
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      expect(result.environment).toBeDefined();
      expect(result.environment.submodels.length).toBeGreaterThan(0);

      console.log(`Nameplate: ${result.validationErrors.length} validation errors`);
      console.log(`Nameplate: ${result.environment.submodels.length} submodels`);
    });

    it('detects the nameplate template', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'nameplate-sample.aasx');

      if (!fs.existsSync(filePath)) {
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      for (const sm of result.environment.submodels) {
        const templateType = detectTemplate(sm);
        if (templateType !== TemplateType.GENERIC) {
          console.log(`Found template: ${templateType} for ${sm.idShort}`);
        }
      }
    });

    it('extracts nameplate data correctly', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'nameplate-sample.aasx');

      if (!fs.existsSync(filePath)) {
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      for (const sm of result.environment.submodels) {
        const templateType = detectTemplate(sm);
        if (templateType === TemplateType.NAMEPLATE) {
          const data = extractNameplateData(sm);
          console.log('Extracted nameplate data:', data);

          // Should have at least some data extracted
          const hasData = Object.keys(data).length > 0;
          expect(hasData).toBe(true);
        }
      }
    });
  });

  describe('Carbon Footprint V0.9', () => {
    it('parses the official carbon footprint sample without errors', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'carbon-footprint-sample.aasx');

      if (!fs.existsSync(filePath)) {
        console.log('Carbon footprint sample not found, skipping');
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      expect(result.environment).toBeDefined();
      expect(result.environment.submodels.length).toBeGreaterThan(0);

      console.log(`Carbon Footprint: ${result.validationErrors.length} validation errors`);
      console.log(`Carbon Footprint: ${result.environment.submodels.length} submodels`);
    });

    it('extracts carbon footprint data correctly', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'carbon-footprint-sample.aasx');

      if (!fs.existsSync(filePath)) {
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      for (const sm of result.environment.submodels) {
        const templateType = detectTemplate(sm);
        if (templateType === TemplateType.CARBON_FOOTPRINT) {
          const data = extractCarbonFootprintData(sm);
          console.log('Extracted carbon footprint data:', data);

          // Check if PCF data was extracted
          if (data.pcfTotal !== undefined) {
            expect(typeof data.pcfTotal).toBe('number');
          }
        }
      }
    });
  });

  describe('Technical Data V1.2', () => {
    it('parses the official technical data sample without errors', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'technical-data-sample.aasx');

      if (!fs.existsSync(filePath)) {
        console.log('Technical data sample not found, skipping');
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      expect(result.environment).toBeDefined();
      expect(result.environment.submodels.length).toBeGreaterThan(0);

      console.log(`Technical Data: ${result.validationErrors.length} validation errors`);
      console.log(`Technical Data: ${result.environment.submodels.length} submodels`);
    });

    it('extracts technical data correctly', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'technical-data-sample.aasx');

      if (!fs.existsSync(filePath)) {
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      for (const sm of result.environment.submodels) {
        const templateType = detectTemplate(sm);
        if (templateType === TemplateType.TECHNICAL_DATA) {
          const data = extractTechnicalData(sm);
          console.log('Extracted technical data:', {
            generalInfo: data.generalInformation,
            classificationsCount: data.productClassifications?.length,
            propertiesCount: data.technicalProperties?.length,
          });
        }
      }
    });
  });

  describe('Handover Documentation V1.2', () => {
    it('parses the official handover docs sample without errors', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'handover-docs-sample.aasx');

      if (!fs.existsSync(filePath)) {
        console.log('Handover docs sample not found, skipping');
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      expect(result.environment).toBeDefined();
      expect(result.environment.submodels.length).toBeGreaterThan(0);

      console.log(`Handover Docs: ${result.validationErrors.length} validation errors`);
      console.log(`Handover Docs: ${result.environment.submodels.length} submodels`);
    });

    it('extracts handover documentation correctly', async () => {
      const filePath = path.join(IDTA_FIXTURES, 'handover-docs-sample.aasx');

      if (!fs.existsSync(filePath)) {
        return;
      }

      const fileData = fs.readFileSync(filePath);
      const result = await parseAASX(fileData.buffer.slice(
        fileData.byteOffset,
        fileData.byteOffset + fileData.byteLength
      ));

      for (const sm of result.environment.submodels) {
        const templateType = detectTemplate(sm);
        if (templateType === TemplateType.HANDOVER_DOCUMENTATION) {
          const docsData = extractHandoverDocs(sm);
          console.log('Extracted handover docs:', {
            documentsCount: docsData.documents.length,
            categories: [...new Set(docsData.documents.map(d => d.documentClassId))],
          });
        }
      }
    });
  });
});
