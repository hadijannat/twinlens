/**
 * Compare Store
 * Manages compare cart items in chrome.storage.local
 */

import type { CompareItem, CompareState } from './types';
import { COMPARE_STORAGE_KEY, MAX_COMPARE_ITEMS } from './types';
import type { AASEnvironment } from '@shared/types';

export class CompareStore {
  private maxItems: number;

  constructor(maxItems = MAX_COMPARE_ITEMS) {
    this.maxItems = maxItems;
  }

  /**
   * Generates a unique ID for a compare item
   */
  private generateId(): string {
    return `compare_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets all items from storage
   */
  async getItems(): Promise<CompareItem[]> {
    const result = await chrome.storage.local.get([COMPARE_STORAGE_KEY]);
    const state = result[COMPARE_STORAGE_KEY] as CompareState | undefined;
    return state?.items || [];
  }

  /**
   * Saves items to storage
   */
  private async saveItems(items: CompareItem[]): Promise<void> {
    const state: CompareState = {
      items,
      maxItems: this.maxItems,
    };
    await chrome.storage.local.set({ [COMPARE_STORAGE_KEY]: state });
  }

  /**
   * Adds an item to the compare list
   * Returns the ID of the added item
   */
  async addItem(item: Omit<CompareItem, 'id' | 'timestamp'>): Promise<string> {
    const items = await this.getItems();

    // Enforce max items limit
    if (items.length >= this.maxItems) {
      throw new Error(`Compare cart is full (max ${this.maxItems} items)`);
    }

    const newItem: CompareItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    items.push(newItem);
    await this.saveItems(items);

    return newItem.id;
  }

  /**
   * Removes an item by ID
   */
  async removeItem(id: string): Promise<void> {
    const items = await this.getItems();
    const filtered = items.filter(item => item.id !== id);
    await this.saveItems(filtered);
  }

  /**
   * Clears all items
   */
  async clear(): Promise<void> {
    await chrome.storage.local.remove([COMPARE_STORAGE_KEY]);
  }

  /**
   * Gets a stable identifier for an environment
   * Prefers globalAssetId, falls back to shell.id
   */
  private getEnvironmentId(env: AASEnvironment): string | undefined {
    const shell = env.assetAdministrationShells[0];
    if (!shell) return undefined;
    return shell.assetInformation?.globalAssetId || shell.id;
  }

  /**
   * Checks if an environment is already in the compare list
   * Uses globalAssetId or shell.id as identifier
   */
  async hasItem(env: AASEnvironment): Promise<boolean> {
    const items = await this.getItems();
    const envId = this.getEnvironmentId(env);

    if (!envId) return false;

    return items.some(item => this.getEnvironmentId(item.data) === envId);
  }

  /**
   * Gets the current item count
   */
  async getCount(): Promise<number> {
    const items = await this.getItems();
    return items.length;
  }
}

// Singleton instance
export const compareStore = new CompareStore();
