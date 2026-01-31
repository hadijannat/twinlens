/**
 * useIdResolution Hook
 * React hook for resolving ID Links via the service worker
 */

import { useState, useCallback, useRef } from 'react';
import type {
  ResolutionStatus,
  ResolutionResult,
  ResolutionOptions,
} from '@lib/id-resolution';

interface UseIdResolutionReturn {
  /** Trigger resolution of an ID Link URL */
  resolve: (url: string, options?: ResolutionOptions) => Promise<ResolutionResult>;
  /** Cancel the current resolution */
  cancel: () => void;
  /** Current resolution status */
  status: ResolutionStatus;
  /** Resolution result (if resolved) */
  result: ResolutionResult | null;
  /** Whether resolution is in progress */
  isResolving: boolean;
}

/**
 * Hook for resolving ID Links with cancellation support
 *
 * @example
 * const { resolve, cancel, status, result, isResolving } = useIdResolution();
 *
 * // Trigger resolution
 * const handleResolve = async () => {
 *   try {
 *     const result = await resolve(url);
 *     console.log('Endpoints:', result.endpoints);
 *   } catch (error) {
 *     console.error('Resolution failed:', error);
 *   }
 * };
 *
 * // Cancel if needed
 * const handleCancel = () => cancel();
 */
export function useIdResolution(): UseIdResolutionReturn {
  const [status, setStatus] = useState<ResolutionStatus>('pending');
  const [result, setResult] = useState<ResolutionResult | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const resolve = useCallback(
    async (
      url: string,
      options?: ResolutionOptions
    ): Promise<ResolutionResult> => {
      // Generate unique request ID
      const requestId = crypto.randomUUID();
      requestIdRef.current = requestId;

      setStatus('resolving');
      setResult(null);

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'RESOLVE_ID_LINK',
          url,
          options,
          requestId,
        });

        // Check if this request was superseded by a newer one
        if (requestIdRef.current !== requestId) {
          throw new Error('Request superseded');
        }

        if (response.error) {
          setStatus('failed');
          throw new Error(response.error);
        }

        const resolutionResult = response.result as ResolutionResult;
        setResult(resolutionResult);
        setStatus(resolutionResult.status);

        return resolutionResult;
      } catch (error) {
        // Only update status if this is still the active request
        if (requestIdRef.current === requestId) {
          setStatus('failed');
        }
        throw error;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (requestIdRef.current) {
      chrome.runtime.sendMessage({
        type: 'CANCEL_RESOLUTION',
        requestId: requestIdRef.current,
      });
      setStatus('cancelled');
      requestIdRef.current = null;
    }
  }, []);

  return {
    resolve,
    cancel,
    status,
    result,
    isResolving: status === 'resolving',
  };
}
