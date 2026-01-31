/**
 * useAASXParser Hook
 * Manages AASX file parsing state and Web Worker communication
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ParseResult, ParseWorkerRequest, ParseWorkerResponse } from '@shared/types';
import type { ValidationMode } from '@lib/settings';

type ParserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: ParseResult; aasxData: ArrayBuffer; fileName: string }
  | { status: 'error'; error: string };

interface UseAASXParserOptions {
  validationMode?: ValidationMode;
}

interface UseAASXParserReturn {
  state: ParserState;
  parseFile: (file: File) => void;
  parseArrayBuffer: (fileData: ArrayBuffer, fileName: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export function useAASXParser(options: UseAASXParserOptions = {}): UseAASXParserReturn {
  const { validationMode } = options;
  const [state, setState] = useState<ParserState>({ status: 'idle' });
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const startWorker = useCallback(
    (fileData: ArrayBuffer, fileName: string, requestId: number) => {
      // Terminate any existing worker
      workerRef.current?.terminate();

      // Clone the ArrayBuffer before transferring to worker
      // (transfer neuters the original, but we need it for file extraction)
      const aasxDataCopy = fileData.slice(0);

      // Create new worker
      const worker = new Worker(
        new URL('../../workers/parse-worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      const isStale = () => requestId !== requestIdRef.current;
      const cleanup = () => {
        worker.terminate();
        if (workerRef.current === worker) {
          workerRef.current = null;
        }
      };

      worker.onmessage = (event: MessageEvent<ParseWorkerResponse>) => {
        if (isStale()) {
          cleanup();
          return;
        }

        const response = event.data;

        if (response.type === 'success' && response.result) {
          setState({ status: 'success', result: response.result, aasxData: aasxDataCopy, fileName });
        } else {
          setState({
            status: 'error',
            error: response.error ?? 'Unknown error occurred',
          });
        }

        cleanup();
      };

      worker.onerror = (error) => {
        if (isStale()) {
          cleanup();
          return;
        }

        setState({
          status: 'error',
          error: `Worker error: ${error.message}`,
        });
        cleanup();
      };

      const request: ParseWorkerRequest = {
        type: 'parse',
        fileData,
        fileName,
        validationMode,
      };
      worker.postMessage(request, [fileData]);
    },
    [validationMode]
  );

  const parseArrayBuffer = useCallback(
    (fileData: ArrayBuffer, fileName: string) => {
      const requestId = ++requestIdRef.current;
      setState({ status: 'loading' });
      startWorker(fileData, fileName, requestId);
    },
    [startWorker]
  );

  const parseFile = useCallback(
    (file: File) => {
      const requestId = ++requestIdRef.current;

      // Validate file extension - allow .aasx and .json
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext !== 'aasx' && ext !== 'json') {
        workerRef.current?.terminate();
        workerRef.current = null;
        setState({
          status: 'error',
          error: 'Invalid file type. Please select an .aasx or .json file.',
        });
        return;
      }

      setState({ status: 'loading' });

      // Terminate any existing worker
      workerRef.current?.terminate();

      // Read file and send to worker
      const reader = new FileReader();

      reader.onload = () => {
        if (requestId !== requestIdRef.current) return;
        const result = reader.result;
        if (!(result instanceof ArrayBuffer)) {
          setState({
            status: 'error',
            error: 'Failed to read file',
          });
          return;
        }
        startWorker(result, file.name, requestId);
      };

      reader.onerror = () => {
        if (requestId !== requestIdRef.current) return;
        setState({
          status: 'error',
          error: 'Failed to read file',
        });
      };

      reader.readAsArrayBuffer(file);
    },
    [startWorker]
  );

  const setError = useCallback((error: string) => {
    requestIdRef.current += 1;
    workerRef.current?.terminate();
    workerRef.current = null;
    setState({ status: 'error', error });
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    requestIdRef.current += 1;
    setState({ status: 'idle' });
  }, []);

  return { state, parseFile, parseArrayBuffer, setError, reset };
}
