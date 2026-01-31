import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { Dropzone } from './components/Dropzone';
import { AssetIdentity } from './components/AssetIdentity';
import { SubmodelTree } from './components/SubmodelTree';
import { DocumentsList } from './components/DocumentsList';
import { ValidationErrors } from './components/ValidationErrors';
import { RawJsonViewer } from './components/RawJsonViewer';
import { ComplianceView } from './components/ComplianceView';
import { QRScanResult } from './components/QRScanResult';
import { PageFindings } from './components/PageFindings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExportMenu } from './components/ExportMenu';
import { useAASXParser } from './hooks/useAASXParser';
import type { PendingQRImage } from '@shared/types';

type TabId = 'overview' | 'submodels' | 'documents' | 'compliance' | 'raw';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'submodels', label: 'Submodels' },
  { id: 'documents', label: 'Documents' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'raw', label: 'Raw JSON' },
];

function getFileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').pop();
    return name && name.trim().length > 0 ? name : 'download.aasx';
  } catch {
    return 'download.aasx';
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [pendingQR, setPendingQR] = useState<PendingQRImage | null>(null);
  const [showPageFindings, setShowPageFindings] = useState(false);
  const { state, parseFile, parseArrayBuffer, setError, reset } = useAASXParser();

  const handleFileSelect = (file: File) => {
    parseFile(file);
  };

  const handleQROpenUrl = async (url: string) => {
    // Check if it's an AASX file
    if (url.toLowerCase().endsWith('.aasx')) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        parseArrayBuffer(buffer, getFileNameFromUrl(url));
        setPendingQR(null);
      } catch (err) {
        console.error('Failed to load AASX from QR URL', err);
        setError('Failed to load AASX file from QR code link.');
        setPendingQR(null);
      }
    } else {
      // Open external URL in new tab
      window.open(url, '_blank');
      setPendingQR(null);
    }
  };

  const handleQRDismiss = () => {
    setPendingQR(null);
  };

  const handleFindingsOpenUrl = async (url: string) => {
    // Check if it's an AASX file
    if (url.toLowerCase().endsWith('.aasx')) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        parseArrayBuffer(buffer, getFileNameFromUrl(url));
        setShowPageFindings(false);
      } catch (err) {
        console.error('Failed to load AASX from page finding URL', err);
        setError('Failed to load AASX file from link.');
        setShowPageFindings(false);
      }
    } else {
      // Open external URL in new tab
      window.open(url, '_blank');
    }
  };

  const handleFindingsDismiss = () => {
    setShowPageFindings(false);
  };

  // Check for pending AASX URL from context menu
  useEffect(() => {
    let cancelled = false;

    if (!chrome?.runtime?.sendMessage) {
      return () => {
        cancelled = true;
      };
    }

    chrome.runtime.sendMessage({ type: 'GET_PENDING_URL' }, (response) => {
      if (cancelled) return;

      if (chrome.runtime.lastError) {
        console.warn('Failed to retrieve pending URL', chrome.runtime.lastError);
        return;
      }

      const url = response?.url as string | undefined;
      if (!url) return;

      (async () => {
        try {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const buffer = await res.arrayBuffer();
          if (cancelled) return;
          parseArrayBuffer(buffer, getFileNameFromUrl(url));
        } catch (err) {
          console.error('Failed to load AASX from URL', err);
          if (!cancelled) {
            setError('Failed to load AASX file from link.');
          }
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [parseArrayBuffer, setError]);

  // Check for pending QR scan from context menu
  useEffect(() => {
    let cancelled = false;

    if (!chrome?.runtime?.sendMessage) {
      return () => {
        cancelled = true;
      };
    }

    chrome.runtime.sendMessage({ type: 'GET_PENDING_QR' }, (response) => {
      if (cancelled) return;

      if (chrome.runtime.lastError) {
        console.warn('Failed to retrieve pending QR', chrome.runtime.lastError);
        return;
      }

      if (response) {
        setPendingQR(response as PendingQRImage);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const renderContent = () => {
    if (state.status === 'idle') {
      return (
        <>
          <Dropzone onFileSelect={handleFileSelect} />
          {!showPageFindings && (
            <button
              className="scan-page-btn"
              onClick={() => setShowPageFindings(true)}
            >
              Scan this page for DPP content
            </button>
          )}
        </>
      );
    }

    if (state.status === 'loading') {
      return (
        <div className="loading">
          <div className="spinner" />
          <p>Parsing AASX file...</p>
        </div>
      );
    }

    if (state.status === 'error') {
      return (
        <div className="card">
          <ValidationErrors
            errors={[{ path: '', message: state.error }]}
          />
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            Try Another File
          </button>
        </div>
      );
    }

    const { result } = state;

    switch (activeTab) {
      case 'overview':
        return (
          <>
            {result.validationErrors.length > 0 && (
              <ValidationErrors errors={result.validationErrors} />
            )}
            <AssetIdentity
              shells={result.environment.assetAdministrationShells}
              thumbnail={result.thumbnail}
            />
          </>
        );

      case 'submodels':
        return (
          <ErrorBoundary>
            <SubmodelTree submodels={result.environment.submodels} />
          </ErrorBoundary>
        );

      case 'documents':
        return (
          <ErrorBoundary>
            <DocumentsList files={result.supplementaryFiles} aasxData={state.aasxData} />
          </ErrorBoundary>
        );

      case 'compliance':
        return (
          <ErrorBoundary>
            <ComplianceView environment={result.environment} />
          </ErrorBoundary>
        );

      case 'raw':
        return (
          <ErrorBoundary>
            <RawJsonViewer data={result.environment} />
          </ErrorBoundary>
        );

      default:
        return null;
    }
  };

  const showTabs = state.status === 'success';

  return (
    <div className="app">
      <header className="app-header">
        <Eye size={24} color="var(--color-primary)" />
        <h1>TwinLens</h1>
        {state.status === 'success' && (
          <>
            <ExportMenu
              environment={state.result.environment}
              aasxData={state.aasxData}
              fileName={state.fileName}
            />
            <button
              onClick={reset}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                background: 'var(--color-gray-100)',
                color: 'var(--color-gray-600)',
                border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Open New File
            </button>
          </>
        )}
      </header>

      {showTabs && (
        <nav className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      <main className="app-content">
        {pendingQR && (
          <QRScanResult
            pendingQR={pendingQR}
            onOpenUrl={handleQROpenUrl}
            onDismiss={handleQRDismiss}
          />
        )}
        {showPageFindings && (
          <PageFindings
            onOpenUrl={handleFindingsOpenUrl}
            onDismiss={handleFindingsDismiss}
          />
        )}
        {renderContent()}
      </main>
    </div>
  );
}
