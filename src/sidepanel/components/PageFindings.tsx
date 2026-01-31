/**
 * PageFindings Component
 * Displays DPP/AAS content discovered on the current page
 */

import { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  HelpCircle,
  Circle,
  ExternalLink,
  FileJson,
  Link,
  Tag,
  RefreshCw,
  X,
} from 'lucide-react';

interface DetectionResult {
  type: 'jsonld' | 'link' | 'meta' | 'script' | 'structured';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  url?: string;
  data?: unknown;
}

interface ScanResult {
  url: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  findings: DetectionResult[];
  timestamp: string;
}

interface PageFindingsProps {
  onOpenUrl: (url: string) => void;
  onDismiss: () => void;
}

function getConfidenceIcon(confidence: string, size = 16) {
  switch (confidence) {
    case 'high':
      return <CheckCircle size={size} className="findings-icon high" />;
    case 'medium':
      return <HelpCircle size={size} className="findings-icon medium" />;
    default:
      return <Circle size={size} className="findings-icon low" />;
  }
}

function getTypeIcon(type: string, size = 14) {
  switch (type) {
    case 'jsonld':
      return <FileJson size={size} />;
    case 'link':
      return <Link size={size} />;
    case 'meta':
      return <Tag size={size} />;
    default:
      return <Search size={size} />;
  }
}

export function PageFindings({ onOpenUrl, onDismiss }: PageFindingsProps) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScanResult = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current tab ID
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab?.id) {
        setError('Could not get current tab');
        setIsLoading(false);
        return;
      }

      // Get scan result for this tab
      chrome.runtime.sendMessage(
        { type: 'GET_SCAN_RESULT', tabId: tab.id },
        (result) => {
          if (chrome.runtime.lastError) {
            setError('Could not get scan result');
          } else {
            setScanResult(result);
          }
          setIsLoading(false);
        }
      );
    } catch (err) {
      setError('Failed to load scan result');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScanResult();
  }, []);

  if (isLoading) {
    return (
      <div className="page-findings">
        <div className="page-findings-header">
          <Search size={20} className="page-findings-icon" />
          <span className="page-findings-title">Page Discovery</span>
          <button className="page-findings-close" onClick={onDismiss}>
            <X size={16} />
          </button>
        </div>
        <div className="page-findings-loading">
          <RefreshCw size={20} className="spin" />
          <span>Loading scan results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-findings">
        <div className="page-findings-header">
          <Search size={20} className="page-findings-icon" />
          <span className="page-findings-title">Page Discovery</span>
          <button className="page-findings-close" onClick={onDismiss}>
            <X size={16} />
          </button>
        </div>
        <div className="page-findings-error">{error}</div>
      </div>
    );
  }

  if (!scanResult || scanResult.confidence === 'none') {
    return (
      <div className="page-findings">
        <div className="page-findings-header">
          <Search size={20} className="page-findings-icon" />
          <span className="page-findings-title">Page Discovery</span>
          <button
            className="page-findings-refresh"
            onClick={loadScanResult}
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button className="page-findings-close" onClick={onDismiss}>
            <X size={16} />
          </button>
        </div>
        <div className="page-findings-empty">
          No DPP or AAS content detected on this page.
        </div>
      </div>
    );
  }

  return (
    <div className="page-findings">
      <div className="page-findings-header">
        <Search size={20} className="page-findings-icon" />
        <span className="page-findings-title">Page Discovery</span>
        {getConfidenceIcon(scanResult.confidence)}
        <button
          className="page-findings-refresh"
          onClick={loadScanResult}
          aria-label="Refresh"
        >
          <RefreshCw size={14} />
        </button>
        <button className="page-findings-close" onClick={onDismiss}>
          <X size={16} />
        </button>
      </div>

      <div className="page-findings-content">
        <div className="page-findings-summary">
          <span className={`page-findings-confidence ${scanResult.confidence}`}>
            {scanResult.confidence.charAt(0).toUpperCase() +
              scanResult.confidence.slice(1)}{' '}
            confidence
          </span>
          <span className="page-findings-count">
            {scanResult.findings.length} finding
            {scanResult.findings.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="page-findings-list">
          {scanResult.findings.map((finding, idx) => (
            <div key={idx} className="page-finding-item">
              <div className="page-finding-type">
                {getTypeIcon(finding.type)}
                <span>{finding.type}</span>
              </div>
              <div className="page-finding-desc">{finding.description}</div>
              {finding.url && (
                <button
                  className="page-finding-link"
                  onClick={() => onOpenUrl(finding.url!)}
                >
                  <ExternalLink size={12} />
                  Open
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
