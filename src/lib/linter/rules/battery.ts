/**
 * EU Battery Regulation Rules
 * Based on Regulation (EU) 2023/1542 Annex XIII
 * Battery Passport Data Requirements
 */

import type { RulePack, LintRule, LintContext } from '../types';
import type { SubmodelElement, Property, MultiLanguageProperty } from '@shared/types';

// Semantic ID patterns for battery-related submodels
const BATTERY_PASSPORT_SEMANTIC_IDS = [
  'https://admin-shell.io/battery',
  'urn:battery',
  'BatteryPassport',
  'DigitalProductPassport',
];

/**
 * Check if this environment contains battery passport data
 */
function hasBatteryData(ctx: LintContext): boolean {
  for (const pattern of BATTERY_PASSPORT_SEMANTIC_IDS) {
    const matches = ctx.findSubmodelsBySemanticId(pattern);
    if (matches.length > 0) return true;
  }

  // Also check for common battery-related idShorts
  const batteryKeywords = ['Battery', 'Cell', 'CarbonFootprint', 'Recyclability'];
  for (const submodel of ctx.environment.submodels) {
    if (batteryKeywords.some((kw) => submodel.idShort?.includes(kw))) {
      return true;
    }
  }

  return false;
}

/**
 * Get element value as string
 */
function getElementValue(element: SubmodelElement | undefined): string | undefined {
  if (!element) return undefined;

  if (element.modelType === 'Property') {
    return (element as Property).value;
  }

  if (element.modelType === 'MultiLanguageProperty') {
    const values = (element as MultiLanguageProperty).value;
    if (values && values.length > 0) {
      // Prefer English, fall back to first available
      const en = values.find((v) => v.language === 'en');
      return en?.text ?? values[0]?.text;
    }
  }

  return undefined;
}

/**
 * Find element in submodel by idShort (recursive search)
 */
function findElementRecursive(
  elements: SubmodelElement[] | undefined,
  idShort: string
): SubmodelElement | undefined {
  if (!elements) return undefined;

  for (const element of elements) {
    if (element.idShort === idShort) return element;

    // Check nested elements
    let children: SubmodelElement[] | undefined;
    if (element.modelType === 'SubmodelElementCollection') {
      children = (element as { value?: SubmodelElement[] }).value;
    } else if (element.modelType === 'SubmodelElementList') {
      children = (element as { value?: SubmodelElement[] }).value;
    } else if (element.modelType === 'Entity') {
      children = (element as { statements?: SubmodelElement[] }).statements;
    }

    if (children) {
      const found = findElementRecursive(children, idShort);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Check if a required field exists in any submodel
 */
function checkRequiredField(
  ctx: LintContext,
  fieldName: string,
  reference: string
): boolean {
  for (const submodel of ctx.environment.submodels) {
    const element = findElementRecursive(submodel.submodelElements, fieldName);
    const value = getElementValue(element);
    if (value && value.trim().length > 0) {
      return true;
    }
  }

  ctx.addIssue({
    severity: 'error',
    message: `Missing required field: ${fieldName}`,
    reference,
    expectedValue: `Non-empty value for ${fieldName}`,
    actualValue: undefined,
  });

  return false;
}

// ============================================================================
// Identification Rules (Annex XIII Part A, Section 1)
// ============================================================================

const manufacturerRule: LintRule = {
  id: 'battery.identification.manufacturer',
  name: 'Manufacturer Name',
  description: 'Battery manufacturer name and contact details must be provided',
  category: 'Identification',
  severity: 'error',
  reference: 'EU Battery Regulation Annex XIII, Section 1.1',
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;
    checkRequiredField(
      ctx,
      'ManufacturerName',
      'EU Battery Regulation Annex XIII, Section 1.1'
    );
  },
};

const batteryModelRule: LintRule = {
  id: 'battery.identification.model',
  name: 'Battery Model',
  description: 'Battery model identifier must be provided',
  category: 'Identification',
  severity: 'error',
  reference: 'EU Battery Regulation Annex XIII, Section 1.2',
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    // Check for any of these common field names
    const modelFields = ['BatteryModel', 'ModelIdentifier', 'ProductModel', 'TypeDesignation'];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of modelFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element && getElementValue(element)) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      ctx.addIssue({
        severity: 'error',
        message: 'Missing battery model identifier',
        reference: 'EU Battery Regulation Annex XIII, Section 1.2',
        expectedValue: 'Battery model identifier',
        actualValue: undefined,
      });
    }
  },
};

const uniqueIdentifierRule: LintRule = {
  id: 'battery.identification.uniqueId',
  name: 'Unique Identifier',
  description: 'Unique battery identifier must be provided',
  category: 'Identification',
  severity: 'error',
  reference: 'EU Battery Regulation Annex XIII, Section 1.3',
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const idFields = ['BatteryUniqueIdentifier', 'UniqueIdentifier', 'SerialNumber', 'GTIN'];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of idFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element && getElementValue(element)) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      ctx.addIssue({
        severity: 'error',
        message: 'Missing unique battery identifier (e.g., serial number, GTIN)',
        reference: 'EU Battery Regulation Annex XIII, Section 1.3',
      });
    }
  },
};

// ============================================================================
// Carbon Footprint Rules (Annex XIII Part A, Section 2)
// ============================================================================

const carbonFootprintRule: LintRule = {
  id: 'battery.carbon.footprint',
  name: 'Carbon Footprint Declaration',
  description: 'Total carbon footprint of the battery must be declared',
  category: 'Carbon Footprint',
  severity: 'warning',
  reference: 'EU Battery Regulation Annex XIII, Section 2.1',
  effectiveDate: '2025-02-18', // Effective for EV batteries from this date
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const carbonFields = [
      'CarbonFootprint',
      'TotalCarbonFootprint',
      'CO2Footprint',
      'LifeCycleCarbonFootprint',
      'PCFTotal',
    ];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of carbonFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element) {
          found = true;

          // Check if value is provided
          const value = getElementValue(element);
          if (!value) {
            ctx.addIssue({
              severity: 'warning',
              message: 'Carbon footprint field exists but has no value',
              path: `${submodel.idShort}/${fieldName}`,
              reference: 'EU Battery Regulation Annex XIII, Section 2.1',
            });
          }
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      ctx.addIssue({
        severity: 'warning',
        message: 'Missing carbon footprint declaration',
        reference: 'EU Battery Regulation Annex XIII, Section 2.1',
        expectedValue: 'Carbon footprint value in kg CO2e per kWh',
      });
    }
  },
};

const carbonFootprintPerformanceClassRule: LintRule = {
  id: 'battery.carbon.performanceClass',
  name: 'Carbon Footprint Performance Class',
  description: 'Carbon footprint performance class label must be provided',
  category: 'Carbon Footprint',
  severity: 'info',
  reference: 'EU Battery Regulation Annex XIII, Section 2.2',
  effectiveDate: '2026-08-18', // Future requirement
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const classFields = [
      'CarbonFootprintPerformanceClass',
      'CFPerformanceClass',
      'PerformanceClass',
    ];

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of classFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element && getElementValue(element)) {
          return; // Found
        }
      }
    }

    ctx.addIssue({
      severity: 'info',
      message: 'Carbon footprint performance class not declared (future requirement)',
      reference: 'EU Battery Regulation Annex XIII, Section 2.2',
      effectiveDate: '2026-08-18',
    });
  },
};

// ============================================================================
// Material Composition Rules (Annex XIII Part A, Section 3)
// ============================================================================

const materialCompositionRule: LintRule = {
  id: 'battery.materials.composition',
  name: 'Material Composition',
  description: 'Battery material composition must be declared',
  category: 'Materials',
  severity: 'warning',
  reference: 'EU Battery Regulation Annex XIII, Section 3',
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const materialFields = [
      'MaterialComposition',
      'BatteryChemistry',
      'CathodeMaterial',
      'AnodeMaterial',
      'Electrolyte',
      'HazardousSubstances',
    ];
    let foundAny = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of materialFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element) {
          foundAny = true;
          break;
        }
      }
      if (foundAny) break;
    }

    if (!foundAny) {
      ctx.addIssue({
        severity: 'warning',
        message: 'Missing battery material composition information',
        reference: 'EU Battery Regulation Annex XIII, Section 3',
      });
    }
  },
};

const recycledContentRule: LintRule = {
  id: 'battery.materials.recycledContent',
  name: 'Recycled Content Share',
  description: 'Share of recycled content must be declared for cobalt, lithium, nickel, and lead',
  category: 'Materials',
  severity: 'info',
  reference: 'EU Battery Regulation Annex XIII, Section 3.2',
  effectiveDate: '2027-08-18', // Future requirement
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const recycledFields = [
      'RecycledContent',
      'RecycledCobalt',
      'RecycledLithium',
      'RecycledNickel',
      'RecycledLead',
    ];
    let foundAny = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of recycledFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element) {
          foundAny = true;
          break;
        }
      }
      if (foundAny) break;
    }

    if (!foundAny) {
      ctx.addIssue({
        severity: 'info',
        message: 'Recycled content share not declared (future requirement)',
        reference: 'EU Battery Regulation Annex XIII, Section 3.2',
        effectiveDate: '2027-08-18',
      });
    }
  },
};

// ============================================================================
// Performance & Durability Rules (Annex XIII Part A, Section 4)
// ============================================================================

const capacityRule: LintRule = {
  id: 'battery.performance.capacity',
  name: 'Rated Capacity',
  description: 'Battery rated capacity must be provided',
  category: 'Performance',
  severity: 'error',
  reference: 'EU Battery Regulation Annex XIII, Section 4.1',
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const capacityFields = [
      'RatedCapacity',
      'NominalCapacity',
      'Capacity',
      'BatteryCapacity',
    ];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of capacityFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        const value = getElementValue(element);
        if (value) {
          found = true;

          // Validate it's a number
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue <= 0) {
            ctx.addIssue({
              severity: 'warning',
              message: 'Capacity value should be a positive number',
              path: `${submodel.idShort}/${fieldName}`,
              actualValue: value,
              expectedValue: 'Positive numeric value',
            });
          }
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      ctx.addIssue({
        severity: 'error',
        message: 'Missing battery rated capacity',
        reference: 'EU Battery Regulation Annex XIII, Section 4.1',
      });
    }
  },
};

const voltageRule: LintRule = {
  id: 'battery.performance.voltage',
  name: 'Nominal Voltage',
  description: 'Battery nominal voltage must be provided',
  category: 'Performance',
  severity: 'error',
  reference: 'EU Battery Regulation Annex XIII, Section 4.2',
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const voltageFields = [
      'NominalVoltage',
      'RatedVoltage',
      'Voltage',
      'MaxVoltage',
      'MinVoltage',
    ];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of voltageFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element && getElementValue(element)) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      ctx.addIssue({
        severity: 'error',
        message: 'Missing battery nominal voltage',
        reference: 'EU Battery Regulation Annex XIII, Section 4.2',
      });
    }
  },
};

const stateOfHealthRule: LintRule = {
  id: 'battery.performance.soh',
  name: 'State of Health',
  description: 'State of health parameters should be available',
  category: 'Performance',
  severity: 'warning',
  reference: 'EU Battery Regulation Annex XIII, Section 4.5',
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const sohFields = [
      'StateOfHealth',
      'SOH',
      'RemainingCapacity',
      'CapacityFade',
      'CycleCount',
    ];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of sohFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      ctx.addIssue({
        severity: 'warning',
        message: 'State of health information not available',
        reference: 'EU Battery Regulation Annex XIII, Section 4.5',
      });
    }
  },
};

// ============================================================================
// End of Life Rules (Annex XIII Part A, Section 5)
// ============================================================================

const dismantlingInfoRule: LintRule = {
  id: 'battery.endoflife.dismantling',
  name: 'Dismantling Information',
  description: 'Information for safe dismantling and recycling must be provided',
  category: 'End of Life',
  severity: 'warning',
  reference: 'EU Battery Regulation Annex XIII, Section 5',
  validate: (ctx) => {
    if (!hasBatteryData(ctx)) return;

    const dismantlingFields = [
      'DismantlingInformation',
      'RecyclingInstructions',
      'EndOfLifeInformation',
      'DisassemblyInstructions',
    ];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of dismantlingFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      ctx.addIssue({
        severity: 'warning',
        message: 'Missing dismantling and recycling information',
        reference: 'EU Battery Regulation Annex XIII, Section 5',
      });
    }
  },
};

// ============================================================================
// Rule Pack Export
// ============================================================================

export const batteryPassportRules: RulePack = {
  id: 'eu-battery-regulation',
  name: 'EU Battery Regulation',
  description:
    'Compliance rules based on EU Battery Regulation (2023/1542) Annex XIII',
  version: '2023/1542',
  rules: [
    // Identification
    manufacturerRule,
    batteryModelRule,
    uniqueIdentifierRule,
    // Carbon Footprint
    carbonFootprintRule,
    carbonFootprintPerformanceClassRule,
    // Materials
    materialCompositionRule,
    recycledContentRule,
    // Performance
    capacityRule,
    voltageRule,
    stateOfHealthRule,
    // End of Life
    dismantlingInfoRule,
  ],
};
