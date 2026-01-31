/**
 * Compare Diff Utilities
 * Comparison logic for AAS environments
 */

import type { AASEnvironment, Submodel, SubmodelElement, Property, Entity, SubmodelElementList } from '@shared/types';

export interface ComparedField {
  label: string;
  values: (string | undefined)[];
  isDifferent: boolean;
}

/**
 * Generates a unique key for an element within its context
 * Uses index as fallback when idShort is missing or duplicated
 */
function makeElementKey(prefix: string, element: SubmodelElement, index: number): string {
  const idPart = element.idShort || `[${index}]`;
  return prefix ? `${prefix} > ${idPart}` : idPart;
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

function extractSubmodelFields(submodel: Submodel, fields: Map<string, string | undefined>): void {
  const elements = submodel.submodelElements || [];
  // Use submodel idShort as prefix, with id fallback for uniqueness
  const submodelPrefix = submodel.idShort || submodel.id?.split('/').pop() || 'Submodel';

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element) {
      extractElementValue(element, fields, submodelPrefix, i);
    }
  }
}

function extractElementValue(
  element: SubmodelElement,
  fields: Map<string, string | undefined>,
  prefix: string,
  index: number
): void {
  const key = makeElementKey(prefix, element, index);

  switch (element.modelType) {
    case 'Property': {
      const prop = element as Property;
      fields.set(key, prop.value);
      break;
    }
    case 'MultiLanguageProperty': {
      const mlp = element as { value?: { language: string; text: string }[] };
      fields.set(key, mlp.value?.[0]?.text);
      break;
    }
    case 'Range': {
      const range = element as { min?: string; max?: string };
      fields.set(key, `${range.min ?? '?'} - ${range.max ?? '?'}`);
      break;
    }
    case 'SubmodelElementCollection': {
      const collection = element as { value?: SubmodelElement[] };
      const children = collection.value || [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child) {
          extractElementValue(child, fields, key, i);
        }
      }
      break;
    }
    case 'SubmodelElementList': {
      const list = element as SubmodelElementList;
      const items = list.value || [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item) {
          extractElementValue(item, fields, key, i);
        }
      }
      break;
    }
    case 'Entity': {
      const entity = element as Entity;
      fields.set(`${key} (entityType)`, entity.entityType);
      if (entity.globalAssetId) {
        fields.set(`${key} (globalAssetId)`, entity.globalAssetId);
      }
      const statements = entity.statements || [];
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          extractElementValue(statement, fields, key, i);
        }
      }
      break;
    }
    case 'File': {
      const file = element as { value?: string; contentType: string };
      fields.set(key, file.value);
      break;
    }
    case 'Blob': {
      const blob = element as { contentType: string };
      fields.set(key, `[${blob.contentType}]`);
      break;
    }
    // ReferenceElement, RelationshipElement, etc. - skip for now
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
