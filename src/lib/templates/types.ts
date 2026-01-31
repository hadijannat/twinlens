/**
 * Template Types for IDTA Submodel Rendering
 */

import type { LangStringSet } from '@shared/types';

export enum TemplateType {
  NAMEPLATE = 'nameplate',
  CARBON_FOOTPRINT = 'carbon_footprint',
  TECHNICAL_DATA = 'technical_data',
  HANDOVER_DOCUMENTATION = 'handover_documentation',
  GENERIC = 'generic',
}

/**
 * Digital Nameplate data extracted from IDTA 02006-3-0 template
 */
export interface NameplateData {
  manufacturerName?: string;
  manufacturerProductDesignation?: string;
  manufacturerProductFamily?: string;
  serialNumber?: string;
  batchNumber?: string;
  productCountryOfOrigin?: string;
  yearOfConstruction?: string;
  dateOfManufacture?: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  softwareVersion?: string;
  contactInfo?: ContactInfo;
  markings?: Marking[];
}

export interface ContactInfo {
  companyName?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

export interface Marking {
  name: string;
  file?: string;
  additionalText?: string;
}

/**
 * Carbon Footprint data extracted from IDTA 02023-0-9 template
 */
export interface CarbonFootprintData {
  pcfTotal?: number;
  pcfUnit?: string;
  pcfCalculationMethod?: string;
  pcfReferenceValueForCalculation?: string;
  pcfQuantityOfMeasureForCalculation?: number;
  pcfLifeCyclePhases?: LifeCyclePhase[];
  pcfGoodsAddressHandover?: AddressInfo;
  publicationDate?: string;
  expirationDate?: string;
}

export interface LifeCyclePhase {
  phase: string;
  value: number;
  unit: string;
}

export interface AddressInfo {
  street?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}

/**
 * Multi-language text helper
 */
export function getPreferredText(
  langStrings: LangStringSet[] | undefined,
  preferredLang = 'en'
): string | undefined {
  if (!langStrings || langStrings.length === 0) return undefined;

  // Try preferred language first
  const preferred = langStrings.find((ls) => ls.language === preferredLang);
  if (preferred) return preferred.text;

  // Fall back to first available
  return langStrings[0]?.text;
}
