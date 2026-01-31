/**
 * ExportMenu Component
 * Dropdown menu for exporting AAS data in various formats
 */

import { useState, useRef, useEffect } from 'react';
import { Download, Copy, FileJson, Package, Check } from 'lucide-react';
import type { AASEnvironment } from '@shared/types';
import {
  copyToClipboard,
  downloadJson,
  downloadArrayBuffer,
} from '@lib/file-utils';

interface ExportMenuProps {
  environment: AASEnvironment;
  aasxData: ArrayBuffer;
  fileName?: string;
}

type CopyStatus = 'idle' | 'success' | 'error';

export function ExportMenu({
  environment,
  aasxData,
  fileName = 'asset.aasx',
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Reset copy status after delay
  useEffect(() => {
    if (copyStatus !== 'idle') {
      const timer = setTimeout(() => setCopyStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  const handleCopyJson = async () => {
    const json = JSON.stringify(environment, null, 2);
    const success = await copyToClipboard(json);
    setCopyStatus(success ? 'success' : 'error');
    if (success) {
      setIsOpen(false);
    }
  };

  const handleDownloadJson = () => {
    const baseName = fileName.replace(/\.aasx$/i, '');
    downloadJson(environment, `${baseName}.json`);
    setIsOpen(false);
  };

  const handleDownloadAasx = () => {
    downloadArrayBuffer(
      aasxData,
      fileName,
      'application/asset-administration-shell-package'
    );
    setIsOpen(false);
  };

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        className="export-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download size={14} />
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="export-menu-dropdown">
          <button className="export-menu-item" onClick={handleCopyJson}>
            {copyStatus === 'success' ? (
              <Check size={14} className="export-menu-icon success" />
            ) : (
              <Copy size={14} className="export-menu-icon" />
            )}
            <span>
              {copyStatus === 'success' ? 'Copied!' : 'Copy JSON'}
            </span>
          </button>

          <button className="export-menu-item" onClick={handleDownloadJson}>
            <FileJson size={14} className="export-menu-icon" />
            <span>Download JSON</span>
          </button>

          <div className="export-menu-divider" />

          <button className="export-menu-item" onClick={handleDownloadAasx}>
            <Package size={14} className="export-menu-icon" />
            <span>Download AASX</span>
          </button>
        </div>
      )}
    </div>
  );
}
