/**
 * Compare Cart Types
 */

import type { AASEnvironment } from '@shared/types';
import type { NormalizedAsset } from '@lib/normalized';

export interface CompareItem {
  id: string;
  name: string;
  timestamp: number;
  thumbnail?: string;
  data: AASEnvironment;
  normalized?: NormalizedAsset;
}

export interface CompareState {
  items: CompareItem[];
  maxItems: number;
}

export const COMPARE_STORAGE_KEY = 'twinlens_compare_items';
export const MAX_COMPARE_ITEMS = 4;
