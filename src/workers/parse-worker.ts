/**
 * Parse Worker
 * Offloads AASX parsing to a separate thread to prevent UI blocking
 */

import { parseAASX } from '@lib/aasx-parser';
import type { ParseWorkerRequest, ParseWorkerResponse } from '@shared/types';

self.onmessage = async (event: MessageEvent<ParseWorkerRequest>) => {
  const { type, fileData } = event.data;

  if (type !== 'parse') {
    return;
  }

  try {
    const result = await parseAASX(fileData);

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
