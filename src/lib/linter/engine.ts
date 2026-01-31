/**
 * Linter Engine
 * Executes lint rules against an AAS environment
 */

import type { AASEnvironment, Submodel, SubmodelElement } from '@shared/types';
import type {
  LintRule,
  RulePack,
  LintResult,
  LintContext,
  LintIssue,
  LintStatus,
} from './types';

/**
 * Find submodels matching a semantic ID pattern
 */
function findSubmodelsBySemanticId(
  environment: AASEnvironment,
  pattern: string | RegExp
): Submodel[] {
  return environment.submodels.filter((submodel) => {
    if (!submodel.semanticId?.keys?.length) return false;
    const semanticIdValue = submodel.semanticId.keys[0]?.value;
    if (!semanticIdValue) return false;

    if (typeof pattern === 'string') {
      return semanticIdValue.includes(pattern);
    }
    return pattern.test(semanticIdValue);
  });
}

/**
 * Find an element by idShort in a submodel's elements (non-recursive)
 */
function findElementByIdShort(
  submodel: Submodel,
  idShort: string
): SubmodelElement | undefined {
  return submodel.submodelElements?.find((el) => el.idShort === idShort);
}

/**
 * Get child elements from a container element
 */
function getChildElements(element: SubmodelElement): SubmodelElement[] {
  if (
    element.modelType === 'SubmodelElementCollection' ||
    element.modelType === 'SubmodelElementList'
  ) {
    return (element as { value?: SubmodelElement[] }).value ?? [];
  }
  if (element.modelType === 'Entity') {
    return (element as { statements?: SubmodelElement[] }).statements ?? [];
  }
  return [];
}

/**
 * Find an element by path (e.g., "Collection/SubCollection/Property")
 */
function findElementByPath(
  submodel: Submodel,
  path: string
): SubmodelElement | undefined {
  const parts = path.split('/');
  let currentElements: SubmodelElement[] | undefined = submodel.submodelElements;

  for (let i = 0; i < parts.length; i++) {
    if (!currentElements) return undefined;

    const part = parts[i];
    const element = currentElements.find((el) => el.idShort === part);
    if (!element) return undefined;

    if (i === parts.length - 1) {
      return element;
    }

    currentElements = getChildElements(element);
  }

  return undefined;
}

/**
 * Create a lint context for rule execution
 */
function createContext(
  environment: AASEnvironment,
  rule: LintRule,
  issues: LintIssue[]
): LintContext {
  return {
    environment,
    addIssue: (issue) => {
      issues.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ...issue,
      });
    },
    findSubmodelsBySemanticId: (pattern) =>
      findSubmodelsBySemanticId(environment, pattern),
    findElementByIdShort,
    findElementByPath,
  };
}

/**
 * Determine overall status from issues
 */
function determineStatus(issues: LintIssue[]): LintStatus {
  if (issues.some((i) => i.severity === 'error')) return 'fail';
  if (issues.some((i) => i.severity === 'warning')) return 'warn';
  return 'pass';
}

/**
 * Execute a single rule pack against an environment
 */
export function executeRulePack(
  environment: AASEnvironment,
  rulePack: RulePack
): LintResult {
  const issues: LintIssue[] = [];
  const now = new Date();

  for (const rule of rulePack.rules) {
    // Check if rule is effective yet
    const isEffective =
      !rule.effectiveDate || new Date(rule.effectiveDate) <= now;

    try {
      const ctx = createContext(environment, rule, issues);
      rule.validate(ctx);

      // Downgrade severity for future rules
      if (!isEffective) {
        for (let i = issues.length - 1; i >= 0; i--) {
          const issue = issues[i];
          if (issue && issue.ruleId === rule.id) {
            issue.severity = 'info';
            issue.effectiveDate = rule.effectiveDate;
          }
        }
      }
    } catch (error) {
      // Rule execution failed - log but continue
      console.warn(`Rule ${rule.id} failed to execute:`, error);
    }
  }

  const summary = {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    infos: issues.filter((i) => i.severity === 'info').length,
    passed: rulePack.rules.length - new Set(issues.map((i) => i.ruleId)).size,
    total: rulePack.rules.length,
  };

  return {
    status: determineStatus(issues),
    issues,
    summary,
    rulesExecuted: [rulePack.id],
    timestamp: now.toISOString(),
  };
}

/**
 * Execute multiple rule packs against an environment
 */
export function executeLinter(
  environment: AASEnvironment,
  rulePacks: RulePack[]
): LintResult {
  const allIssues: LintIssue[] = [];
  const allRulesExecuted: string[] = [];
  let totalRules = 0;

  for (const pack of rulePacks) {
    const result = executeRulePack(environment, pack);
    allIssues.push(...result.issues);
    allRulesExecuted.push(...result.rulesExecuted);
    totalRules += pack.rules.length;
  }

  const summary = {
    errors: allIssues.filter((i) => i.severity === 'error').length,
    warnings: allIssues.filter((i) => i.severity === 'warning').length,
    infos: allIssues.filter((i) => i.severity === 'info').length,
    passed: totalRules - new Set(allIssues.map((i) => i.ruleId)).size,
    total: totalRules,
  };

  return {
    status: determineStatus(allIssues),
    issues: allIssues,
    summary,
    rulesExecuted: allRulesExecuted,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Group issues by category for UI display
 */
export function groupIssuesByCategory(issues: LintIssue[]): Map<string, LintIssue[]> {
  const groups = new Map<string, LintIssue[]>();

  for (const issue of issues) {
    // Extract category from ruleId (e.g., "battery.identification.manufacturer" -> "identification")
    const parts = issue.ruleId.split('.');
    const category = (parts.length > 1 ? parts[1] : 'general') ?? 'general';

    const existing = groups.get(category) ?? [];
    existing.push(issue);
    groups.set(category, existing);
  }

  return groups;
}
