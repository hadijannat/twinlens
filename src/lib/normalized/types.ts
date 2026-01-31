/**
 * Normalized Asset Model Types
 * Unified internal representation of AAS data for consistent access
 * across all features (compare cart, AI chat, export).
 */

export type SourceType = 'AASX' | 'AAS_REST' | 'JSON_LD' | 'ID_LINK';

export interface Provenance {
  sourceType: SourceType;
  sourceUrl?: string;
  fileName?: string;
  fetchedAt: string;
  validationResults: {
    valid: boolean;
    errorCount: number;
    warningCount: number;
  };
}

export interface AssetIdentity {
  manufacturer?: string;
  productDesignation?: string;
  serialNumber?: string;
  modelId?: string;
  gtin?: string;
  idLinkUrl?: string;
  globalAssetId?: string;
  assetKind?: 'Instance' | 'Type' | 'NotApplicable';
  shellId?: string;
  shellIdShort?: string;
}

export type TypedValue =
  | { type: 'string'; value: string; unit?: string }
  | { type: 'number'; value: number; unit?: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'date'; value: string }
  | { type: 'multilang'; values: { lang: string; text: string }[] };

export interface TechnicalFact {
  canonicalKey: string;
  semanticId?: string;
  displayLabel: string;
  value: TypedValue;
  category?: string;
  sourceSubmodel?: string;
}

export interface TechnicalFacts {
  facts: Map<string, TechnicalFact>;
  byCategory: Map<string, TechnicalFact[]>;
}

export interface CarbonFootprint {
  totalCO2eq?: number;
  unit: string;
  calculationMethod?: string;
  lifeCyclePhases?: { phase: string; value: number; unit: string }[];
  publicationDate?: string;
}

export interface Sustainability {
  carbonFootprint?: CarbonFootprint;
  materials?: { name: string; percentage?: number; recyclable?: boolean }[];
  recyclabilityRate?: number;
}

export type DocumentCategory =
  | 'identification'
  | 'technical_specification'
  | 'drawing'
  | 'manual'
  | 'certificate'
  | 'contract'
  | 'other';

export interface NormalizedDocument {
  id: string;
  title?: string;
  category: DocumentCategory;
  language?: string;
  filePath?: string;
  mimeType?: string;
}

export interface Documents {
  items: NormalizedDocument[];
  byCategory: Map<DocumentCategory, NormalizedDocument[]>;
}

export interface NormalizedAsset {
  identity: AssetIdentity;
  technicalFacts: TechnicalFacts;
  sustainability: Sustainability;
  documents: Documents;
  provenance: Provenance;
  displayName: string;
  thumbnail?: string;
}
