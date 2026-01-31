/**
 * ModelViewer Component
 * Wrapper for @google/model-viewer web component
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, RotateCw } from 'lucide-react';

// Lazy load model-viewer to reduce initial bundle size
let modelViewerLoaded = false;

interface ModelViewerProps {
  blobUrl: string;
  filename: string;
}

export function ModelViewer({ blobUrl, filename }: ModelViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(modelViewerLoaded);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load model-viewer on first use
  useEffect(() => {
    if (!modelViewerLoaded) {
      import('@google/model-viewer').then(() => {
        modelViewerLoaded = true;
        setReady(true);
      });
    }
  }, []);

  // Handle model-viewer events
  useEffect(() => {
    if (!ready) return;

    const container = containerRef.current;
    if (!container) return;

    const viewer = container.querySelector('model-viewer');
    if (!viewer) return;

    const handleLoad = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setError('Failed to load 3D model');
    };

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [blobUrl, ready]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  if (error) {
    return (
      <div className="model-viewer-error">
        <AlertCircle size={48} />
        <p>{error}</p>
        <button onClick={handleRetry}>
          <RotateCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="model-viewer-container" ref={containerRef}>
      {(loading || !ready) && (
        <div className="model-viewer-loading">
          <Loader2 size={32} className="spin" />
          <p>{ready ? 'Loading 3D model...' : 'Initializing viewer...'}</p>
        </div>
      )}
      {ready && (
        <model-viewer
        src={blobUrl}
        alt={filename}
        camera-controls
        auto-rotate
        shadow-intensity="1"
        loading="eager"
        style={{ width: '100%', height: '100%', opacity: loading ? 0 : 1 }}
      />
      )}
    </div>
  );
}
