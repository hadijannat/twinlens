import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompareStore } from '../../src/lib/compare/store';
import type { CompareItem } from '../../src/lib/compare/types';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string[]) => Promise.resolve(
        keys.reduce((acc, key) => ({ ...acc, [key]: mockStorage[key] }), {})
      )),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string[]) => {
        keys.forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      }),
    },
  },
});

describe('CompareStore', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  it('adds an item to the compare list', async () => {
    const item: Omit<CompareItem, 'id' | 'timestamp'> = {
      name: 'Test Asset',
      data: { assetAdministrationShells: [], submodels: [] },
    };

    const store = new CompareStore();
    const id = await store.addItem(item);

    expect(id).toBeDefined();
    const items = await store.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe('Test Asset');
  });

  it('removes an item from the compare list', async () => {
    const store = new CompareStore();
    const id = await store.addItem({
      name: 'Test Asset',
      data: { assetAdministrationShells: [], submodels: [] },
    });

    await store.removeItem(id);
    const items = await store.getItems();
    expect(items).toHaveLength(0);
  });

  it('clears all items', async () => {
    const store = new CompareStore();
    await store.addItem({ name: 'Asset 1', data: { assetAdministrationShells: [], submodels: [] } });
    await store.addItem({ name: 'Asset 2', data: { assetAdministrationShells: [], submodels: [] } });

    await store.clear();
    const items = await store.getItems();
    expect(items).toHaveLength(0);
  });
});
