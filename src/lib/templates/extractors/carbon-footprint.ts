/**
 * Carbon Footprint Data Extractor
 * Extracts PCF data from IDTA 02023-0-9 submodel
 */

import type { Submodel, SubmodelElement, SubmodelElementCollection, Property } from '@shared/types';
import type { CarbonFootprintData } from '../types';

/**
 * Field mappings for Carbon Footprint submodel
 */
const FIELD_MAPPINGS: Record<string, keyof CarbonFootprintData | 'pcfTotal'> = {
  PCFCO2eq: 'pcfTotal',
  PCFTotal: 'pcfTotal',
  PCFCalculationMethod: 'pcfCalculationMethod',
  PCFReferenceValueForCalculation: 'pcfReferenceValueForCalculation',
  PCFQuantityOfMeasureForCalculation: 'pcfQuantityOfMeasureForCalculation',
  PublicationDate: 'publicationDate',
  ExpirationDate: 'expirationDate',
};

/**
 * Extracts numeric value from a Property
 */
function extractNumericValue(element: SubmodelElement): number | undefined {
  if (element.modelType !== 'Property') return undefined;
  const prop = element as Property;
  if (!prop.value) return undefined;
  const num = parseFloat(prop.value);
  return isNaN(num) ? undefined : num;
}

/**
 * Extracts string value from a Property
 */
function extractStringValue(element: SubmodelElement): string | undefined {
  if (element.modelType !== 'Property') return undefined;
  return (element as Property).value;
}

/**
 * Recursively searches for PCF fields in submodel elements
 */
function processElements(elements: SubmodelElement[], data: CarbonFootprintData): void {
  for (const element of elements) {
    const idShort = element.idShort || '';
    const mappedField = FIELD_MAPPINGS[idShort];

    if (mappedField) {
      if (mappedField === 'pcfTotal') {
        // Only pcfTotal is numeric
        const value = extractNumericValue(element);
        if (value !== undefined) {
          (data as Record<string, number>)[mappedField] = value;
        }
      } else {
        // All other fields are strings (including pcfQuantityOfMeasureForCalculation)
        const value = extractStringValue(element);
        if (value) {
          (data as Record<string, string>)[mappedField] = value;
        }
      }
    }

    // Recursively process collections
    if (element.modelType === 'SubmodelElementCollection') {
      const collection = element as SubmodelElementCollection;
      if (collection.value) {
        processElements(collection.value, data);
      }
    }
  }
}

/**
 * Extracts carbon footprint data from a PCF submodel
 */
export function extractCarbonFootprintData(submodel: Submodel): CarbonFootprintData {
  const data: CarbonFootprintData = {};
  const elements = submodel.submodelElements || [];

  processElements(elements, data);

  // Set default unit if we have a total
  if (data.pcfTotal !== undefined && !data.pcfUnit) {
    data.pcfUnit = 'kg CO2e';
  }

  return data;
}
