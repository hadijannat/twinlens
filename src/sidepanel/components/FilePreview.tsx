/**
 * FilePreview Component
 * Modal for previewing images, PDFs, and text files
 */

import { useEffect, useState, useCallback } from 'react';
import { X, ExternalLink, Download, AlertTriangle } from 'lucide-react';
import type { PreviewableType } from '@shared/types';
import { triggerDownload } from '@lib/file-utils';
import { openBlobUrl } from '@lib/safe-navigation';
import { ModelViewer } from './ModelViewer';

// Local type to avoid conflict with AAS Blob type
interface PreviewFileData {
  blobUrl: string;
  blob: globalThis.Blob;
  contentType: string;
  fileName: string;
  previewType: PreviewableType;
}

interface FilePreviewProps {
  file: PreviewFileData;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);

  // Load text content if text file
  useEffect(() => {
    if (file.previewType === 'text') {
      fetch(file.blobUrl)
        .then((res) => res.text())
        .then(setTextContent)
        .catch((err) => setTextError(err.message));
    }
  }, [file.blobUrl, file.previewType]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleDownload = useCallback(() => {
    triggerDownload(file.blobUrl, file.fileName);
  }, [file.blobUrl, file.fileName]);

  const handleOpenInNewTab = useCallback(() => {
    openBlobUrl(file.blobUrl);
  }, [file.blobUrl]);

  const renderContent = () => {
    switch (file.previewType) {
      case 'image':
        return (
          <img
            src={file.blobUrl}
            alt={file.fileName}
            className="preview-image"
          />
        );

      case 'pdf':
        return (
          <div className="preview-pdf-prompt">
            <p>PDF files open in a new browser tab.</p>
            <button
              onClick={handleOpenInNewTab}
              className="preview-action-btn primary"
            >
              <ExternalLink size={16} />
              Open PDF
            </button>
          </div>
        );

      case 'text':
        if (textError) {
          return (
            <div className="preview-error">
              <AlertTriangle size={24} />
              <p>Failed to load file: {textError}</p>
            </div>
          );
        }
        if (textContent === null) {
          return (
            <div className="preview-loading">
              <div className="spinner" />
              <p>Loading...</p>
            </div>
          );
        }
        return <pre className="preview-text">{textContent}</pre>;

      case '3d-model':
        return (
          <ModelViewer
            blobUrl={file.blobUrl}
            filename={file.fileName}
          />
        );

      case 'unsupported':
      default:
        return (
          <div className="preview-unsupported">
            <AlertTriangle size={32} />
            <p>This file type cannot be previewed.</p>
            <p className="preview-hint">
              Download the file to view it with an appropriate application.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="preview-overlay" onClick={handleBackdropClick}>
      <div className="preview-modal">
        <div className="preview-header">
          <span className="preview-filename" title={file.fileName}>
            {file.fileName}
          </span>
          <div className="preview-actions">
            <button
              onClick={handleDownload}
              className="preview-icon-btn"
              title="Download"
              aria-label="Download file"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="preview-icon-btn"
              title="Close"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="preview-content">{renderContent()}</div>
      </div>
    </div>
  );
}
