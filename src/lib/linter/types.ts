/**
 * Linter Types
 * Type definitions for the compliance linting system
 */

import type { AASEnvironment, Submodel, SubmodelElement } from '@shared/types';

/**
 * Severity levels for lint issues
 */
export type LintSeverity = 'error' | 'warning' | 'info';

/**
 * Status of a lint check
 */
export type LintStatus = 'pass' | 'warn' | 'fail';

/**
 * A single lint issue found during validation
 */
export interface LintIssue {
  /** Unique identifier for the rule that generated this issue */
  ruleId: string;
  /** Human-readable rule name */
  ruleName: string;
  /** Severity of the issue */
  severity: LintSeverity;
  /** Detailed message explaining the issue */
  message: string;
  /** Path to the problematic element (e.g., "submodels[0].submodelElements[2]") */
  path?: string;
  /** The actual value that caused the issue */
  actualValue?: unknown;
  /** The expected value or constraint */
  expectedValue?: unknown;
  /** Effective date if this is a future requirement */
  effectiveDate?: string;
  /** Reference to the regulation/spec (e.g., "EU Battery Regulation Art. 77") */
  reference?: string;
}

/**
 * Context provided to lint rules during execution
 */
export interface LintContext {
  /** The full AAS environment being validated */
  environment: AASEnvironment;
  /** Helper to add an issue */
  addIssue: (issue: Omit<LintIssue, 'ruleId' | 'ruleName'>) => void;
  /** Find submodels by semantic ID pattern */
  findSubmodelsBySemanticId: (pattern: string | RegExp) => Submodel[];
  /** Find elements within a submodel by idShort */
  findElementByIdShort: (submodel: Submodel, idShort: string) => SubmodelElement | undefined;
  /** Find nested elements by path (e.g., "Collection/SubCollection/Property") */
  findElementByPath: (submodel: Submodel, path: string) => SubmodelElement | undefined;
}

/**
 * A lint rule definition
 */
export interface LintRule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description of what this rule checks */
  description: string;
  /** Category/group for organization */
  category: string;
  /** Default severity if the rule fails */
  severity: LintSeverity;
  /** Reference to the regulation/spec */
  reference?: string;
  /** Effective date (rules not yet in force show as info) */
  effectiveDate?: string;
  /** The validation function */
  validate: (ctx: LintContext) => void;
}

/**
 * A collection of related lint rules
 */
export interface RulePack {
  /** Unique identifier for the rule pack */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the rule pack */
  description: string;
  /** Version of the regulation/spec */
  version?: string;
  /** The rules in this pack */
  rules: LintRule[];
}

/**
 * Result of running the linter
 */
export interface LintResult {
  /** Overall status based on worst issue */
  status: LintStatus;
  /** All issues found */
  issues: LintIssue[];
  /** Summary counts by severity */
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    passed: number;
    total: number;
  };
  /** Which rule packs were executed */
  rulesExecuted: string[];
  /** Timestamp of the lint run */
  timestamp: string;
}

/**
 * Category grouping for UI display
 */
export interface LintCategory {
  id: string;
  name: string;
  issues: LintIssue[];
  status: LintStatus;
}
