/**
 * AASX Parser
 * Extracts and validates AAS environments from AASX package files
 *
 * AASX is an OPC-based ZIP package containing:
 * - _rels/.rels - Root relationships
 * - aasx/_rels/aasx-origin.rels - AAS-specific relationships
 * - aas-spec file (JSON or XML)
 * - Supplementary files (documents, thumbnails, etc.)
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { validateAASEnvironment, type ValidationOptions } from './aas-validator';
import type {
  AASEnvironment,
  ParseResult,
  ValidationError,
  SupplementaryFile,
} from '@shared/types';
import {
  isAASv2,
  mapAAS,
  mapSubmodel,
  mapConceptDescription,
  mapSemanticId,
  mapSubmodelElementValue,
  mapValueType,
  mapMultiLanguageValue,
} from './aas-v2-mapper';
import { ensureArray } from '@shared/utils';
import {
  AASX_ORIGIN_REL_TYPE,
  AAS_SPEC_REL_TYPE,
  AAS_SUPPL_REL_TYPE,
} from '@shared/constants';

// ============================================================================
// Types
// ============================================================================

interface OpcRelationship {
  Id: string;
  Type: string;
  Target: string;
}

interface OpcRelationships {
  Relationships?: {
    Relationship?: OpcRelationship | OpcRelationship[];
  };
}

const THUMBNAIL_PATHS = [
  'aasx/thumbnail.png',
  'aasx/thumbnail.jpg',
  'aasx/thumbnail.jpeg',
  'Thumbnail/thumbnail.png',
  'Thumbnail/thumbnail.jpg',
];

// ============================================================================
// XML Parser Configuration
// ============================================================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  parseAttributeValue: true,
  trimValues: true,
});

// ============================================================================
// Helper Functions
// ============================================================================

function normalizePath(path: string): string {
  // Remove leading slash if present
  return path.startsWith('/') ? path.slice(1) : path;
}

function resolveRelativePath(basePath: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return normalizePath(relativePath);
  }

  const baseParts = basePath.split('/').slice(0, -1);
  const relParts = relativePath.split('/');

  for (const part of relParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.') {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}

function parseRelationships(xmlContent: string): OpcRelationship[] {
  const parsed = xmlParser.parse(xmlContent) as OpcRelationships;
  const rels = parsed?.Relationships?.Relationship;

  if (!rels) {
    return [];
  }

  return Array.isArray(rels) ? rels : [rels];
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    json: 'application/json',
    xml: 'application/xml',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    txt: 'text/plain',
    html: 'text/html',
    stp: 'application/step',
    step: 'application/step',
    gltf: 'model/gltf+json',
    glb: 'model/gltf-binary',
    obj: 'model/obj',
    stl: 'model/stl',
  };
  return mimeTypes[ext ?? ''] ?? 'application/octet-stream';
}

function getZipFileSize(file: JSZip.JSZipObject): number | undefined {
  const data = (file as unknown as {
    _data?: { uncompressedSize?: number; compressedSize?: number; length?: number };
  })._data;
  if (!data) return undefined;
  if (typeof data.uncompressedSize === 'number') return data.uncompressedSize;
  if (typeof data.compressedSize === 'number') return data.compressedSize;
  if (typeof data.length === 'number') return data.length;
  return undefined;
}

// ============================================================================
// Data Normalization (handles older AAS formats)
// ============================================================================

// ensureArray is imported from @shared/utils

function normalizeSubmodelElements(elements: unknown): unknown[] {
  if (!elements) return [];
  if (Array.isArray(elements)) return elements;
  if (typeof elements === 'object' && elements !== null) {
    // Handle object format - convert to array
    const obj = elements as Record<string, unknown>;
    // Check if it's a wrapper object with a specific key
    if (obj.submodelElement) {
      return ensureArray(obj.submodelElement);
    }
    // Otherwise treat as array of values
    return Object.values(obj);
  }
  return [];
}

/**
 * Normalizes a raw AAS environment to ensure consistent structure.
 *
 * Handles both AAS v2 and v3 formats by:
 * - Converting single objects or object-keyed data to arrays
 * - Ensuring all AAS shells and submodels have proper modelType
 * - Normalizing submodel elements (which may be nested objects in v2)
 * - Conditionally including conceptDescriptions only when non-empty
 *
 * @param env - Partial or raw environment from JSON/XML parsing
 * @returns Normalized AASEnvironment ready for validation and display
 */
function normalizeEnvironment(env: Partial<AASEnvironment>): AASEnvironment {
  // Note: Don't set empty arrays for optional properties like conceptDescriptions
  // The AAS spec requires these to be either absent or have at least one item
  // Using spread to conditionally include conceptDescriptions only when non-empty
  const result: AASEnvironment = {
    assetAdministrationShells: ensureArray(env.assetAdministrationShells),
    submodels: ensureArray(env.submodels),
    ...(env.conceptDescriptions?.length
      ? { conceptDescriptions: env.conceptDescriptions }
      : {}),
  };

  // Normalize each submodel's elements
  result.submodels = result.submodels.map((sm) => {
    const submodel = sm as unknown as Record<string, unknown>;
    return {
      ...submodel,
      modelType: 'Submodel' as const,
      submodelElements: normalizeSubmodelElements(submodel.submodelElements),
    };
  }) as AASEnvironment['submodels'];

  // Ensure AAS have modelType
  result.assetAdministrationShells = result.assetAdministrationShells.map((aas) => ({
    ...aas,
    modelType: 'AssetAdministrationShell' as const,
  }));

  return result;
}

// ============================================================================
// Environment Transformation (XML to JSON format)
// ============================================================================

// Map XML element type names to modelType values
const XML_TYPE_MAP: Record<string, string> = {
  property: 'Property',
  multiLanguageProperty: 'MultiLanguageProperty',
  range: 'Range',
  blob: 'Blob',
  file: 'File',
  referenceElement: 'ReferenceElement',
  relationshipElement: 'RelationshipElement',
  annotatedRelationshipElement: 'AnnotatedRelationshipElement',
  entity: 'Entity',
  basicEventElement: 'BasicEventElement',
  operation: 'Operation',
  capability: 'Capability',
  submodelElementCollection: 'SubmodelElementCollection',
  submodelElementList: 'SubmodelElementList',
};

// Check if modelType indicates a collection
function isCollectionType(modelType: unknown): boolean {
  return modelType === 'SubmodelElementCollection' || modelType === 'SubmodelElementList';
}

// Check if modelType is a property type that needs valueType mapping
function isPropertyType(modelType: unknown): boolean {
  return modelType === 'Property' || modelType === 'Range';
}

// Check if modelType is a file/blob type that needs contentType
function isFileType(modelType: unknown): boolean {
  return modelType === 'File' || modelType === 'Blob';
}

/**
 * Transforms a submodel element's value field based on its modelType.
 *
 * Different AAS element types have different value formats:
 * - Property/Range: string value (v2 may have number, converted to string)
 * - MultiLanguageProperty: array of { language, text } (v2 uses { lang, #text })
 * - SubmodelElementCollection/List: array of nested elements (recursively transformed)
 * - File: path string
 * - Blob: base64 content
 *
 * This handles v2→v3 conversion for value formats and recursively processes
 * nested collections to ensure all elements are properly transformed.
 *
 * @param element - The submodel element with value and modelType
 * @returns Transformed value appropriate for the element's modelType
 */
function transformElementValue(element: Record<string, unknown>): unknown {
  const { value, modelType } = element;

  if (!value) return value;

  // Property: value should be string (may be number in v2)
  if (isPropertyType(modelType)) {
    if (typeof value === 'number') {
      return String(value);
    }
    return value;
  }

  // MultiLanguageProperty: value should be array of LangStringSet
  if (modelType === 'MultiLanguageProperty') {
    return mapMultiLanguageValue(value);
  }

  // If value is already an array, recursively transform each element
  if (Array.isArray(value)) {
    // For collections, transform nested elements
    if (isCollectionType(modelType)) {
      return transformXmlSubmodelElements(value);
    }
    return value;
  }

  // If value is an object (v2 wrapper format)
  if (typeof value === 'object') {
    const valueObj = value as Record<string, unknown>;
    if (valueObj.submodelElement || isCollectionType(modelType)) {
      const mappedValue = mapSubmodelElementValue(value);
      return transformXmlSubmodelElements(mappedValue);
    }
  }

  return value;
}

// Transform XML submodel elements which are wrapped in type tags
function transformXmlSubmodelElements(elements: unknown): unknown[] {
  if (!elements) return [];

  // Handle wrapper object with submodelElement key
  const wrapper = elements as Record<string, unknown>;
  const elementList = wrapper.submodelElement ?? elements;

  const items = Array.isArray(elementList) ? elementList : [elementList];

  return items.map((item) => {
    if (!item || typeof item !== 'object') return item;

    const obj = item as Record<string, unknown>;

    // Check if already has modelType (JSON format)
    if (obj.modelType) {
      // Transform semanticId if present (for v2 format)
      const transformed: Record<string, unknown> = { ...obj };
      if (obj.semanticId) {
        const mappedSemanticId = mapSemanticId(obj);
        if (mappedSemanticId) {
          transformed.semanticId = mappedSemanticId;
        }
      }

      // Fix valueType (v2 issue - may be empty or missing xs: prefix)
      if (isPropertyType(obj.modelType)) {
        transformed.valueType = mapValueType(obj.valueType);
      }

      // Fix contentType for File/Blob (v2 may omit it)
      if (isFileType(obj.modelType) && !obj.contentType) {
        transformed.contentType = 'application/octet-stream';
      }

      // Transform value recursively for all types
      if (obj.value !== undefined) {
        transformed.value = transformElementValue(transformed);
      }

      return transformed;
    }

    // XML format: element is wrapped in type-specific tag
    // e.g., { property: { idShort: "Name", ... } }
    for (const [xmlType, modelType] of Object.entries(XML_TYPE_MAP)) {
      if (obj[xmlType]) {
        const innerElement = obj[xmlType] as Record<string, unknown>;
        const transformed: Record<string, unknown> = {
          ...innerElement,
          modelType,
        };

        // Transform semanticId if present (for v2 format)
        if (innerElement.semanticId) {
          const mappedSemanticId = mapSemanticId(innerElement);
          if (mappedSemanticId) {
            transformed.semanticId = mappedSemanticId;
          }
        }

        // Fix valueType (v2 issue - may be empty or missing xs: prefix)
        if (isPropertyType(modelType)) {
          transformed.valueType = mapValueType(innerElement.valueType);
        }

        // Fix contentType for File/Blob (v2 may omit it)
        if (isFileType(modelType) && !innerElement.contentType) {
          transformed.contentType = 'application/octet-stream';
        }

        // Transform value recursively for all types
        if (innerElement.value !== undefined) {
          transformed.value = transformElementValue(transformed);
        }

        return transformed;
      }
    }

    // Fallback: return as-is
    return obj;
  }).filter(Boolean);
}

/**
 * Transforms an XML-parsed AAS environment to normalized JSON format.
 *
 * XML AAS environments have a nested wrapper structure that differs from JSON:
 * - `aasenv.assetAdministrationShells.assetAdministrationShell` (vs `assetAdministrationShells`)
 * - `aasenv.submodels.submodel` (vs `submodels`)
 * - Submodel elements wrapped in type tags: `{ property: {...} }` (vs `{ modelType: "Property", ... }`)
 *
 * This function:
 * 1. Detects v2 vs v3 format and applies appropriate mappings
 * 2. Unwraps nested container structures
 * 3. Transforms XML type-tagged elements to modelType format
 * 4. Ensures all elements have proper modelType set
 *
 * @param xmlData - Raw parsed XML data (from fast-xml-parser)
 * @returns Normalized AASEnvironment matching JSON format
 */
function transformXmlEnvironment(xmlData: unknown): AASEnvironment {
  // XML environments have a different structure
  // This normalizes them to match the JSON format
  const data = xmlData as Record<string, unknown>;
  const env = data.aasenv ?? data.environment ?? data;

  // Check if this is AAS v2 format
  const isV2 = isAASv2(env);

  const result: AASEnvironment = {
    assetAdministrationShells: [],
    submodels: [],
    conceptDescriptions: [],
  };

  // Extract AAS
  const aasContainer = (env as Record<string, unknown>).assetAdministrationShells;
  if (aasContainer) {
    const aasList = (aasContainer as Record<string, unknown>).assetAdministrationShell;
    if (aasList) {
      const rawList = Array.isArray(aasList) ? aasList : [aasList];
      // Apply v2 mapping if needed
      result.assetAdministrationShells = rawList.map((aas) => {
        const mapped = isV2 ? mapAAS(aas) : aas;
        return {
          ...mapped,
          modelType: 'AssetAdministrationShell' as const,
        };
      }) as AASEnvironment['assetAdministrationShells'];
    }
  }

  // Extract Submodels and transform their elements
  const smContainer = (env as Record<string, unknown>).submodels;
  if (smContainer) {
    const smList = (smContainer as Record<string, unknown>).submodel;
    if (smList) {
      const submodels = Array.isArray(smList) ? smList : [smList];
      result.submodels = submodels.map((sm) => {
        // Apply v2 mapping if needed
        const mapped = isV2 ? mapSubmodel(sm) : (sm as Record<string, unknown>);
        return {
          ...mapped,
          modelType: 'Submodel' as const,
          submodelElements: transformXmlSubmodelElements(mapped.submodelElements),
        };
      }) as AASEnvironment['submodels'];
    }
  }

  // Extract Concept Descriptions
  const cdContainer = (env as Record<string, unknown>).conceptDescriptions;
  if (cdContainer) {
    const cdList = (cdContainer as Record<string, unknown>).conceptDescription;
    if (cdList) {
      const conceptDescriptions = Array.isArray(cdList) ? cdList : [cdList];
      result.conceptDescriptions = conceptDescriptions.map((cd) => {
        const mapped = isV2 ? mapConceptDescription(cd) : (cd as Record<string, unknown>);
        return {
          ...mapped,
          modelType: 'ConceptDescription' as const,
        };
      }) as AASEnvironment['conceptDescriptions'];
    }
  }

  return result;
}

// ============================================================================
// Main Parser
// ============================================================================

export async function parseAASX(
  fileData: ArrayBuffer,
  validationOptions?: ValidationOptions
): Promise<ParseResult> {
  const validationErrors: ValidationError[] = [];
  const supplementaryFiles: SupplementaryFile[] = [];
  let thumbnail: string | undefined;

  // Load ZIP
  const zip = await JSZip.loadAsync(fileData);

  // Step 1: Find the root relationships file
  const rootRelsFile = zip.file('_rels/.rels');
  if (!rootRelsFile) {
    throw new Error('Invalid AASX: Missing _rels/.rels');
  }

  const rootRelsContent = await rootRelsFile.async('string');
  const rootRels = parseRelationships(rootRelsContent);

  // Step 2: Find aasx-origin relationship
  const aasxOriginRel = rootRels.find(
    (r) => r.Type === AASX_ORIGIN_REL_TYPE
  );

  let aasSpecPath: string | undefined;

  if (aasxOriginRel) {
    // Standard path: aasx-origin -> aas-spec
    const originPath = normalizePath(aasxOriginRel.Target);
    const originDir = originPath.split('/').slice(0, -1).join('/');
    const originFile = originPath.split('/').pop() ?? '';
    const originRelsPath = normalizePath(
      originDir ? `${originDir}/_rels/${originFile}.rels` : `_rels/${originFile}.rels`
    );

    const originRelsFile = zip.file(originRelsPath);
    if (originRelsFile) {
      const originRelsContent = await originRelsFile.async('string');
      const originRels = parseRelationships(originRelsContent);

      const aasSpecRel = originRels.find((r) => r.Type === AAS_SPEC_REL_TYPE);
      if (aasSpecRel) {
        aasSpecPath = resolveRelativePath(originPath, aasSpecRel.Target);
      }

      // Collect supplementary files
      const supplRels = originRels.filter((r) => r.Type === AAS_SUPPL_REL_TYPE);
      for (const rel of supplRels) {
        const path = resolveRelativePath(originPath, rel.Target);
        const file = zip.file(path);
        if (file) {
          let size = getZipFileSize(file);
          if (size === undefined) {
            const data = await file.async('arraybuffer');
            size = data.byteLength;
          }
          supplementaryFiles.push({
            path,
            contentType: getContentType(path),
            size,
          });
        }
      }
    }
  }

  // Fallback: Look for JSON/XML files directly
  if (!aasSpecPath) {
    const candidates = [
      'aasx/aas.json',
      'aasx/aas.xml',
      'aas.json',
      'aas.xml',
    ];

    for (const candidate of candidates) {
      if (zip.file(candidate)) {
        aasSpecPath = candidate;
        break;
      }
    }

    // Last resort: find any JSON or XML file
    if (!aasSpecPath) {
      for (const [path] of Object.entries(zip.files)) {
        if (path.endsWith('.json') || path.endsWith('.xml')) {
          aasSpecPath = path;
          break;
        }
      }
    }
  }

  if (!aasSpecPath) {
    throw new Error('Invalid AASX: No AAS specification file found');
  }

  // Step 3: Read and parse the AAS specification file
  const aasSpecFile = zip.file(aasSpecPath);
  if (!aasSpecFile) {
    throw new Error(`Invalid AASX: AAS spec file not found at ${aasSpecPath}`);
  }

  const aasSpecContent = await aasSpecFile.async('string');
  let rawEnvironment: unknown;

  if (aasSpecPath.endsWith('.json')) {
    rawEnvironment = JSON.parse(aasSpecContent);
  } else {
    // XML parsing
    const xmlData = xmlParser.parse(aasSpecContent);
    rawEnvironment = transformXmlEnvironment(xmlData);
  }

  // Step 4: Normalize to V3 format (handles V2 compatibility)
  let environment = normalizeEnvironment(rawEnvironment as Partial<AASEnvironment>);

  // Step 5: Validate using official aas-core library
  const validationResult = validateAASEnvironment(environment, validationOptions);

  // Collect all validation errors
  for (const error of validationResult.allErrors) {
    validationErrors.push(error);
  }

  // Step 5: Extract thumbnail
  for (const thumbPath of THUMBNAIL_PATHS) {
    const thumbFile = zip.file(thumbPath);
    if (thumbFile) {
      const thumbData = await thumbFile.async('base64');
      const mimeType = getContentType(thumbPath);
      thumbnail = `data:${mimeType};base64,${thumbData}`;
      break;
    }
  }

  // Also check if AAS defines a default thumbnail
  for (const aas of environment.assetAdministrationShells) {
    const thumbResource = aas.assetInformation?.defaultThumbnail;
    if (thumbResource?.path && !thumbnail) {
      const thumbFile = zip.file(normalizePath(thumbResource.path));
      if (thumbFile) {
        const thumbData = await thumbFile.async('base64');
        const mimeType = thumbResource.contentType ?? getContentType(thumbResource.path);
        thumbnail = `data:${mimeType};base64,${thumbData}`;
        break;
      }
    }
  }

  // Step 6: Collect remaining supplementary files
  for (const [path, file] of Object.entries(zip.files)) {
    if (
      !file.dir &&
      !path.startsWith('_rels/') &&
      !path.includes('/.rels') &&
      path !== aasSpecPath &&
      !supplementaryFiles.some((f) => f.path === path)
    ) {
      // Skip Content_Types and core package files
      if (path === '[Content_Types].xml') continue;

      let size = getZipFileSize(file);
      if (size === undefined) {
        const data = await file.async('arraybuffer');
        size = data.byteLength;
      }
      supplementaryFiles.push({
        path,
        contentType: getContentType(path),
        size,
      });
    }
  }

  return {
    environment,
    validationErrors,
    supplementaryFiles,
    thumbnail,
  };
}

/**
 * Parse a standalone JSON AAS environment
 */
export async function parseJSON(
  jsonData: string | ArrayBuffer,
  validationOptions?: ValidationOptions
): Promise<ParseResult> {
  const validationErrors: ValidationError[] = [];

  // Convert ArrayBuffer to string if needed
  const jsonString =
    typeof jsonData === 'string'
      ? jsonData
      : new TextDecoder().decode(jsonData);

  // Parse JSON
  let rawEnv: unknown;
  try {
    rawEnv = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Invalid JSON: ${(err as Error).message}`);
  }

  // Determine if this is v2 or v3 format
  if (isAASv2(rawEnv)) {
    validationErrors.push({
      path: '$',
      message: 'Parsed as AAS v2 format (converted to v3)',
    });
  }

  // Normalize the environment to V3 format
  const environment = normalizeEnvironment(rawEnv as Partial<AASEnvironment>);

  // Validate using official aas-core library
  const validationResult = validateAASEnvironment(environment, validationOptions);

  // Collect all validation errors
  for (const error of validationResult.allErrors) {
    validationErrors.push(error);
  }

  return {
    environment,
    validationErrors,
    supplementaryFiles: [],
    thumbnail: undefined,
  };
}

/**
 * Parse either AASX or JSON format based on file content
 */
export async function parseAASData(
  fileData: ArrayBuffer,
  fileName: string,
  validationOptions?: ValidationOptions
): Promise<ParseResult> {
  // Check file extension first
  const ext = fileName.toLowerCase().split('.').pop();

  if (ext === 'json') {
    return parseJSON(fileData, validationOptions);
  }

  if (ext === 'aasx') {
    return parseAASX(fileData, validationOptions);
  }

  // Try to detect format from content
  if (fileData.byteLength === 0) {
    throw new Error('Empty file. Please provide an .aasx or .json file.');
  }

  const header = new Uint8Array(fileData.slice(0, 4));
  const byte0 = header[0] ?? 0;
  const byte1 = header[1] ?? 0;

  // Check for ZIP signature (PK..)
  if (byte0 === 0x50 && byte1 === 0x4b) {
    return parseAASX(fileData, validationOptions);
  }

  // Check for JSON (starts with { or [)
  const firstChar = String.fromCharCode(byte0);
  if (firstChar === '{' || firstChar === '[') {
    return parseJSON(fileData, validationOptions);
  }

  throw new Error(
    'Unsupported file format. Please provide an .aasx or .json file.'
  );
}
