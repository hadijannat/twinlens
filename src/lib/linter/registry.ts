/**
 * Compliance Rule Pack Registry
 * Manages registration and retrieval of compliance rule packs
 */

import type { RulePack } from './types';

/**
 * Registry for rule packs
 * Rule packs are registered at module load time
 */
const rulePacks = new Map<string, RulePack>();

/**
 * Register a rule pack with the registry
 */
export function registerRulePack(pack: RulePack): void {
  if (rulePacks.has(pack.id)) {
    console.warn(`Rule pack "${pack.id}" is already registered, overwriting`);
  }
  rulePacks.set(pack.id, pack);
}

/**
 * Get a specific rule pack by ID
 */
export function getRulePack(id: string): RulePack | undefined {
  return rulePacks.get(id);
}

/**
 * Get all registered rule packs
 */
export function getAllRulePacks(): RulePack[] {
  return Array.from(rulePacks.values());
}

/**
 * Get rule pack IDs
 */
export function getRulePackIds(): string[] {
  return Array.from(rulePacks.keys());
}

/**
 * Get enabled rule packs based on user preferences
 */
export function getEnabledRulePacks(enabledPackIds: string[]): RulePack[] {
  return enabledPackIds
    .map((id) => rulePacks.get(id))
    .filter((pack): pack is RulePack => pack !== undefined);
}

/**
 * Get rule pack metadata (without the full rules for UI display)
 */
export interface RulePackInfo {
  id: string;
  name: string;
  description: string;
  version?: string;
  ruleCount: number;
}

export function getRulePackInfos(): RulePackInfo[] {
  return getAllRulePacks().map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    version: pack.version,
    ruleCount: pack.rules.length,
  }));
}

/**
 * Check if a rule pack is registered
 */
export function hasRulePack(id: string): boolean {
  return rulePacks.has(id);
}

/**
 * Clear all registered rule packs (for testing)
 */
export function clearRegistry(): void {
  rulePacks.clear();
}
