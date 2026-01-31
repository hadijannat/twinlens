/**
 * Nameplate Data Extractor
 * Extracts Digital Nameplate fields from IDTA 02006-3-0 submodel
 */

import type { Submodel, SubmodelElement, SubmodelElementCollection, Property, MultiLanguageProperty } from '@shared/types';
import type { NameplateData, ContactInfo, Marking } from '../types';
import { getPreferredText } from '../types';

/**
 * Field mappings from IDTA nameplate idShort to our data model
 */
const FIELD_MAPPINGS: Record<string, keyof NameplateData> = {
  ManufacturerName: 'manufacturerName',
  ManufacturerProductDesignation: 'manufacturerProductDesignation',
  ManufacturerProductFamily: 'manufacturerProductFamily',
  SerialNumber: 'serialNumber',
  BatchNumber: 'batchNumber',
  ProductCountryOfOrigin: 'productCountryOfOrigin',
  YearOfConstruction: 'yearOfConstruction',
  DateOfManufacture: 'dateOfManufacture',
  HardwareVersion: 'hardwareVersion',
  FirmwareVersion: 'firmwareVersion',
  SoftwareVersion: 'softwareVersion',
};

const CONTACT_FIELD_MAPPINGS: Record<string, keyof ContactInfo> = {
  Company: 'companyName',
  CompanyName: 'companyName',
  Street: 'street',
  ZipCode: 'zipCode',
  Zipcode: 'zipCode',
  CityTown: 'city',
  City: 'city',
  NationalCode: 'country',
  Country: 'country',
  Phone: 'phone',
  Telefon: 'phone',
  Fax: 'fax',
  Email: 'email',
  EmailAddress: 'email',
};

/**
 * Extracts string value from Property or MultiLanguageProperty
 */
function extractValue(element: SubmodelElement): string | undefined {
  if (element.modelType === 'Property') {
    return (element as Property).value;
  }
  if (element.modelType === 'MultiLanguageProperty') {
    return getPreferredText((element as MultiLanguageProperty).value);
  }
  return undefined;
}

/**
 * Extracts contact information from ContactInformation collection
 */
function extractContactInfo(collection: SubmodelElementCollection): ContactInfo {
  const info: ContactInfo = {};
  const elements = collection.value || [];

  for (const element of elements) {
    const idShort = element.idShort || '';
    const mappedField = CONTACT_FIELD_MAPPINGS[idShort];

    if (mappedField) {
      const value = extractValue(element);
      if (value) {
        info[mappedField] = value;
      }
    }
  }

  return info;
}

/**
 * Extracts markings from Markings collection
 */
function extractMarkings(collection: SubmodelElementCollection): Marking[] {
  const markings: Marking[] = [];
  const elements = collection.value || [];

  for (const element of elements) {
    if (element.modelType === 'SubmodelElementCollection') {
      const markingCollection = element as SubmodelElementCollection;
      const marking: Marking = {
        name: element.idShort || 'Unknown',
      };

      for (const child of markingCollection.value || []) {
        if (child.modelType === 'File' && child.idShort === 'MarkingFile') {
          marking.file = (child as { value?: string }).value;
        }
        if (child.idShort === 'MarkingAdditionalText') {
          marking.additionalText = extractValue(child);
        }
      }

      markings.push(marking);
    }
  }

  return markings;
}

/**
 * Extracts nameplate data from a Digital Nameplate submodel
 */
export function extractNameplateData(submodel: Submodel): NameplateData {
  const data: NameplateData = {};
  const elements = submodel.submodelElements || [];

  for (const element of elements) {
    const idShort = element.idShort || '';

    // Handle direct field mappings
    const mappedField = FIELD_MAPPINGS[idShort];
    if (mappedField) {
      const value = extractValue(element);
      if (value) {
        (data as Record<string, string>)[mappedField] = value;
      }
      continue;
    }

    // Handle ContactInformation collection
    if (idShort === 'ContactInformation' && element.modelType === 'SubmodelElementCollection') {
      data.contactInfo = extractContactInfo(element as SubmodelElementCollection);
      continue;
    }

    // Handle Markings collection
    if (idShort === 'Markings' && element.modelType === 'SubmodelElementCollection') {
      data.markings = extractMarkings(element as SubmodelElementCollection);
      continue;
    }
  }

  return data;
}
