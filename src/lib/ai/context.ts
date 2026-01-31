/**
 * Context Builder
 * Creates structured context from AAS environment for AI prompts
 */

import type { AASEnvironment, Submodel } from '@shared/types';
import type { AssetContext, SubmodelSummary } from './types';
import { detectTemplate } from '@lib/templates/detector';
import { TemplateType } from '@lib/templates/types';
import { summarizeSubmodel } from './summarize';

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
