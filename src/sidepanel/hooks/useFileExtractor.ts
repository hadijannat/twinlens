/**
 * useFileExtractor Hook
 * Manages file extraction from AASX with in-memory LRU caching
 */

import { useCallback, useRef, useEffect } from 'react';
import type { ExtractWorkerRequest, ExtractWorkerResponse } from '@shared/types';
import { createBlobUrl, revokeBlobUrl } from '@lib/file-utils';

// Cache limits
const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_CACHE_ENTRIES = 20;

// Local type to avoid conflict with AAS Blob type
interface CachedFileEntry {
  blobUrl: string;
  blob: globalThis.Blob;
  size: number;
  lastAccessed: number;
}

interface ExtractResult {
  blobUrl: string;
  blob: globalThis.Blob;
}

interface UseFileExtractorReturn {
  extractFile: (
    aasxData: ArrayBuffer,
    filePath: string,
    contentType: string
  ) => Promise<ExtractResult>;
  isExtracting: (filePath: string) => boolean;
  clearCache: () => void;
}

export function useFileExtractor(): UseFileExtractorReturn {
  const cacheRef = useRef<Map<string, CachedFileEntry>>(new Map());
  const pendingRef = useRef<Map<string, Promise<ExtractResult>>>(new Map());
  const totalSizeRef = useRef(0);

  // Cleanup all blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const cached of cacheRef.current.values()) {
        revokeBlobUrl(cached.blobUrl);
      }
      cacheRef.current.clear();
      totalSizeRef.current = 0;
    };
  }, []);

  const evictOldest = useCallback(() => {
    const cache = cacheRef.current;

    // Evict until under limits
    while (
      cache.size > 0 &&
      (cache.size >= MAX_CACHE_ENTRIES || totalSizeRef.current > MAX_CACHE_SIZE_BYTES)
    ) {
      // Map iteration order is insertion order; find LRU by lastAccessed
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const entry = cache.get(oldestKey);
        if (entry) {
          revokeBlobUrl(entry.blobUrl);
          totalSizeRef.current -= entry.size;
          cache.delete(oldestKey);
        }
      } else {
        break;
      }
    }
  }, []);

  const extractFile = useCallback(
    async (
      aasxData: ArrayBuffer,
      filePath: string,
      contentType: string
    ): Promise<ExtractResult> => {
      const cache = cacheRef.current;
      const pending = pendingRef.current;

      // Check cache first
      const cached = cache.get(filePath);
      if (cached) {
        // Update last accessed time (LRU)
        cached.lastAccessed = Date.now();
        return { blobUrl: cached.blobUrl, blob: cached.blob };
      }

      // Check if already extracting
      const pendingPromise = pending.get(filePath);
      if (pendingPromise) {
        return pendingPromise;
      }

      // Create extraction promise
      const extractPromise = new Promise<ExtractResult>((resolve, reject) => {
        const worker = new Worker(
          new URL('../../workers/extract-worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<ExtractWorkerResponse>) => {
          worker.terminate();
          pending.delete(filePath);

          const response = event.data;

          if (response.type === 'success' && response.fileData) {
            const blob = new Blob([response.fileData], { type: contentType });
            const blobUrl = createBlobUrl(blob);
            const size = blob.size;

            // Evict if necessary before adding
            totalSizeRef.current += size;
            evictOldest();

            // Add to cache
            cache.set(filePath, {
              blobUrl,
              blob,
              size,
              lastAccessed: Date.now(),
            });

            resolve({ blobUrl, blob });
          } else {
            reject(new Error(response.error ?? 'Extraction failed'));
          }
        };

        worker.onerror = (error) => {
          worker.terminate();
          pending.delete(filePath);
          reject(new Error(`Worker error: ${error.message}`));
        };

        // Clone the ArrayBuffer for the worker (transfer neuters original)
        const dataCopy = aasxData.slice(0);

        const request: ExtractWorkerRequest = {
          type: 'extract',
          aasxData: dataCopy,
          filePath,
        };

        worker.postMessage(request, [dataCopy]);
      });

      pending.set(filePath, extractPromise);

      return extractPromise;
    },
    [evictOldest]
  );

  const isExtracting = useCallback((filePath: string): boolean => {
    return pendingRef.current.has(filePath);
  }, []);

  const clearCache = useCallback(() => {
    for (const cached of cacheRef.current.values()) {
      revokeBlobUrl(cached.blobUrl);
    }
    cacheRef.current.clear();
    totalSizeRef.current = 0;
  }, []);

  return { extractFile, isExtracting, clearCache };
}
