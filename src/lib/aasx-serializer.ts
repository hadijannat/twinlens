/**
 * AASX Serializer
 * Serializes AAS environments to clean JSON and AASX packages
 * Uses the official aas-core library for spec-compliant output
 */

import JSZip from 'jszip';
import * as aas from '@aas-core-works/aas-core3.0-typescript';
import type { AASEnvironment, SupplementaryFile } from '@shared/types';

/**
 * Convert our internal AASEnvironment type to an aas-core Environment
 * This handles any type mismatches between our types and the library types
 */
function toAasCoreEnvironment(env: AASEnvironment): aas.types.Environment {
  // Use JSON round-trip to convert between types safely
  // This ensures proper type conversion without TS errors
  const jsonString = JSON.stringify({
    assetAdministrationShells: env.assetAdministrationShells,
    submodels: env.submodels,
    conceptDescriptions: env.conceptDescriptions,
  });

  const result = aas.jsonization.environmentFromJsonable(JSON.parse(jsonString));
  if (result.error !== null) {
    // If conversion fails, return a minimal environment
    console.warn('Failed to convert to aas-core Environment:', result.error.message);
    return new aas.types.Environment([], [], []);
  }

  return result.mustValue();
}

/**
 * Serialize an AAS environment to clean, spec-compliant JSON
 *
 * @param environment - The AAS environment to serialize
 * @param prettyPrint - Whether to format with indentation (default: true)
 * @returns JSON string representation
 */
export function serializeToJson(environment: AASEnvironment, prettyPrint = true): string {
  try {
    const aasCoreEnv = toAasCoreEnvironment(environment);
    const jsonable = aas.jsonization.toJsonable(aasCoreEnv);
    return prettyPrint ? JSON.stringify(jsonable, null, 2) : JSON.stringify(jsonable);
  } catch (err) {
    // Fallback to direct serialization if aas-core conversion fails
    console.warn('Falling back to direct JSON serialization:', err);
    return prettyPrint
      ? JSON.stringify(environment, null, 2)
      : JSON.stringify(environment);
  }
}

/**
 * OPC Content Types XML for AASX packages
 */
function generateContentTypesXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="xml" ContentType="application/xml" />
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="png" ContentType="image/png" />
  <Default Extension="jpg" ContentType="image/jpeg" />
  <Default Extension="jpeg" ContentType="image/jpeg" />
  <Default Extension="pdf" ContentType="application/pdf" />
  <Default Extension="txt" ContentType="text/plain" />
</Types>`;
}

/**
 * Root relationships file
 */
function generateRootRels(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://admin-shell.io/aasx/relationships/aasx-origin" Target="/aasx/aasx-origin" Id="id1" />
</Relationships>`;
}

/**
 * AASX origin relationships file
 */
function generateAasxOriginRels(supplementaryFiles: SupplementaryFile[]): string {
  const rels: string[] = [
    '<Relationship Type="http://admin-shell.io/aasx/relationships/aas-spec" Target="aas-spec.json" Id="aasSpec" />',
  ];

  supplementaryFiles.forEach((file, index) => {
    // Make path relative to aasx folder
    const relativePath = file.path.startsWith('aasx/')
      ? file.path.substring(5)
      : `../${file.path}`;
    rels.push(
      `<Relationship Type="http://admin-shell.io/aasx/relationships/aas-suppl" Target="${relativePath}" Id="suppl${index}" />`
    );
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels.join('\n  ')}
</Relationships>`;
}

export interface BuildAasxOptions {
  /** Original AASX data to copy supplementary files from */
  originalAasxData?: ArrayBuffer;
  /** Supplementary files to include */
  supplementaryFiles?: SupplementaryFile[];
  /** Whether to pretty-print the JSON (default: true) */
  prettyPrint?: boolean;
}

/**
 * Build an AASX package from an AAS environment
 *
 * @param environment - The AAS environment to package
 * @param options - Build options including original data and formatting
 * @returns ArrayBuffer containing the AASX package
 */
export async function buildAasx(
  environment: AASEnvironment,
  options: BuildAasxOptions = {}
): Promise<ArrayBuffer> {
  const {
    originalAasxData,
    supplementaryFiles = [],
    prettyPrint = true,
  } = options;

  const zip = new JSZip();

  // Copy supplementary files from original AASX if provided
  if (originalAasxData && supplementaryFiles.length > 0) {
    try {
      const originalZip = await JSZip.loadAsync(originalAasxData);

      for (const file of supplementaryFiles) {
        const originalFile = originalZip.file(file.path);
        if (originalFile) {
          const content = await originalFile.async('arraybuffer');
          zip.file(file.path, content);
        }
      }
    } catch (err) {
      console.warn('Failed to copy supplementary files from original AASX:', err);
    }
  }

  // Add OPC package structure
  zip.file('[Content_Types].xml', generateContentTypesXml());
  zip.file('_rels/.rels', generateRootRels());

  // Add aasx-origin marker file
  zip.file('aasx/aasx-origin', '');

  // Add aasx-origin relationships
  zip.file('aasx/_rels/aasx-origin.rels', generateAasxOriginRels(supplementaryFiles));

  // Serialize and add the AAS environment
  const jsonContent = serializeToJson(environment, prettyPrint);
  zip.file('aasx/aas-spec.json', jsonContent);

  // Generate the ZIP file
  return zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
