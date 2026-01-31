/**
 * RegistryBrowser Component
 * Browse and search AAS shells from connected registries
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, Server, RefreshCw, ExternalLink, Box, AlertCircle } from 'lucide-react';
import type { RegistryConfig, ShellDescriptor, ConnectionStatus } from '@lib/registry/types';
import { createRegistryClient, RegistryClient } from '@lib/registry/client';
import { RegistryError } from '@lib/registry/types';

interface RegistryBrowserProps {
  config: RegistryConfig | null;
  onConnect: () => void;
  onSelectShell: (shell: ShellDescriptor) => void;
}

export function RegistryBrowser({ config, onConnect, onSelectShell }: RegistryBrowserProps) {
  const [client, setClient] = useState<RegistryClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [shells, setShells] = useState<ShellDescriptor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client when config changes
  useEffect(() => {
    if (config) {
      const newClient = createRegistryClient(config);
      setClient(newClient);
      setStatus('connecting');
      setError(null);

      // Test connection
      newClient.testConnection()
        .then((connected) => {
          setStatus(connected ? 'connected' : 'error');
          if (connected) {
            loadShells(newClient);
          } else {
            setError('Failed to connect to registry');
          }
        })
        .catch((err) => {
          setStatus('error');
          setError(err.message);
        });
    } else {
      setClient(null);
      setStatus('disconnected');
      setShells([]);
    }
  }, [config]);

  const loadShells = useCallback(async (registryClient: RegistryClient) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await registryClient.listShells(50);
      setShells(result.shells);
    } catch (err) {
      const message = err instanceof RegistryError ? err.message : 'Failed to load shells';
      setError(message);
      setShells([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (client && status === 'connected') {
      loadShells(client);
    }
  }, [client, status, loadShells]);

  const handleSearch = useCallback(async () => {
    if (!client || !searchQuery.trim()) {
      if (client) {
        loadShells(client);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await client.searchShells(searchQuery.trim());
      setShells(result.shells);
    } catch (err) {
      const message = err instanceof RegistryError ? err.message : 'Search failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [client, searchQuery, loadShells]);

  // Handle Enter key in search
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // No config - show connect prompt
  if (!config) {
    return (
      <div className="registry-browser">
        <div className="registry-empty">
          <Server size={48} className="registry-empty-icon" />
          <h3>No Registry Connected</h3>
          <p>Connect to an AAS Registry to browse available shells</p>
          <button className="registry-connect-btn" onClick={onConnect}>
            <Server size={16} />
            Connect to Registry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="registry-browser">
      {/* Header with connection status */}
      <div className="registry-header">
        <div className="registry-status">
          <span className={`registry-status-dot ${status}`} />
          <span className="registry-status-text">
            {status === 'connected' ? config.name : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        <div className="registry-actions">
          <button
            className="icon-btn"
            onClick={handleRefresh}
            disabled={status !== 'connected' || isLoading}
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          </button>
          <button className="icon-btn" onClick={onConnect} title="Settings">
            <Server size={14} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {status === 'connected' && (
        <div className="registry-search">
          <Search size={14} className="registry-search-icon" />
          <input
            type="text"
            className="registry-search-input"
            placeholder="Search shells..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchQuery && (
            <button
              className="registry-search-clear"
              onClick={() => {
                setSearchQuery('');
                if (client) loadShells(client);
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="registry-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="registry-loading">
          <div className="spinner" />
          <span>Loading shells...</span>
        </div>
      )}

      {/* Shell list */}
      {status === 'connected' && !isLoading && shells.length > 0 && (
        <div className="registry-shell-list">
          {shells.map((shell) => (
            <button
              key={shell.id}
              className="registry-shell-item"
              onClick={() => onSelectShell(shell)}
            >
              <Box size={16} className="registry-shell-icon" />
              <div className="registry-shell-info">
                <span className="registry-shell-name">{shell.idShort || shell.id}</span>
                {shell.description && (
                  <span className="registry-shell-desc">{shell.description}</span>
                )}
                <span className="registry-shell-id">{shell.id}</span>
              </div>
              <ExternalLink size={14} className="registry-shell-arrow" />
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {status === 'connected' && !isLoading && shells.length === 0 && !error && (
        <div className="registry-empty-results">
          <Box size={32} />
          <p>No shells found</p>
        </div>
      )}
    </div>
  );
}
