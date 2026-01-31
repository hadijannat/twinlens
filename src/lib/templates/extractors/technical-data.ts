/**
 * Technical Data Extractor
 * Extracts Technical Data fields from IDTA 02003 submodel
 */

import type { Submodel, SubmodelElement, SubmodelElementCollection, Property, MultiLanguageProperty } from '@shared/types';
import type { TechnicalDataData, TechnicalDataItem } from '../types';
import { getPreferredText } from '../types';

/**
 * Field mappings for GeneralInformation
 */
const GENERAL_INFO_FIELDS: Record<string, keyof NonNullable<TechnicalDataData['generalInformation']>> = {
  ManufacturerName: 'manufacturerName',
  ManufacturerProductDesignation: 'manufacturerProductDesignation',
  ManufacturerOrderCode: 'manufacturerOrderCode',
  ManufacturerProductRoot: 'manufacturerProductRoot',
  ManufacturerProductFamily: 'manufacturerProductFamily',
};

/**
 * Extracts string value from Property or MultiLanguageProperty
 */
function extractProperty(element: SubmodelElement): string | undefined {
  if (element.modelType === 'Property') {
    return (element as Property).value;
  }
  if (element.modelType === 'MultiLanguageProperty') {
    const mlp = element as MultiLanguageProperty;
    return getPreferredText(mlp.value);
  }
  return undefined;
}

/**
 * Extracts GeneralInformation from collection
 */
function extractGeneralInfo(collection: SubmodelElementCollection): TechnicalDataData['generalInformation'] {
  const info: NonNullable<TechnicalDataData['generalInformation']> = {};

  for (const element of collection.value || []) {
    const field = GENERAL_INFO_FIELDS[element.idShort || ''];
    if (field) {
      const value = extractProperty(element);
      if (value) {
        info[field] = value;
      }
    }
  }

  return Object.keys(info).length > 0 ? info : undefined;
}

/**
 * Extracts technical properties from TechnicalProperties collection
 */
function extractTechnicalProperties(collection: SubmodelElementCollection): TechnicalDataItem[] {
  const items: TechnicalDataItem[] = [];

  for (const element of collection.value || []) {
    if (element.modelType === 'Property' || element.modelType === 'MultiLanguageProperty') {
      const value = extractProperty(element);
      if (value) {
        items.push({
          idShort: element.idShort || '',
          value,
          semanticId: element.semanticId?.keys?.[0]?.value,
        });
      }
    } else if (element.modelType === 'SubmodelElementCollection') {
      // Handle nested property collections (common in technical data)
      const nested = element as SubmodelElementCollection;
      for (const child of nested.value || []) {
        if (child.modelType === 'Property' || child.modelType === 'MultiLanguageProperty') {
          const value = extractProperty(child);
          if (value) {
            items.push({
              idShort: child.idShort || '',
              label: element.idShort, // Use parent as label/category
              value,
              semanticId: child.semanticId?.keys?.[0]?.value,
            });
          }
        }
      }
    }
  }

  return items;
}

/**
 * Extracts product classifications from ProductClassifications collection
 */
function extractClassifications(collection: SubmodelElementCollection): TechnicalDataData['productClassifications'] {
  const classifications: NonNullable<TechnicalDataData['productClassifications']> = [];

  for (const element of collection.value || []) {
    if (element.modelType === 'SubmodelElementCollection') {
      const cls = element as SubmodelElementCollection;
      let system = '';
      let classId = '';
      let version = '';

      for (const prop of cls.value || []) {
        const value = extractProperty(prop);
        if (!value) continue;

        if (prop.idShort === 'ProductClassificationSystem') system = value;
        if (prop.idShort === 'ClassificationSystemVersion') version = value;
        if (prop.idShort === 'ProductClassId') classId = value;
      }

      if (system && classId) {
        classifications.push({ system, classId, version: version || undefined });
      }
    }
  }

  return classifications.length > 0 ? classifications : undefined;
}

/**
 * Extracts FurtherInformation from collection
 */
function extractFurtherInfo(collection: SubmodelElementCollection): TechnicalDataData['furtherInformation'] {
  const info: NonNullable<TechnicalDataData['furtherInformation']> = {};
  const textStatements: string[] = [];

  for (const element of collection.value || []) {
    const idShort = element.idShort || '';
    const value = extractProperty(element);

    if (idShort === 'ValidDate' && value) {
      info.validDate = value;
    } else if (idShort.startsWith('TextStatement') && value) {
      textStatements.push(value);
    }
  }

  if (textStatements.length > 0) {
    info.textStatements = textStatements;
  }

  return Object.keys(info).length > 0 ? info : undefined;
}

/**
 * Extracts Technical Data from an IDTA 02003 submodel
 */
export function extractTechnicalData(submodel: Submodel): TechnicalDataData {
  const data: TechnicalDataData = {};

  for (const element of submodel.submodelElements || []) {
    if (element.modelType !== 'SubmodelElementCollection') continue;

    const collection = element as SubmodelElementCollection;
    const idShort = element.idShort || '';

    if (idShort === 'GeneralInformation') {
      data.generalInformation = extractGeneralInfo(collection);
    } else if (idShort === 'TechnicalProperties') {
      data.technicalProperties = extractTechnicalProperties(collection);
    } else if (idShort === 'ProductClassifications') {
      data.productClassifications = extractClassifications(collection);
    } else if (idShort === 'FurtherInformation') {
      data.furtherInformation = extractFurtherInfo(collection);
    }
  }

  return data;
}
