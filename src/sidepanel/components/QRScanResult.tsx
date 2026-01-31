/**
 * QRScanResult Component
 * Displays the result of scanning a QR code and allows navigation
 */

import { useState, useEffect } from 'react';
import {
  QrCode,
  Link,
  Package,
  ExternalLink,
  AlertCircle,
  Loader,
  X,
  Search,
  Globe,
  Database,
  FileJson,
  ChevronRight,
} from 'lucide-react';
import type { PendingQRImage } from '@shared/types';
import { decodeQRFromDataUrl } from '@lib/qr-decoder';
import { resolveIdLink, isValidIdLink, type ResolvedLink } from '@lib/id-resolver';
import type { ResolvedEndpoint, EndpointType } from '@lib/id-resolution';
import { useIdResolution } from '../hooks/useIdResolution';

interface QRScanResultProps {
  pendingQR: PendingQRImage;
  onOpenUrl: (url: string) => void;
  onDismiss: () => void;
}

type ScanState =
  | { status: 'scanning' }
  | { status: 'success'; data: string; resolved: ResolvedLink }
  | { status: 'error'; message: string };

function getLinkIcon(type: string) {
  switch (type) {
    case 'aas':
      return <Package size={20} />;
    case 'passport':
      return <QrCode size={20} />;
    default:
      return <Link size={20} />;
  }
}

function getLinkTypeLabel(type: string): string {
  switch (type) {
    case 'aas':
      return 'AAS Package';
    case 'passport':
      return 'Digital Passport';
    case 'url':
      return 'Web Link';
    default:
      return 'Unknown';
  }
}

function getEndpointIcon(type: EndpointType) {
  switch (type) {
    case 'aasx':
      return <Package size={16} />;
    case 'aas-api':
      return <Database size={16} />;
    case 'submodel-api':
      return <FileJson size={16} />;
    case 'registry':
      return <Database size={16} />;
    case 'dpp-portal':
      return <Globe size={16} />;
    default:
      return <Link size={16} />;
  }
}

function getEndpointTypeLabel(type: EndpointType): string {
  switch (type) {
    case 'aasx':
      return 'AASX Package';
    case 'aas-api':
      return 'AAS API';
    case 'submodel-api':
      return 'Submodel API';
    case 'registry':
      return 'Registry';
    case 'dpp-portal':
      return 'DPP Portal';
    default:
      return 'Endpoint';
  }
}

function getDiscoveryMethodLabel(method: ResolvedEndpoint['discoveryMethod']): string {
  switch (method) {
    case 'direct':
      return 'Direct';
    case 'redirect':
      return 'Redirect';
    case 'well-known':
      return 'Well-known';
    case 'gs1-resolver':
      return 'GS1';
    case 'link-header':
      return 'Link Header';
    default:
      return method;
  }
}

interface EndpointCardProps {
  endpoint: ResolvedEndpoint;
  onOpen: (url: string) => void;
}

function EndpointCard({ endpoint, onOpen }: EndpointCardProps) {
  return (
    <button
      className="qr-scan-endpoint"
      onClick={() => onOpen(endpoint.url)}
      title={endpoint.url}
    >
      <div className="qr-scan-endpoint-icon">
        {getEndpointIcon(endpoint.type)}
      </div>
      <div className="qr-scan-endpoint-info">
        <span className="qr-scan-endpoint-type">
          {getEndpointTypeLabel(endpoint.type)}
        </span>
        <span className="qr-scan-endpoint-url">{endpoint.url}</span>
      </div>
      <div className="qr-scan-endpoint-meta">
        <span className="qr-scan-endpoint-method">
          {getDiscoveryMethodLabel(endpoint.discoveryMethod)}
        </span>
        <span className="qr-scan-endpoint-confidence">
          {Math.round(endpoint.confidence * 100)}%
        </span>
      </div>
      <ChevronRight size={16} className="qr-scan-endpoint-arrow" />
    </button>
  );
}

export function QRScanResult({ pendingQR, onOpenUrl, onDismiss }: QRScanResultProps) {
  const [state, setState] = useState<ScanState>({ status: 'scanning' });
  const { resolve, cancel, status: resolutionStatus, result: resolutionResult, isResolving } = useIdResolution();

  const handleResolveEndpoints = async () => {
    if (state.status === 'success') {
      try {
        await resolve(state.data);
      } catch {
        // Error is handled by the hook
      }
    }
  };

  const handleOpenEndpoint = (url: string) => {
    onOpenUrl(url);
  };

  useEffect(() => {
    async function decodeQR() {
      // Check for error from service worker
      if (pendingQR.error) {
        setState({ status: 'error', message: pendingQR.error });
        return;
      }

      if (!pendingQR.dataUrl) {
        setState({ status: 'error', message: 'No image data available' });
        return;
      }

      // Decode the QR code
      const result = await decodeQRFromDataUrl(pendingQR.dataUrl);

      if (!result.success || !result.data) {
        setState({
          status: 'error',
          message: result.error ?? 'No QR code found in image',
        });
        return;
      }

      // Check if the decoded data is a valid URL
      if (!isValidIdLink(result.data)) {
        setState({
          status: 'error',
          message: 'QR code does not contain a valid URL',
        });
        return;
      }

      // Resolve the link
      const resolved = resolveIdLink(result.data);

      setState({
        status: 'success',
        data: result.data,
        resolved,
      });
    }

    decodeQR();
  }, [pendingQR]);

  const handleOpenUrl = () => {
    if (state.status === 'success') {
      onOpenUrl(state.resolved.url);
    }
  };

  return (
    <div className="qr-scan-result">
      <div className="qr-scan-header">
        <QrCode size={20} className="qr-scan-icon" />
        <span className="qr-scan-title">QR Code Scan</span>
        <button className="qr-scan-close" onClick={onDismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>

      <div className="qr-scan-content">
        {state.status === 'scanning' && (
          <div className="qr-scan-loading">
            <Loader size={24} className="spin" />
            <span>Decoding QR code...</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="qr-scan-error">
            <AlertCircle size={24} />
            <span>{state.message}</span>
          </div>
        )}

        {state.status === 'success' && (
          <>
            <div className="qr-scan-link-type">
              {getLinkIcon(state.resolved.type)}
              <span>{getLinkTypeLabel(state.resolved.type)}</span>
            </div>

            {state.resolved.manufacturer && (
              <div className="qr-scan-meta">
                <span className="qr-scan-label">Manufacturer</span>
                <span className="qr-scan-value">{state.resolved.manufacturer}</span>
              </div>
            )}

            {state.resolved.productType && (
              <div className="qr-scan-meta">
                <span className="qr-scan-label">Product</span>
                <span className="qr-scan-value">{state.resolved.productType}</span>
              </div>
            )}

            {state.resolved.identifier && (
              <div className="qr-scan-meta">
                <span className="qr-scan-label">Identifier</span>
                <span className="qr-scan-value qr-scan-mono">
                  {state.resolved.identifier}
                </span>
              </div>
            )}

            <div className="qr-scan-url">
              <span className="qr-scan-url-text" title={state.data}>
                {state.data}
              </span>
            </div>

            <div className="qr-scan-actions">
              {state.resolved.type === 'aas' ? (
                <button className="qr-scan-btn primary" onClick={handleOpenUrl}>
                  <Package size={16} />
                  Open in TwinLens
                </button>
              ) : (
                <>
                  <button className="qr-scan-btn" onClick={handleOpenUrl}>
                    <ExternalLink size={16} />
                    Open Link
                  </button>
                  {state.resolved.type === 'passport' && (
                    isResolving ? (
                      <button className="qr-scan-btn" onClick={cancel}>
                        <X size={16} />
                        Cancel
                      </button>
                    ) : (
                      <button className="qr-scan-btn" onClick={handleResolveEndpoints}>
                        <Search size={16} />
                        Resolve Endpoints
                      </button>
                    )
                  )}
                </>
              )}
            </div>

            {/* Resolution Results */}
            {resolutionResult && resolutionResult.endpoints.length > 0 && (
              <div className="qr-scan-endpoints">
                <div className="qr-scan-endpoints-header">
                  <span>Discovered Endpoints ({resolutionResult.endpoints.length})</span>
                  {resolutionResult.duration && (
                    <span className="qr-scan-endpoints-time">
                      {resolutionResult.duration}ms
                    </span>
                  )}
                </div>
                <div className="qr-scan-endpoints-list">
                  {resolutionResult.endpoints.map((endpoint, index) => (
                    <EndpointCard
                      key={`${endpoint.url}-${index}`}
                      endpoint={endpoint}
                      onOpen={handleOpenEndpoint}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Failed */}
            {resolutionStatus === 'failed' && resolutionResult?.error && (
              <div className="qr-scan-resolution-error">
                <AlertCircle size={16} />
                <span>{resolutionResult.error}</span>
              </div>
            )}

            {/* No Endpoints Found */}
            {resolutionStatus === 'resolved' && resolutionResult?.endpoints.length === 0 && (
              <div className="qr-scan-no-endpoints">
                <span>No AAS endpoints discovered</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
