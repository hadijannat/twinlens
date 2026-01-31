/**
 * Context Builder
 * Creates structured context from AAS environment for AI prompts
 */

import type { AASEnvironment, Submodel } from '@shared/types';
import type { AssetContext, SubmodelSummary } from './types';
import { detectTemplate } from '@lib/templates/detector';
import { TemplateType } from '@lib/templates/types';
import { summarizeSubmodel } from './summarize';
import type { NormalizedAsset } from '@lib/normalized';

export function buildAssetContext(environment: AASEnvironment): AssetContext {
  const shell = environment.assetAdministrationShells[0];
  const asset = shell?.assetInformation;

  const submodelSummaries = (environment.submodels || []).map((submodel) =>
    createSubmodelSummary(submodel)
  );

  const contextString = JSON.stringify(submodelSummaries);
  const estimatedTokens = Math.ceil(contextString.length / 4);

  return {
    assetId: asset?.globalAssetId || 'unknown',
    assetIdShort: shell?.idShort,
    assetKind: asset?.assetKind,
    shellId: shell?.id || 'unknown',
    shellIdShort: shell?.idShort,
    submodelSummaries,
    estimatedTokens,
  };
}

function createSubmodelSummary(submodel: Submodel): SubmodelSummary {
  const templateType = detectTemplate(submodel);
  const { keyProperties, fullContent } = summarizeSubmodel(submodel, templateType);

  return {
    id: submodel.id || 'unknown',
    idShort: submodel.idShort || 'unknown',
    semanticId: submodel.semanticId?.keys?.[0]?.value,
    templateType: templateType !== TemplateType.GENERIC ? templateType : undefined,
    keyProperties,
    fullContent,
  };
}

export function formatContextForPrompt(context: AssetContext): string {
  const lines: string[] = [
    '## Asset Information',
    `- Asset ID: ${context.assetId}`,
  ];

  if (context.assetIdShort) lines.push(`- Asset Name: ${context.assetIdShort}`);
  if (context.assetKind) lines.push(`- Asset Kind: ${context.assetKind}`);
  if (context.shellIdShort) lines.push(`- Shell Name: ${context.shellIdShort}`);

  lines.push('', '## Submodels');

  for (const sm of context.submodelSummaries) {
    lines.push(``, `### ${sm.idShort}`);
    if (sm.templateType) lines.push(`Type: ${sm.templateType}`);
    if (sm.semanticId) lines.push(`Semantic ID: ${sm.semanticId}`);
    lines.push('Properties:');
    for (const [key, value] of Object.entries(sm.keyProperties)) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Formats a TypedValue for display in AI context
 */
function formatTypedValue(value: import('@lib/normalized').TypedValue): string {
  switch (value.type) {
    case 'number':
      return value.unit ? `${value.value} ${value.unit}` : String(value.value);
    case 'boolean':
      return value.value ? 'Yes' : 'No';
    case 'multilang':
      // Prefer English, fall back to first available
      const en = value.values.find(v => v.lang === 'en');
      return en?.text ?? value.values[0]?.text ?? '';
    case 'date':
    case 'string':
    default:
      return value.value;
  }
}

/**
 * Formats normalized asset context for AI prompts
 * Uses the normalized model for consistent, well-structured context
 */
export function formatNormalizedContextForPrompt(normalized: NormalizedAsset): string {
  const lines: string[] = ['## Asset Information'];

  // Identity section
  lines.push(`- Name: ${normalized.displayName}`);

  const { identity } = normalized;
  if (identity.manufacturer) lines.push(`- Manufacturer: ${identity.manufacturer}`);
  if (identity.productDesignation) lines.push(`- Product: ${identity.productDesignation}`);
  if (identity.serialNumber) lines.push(`- Serial Number: ${identity.serialNumber}`);
  if (identity.modelId) lines.push(`- Model ID: ${identity.modelId}`);
  if (identity.assetKind) lines.push(`- Asset Kind: ${identity.assetKind}`);
  if (identity.globalAssetId) lines.push(`- Global Asset ID: ${identity.globalAssetId}`);

  // Technical facts by category
  const { technicalFacts } = normalized;
  if (technicalFacts.byCategory.size > 0) {
    lines.push('', '## Technical Properties');

    for (const [category, facts] of technicalFacts.byCategory) {
      lines.push(``, `### ${category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}`);
      for (const fact of facts) {
        const valueStr = formatTypedValue(fact.value);
        lines.push(`- ${fact.displayLabel}: ${valueStr}`);
      }
    }
  }

  // Sustainability
  const { sustainability } = normalized;
  if (sustainability.carbonFootprint) {
    lines.push('', '## Sustainability');
    const cf = sustainability.carbonFootprint;
    if (cf.totalCO2eq !== undefined) {
      lines.push(`- Carbon Footprint: ${cf.totalCO2eq} ${cf.unit}`);
    }
    if (cf.calculationMethod) {
      lines.push(`- Calculation Method: ${cf.calculationMethod}`);
    }
    if (cf.lifeCyclePhases && cf.lifeCyclePhases.length > 0) {
      lines.push('- Life Cycle Phases:');
      for (const phase of cf.lifeCyclePhases) {
        lines.push(`  - ${phase.phase}: ${phase.value} ${phase.unit}`);
      }
    }
  }

  // Documents summary
  const { documents } = normalized;
  if (documents.items.length > 0) {
    lines.push('', '## Documentation');
    lines.push(`Total Documents: ${documents.items.length}`);

    for (const [category, docs] of documents.byCategory) {
      const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
      lines.push(`- ${categoryLabel}: ${docs.length} document(s)`);
    }
  }

  // Provenance
  lines.push('', '## Data Source');
  lines.push(`- Source Type: ${normalized.provenance.sourceType}`);
  if (normalized.provenance.fileName) {
    lines.push(`- File: ${normalized.provenance.fileName}`);
  }
  if (normalized.provenance.sourceUrl) {
    lines.push(`- URL: ${normalized.provenance.sourceUrl}`);
  }
  lines.push(`- Fetched: ${normalized.provenance.fetchedAt}`);
  lines.push(`- Valid: ${normalized.provenance.validationResults.valid ? 'Yes' : 'No'}`);

  return lines.join('\n');
}
