/**
 * Submodel Summarizer
 * Creates concise summaries of submodels for AI context
 */

import type {
  Submodel,
  SubmodelElement,
  Property,
  MultiLanguageProperty,
  SubmodelElementCollection,
} from '@shared/types';
import { TemplateType } from '@lib/templates/types';
import { getPreferredText } from '@lib/templates/types';

interface SubmodelSummaryResult {
  keyProperties: Record<string, string>;
  fullContent?: string;
}

export function summarizeSubmodel(
  submodel: Submodel,
  templateType: TemplateType
): SubmodelSummaryResult {
  const keyProperties: Record<string, string> = {};

  switch (templateType) {
    case TemplateType.NAMEPLATE:
      extractNameplateProperties(submodel, keyProperties);
      break;
    case TemplateType.CARBON_FOOTPRINT:
      extractCarbonFootprintProperties(submodel, keyProperties);
      break;
    case TemplateType.TECHNICAL_DATA:
      extractTechnicalDataProperties(submodel, keyProperties);
      break;
    case TemplateType.HANDOVER_DOCUMENTATION:
      extractHandoverDocsProperties(submodel, keyProperties);
      break;
    default:
      extractGenericProperties(submodel, keyProperties);
  }

  return { keyProperties };
}

function extractPropertyValue(element: SubmodelElement): string | undefined {
  if (element.modelType === 'Property') {
    return (element as Property).value;
  }
  if (element.modelType === 'MultiLanguageProperty') {
    return getPreferredText((element as MultiLanguageProperty).value);
  }
  return undefined;
}

function extractNameplateProperties(
  submodel: Submodel,
  props: Record<string, string>
): void {
  const targets = [
    'ManufacturerName',
    'ManufacturerProductDesignation',
    'SerialNumber',
    'YearOfConstruction',
    'DateOfManufacture',
    'ProductCountryOfOrigin',
  ];

  for (const element of submodel.submodelElements || []) {
    if (targets.includes(element.idShort || '')) {
      const value = extractPropertyValue(element);
      if (value) props[element.idShort!] = value;
    }
  }
}

function extractCarbonFootprintProperties(
  submodel: Submodel,
  props: Record<string, string>
): void {
  for (const element of submodel.submodelElements || []) {
    if (element.modelType === 'SubmodelElementCollection') {
      const collection = element as SubmodelElementCollection;
      if (
        element.idShort?.includes('CarbonFootprint') ||
        element.idShort?.includes('PCF')
      ) {
        for (const child of collection.value || []) {
          if (child.idShort?.includes('CO2') || child.idShort?.includes('Carbon')) {
            const value = extractPropertyValue(child);
            if (value) props[child.idShort!] = value;
          }
        }
      }
    }
  }
}

function extractTechnicalDataProperties(
  submodel: Submodel,
  props: Record<string, string>
): void {
  for (const element of submodel.submodelElements || []) {
    if (
      element.modelType === 'SubmodelElementCollection' &&
      element.idShort === 'GeneralInformation'
    ) {
      const collection = element as SubmodelElementCollection;
      for (const child of collection.value || []) {
        const value = extractPropertyValue(child);
        if (value) props[child.idShort || 'unknown'] = value;
      }
    }
  }
}

function extractHandoverDocsProperties(
  submodel: Submodel,
  props: Record<string, string>
): void {
  let docCount = 0;
  for (const element of submodel.submodelElements || []) {
    if (element.modelType === 'SubmodelElementCollection') {
      docCount++;
    }
  }
  props['DocumentCount'] = String(docCount);
}

function extractGenericProperties(
  submodel: Submodel,
  props: Record<string, string>,
  maxProps = 10
): void {
  let count = 0;
  for (const element of submodel.submodelElements || []) {
    if (count >= maxProps) break;
    const value = extractPropertyValue(element);
    if (value && element.idShort) {
      props[element.idShort] = value;
      count++;
    }
  }
}
