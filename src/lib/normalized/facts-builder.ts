/**
 * Technical Facts Builder
 * Extracts and categorizes technical facts from AAS environment
 */

import type {
  AASEnvironment,
  SubmodelElement,
  SubmodelElementCollection,
  Property,
  MultiLanguageProperty,
  Range,
} from '@shared/types';
import type { TechnicalFact, TechnicalFacts, TypedValue } from './types';
import {
  resolveSemanticId,
  canonicalizeIdShort,
  generateDisplayLabel,
} from './semantic-mapping';
import { normalizeUnit } from './units';

/**
 * Determines value type from XSD datatype
 */
function getValueType(
  valueType?: string
): 'string' | 'number' | 'boolean' | 'date' {
  if (!valueType) return 'string';

  const type = valueType.replace('xs:', '').toLowerCase();

  if (
    [
      'integer',
      'int',
      'long',
      'short',
      'byte',
      'decimal',
      'float',
      'double',
      'nonnegativeinteger',
      'positiveinteger',
      'negativeinteger',
      'nonpositiveinteger',
      'unsignedbyte',
      'unsignedint',
      'unsignedlong',
      'unsignedshort',
    ].includes(type)
  ) {
    return 'number';
  }

  if (type === 'boolean') {
    return 'boolean';
  }

  if (['date', 'datetime', 'time'].includes(type)) {
    return 'date';
  }

  return 'string';
}

/**
 * Extracts TypedValue from a Property element
 */
function extractPropertyValue(property: Property): TypedValue | null {
  if (property.value === undefined || property.value === null) {
    return null;
  }

  const valueType = getValueType(property.valueType);

  switch (valueType) {
    case 'number': {
      const numValue = parseFloat(property.value);
      if (isNaN(numValue)) {
        return { type: 'string', value: property.value };
      }
      return { type: 'number', value: numValue };
    }
    case 'boolean':
      return {
        type: 'boolean',
        value: property.value.toLowerCase() === 'true',
      };
    case 'date':
      return { type: 'date', value: property.value };
    default:
      return { type: 'string', value: property.value };
  }
}

/**
 * Extracts TypedValue from a MultiLanguageProperty element
 */
function extractMultiLangValue(mlp: MultiLanguageProperty): TypedValue | null {
  if (!mlp.value || mlp.value.length === 0) {
    return null;
  }

  return {
    type: 'multilang',
    values: mlp.value.map((ls) => ({ lang: ls.language, text: ls.text })),
  };
}

/**
 * Extracts TypedValue from a Range element
 */
function extractRangeValue(range: Range): TypedValue | null {
  const parts: string[] = [];
  if (range.min !== undefined) parts.push(`min: ${range.min}`);
  if (range.max !== undefined) parts.push(`max: ${range.max}`);

  if (parts.length === 0) return null;

  return { type: 'string', value: parts.join(', ') };
}

/**
 * Gets the semantic ID value from an element
 */
function getSemanticId(element: SubmodelElement): string | undefined {
  return element.semanticId?.keys?.[0]?.value;
}

/**
 * Extracts unit from embedded data specification
 */
function extractUnitFromElement(element: SubmodelElement): string | undefined {
  const eds = element.embeddedDataSpecifications?.[0];
  if (!eds) return undefined;

  const content = eds.dataSpecificationContent;
  return content?.unit;
}

/**
 * Creates a TechnicalFact from a submodel element
 */
function createFact(
  element: SubmodelElement,
  sourceSubmodel: string,
  parentPath?: string
): TechnicalFact | null {
  const idShort = element.idShort || 'unknown';
  const semanticId = getSemanticId(element);

  // Try to get value based on element type
  let typedValue: TypedValue | null = null;

  switch (element.modelType) {
    case 'Property':
      typedValue = extractPropertyValue(element as Property);
      break;
    case 'MultiLanguageProperty':
      typedValue = extractMultiLangValue(element as MultiLanguageProperty);
      break;
    case 'Range':
      typedValue = extractRangeValue(element as Range);
      break;
    default:
      return null;
  }

  if (!typedValue) return null;

  // Resolve semantic mapping
  const mapping = semanticId ? resolveSemanticId(semanticId) : undefined;

  // Generate canonical key
  const canonicalKey = mapping?.canonicalKey ?? canonicalizeIdShort(idShort);

  // Generate display label
  const displayLabel = mapping?.displayLabel ?? generateDisplayLabel(idShort);

  // Extract and normalize unit for numeric values
  let unit = extractUnitFromElement(element) ?? mapping?.unit;
  if (typedValue.type === 'number' && unit) {
    const normalized = normalizeUnit(typedValue.value, unit);
    typedValue = {
      type: 'number',
      value: normalized.value,
      unit: normalized.unit,
    };
  } else if (typedValue.type === 'number' && unit) {
    typedValue.unit = unit;
  }

  // Determine category
  const category =
    mapping?.category ??
    (parentPath ? canonicalizeIdShort(parentPath) : undefined);

  return {
    canonicalKey,
    semanticId,
    displayLabel,
    value: typedValue,
    category,
    sourceSubmodel,
  };
}

/**
 * Recursively processes submodel elements to extract facts
 */
function processElements(
  elements: SubmodelElement[],
  sourceSubmodel: string,
  facts: Map<string, TechnicalFact>,
  parentPath?: string
): void {
  for (const element of elements) {
    const idShort = element.idShort ?? '';

    // Try to create a fact from this element
    const fact = createFact(element, sourceSubmodel, parentPath);
    if (fact) {
      // Use canonical key to avoid duplicates
      if (!facts.has(fact.canonicalKey)) {
        facts.set(fact.canonicalKey, fact);
      }
    }

    // Recurse into collections
    if (element.modelType === 'SubmodelElementCollection') {
      const collection = element as SubmodelElementCollection;
      if (collection.value) {
        const newPath = parentPath ? `${parentPath}/${idShort}` : idShort;
        processElements(collection.value, sourceSubmodel, facts, newPath);
      }
    }
  }
}

/**
 * Groups facts by category
 */
function groupByCategory(
  facts: Map<string, TechnicalFact>
): Map<string, TechnicalFact[]> {
  const byCategory = new Map<string, TechnicalFact[]>();

  for (const fact of facts.values()) {
    const category = fact.category ?? 'general';
    const existing = byCategory.get(category) ?? [];
    existing.push(fact);
    byCategory.set(category, existing);
  }

  return byCategory;
}

/**
 * Builds TechnicalFacts from an AAS environment
 */
export function buildTechnicalFacts(environment: AASEnvironment): TechnicalFacts {
  const facts = new Map<string, TechnicalFact>();

  for (const submodel of environment.submodels || []) {
    const sourceSubmodel = submodel.idShort || submodel.id || 'unknown';

    if (submodel.submodelElements) {
      processElements(submodel.submodelElements, sourceSubmodel, facts);
    }
  }

  return {
    facts,
    byCategory: groupByCategory(facts),
  };
}
