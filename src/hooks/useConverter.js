import { useState, useCallback, useEffect, useRef } from 'react';

function normalizeProgress(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * useConverter - generic async conversion state manager.
 */
export function useConverter(converterFn) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDone, setIsDone] = useState(false);
  const isMountedRef = useRef(true);
  const activeRunIdRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      activeRunIdRef.current += 1;
    };
  }, []);

  const run = useCallback(
    async (...args) => {
      const runId = activeRunIdRef.current + 1;
      activeRunIdRef.current = runId;

      if (isMountedRef.current) {
        setIsProcessing(true);
        setProgress(0);
        setResult(null);
        setError(null);
        setIsDone(false);
      }

      try {
        const output = await converterFn(...args, (prog) => {
          if (!isMountedRef.current || activeRunIdRef.current !== runId) return;
          setProgress(normalizeProgress(prog));
        });

        if (isMountedRef.current && activeRunIdRef.current === runId) {
          setResult(output);
          setIsDone(true);
          setProgress(100);
        }

        return output;
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error('An unexpected error occurred.');
        if (isMountedRef.current && activeRunIdRef.current === runId) {
          setError(normalizedError.message);
        }
        throw normalizedError;
      } finally {
        if (isMountedRef.current && activeRunIdRef.current === runId) {
          setIsProcessing(false);
        }
      }
    },
    [converterFn]
  );

  const reset = useCallback(() => {
    activeRunIdRef.current += 1;
    if (!isMountedRef.current) return;

    setIsProcessing(false);
    setProgress(0);
    setResult(null);
    setError(null);
    setIsDone(false);
  }, []);

  return { run, isProcessing, progress, result, error, isDone, reset };
}
