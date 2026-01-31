/**
 * Keyboard Shortcuts Hook
 *
 * Centralized keyboard shortcut handling for the side panel.
 * Supports:
 * - Escape: Close modals in order of priority
 * - Cmd/Ctrl+O: Open file picker
 * - Cmd/Ctrl+,: Open options page
 * - Cmd/Ctrl+1-8: Switch between tabs
 */

import { useEffect } from 'react';

type TabId = 'overview' | 'submodels' | 'documents' | 'compliance' | 'raw' | 'compare' | 'chat' | 'registry';

interface Tab {
  id: TabId;
  label: string;
  alwaysShow?: boolean;
}

interface ModalState {
  showAISettings: boolean;
  showRegistryConnector: boolean;
  hasPendingQR: boolean;
  showPageFindings: boolean;
}

interface UseKeyboardShortcutsOptions {
  /** Current modal visibility states */
  modalState: ModalState;
  /** Whether a file is currently loaded */
  hasFile: boolean;
  /** List of available tabs */
  tabs: Tab[];
  /** Ref to file input element for triggering file picker */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Callbacks for closing modals */
  onCloseAISettings: () => void;
  onCloseRegistryConnector: () => void;
  onClosePendingQR: () => void;
  onClosePageFindings: () => void;
  /** Callback for changing active tab */
  onTabChange: (tabId: TabId) => void;
}

/**
 * Hook that registers global keyboard shortcuts.
 *
 * This hook handles all keyboard shortcuts in a single place,
 * ensuring consistent behavior and proper cleanup.
 *
 * @example
 * useKeyboardShortcuts({
 *   modalState: { showAISettings, showRegistryConnector, ... },
 *   hasFile: state.status === 'success',
 *   tabs: TABS,
 *   fileInputRef,
 *   onCloseAISettings: () => setShowAISettings(false),
 *   onCloseRegistryConnector: () => setShowRegistryConnector(false),
 *   onClosePendingQR: () => setPendingQR(null),
 *   onClosePageFindings: () => setShowPageFindings(false),
 *   onTabChange: setActiveTab,
 * });
 */
export function useKeyboardShortcuts({
  modalState,
  hasFile,
  tabs,
  fileInputRef,
  onCloseAISettings,
  onCloseRegistryConnector,
  onClosePendingQR,
  onClosePageFindings,
  onTabChange,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Escape - close modals in priority order
      if (e.key === 'Escape') {
        if (modalState.showAISettings) {
          onCloseAISettings();
          e.preventDefault();
        } else if (modalState.showRegistryConnector) {
          onCloseRegistryConnector();
          e.preventDefault();
        } else if (modalState.hasPendingQR) {
          onClosePendingQR();
          e.preventDefault();
        } else if (modalState.showPageFindings) {
          onClosePageFindings();
          e.preventDefault();
        }
        return;
      }

      if (!isMod) return;

      // Ctrl/Cmd + O - Open file picker
      if (e.key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
        return;
      }

      // Ctrl/Cmd + , - Open options page
      if (e.key === ',') {
        e.preventDefault();
        if (chrome?.runtime?.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
        return;
      }

      // Ctrl/Cmd + 1-8 - Switch tabs
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8) {
        e.preventDefault();
        const visibleTabs = tabs.filter(tab => tab.alwaysShow || hasFile);
        const targetTab = visibleTabs[num - 1];
        if (targetTab) {
          onTabChange(targetTab.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    modalState.showAISettings,
    modalState.showRegistryConnector,
    modalState.hasPendingQR,
    modalState.showPageFindings,
    hasFile,
    tabs,
    fileInputRef,
    onCloseAISettings,
    onCloseRegistryConnector,
    onClosePendingQR,
    onClosePageFindings,
    onTabChange,
  ]);
}
