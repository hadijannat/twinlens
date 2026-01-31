/**
 * Parse Worker
 * Offloads AASX/JSON parsing to a separate thread to prevent UI blocking
 */

import { parseAASData } from '@lib/aasx-parser';
import type { ParseWorkerRequest, ParseWorkerResponse } from '@shared/types';

self.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  const { type, fileData, fileName, validationMode } = event.data;

  if (type !== 'parse') {
    return;
  }

  try {
    const validationOptions = validationMode
      ? { mode: validationMode, maxErrors: 100 }
      : undefined;

    const result = await parseAASData(
      fileData,
      fileName || 'unknown.aasx',
      validationOptions
    );

    const response: ParseWorkerResponse = {
      type: 'success',
      result,
    };

    self.postMessage(response);
  } catch (error) {
    const response: ParseWorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    self.postMessage(response);
  }
};

export {};
