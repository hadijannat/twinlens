/**
 * ExportMenu Component
 * Dropdown menu for exporting AAS data in various formats
 */

import { useState, useRef, useEffect } from 'react';
import { Download, Copy, FileJson, Package, Check, Save, FileText } from 'lucide-react';
import type { AASEnvironment, SupplementaryFile } from '@shared/types';
import { copyToClipboard, downloadArrayBuffer } from '@lib/file-utils';
import { serializeToJson, buildAasx } from '@lib/aasx-serializer';
import { generatePdfReport } from '@lib/pdf-export';
import { normalizeEnvironment } from '@lib/normalized';
import { executeLinter, getAllRulePacks } from '@lib/linter';

interface ExportMenuProps {
  environment: AASEnvironment;
  aasxData: ArrayBuffer;
  supplementaryFiles?: SupplementaryFile[];
  fileName?: string;
}

type CopyStatus = 'idle' | 'success' | 'error';
type SaveStatus = 'idle' | 'saving' | 'success' | 'error';
type PdfStatus = 'idle' | 'generating' | 'success' | 'error';

export function ExportMenu({
  environment,
  aasxData,
  supplementaryFiles = [],
  fileName = 'asset.aasx',
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>('idle');
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

  // Reset save status after delay
  useEffect(() => {
    if (saveStatus === 'success' || saveStatus === 'error') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Reset PDF status after delay
  useEffect(() => {
    if (pdfStatus === 'success' || pdfStatus === 'error') {
      const timer = setTimeout(() => setPdfStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [pdfStatus]);

  const handleCopyJson = async () => {
    // Use clean aas-core serialization
    const json = serializeToJson(environment, true);
    const success = await copyToClipboard(json);
    setCopyStatus(success ? 'success' : 'error');
    if (success) {
      setIsOpen(false);
    }
  };

  const handleDownloadJson = () => {
    const baseName = fileName.replace(/\.aasx$/i, '');
    // Use clean aas-core serialization
    const json = serializeToJson(environment, true);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleDownloadPdf = async () => {
    setPdfStatus('generating');
    try {
      // Normalize the environment
      const normalizedAsset = normalizeEnvironment(environment, {
        sourceType: 'AASX',
        fileName,
      });

      // Run linter with all rule packs
      const rulePacks = getAllRulePacks();
      const lintResult = executeLinter(environment, rulePacks);

      // Generate PDF
      const result = await generatePdfReport({
        asset: normalizedAsset,
        lintResult,
        fileName,
      });

      // Download blob
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      setPdfStatus('success');
      setIsOpen(false);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setPdfStatus('error');
    }
  };

  const handleDownloadOriginalAasx = () => {
    downloadArrayBuffer(
      aasxData,
      fileName,
      'application/asset-administration-shell-package'
    );
    setIsOpen(false);
  };

  const handleSaveAsAasx = async () => {
    setSaveStatus('saving');

    try {
      const baseName = fileName.replace(/\.aasx$/i, '');
      const newAasxData = await buildAasx(environment, {
        originalAasxData: aasxData,
        supplementaryFiles,
        prettyPrint: true,
      });

      downloadArrayBuffer(
        newAasxData,
        `${baseName}-export.aasx`,
        'application/asset-administration-shell-package'
      );

      setSaveStatus('success');
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to save AASX:', err);
      setSaveStatus('error');
    }
  };

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        className="export-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Export asset data"
      >
        <Download size={14} aria-hidden="true" />
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="export-menu-dropdown" role="menu" aria-label="Export options">
          <button
            className="export-menu-item"
            onClick={handleCopyJson}
            role="menuitem"
            aria-label={copyStatus === 'success' ? 'JSON copied to clipboard' : 'Copy JSON to clipboard'}
          >
            {copyStatus === 'success' ? (
              <Check size={14} className="export-menu-icon success" aria-hidden="true" />
            ) : (
              <Copy size={14} className="export-menu-icon" aria-hidden="true" />
            )}
            <span>
              {copyStatus === 'success' ? 'Copied!' : 'Copy JSON'}
            </span>
          </button>

          <button
            className="export-menu-item"
            onClick={handleDownloadJson}
            role="menuitem"
            aria-label="Download as JSON file"
          >
            <FileJson size={14} className="export-menu-icon" aria-hidden="true" />
            <span>Download JSON</span>
          </button>

          <button
            className="export-menu-item"
            onClick={handleDownloadPdf}
            role="menuitem"
            disabled={pdfStatus === 'generating'}
            aria-label="Download as PDF report"
          >
            {pdfStatus === 'generating' ? (
              <div className="spinner-small" aria-hidden="true" />
            ) : pdfStatus === 'success' ? (
              <Check size={14} className="export-menu-icon success" aria-hidden="true" />
            ) : (
              <FileText size={14} className="export-menu-icon" aria-hidden="true" />
            )}
            <span>
              {pdfStatus === 'generating'
                ? 'Generating...'
                : pdfStatus === 'success'
                  ? 'Downloaded!'
                  : 'Download PDF'}
            </span>
          </button>

          <div className="export-menu-divider" role="separator" />

          <button
            className="export-menu-item"
            onClick={handleSaveAsAasx}
            role="menuitem"
            disabled={saveStatus === 'saving'}
            aria-label="Save as new AASX file with clean serialization"
          >
            {saveStatus === 'saving' ? (
              <div className="spinner-small" aria-hidden="true" />
            ) : saveStatus === 'success' ? (
              <Check size={14} className="export-menu-icon success" aria-hidden="true" />
            ) : (
              <Save size={14} className="export-menu-icon" aria-hidden="true" />
            )}
            <span>
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'success'
                  ? 'Saved!'
                  : 'Save As AASX'}
            </span>
          </button>

          <button
            className="export-menu-item"
            onClick={handleDownloadOriginalAasx}
            role="menuitem"
            aria-label="Download original AASX file"
          >
            <Package size={14} className="export-menu-icon" aria-hidden="true" />
            <span>Download Original</span>
          </button>
        </div>
      )}
    </div>
  );
}
