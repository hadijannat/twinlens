/**
 * Semantic ID to Canonical Key Mapping
 * Maps IDTA/ECLASS semantic IDs to normalized property names
 */

export interface SemanticMapping {
  canonicalKey: string;
  displayLabel: string;
  category?: string;
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'multilang';
  unit?: string;
}

/**
 * IDTA Nameplate mappings (IDTA 02006)
 */
const NAMEPLATE_MAPPINGS: Record<string, SemanticMapping> = {
  'https://admin-shell.io/zvei/nameplate/2/0/Nameplate/ManufacturerName': {
    canonicalKey: 'manufacturer_name',
    displayLabel: 'Manufacturer',
    category: 'identity',
    valueType: 'multilang',
  },
  'https://admin-shell.io/zvei/nameplate/2/0/Nameplate/ManufacturerProductDesignation': {
    canonicalKey: 'product_designation',
    displayLabel: 'Product Designation',
    category: 'identity',
    valueType: 'multilang',
  },
  'https://admin-shell.io/zvei/nameplate/2/0/Nameplate/SerialNumber': {
    canonicalKey: 'serial_number',
    displayLabel: 'Serial Number',
    category: 'identity',
    valueType: 'string',
  },
  'https://admin-shell.io/zvei/nameplate/2/0/Nameplate/BatchNumber': {
    canonicalKey: 'batch_number',
    displayLabel: 'Batch Number',
    category: 'identity',
    valueType: 'string',
  },
  'https://admin-shell.io/zvei/nameplate/2/0/Nameplate/YearOfConstruction': {
    canonicalKey: 'year_of_construction',
    displayLabel: 'Year of Construction',
    category: 'identity',
    valueType: 'string',
  },
  'https://admin-shell.io/zvei/nameplate/2/0/Nameplate/DateOfManufacture': {
    canonicalKey: 'date_of_manufacture',
    displayLabel: 'Date of Manufacture',
    category: 'identity',
    valueType: 'date',
  },
  'https://admin-shell.io/zvei/nameplate/2/0/Nameplate/ProductCountryOfOrigin': {
    canonicalKey: 'country_of_origin',
    displayLabel: 'Country of Origin',
    category: 'identity',
    valueType: 'string',
  },
};

/**
 * IDTA Technical Data mappings (IDTA 02003)
 */
const TECHNICAL_DATA_MAPPINGS: Record<string, SemanticMapping> = {
  'https://admin-shell.io/ZVEI/TechnicalData/MaxRotationalSpeed': {
    canonicalKey: 'max_rotational_speed',
    displayLabel: 'Max Rotational Speed',
    category: 'performance',
    valueType: 'number',
    unit: 'rpm',
  },
  'https://admin-shell.io/ZVEI/TechnicalData/NominalVoltage': {
    canonicalKey: 'nominal_voltage',
    displayLabel: 'Nominal Voltage',
    category: 'electrical',
    valueType: 'number',
    unit: 'V',
  },
  'https://admin-shell.io/ZVEI/TechnicalData/NominalCurrent': {
    canonicalKey: 'nominal_current',
    displayLabel: 'Nominal Current',
    category: 'electrical',
    valueType: 'number',
    unit: 'A',
  },
  'https://admin-shell.io/ZVEI/TechnicalData/NominalPower': {
    canonicalKey: 'nominal_power',
    displayLabel: 'Nominal Power',
    category: 'electrical',
    valueType: 'number',
    unit: 'W',
  },
  'https://admin-shell.io/ZVEI/TechnicalData/Weight': {
    canonicalKey: 'weight',
    displayLabel: 'Weight',
    category: 'physical',
    valueType: 'number',
    unit: 'kg',
  },
  'https://admin-shell.io/ZVEI/TechnicalData/Width': {
    canonicalKey: 'width',
    displayLabel: 'Width',
    category: 'dimensions',
    valueType: 'number',
    unit: 'mm',
  },
  'https://admin-shell.io/ZVEI/TechnicalData/Height': {
    canonicalKey: 'height',
    displayLabel: 'Height',
    category: 'dimensions',
    valueType: 'number',
    unit: 'mm',
  },
  'https://admin-shell.io/ZVEI/TechnicalData/Depth': {
    canonicalKey: 'depth',
    displayLabel: 'Depth',
    category: 'dimensions',
    valueType: 'number',
    unit: 'mm',
  },
};

/**
 * IDTA Carbon Footprint mappings (IDTA 02023)
 */
const CARBON_FOOTPRINT_MAPPINGS: Record<string, SemanticMapping> = {
  'https://admin-shell.io/idta/CarbonFootprint/PCFCO2eq': {
    canonicalKey: 'pcf_co2_eq',
    displayLabel: 'PCF CO2 Equivalent',
    category: 'sustainability',
    valueType: 'number',
    unit: 'kg CO2e',
  },
  'https://admin-shell.io/idta/CarbonFootprint/PCFCalculationMethod': {
    canonicalKey: 'pcf_calculation_method',
    displayLabel: 'Calculation Method',
    category: 'sustainability',
    valueType: 'string',
  },
  'https://admin-shell.io/idta/CarbonFootprint/PCFReferenceValueForCalculation': {
    canonicalKey: 'pcf_reference_value',
    displayLabel: 'Reference Value for Calculation',
    category: 'sustainability',
    valueType: 'string',
  },
};

/**
 * Combined semantic mappings
 */
export const SEMANTIC_MAPPINGS = new Map<string, SemanticMapping>([
  ...Object.entries(NAMEPLATE_MAPPINGS),
  ...Object.entries(TECHNICAL_DATA_MAPPINGS),
  ...Object.entries(CARBON_FOOTPRINT_MAPPINGS),
]);

/**
 * Resolves a semantic ID to its canonical mapping
 * Handles version variations by checking partial matches
 */
export function resolveSemanticId(semanticId: string): SemanticMapping | undefined {
  // Try exact match first
  const exact = SEMANTIC_MAPPINGS.get(semanticId);
  if (exact) return exact;

  // Try partial match for versioned IDs
  for (const [key, mapping] of SEMANTIC_MAPPINGS) {
    // Match if the semantic ID starts with the key (handles version suffixes)
    if (semanticId.startsWith(key)) return mapping;
    // Match if the key starts with the semantic ID (handles version prefixes)
    if (key.startsWith(semanticId)) return mapping;
  }

  return undefined;
}

/**
 * Converts an idShort to a canonical key format
 * Transforms CamelCase to snake_case and normalizes
 */
export function canonicalizeIdShort(idShort: string): string {
  return idShort
    // Insert underscore before uppercase letters
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    // Convert to lowercase
    .toLowerCase()
    // Replace non-alphanumeric characters with underscore
    .replace(/[^a-z0-9_]/g, '_')
    // Remove consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_|_$/g, '');
}

/**
 * Generates a display label from an idShort
 * Transforms CamelCase to readable text
 */
export function generateDisplayLabel(idShort: string): string {
  return idShort
    // Insert space before uppercase letters
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter
    .replace(/^./, (str) => str.toUpperCase());
}
