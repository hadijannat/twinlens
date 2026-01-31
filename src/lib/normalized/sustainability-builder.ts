/**
 * Sustainability Data Builder
 * Extracts carbon footprint and material composition from AAS environment
 */

import type { AASEnvironment, Submodel } from '@shared/types';
import type { Sustainability, CarbonFootprint } from './types';
import { detectTemplate, TemplateType } from '@lib/templates/detector';
import { extractCarbonFootprintData } from '@lib/templates/extractors/carbon-footprint';
import { normalizeUnit } from './units';

/**
 * Converts existing CarbonFootprintData to normalized CarbonFootprint
 */
function normalizeCarbonFootprint(
  submodel: Submodel
): CarbonFootprint | undefined {
  const data = extractCarbonFootprintData(submodel);

  if (data.pcfTotal === undefined) {
    return undefined;
  }

  // Normalize the CO2 value
  const unit = data.pcfUnit ?? 'kg CO2e';
  const normalized = normalizeUnit(data.pcfTotal, unit);

  const footprint: CarbonFootprint = {
    totalCO2eq: normalized.value,
    unit: normalized.unit,
  };

  if (data.pcfCalculationMethod) {
    footprint.calculationMethod = data.pcfCalculationMethod;
  }

  if (data.pcfLifeCyclePhases && data.pcfLifeCyclePhases.length > 0) {
    footprint.lifeCyclePhases = data.pcfLifeCyclePhases.map((phase) => {
      const normalizedPhase = normalizeUnit(phase.value, phase.unit);
      return {
        phase: phase.phase,
        value: normalizedPhase.value,
        unit: normalizedPhase.unit,
      };
    });
  }

  if (data.publicationDate) {
    footprint.publicationDate = data.publicationDate;
  }

  return footprint;
}

/**
 * Finds the carbon footprint submodel in an environment
 */
function findCarbonFootprintSubmodel(
  environment: AASEnvironment
): Submodel | undefined {
  return environment.submodels?.find(
    (sm) => detectTemplate(sm) === TemplateType.CARBON_FOOTPRINT
  );
}

/**
 * Builds Sustainability data from an AAS environment
 */
export function buildSustainability(environment: AASEnvironment): Sustainability {
  const sustainability: Sustainability = {};

  // Find and process carbon footprint submodel
  const cfSubmodel = findCarbonFootprintSubmodel(environment);
  if (cfSubmodel) {
    sustainability.carbonFootprint = normalizeCarbonFootprint(cfSubmodel);
  }

  // Future: Add material composition extraction when IDTA template is available
  // sustainability.materials = extractMaterials(environment);
  // sustainability.recyclabilityRate = extractRecyclabilityRate(environment);

  return sustainability;
}
