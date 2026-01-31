/**
 * RegistryConnector Component
 * Modal for configuring registry connection settings
 */

import { useState, useCallback } from 'react';
import { X, Server, Check, AlertCircle, Loader } from 'lucide-react';
import type { RegistryConfig } from '@lib/registry/types';
import { createRegistryClient } from '@lib/registry/client';

interface RegistryConnectorProps {
  isOpen: boolean;
  currentConfig: RegistryConfig | null;
  onClose: () => void;
  onSave: (config: RegistryConfig) => void;
  onDisconnect: () => void;
}

type RegistryType = RegistryConfig['type'];
type AuthType = NonNullable<RegistryConfig['authType']>;

export function RegistryConnector({
  isOpen,
  currentConfig,
  onClose,
  onSave,
  onDisconnect,
}: RegistryConnectorProps) {
  const [name, setName] = useState(currentConfig?.name || '');
  const [baseUrl, setBaseUrl] = useState(currentConfig?.baseUrl || '');
  const [type, setType] = useState<RegistryType>(currentConfig?.type || 'basyx');
  const [authType, setAuthType] = useState<AuthType>(currentConfig?.authType || 'none');
  const [authToken, setAuthToken] = useState(currentConfig?.authToken || '');
  const [username, setUsername] = useState(currentConfig?.username || '');
  const [password, setPassword] = useState(currentConfig?.password || '');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTest = useCallback(async () => {
    if (!baseUrl.trim()) {
      setTestResult('error');
      setTestError('Please enter a registry URL');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      const testConfig: RegistryConfig = {
        id: 'test',
        name: name || 'Test',
        type,
        baseUrl: baseUrl.trim().replace(/\/$/, ''), // Remove trailing slash
        authType,
        authToken: authType === 'bearer' ? authToken : undefined,
        username: authType === 'basic' ? username : undefined,
        password: authType === 'basic' ? password : undefined,
      };

      const client = createRegistryClient(testConfig);
      const connected = await client.testConnection();

      if (connected) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setTestError('Connection failed');
      }
    } catch (err) {
      setTestResult('error');
      setTestError((err as Error).message);
    } finally {
      setTesting(false);
    }
  }, [baseUrl, name, type, authType, authToken, username, password]);

  const handleSave = useCallback(() => {
    if (!baseUrl.trim()) return;

    const config: RegistryConfig = {
      id: currentConfig?.id || crypto.randomUUID(),
      name: name.trim() || new URL(baseUrl).hostname,
      type,
      baseUrl: baseUrl.trim().replace(/\/$/, ''),
      authType,
      authToken: authType === 'bearer' ? authToken : undefined,
      username: authType === 'basic' ? username : undefined,
      password: authType === 'basic' ? password : undefined,
    };

    onSave(config);
    onClose();
  }, [baseUrl, name, type, authType, authToken, username, password, currentConfig, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content registry-connector" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <Server size={18} />
          <h2>Registry Connection</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Registry Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="My Registry"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Registry URL *</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://registry.example.com/api/v3.0"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <span className="form-hint">Base URL of the AAS Registry API</span>
          </div>

          <div className="form-group">
            <label className="form-label">Registry Type</label>
            <select
              className="form-select"
              value={type}
              onChange={(e) => setType(e.target.value as RegistryType)}
            >
              <option value="basyx">Eclipse BaSyx</option>
              <option value="aasx-server">AASX Server</option>
              <option value="generic">Generic AAS API</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Authentication</label>
            <select
              className="form-select"
              value={authType}
              onChange={(e) => setAuthType(e.target.value as AuthType)}
            >
              <option value="none">None</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
            </select>
          </div>

          {authType === 'bearer' && (
            <div className="form-group">
              <label className="form-label">Bearer Token</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter token..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
              />
            </div>
          )}

          {authType === 'basic' && (
            <>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Test result */}
          {testResult && (
            <div className={`form-message ${testResult}`}>
              {testResult === 'success' ? (
                <>
                  <Check size={14} />
                  <span>Connection successful!</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  <span>{testError || 'Connection failed'}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {currentConfig && (
            <button className="btn btn-danger" onClick={onDisconnect}>
              Disconnect
            </button>
          )}
          <div className="modal-footer-right">
            <button
              className="btn btn-secondary"
              onClick={handleTest}
              disabled={testing || !baseUrl.trim()}
            >
              {testing ? <Loader size={14} className="spin" /> : 'Test'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!baseUrl.trim()}
            >
              {currentConfig ? 'Update' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
