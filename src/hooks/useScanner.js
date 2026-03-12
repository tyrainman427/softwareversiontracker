import { useState, useRef, useCallback } from 'react';
import { lookupLatestVersion } from '../utils/aiClient';
import { compareVersions } from '../utils/versionUtils';

const DELAY_MS = 3000;
const RATE_LIMIT_PAUSE_MS = 10000;
const MAX_RETRIES = 5;

// In-house / internally maintained apps — skip version lookup
const EXCLUDED_APPS = new Set([
  // Add app names here (case-insensitive matching)
  // 'MyInternalTool',
  'keepass',
]);

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export function useScanner(parsedData) {
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const abortRef = useRef(null);

  const start = useCallback(async () => {
    if (!parsedData || parsedData.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsScanning(true);
    setProgress(0);
    setResults([]);

    const scannedResults = [];

    for (let i = 0; i < parsedData.length; i++) {
      if (controller.signal.aborted) break;

      const row = { ...parsedData[i] };
      const name = row['Software Name'];
      const installed = row['Version Number'];
      setCurrentItem(name || `Row ${i + 1}`);

      // Skip excluded (in-house) apps
      const isExcluded = [...EXCLUDED_APPS].some(
        excluded => excluded.toLowerCase() === (name || '').toLowerCase()
      );
      if (isExcluded) {
        row._latestVersion = null;
        row._source = null;
        row._status = 'Excluded';
        scannedResults.push(row);
        setResults([...scannedResults]);
        setProgress(i + 1);
        continue;
      }

      let lookupResult = null;
      let retries = 0;

      while (retries <= MAX_RETRIES) {
        try {
          lookupResult = await lookupLatestVersion(name, installed, controller.signal);
          break;
        } catch (err) {
          if (err.name === 'AbortError') break;
          if (err.status === 429 && retries < MAX_RETRIES) {
            retries++;
            try {
              await sleep(RATE_LIMIT_PAUSE_MS, controller.signal);
            } catch { break; }
            continue;
          }
          break;
        }
      }

      if (controller.signal.aborted) break;

      if (lookupResult) {
        row._latestVersion = lookupResult.latestVersion;
        row._source = lookupResult.source;
        row._status = compareVersions(installed, lookupResult.latestVersion);
      } else {
        row._latestVersion = null;
        row._source = null;
        row._status = 'Unknown';
      }

      scannedResults.push(row);
      setResults([...scannedResults]);
      setProgress(i + 1);

      if (i < parsedData.length - 1 && !controller.signal.aborted) {
        try {
          await sleep(DELAY_MS, controller.signal);
        } catch { break; }
      }
    }

    setIsScanning(false);
  }, [parsedData]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsScanning(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResults([]);
    setProgress(0);
    setCurrentItem('');
    setIsScanning(false);
  }, []);

  return { results, progress, total: parsedData?.length || 0, currentItem, isScanning, start, cancel, reset };
}
