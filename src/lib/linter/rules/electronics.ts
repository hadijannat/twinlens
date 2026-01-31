/**
 * WEEE Electronics Compliance Rules
 * Based on Directive 2012/19/EU on waste electrical and electronic equipment
 */

import type { RulePack, LintRule, LintContext } from '../types';
import type { SubmodelElement, Property, MultiLanguageProperty } from '@shared/types';
import { registerRulePack } from '../registry';

// Semantic ID patterns for electronics-related submodels
const ELECTRONICS_SEMANTIC_IDS = [
  'https://admin-shell.io/electronics',
  'urn:weee',
  'ElectricalEquipment',
  'ElectronicDevice',
];

// WEEE product categories
const WEEE_CATEGORIES = [
  'Temperature exchange equipment',
  'Screens and monitors',
  'Lamps',
  'Large equipment',
  'Small equipment',
  'Small IT and telecommunication equipment',
];

/**
 * Check if this environment contains electronics data
 */
function hasElectronicsData(ctx: LintContext): boolean {
  for (const pattern of ELECTRONICS_SEMANTIC_IDS) {
    const matches = ctx.findSubmodelsBySemanticId(pattern);
    if (matches.length > 0) return true;
  }

  // Check for electronics-related idShorts
  const electronicsKeywords = ['Electronic', 'Electrical', 'Device', 'Equipment', 'WEEE'];
  for (const submodel of ctx.environment.submodels) {
    if (electronicsKeywords.some((kw) => submodel.idShort?.includes(kw))) {
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

// ============================================================================
// Producer Identification Rules (Article 7)
// ============================================================================

const producerIdentificationRule: LintRule = {
  id: 'weee.producer.identification',
  name: 'Producer Identification',
  description: 'Producer name and registration number must be provided',
  category: 'Producer',
  severity: 'error',
  reference: 'WEEE Directive 2012/19/EU, Article 7',
  validate: (ctx) => {
    if (!hasElectronicsData(ctx)) return;

    const producerFields = ['ProducerName', 'ManufacturerName', 'Producer'];
    let foundProducer = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of producerFields) {
        const element = findElementRecursive(submodel.submodelElements, fieldName);
        if (element && getElementValue(element)) {
          foundProducer = true;
          break;
        }
      }
      if (foundProducer) break;
    }

    if (!foundProducer) {
      ctx.addIssue({
        severity: 'error',
        message: 'Missing producer/manufacturer identification',
        reference: 'WEEE Directive 2012/19/EU, Article 7',
      });
    }
  },
};

const producerRegistrationRule: LintRule = {
  id: 'weee.producer.registration',
  name: 'Producer Registration Number',
  description: 'Producer registration number for WEEE compliance',
  category: 'Producer',
  severity: 'warning',
  reference: 'WEEE Directive 2012/19/EU, Article 16',
  validate: (ctx) => {
    if (!hasElectronicsData(ctx)) return;

    const regFields = ['WEEERegistrationNumber', 'ProducerRegistration', 'RegistrationNumber'];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of regFields) {
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
        severity: 'warning',
        message: 'Missing WEEE producer registration number',
        reference: 'WEEE Directive 2012/19/EU, Article 16',
      });
    }
  },
};

// ============================================================================
// Product Categorization Rules (Annex III)
// ============================================================================

const weeeCategoryRule: LintRule = {
  id: 'weee.category.classification',
  name: 'WEEE Category Classification',
  description: 'Product must be classified according to WEEE categories',
  category: 'Classification',
  severity: 'warning',
  reference: 'WEEE Directive 2012/19/EU, Annex III',
  validate: (ctx) => {
    if (!hasElectronicsData(ctx)) return;

    const categoryFields = ['WEEECategory', 'ProductCategory', 'EquipmentCategory'];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of categoryFields) {
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
        severity: 'warning',
        message: `Missing WEEE category classification. Categories: ${WEEE_CATEGORIES.join(', ')}`,
        reference: 'WEEE Directive 2012/19/EU, Annex III',
      });
    }
  },
};

// ============================================================================
// Material Composition Rules (Article 15)
// ============================================================================

const hazardousSubstancesRule: LintRule = {
  id: 'weee.materials.hazardous',
  name: 'Hazardous Substances Declaration',
  description: 'Declaration of hazardous substances in the product',
  category: 'Materials',
  severity: 'warning',
  reference: 'WEEE Directive 2012/19/EU, Article 15',
  validate: (ctx) => {
    if (!hasElectronicsData(ctx)) return;

    const hazardFields = [
      'HazardousSubstances',
      'RoHSCompliance',
      'RestrictedSubstances',
      'MaterialDeclaration',
    ];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of hazardFields) {
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
        message: 'Missing hazardous substances declaration',
        reference: 'WEEE Directive 2012/19/EU, Article 15',
      });
    }
  },
};

// ============================================================================
// Recyclability & End-of-Life Rules (Article 8)
// ============================================================================

const recyclingInstructionsRule: LintRule = {
  id: 'weee.endoflife.recycling',
  name: 'Recycling Instructions',
  description: 'End-of-life recycling and disposal instructions',
  category: 'End of Life',
  severity: 'warning',
  reference: 'WEEE Directive 2012/19/EU, Article 8',
  validate: (ctx) => {
    if (!hasElectronicsData(ctx)) return;

    const recyclingFields = [
      'RecyclingInstructions',
      'DisposalInstructions',
      'EndOfLifeInformation',
      'WasteManagement',
    ];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of recyclingFields) {
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
        message: 'Missing recycling and disposal instructions',
        reference: 'WEEE Directive 2012/19/EU, Article 8',
      });
    }
  },
};

// ============================================================================
// WEEE Marking Rules (Article 14)
// ============================================================================

const weeeMarkingRule: LintRule = {
  id: 'weee.marking.symbol',
  name: 'WEEE Symbol Marking',
  description: 'Product must display the crossed-out wheeled bin symbol',
  category: 'Marking',
  severity: 'info',
  reference: 'WEEE Directive 2012/19/EU, Article 14 & Annex IX',
  validate: (ctx) => {
    if (!hasElectronicsData(ctx)) return;

    const markingFields = [
      'WEEEMarking',
      'WEEESymbol',
      'CrossedOutBin',
      'DisposalMarking',
    ];
    let found = false;

    for (const submodel of ctx.environment.submodels) {
      for (const fieldName of markingFields) {
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
        severity: 'info',
        message: 'WEEE symbol (crossed-out wheeled bin) marking not declared',
        reference: 'WEEE Directive 2012/19/EU, Article 14 & Annex IX',
      });
    }
  },
};

// ============================================================================
// Rule Pack Export
// ============================================================================

export const electronicsWEEERules: RulePack = {
  id: 'weee-electronics',
  name: 'WEEE Electronics',
  description:
    'Compliance rules based on WEEE Directive 2012/19/EU for electronic waste',
  version: '2012/19/EU',
  rules: [
    // Producer
    producerIdentificationRule,
    producerRegistrationRule,
    // Classification
    weeeCategoryRule,
    // Materials
    hazardousSubstancesRule,
    // End of Life
    recyclingInstructionsRule,
    // Marking
    weeeMarkingRule,
  ],
};

// Auto-register with the registry
registerRulePack(electronicsWEEERules);
