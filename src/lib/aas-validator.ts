/**
 * AAS Validation using official aas-core3.0-typescript library
 * Provides V3 spec-compliant validation for AAS environments
 */

import * as aas from '@aas-core-works/aas-core3.0-typescript';
import type * as aasJsonization from '@aas-core-works/aas-core3.0-typescript/jsonization';
import type { ValidationError } from '@shared/types';

/**
 * Pre-process JSON to fix common issues before validation
 * Many real-world AASX files have minor spec deviations
 */
function preprocessEnvironment(jsonable: unknown): unknown {
  return deepClean(jsonable);
}

/**
 * Recursively clean an object to fix common AAS spec deviations
 */
function deepClean(value: unknown, _parentKey?: string): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClean(item));
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      // Fix: keys should be an array, not undefined
      if (key === 'keys' && (val === undefined || val === null)) {
        cleaned[key] = [];
        continue;
      }

      // Fix: description/displayName should be arrays, not undefined - skip if invalid
      if ((key === 'description' || key === 'displayName') && (val === undefined || val === null || !Array.isArray(val))) {
        // Skip invalid description/displayName entirely
        continue;
      }

      // Fix: globalAssetId should be a string, not undefined
      if (key === 'globalAssetId' && (val === undefined || val === null)) {
        // Try to derive from parent context or use placeholder
        cleaned[key] = 'urn:undefined:asset';
        continue;
      }

      // Fix: valueId with invalid keys - remove the whole valueId
      if (key === 'valueId' && val && typeof val === 'object') {
        const valueIdObj = val as Record<string, unknown>;
        // Skip if keys is missing, undefined, null, or not an array
        if (!Array.isArray(valueIdObj.keys)) {
          continue;
        }
      }

      // Fix: semanticId with invalid keys - remove the whole semanticId
      if (key === 'semanticId' && val && typeof val === 'object') {
        const semanticIdObj = val as Record<string, unknown>;
        if (!Array.isArray(semanticIdObj.keys)) {
          continue;
        }
      }

      // Fix: version/revision should be strings, not numbers
      if ((key === 'version' || key === 'revision') && typeof val === 'number') {
        cleaned[key] = String(val);
        continue;
      }

      // Fix: value field - depends on context (modelType and other properties)
      if (key === 'value') {
        const modelType = obj.modelType as string | undefined;
        const collectionTypes = [
          'SubmodelElementCollection',
          'SubmodelElementList',
          'Entity',
          'AnnotatedRelationshipElement',
          'Submodel'
        ];

        // Check if this explicitly looks like a collection type
        const isExplicitCollection =
          collectionTypes.includes(modelType || '') ||
          (modelType && (modelType.includes('Collection') || modelType.includes('List')));

        // Handle based on current value type and context
        if (typeof val === 'number') {
          // Numbers should be strings for Property values
          cleaned[key] = String(val);
          continue;
        } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          if (isExplicitCollection) {
            // Collection with object value - convert to empty array
            cleaned[key] = [];
            continue;
          } else {
            // Non-collection with object value - convert to string
            const valObj = val as Record<string, unknown>;
            if (typeof valObj.value === 'string') {
              cleaned[key] = valObj.value;
            } else if (typeof valObj.text === 'string') {
              cleaned[key] = valObj.text;
            } else {
              cleaned[key] = '';  // Use empty string instead of JSON to avoid further issues
            }
            continue;
          }
        } else if (typeof val === 'string' && isExplicitCollection) {
          // Collection with string value - convert to empty array
          cleaned[key] = [];
          continue;
        }
      }

      // Fix: invalid valueType values - map to valid AAS v3 DataTypeDefXsd
      if (key === 'valueType' && typeof val === 'string') {
        const valueTypeMap: Record<string, string> = {
          'xs:langString': 'xs:string',
          'langString': 'xs:string',
          'xsd:langString': 'xs:string',
          'xsd:string': 'xs:string',
          'xsd:boolean': 'xs:boolean',
          'xsd:integer': 'xs:integer',
          'xsd:int': 'xs:int',
          'xsd:double': 'xs:double',
          'xsd:float': 'xs:float',
          'xsd:decimal': 'xs:decimal',
          'xsd:dateTime': 'xs:dateTime',
          'xsd:date': 'xs:date',
          'xsd:time': 'xs:time',
          'xsd:anyURI': 'xs:anyURI',
          'xsd:base64Binary': 'xs:base64Binary',
        };
        if (valueTypeMap[val]) {
          cleaned[key] = valueTypeMap[val];
          continue;
        }
      }

      // Recursively clean nested objects
      cleaned[key] = deepClean(val, key);
    }

    return cleaned;
  }

  return value;
}

// Re-export JsonValue type for use by other modules
type JsonValue = aasJsonization.JsonValue;

/**
 * Options for validation
 */
export interface ValidationOptions {
  mode: 'strict' | 'lenient';
  maxErrors?: number;
}

/**
 * Result of validation attempt
 */
export interface AASValidationResult {
  /** Whether deserialization succeeded */
  valid: boolean;
  /** Deserialized environment (if successful) */
  environment?: aas.types.Environment;
  /** Deserialization errors */
  deserializationErrors: ValidationError[];
  /** Verification errors (constraint violations) */
  verificationErrors: ValidationError[];
  /** All errors combined */
  allErrors: ValidationError[];
}

/**
 * Validate a JSON-able object against the AAS V3 specification
 * Uses the official aas-core library for spec-compliant validation
 *
 * @param jsonable - Parsed JSON object representing an AAS environment
 * @param options - Validation options (mode and maxErrors)
 * @returns Validation result with errors and optionally the typed environment
 */
export function validateAASEnvironment(
  jsonable: unknown,
  options: ValidationOptions = { mode: 'strict', maxErrors: 100 }
): AASValidationResult {
  const { mode, maxErrors = 100 } = options;
  const deserializationErrors: ValidationError[] = [];
  const verificationErrors: ValidationError[] = [];

  // Pre-process to fix common issues in real-world files
  const cleanedJsonable = preprocessEnvironment(jsonable);

  // Step 1: Try to deserialize (cast to JsonValue for type safety)
  const instanceOrError = aas.jsonization.environmentFromJsonable(
    cleanedJsonable as JsonValue
  );

  if (instanceOrError.error !== null) {
    // Deserialization failed
    deserializationErrors.push({
      path: instanceOrError.error.path?.toString() ?? '$',
      message: instanceOrError.error.message,
    });

    return {
      valid: false,
      deserializationErrors,
      verificationErrors,
      allErrors: deserializationErrors,
    };
  }

  // Step 2: Deserialization succeeded, now verify constraints
  const environment = instanceOrError.mustValue();

  // In lenient mode, skip verification step (constraint checks)
  if (mode === 'lenient') {
    return {
      valid: true,
      environment,
      deserializationErrors,
      verificationErrors: [],
      allErrors: deserializationErrors,
    };
  }

  // Strict mode: run full verification
  let errorCount = 0;
  for (const error of aas.verification.verify(environment)) {
    verificationErrors.push({
      path: error.path?.toString() ?? '$',
      message: error.message,
    });

    errorCount++;
    if (errorCount >= maxErrors) {
      verificationErrors.push({
        path: '$',
        message: `... and more errors (stopped at ${maxErrors})`,
      });
      break;
    }
  }

  return {
    valid: verificationErrors.length === 0,
    environment,
    deserializationErrors,
    verificationErrors,
    allErrors: [...deserializationErrors, ...verificationErrors],
  };
}

/**
 * Quick check if JSON is valid AAS V3 format
 * Returns true if deserialization succeeds, ignoring verification errors
 */
export function isValidAASFormat(jsonable: unknown): boolean {
  const result = aas.jsonization.environmentFromJsonable(jsonable as JsonValue);
  return result.error === null;
}

/**
 * Get a summary of validation issues by category
 */
export function summarizeValidationErrors(
  errors: ValidationError[]
): Map<string, number> {
  const summary = new Map<string, number>();

  for (const error of errors) {
    // Extract the main category from the error message
    const category = categorizeError(error.message);
    summary.set(category, (summary.get(category) ?? 0) + 1);
  }

  return summary;
}

/**
 * Categorize an error message into a broad category
 */
export function categorizeError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('id-short') || lowerMessage.includes('idshort')) {
    return 'ID-Short Format';
  }
  if (lowerMessage.includes('semantic') || lowerMessage.includes('reference')) {
    return 'Reference/SemanticId';
  }
  if (lowerMessage.includes('required') || lowerMessage.includes('missing')) {
    return 'Missing Required Field';
  }
  if (lowerMessage.includes('type') || lowerMessage.includes('model')) {
    return 'Type Mismatch';
  }
  if (lowerMessage.includes('language') || lowerMessage.includes('lang')) {
    return 'Language String';
  }
  if (lowerMessage.includes('value') || lowerMessage.includes('constraint')) {
    return 'Value Constraint';
  }

  return 'Other';
}
