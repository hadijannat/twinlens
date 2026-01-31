/**
 * Main Normalizer
 * Orchestrates transformation of raw AAS data into normalized model
 */

import type { AASEnvironment, Submodel } from '@shared/types';
import type {
  NormalizedAsset,
  AssetIdentity,
  Provenance,
  SourceType,
} from './types';
import { detectTemplate, TemplateType } from '@lib/templates/detector';
import { extractNameplateData } from '@lib/templates/extractors/nameplate';
import { buildTechnicalFacts } from './facts-builder';
import { buildSustainability } from './sustainability-builder';
import { buildDocuments } from './documents-builder';

export interface NormalizationOptions {
  sourceType: SourceType;
  sourceUrl?: string;
  fileName?: string;
  validationErrors?: { path: string; message: string }[];
  validationWarnings?: { path: string; message: string }[];
  thumbnail?: string;
}

/**
 * Finds the nameplate submodel in an environment
 */
function findNameplateSubmodel(
  environment: AASEnvironment
): Submodel | undefined {
  return environment.submodels?.find(
    (sm) => detectTemplate(sm) === TemplateType.NAMEPLATE
  );
}

/**
 * Extracts identity information from nameplate and shell data
 */
function extractIdentity(environment: AASEnvironment): AssetIdentity {
  const shell = environment.assetAdministrationShells[0];
  const asset = shell?.assetInformation;

  const identity: AssetIdentity = {};

  // Get basic identity from shell
  if (asset?.globalAssetId) {
    identity.globalAssetId = asset.globalAssetId;
  }

  if (asset?.assetKind) {
    identity.assetKind = asset.assetKind;
  }

  if (shell?.id) {
    identity.shellId = shell.id;
  }

  if (shell?.idShort) {
    identity.shellIdShort = shell.idShort;
  }

  // Extract from specific asset IDs
  if (asset?.specificAssetIds) {
    for (const specificId of asset.specificAssetIds) {
      const name = specificId.name.toLowerCase();
      const value = specificId.value;

      if (name.includes('serialnumber') || name === 'serial_number') {
        identity.serialNumber = value;
      } else if (name.includes('gtin') || name === 'ean') {
        identity.gtin = value;
      } else if (name.includes('model') && name.includes('id')) {
        identity.modelId = value;
      }
    }
  }

  // Extract from nameplate submodel if available
  const nameplateSubmodel = findNameplateSubmodel(environment);
  if (nameplateSubmodel) {
    const nameplate = extractNameplateData(nameplateSubmodel);

    if (nameplate.manufacturerName) {
      identity.manufacturer = nameplate.manufacturerName;
    }

    if (nameplate.manufacturerProductDesignation) {
      identity.productDesignation = nameplate.manufacturerProductDesignation;
    }

    if (nameplate.serialNumber && !identity.serialNumber) {
      identity.serialNumber = nameplate.serialNumber;
    }
  }

  return identity;
}

/**
 * Generates a display name for the asset
 */
function generateDisplayName(
  identity: AssetIdentity,
  shellIdShort?: string
): string {
  // Priority 1: Product designation
  if (identity.productDesignation) {
    return identity.productDesignation;
  }

  // Priority 2: Manufacturer + Serial Number
  if (identity.manufacturer && identity.serialNumber) {
    return `${identity.manufacturer} ${identity.serialNumber}`;
  }

  // Priority 3: Manufacturer + Model ID
  if (identity.manufacturer && identity.modelId) {
    return `${identity.manufacturer} ${identity.modelId}`;
  }

  // Priority 4: Shell idShort
  if (identity.shellIdShort || shellIdShort) {
    return identity.shellIdShort || shellIdShort || 'Unknown Asset';
  }

  // Priority 5: Manufacturer alone
  if (identity.manufacturer) {
    return identity.manufacturer;
  }

  // Fallback
  return 'Unknown Asset';
}

/**
 * Normalizes an AAS environment into a unified internal model
 */
export function normalizeEnvironment(
  environment: AASEnvironment,
  options: NormalizationOptions
): NormalizedAsset {
  const shell = environment.assetAdministrationShells[0];

  // Extract identity
  const identity = extractIdentity(environment);

  // Build technical facts
  const technicalFacts = buildTechnicalFacts(environment);

  // Build sustainability data
  const sustainability = buildSustainability(environment);

  // Build documents
  const documents = buildDocuments(environment);

  // Build provenance
  const provenance: Provenance = {
    sourceType: options.sourceType,
    sourceUrl: options.sourceUrl,
    fileName: options.fileName,
    fetchedAt: new Date().toISOString(),
    validationResults: {
      valid: (options.validationErrors?.length ?? 0) === 0,
      errorCount: options.validationErrors?.length ?? 0,
      warningCount: options.validationWarnings?.length ?? 0,
    },
  };

  // Generate display name
  const displayName = generateDisplayName(identity, shell?.idShort);

  return {
    identity,
    technicalFacts,
    sustainability,
    documents,
    provenance,
    displayName,
    thumbnail: options.thumbnail,
  };
}
