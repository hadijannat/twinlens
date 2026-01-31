/**
 * AAS Validation using official aas-core3.0-typescript library
 * Provides V3 spec-compliant validation for AAS environments
 */

import * as aas from '@aas-core-works/aas-core3.0-typescript';
import type * as aasJsonization from '@aas-core-works/aas-core3.0-typescript/jsonization';
import type { ValidationError } from '@shared/types';

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

  // Step 1: Try to deserialize (cast to JsonValue for type safety)
  const instanceOrError = aas.jsonization.environmentFromJsonable(
    jsonable as JsonValue
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
