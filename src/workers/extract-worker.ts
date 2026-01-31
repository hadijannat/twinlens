/**
 * Extract Worker
 * Offloads file extraction from AASX packages to a separate thread
 */

import JSZip from 'jszip';
import type { ExtractWorkerRequest, ExtractWorkerResponse } from '@shared/types';

self.onmessage = async (event: MessageEvent<ExtractWorkerRequest>) => {
  const { type, aasxData, filePath } = event.data;

  if (type !== 'extract') {
    return;
  }

  try {
    // Load the AASX (ZIP) package
    const zip = await JSZip.loadAsync(aasxData);

    // Normalize path (remove leading slash if present)
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

    // Find the file
    const file = zip.file(normalizedPath);
    if (!file) {
      throw new Error(`File not found in package: ${filePath}`);
    }

    // Extract file data as ArrayBuffer
    const fileData = await file.async('arraybuffer');

    const response: ExtractWorkerResponse = {
      type: 'success',
      fileData,
    };

    // Transfer the ArrayBuffer for efficiency (zero-copy)
    self.postMessage(response, { transfer: [fileData] });
  } catch (error) {
    const response: ExtractWorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    self.postMessage(response);
  }
};

export {};
