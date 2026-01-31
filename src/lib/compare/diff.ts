/**
 * Compare Diff Utilities
 * Comparison logic for AAS environments
 */

import type { AASEnvironment, Submodel, SubmodelElement, Property } from '@shared/types';

export interface ComparedField {
  label: string;
  values: (string | undefined)[];
  isDifferent: boolean;
}

/**
 * Extracts a flat list of key properties from an environment
 */
export function extractKeyFields(env: AASEnvironment): Map<string, string | undefined> {
  const fields = new Map<string, string | undefined>();

  // Asset info
  const shell = env.assetAdministrationShells[0];
  if (shell) {
    fields.set('Asset ID', shell.assetInformation?.globalAssetId);
    fields.set('Asset Kind', shell.assetInformation?.assetKind);
    fields.set('Shell ID', shell.id);
    fields.set('Shell Name', shell.idShort);
  }

  // Extract properties from all submodels
  for (const submodel of env.submodels) {
    extractSubmodelFields(submodel, fields);
  }

  return fields;
}

function extractSubmodelFields(submodel: Submodel, fields: Map<string, string | undefined>, prefix = ''): void {
  const elements = submodel.submodelElements || [];
  const submodelPrefix = prefix || submodel.idShort || '';

  for (const element of elements) {
    extractElementValue(element, fields, submodelPrefix);
  }
}

function extractElementValue(element: SubmodelElement, fields: Map<string, string | undefined>, prefix: string): void {
  const key = prefix ? `${prefix} > ${element.idShort}` : element.idShort || '';

  if (element.modelType === 'Property') {
    const prop = element as Property;
    fields.set(key, prop.value);
  } else if (element.modelType === 'MultiLanguageProperty') {
    const mlp = element as { value?: { language: string; text: string }[] };
    fields.set(key, mlp.value?.[0]?.text);
  } else if (element.modelType === 'SubmodelElementCollection') {
    const collection = element as { value?: SubmodelElement[] };
    for (const child of collection.value || []) {
      extractElementValue(child, fields, key);
    }
  }
}

/**
 * Compares multiple environments and returns compared fields
 */
export function compareEnvironments(environments: AASEnvironment[]): ComparedField[] {
  const allFieldMaps = environments.map(extractKeyFields);

  // Collect all unique field names
  const allKeys = new Set<string>();
  allFieldMaps.forEach(map => map.forEach((_, key) => allKeys.add(key)));

  // Build comparison result
  const compared: ComparedField[] = [];

  for (const label of allKeys) {
    const values = allFieldMaps.map(map => map.get(label));
    const nonEmpty = values.filter(v => v !== undefined);
    const isDifferent = nonEmpty.length > 1 && new Set(nonEmpty).size > 1;

    compared.push({ label, values, isDifferent });
  }

  // Sort: different fields first, then alphabetically
  compared.sort((a, b) => {
    if (a.isDifferent !== b.isDifferent) return a.isDifferent ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return compared;
}
