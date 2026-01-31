import { useState, useEffect, useCallback, useRef } from 'react';
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
import { CompareCart } from './components/CompareCart';
import { CompareView } from './components/CompareView';
import { RegistryBrowser } from './components/RegistryBrowser';
import { RegistryConnector } from './components/RegistryConnector';
import { ChatView } from './components/ChatView';
import { AISettingsModal } from './components/AISettingsModal';
import { LocalOnlyBanner } from './components/LocalOnlyBanner';
import { useAASXParser } from './hooks/useAASXParser';
import { useChat } from './hooks/useChat';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { compareStore } from '@lib/compare/store';
import { fetchWithPermission } from '@lib/permissions';
import { getProviderDisplayName } from '@lib/ai/settings';
import { safeOpenUrl } from '@lib/safe-navigation';
import type { PendingQRImage } from '@shared/types';
import type { RegistryConfig, ShellDescriptor } from '@lib/registry/types';
import { createRegistryClient } from '@lib/registry/client';

type TabId = 'overview' | 'submodels' | 'documents' | 'compliance' | 'raw' | 'compare' | 'chat' | 'registry';

interface Tab {
  id: TabId;
  label: string;
  alwaysShow?: boolean;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'submodels', label: 'Submodels' },
  { id: 'documents', label: 'Documents' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'raw', label: 'Raw JSON' },
  { id: 'compare', label: 'Compare' },
  { id: 'chat', label: 'Chat', alwaysShow: true },
  { id: 'registry', label: 'Registry', alwaysShow: true },
];

function getFileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').pop();
    return name && name.trim().length > 0 ? name : 'download.aasx';
  } catch (err) {
    console.debug('extractFilename: Invalid URL, using default:', err);
    return 'download.aasx';
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [pendingQR, setPendingQR] = useState<PendingQRImage | null>(null);
  const [showPageFindings, setShowPageFindings] = useState(false);
  const [compareMode, setCompareMode] = useState<'cart' | 'view'>('cart');
  const [isPinned, setIsPinned] = useState(false);
  const [registryConfig, setRegistryConfig] = useState<RegistryConfig | null>(null);
  const [showRegistryConnector, setShowRegistryConnector] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const appSettings = useSettings();
  const { state, parseFile, parseArrayBuffer, setError, reset } = useAASXParser({
    validationMode: appSettings.general.validationMode,
  });

  // Get environment for chat hook
  const environment = state.status === 'success' ? state.result.environment : null;
  const chat = useChat(environment);

  // Ref for file input (for keyboard shortcut)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    modalState: {
      showAISettings,
      showRegistryConnector,
      hasPendingQR: pendingQR !== null,
      showPageFindings,
    },
    hasFile: state.status === 'success',
    tabs: TABS,
    fileInputRef,
    onCloseAISettings: () => setShowAISettings(false),
    onCloseRegistryConnector: () => setShowRegistryConnector(false),
    onClosePendingQR: () => setPendingQR(null),
    onClosePageFindings: () => setShowPageFindings(false),
    onTabChange: setActiveTab,
  });

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
      safeOpenUrl(url);
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
      safeOpenUrl(url);
    }
  };

  const handleFindingsDismiss = () => {
    setShowPageFindings(false);
  };

  const handlePin = async () => {
    if (state.status !== 'success') return;

    const name = state.result.environment.assetAdministrationShells[0]?.idShort
      || state.fileName
      || 'Unnamed Asset';

    try {
      await compareStore.addItem({
        name,
        thumbnail: state.result.thumbnail,
        data: state.result.environment,
      });
      setIsPinned(true);
    } catch (err) {
      console.error('Failed to pin item:', err);
    }
  };

  const handleRegistryShellSelect = useCallback(async (shell: ShellDescriptor) => {
    if (!registryConfig) return;

    try {
      const client = await createRegistryClient(registryConfig);
      const environment = await client.getShellEnvironment(shell.id);

      // Parse the environment as if it were loaded from a file
      const jsonStr = JSON.stringify(environment);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], `${shell.idShort || shell.id}.json`, { type: 'application/json' });

      parseFile(file);
      setActiveTab('overview');
    } catch (err) {
      console.error('Failed to load shell from registry:', err);
      setError(`Failed to load shell: ${(err as Error).message}`);
    }
  }, [registryConfig, parseFile, setError]);

  // Check if already pinned when loading
  useEffect(() => {
    if (state.status === 'success') {
      compareStore.hasItem(state.result.environment).then(setIsPinned);
    } else {
      setIsPinned(false);
    }
  }, [state]);

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
          const res = await fetchWithPermission(url);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const buffer = await res.arrayBuffer();
          if (cancelled) return;
          parseArrayBuffer(buffer, getFileNameFromUrl(url));
        } catch (err) {
          console.error('Failed to load AASX from URL', err);
          if (!cancelled) {
            const message = err instanceof Error ? err.message : 'Failed to load AASX file from link.';
            setError(message);
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
    // Chat tab is always available
    if (activeTab === 'chat') {
      return (
        <ErrorBoundary>
          <ChatView
            messages={chat.messages}
            context={chat.context}
            isLoading={chat.isLoading}
            isConfigured={chat.isConfigured}
            needsConsent={chat.needsConsent}
            providerName={chat.settings ? getProviderDisplayName(chat.settings.provider) : ''}
            onSendMessage={chat.sendMessage}
            onOpenSettings={() => setShowAISettings(true)}
            onGrantConsent={chat.handleGrantConsent}
          />
        </ErrorBoundary>
      );
    }

    // Registry tab is always available
    if (activeTab === 'registry') {
      return (
        <ErrorBoundary>
          <RegistryBrowser
            config={registryConfig}
            onConnect={() => setShowRegistryConnector(true)}
            onSelectShell={handleRegistryShellSelect}
          />
        </ErrorBoundary>
      );
    }

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
            <ComplianceView environment={result.environment} settings={appSettings.compliance} />
          </ErrorBoundary>
        );

      case 'raw':
        return (
          <ErrorBoundary>
            <RawJsonViewer data={result.environment} />
          </ErrorBoundary>
        );

      case 'compare':
        return (
          <ErrorBoundary>
            {compareMode === 'cart' ? (
              <CompareCart onCompare={() => setCompareMode('view')} />
            ) : (
              <CompareView onBack={() => setCompareMode('cart')} />
            )}
          </ErrorBoundary>
        );

      default:
        return null;
    }
  };

  const hasFile = state.status === 'success';
  const visibleTabs = TABS.filter(tab => tab.alwaysShow || hasFile);

  return (
    <div className="app">
      {appSettings.general.localOnlyMode && <LocalOnlyBanner />}
      {state.status === 'success' && (
        <header className="app-toolbar" aria-label="File actions">
          <div className="app-toolbar-actions">
            <ExportMenu
              environment={state.result.environment}
              aasxData={state.aasxData}
              supplementaryFiles={state.result.supplementaryFiles}
              fileName={state.fileName}
            />
            {!isPinned ? (
              <button
                onClick={handlePin}
                aria-label="Pin current asset to compare cart"
                className="app-toolbar-button"
              >
                Pin to Compare
              </button>
            ) : (
              <span className="app-toolbar-status" aria-live="polite">
                Pinned
              </span>
            )}
            <button
              onClick={reset}
              aria-label="Close current file and open a new one"
              className="app-toolbar-button"
            >
              Open New File
            </button>
          </div>
        </header>
      )}

      {visibleTabs.length > 0 && (
        <nav className="tabs" role="tablist" aria-label="Asset views">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              tabIndex={activeTab === tab.id ? 0 : -1}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      <main
        className="app-content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
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

      <RegistryConnector
        isOpen={showRegistryConnector}
        currentConfig={registryConfig}
        onClose={() => setShowRegistryConnector(false)}
        onSave={setRegistryConfig}
        onDisconnect={() => {
          setRegistryConfig(null);
          setShowRegistryConnector(false);
        }}
      />

      <AISettingsModal
        isOpen={showAISettings}
        settings={chat.settings}
        onClose={() => setShowAISettings(false)}
        onSave={chat.updateSettings}
      />

      {/* Hidden file input for keyboard shortcut */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".aasx,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelect(file);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
