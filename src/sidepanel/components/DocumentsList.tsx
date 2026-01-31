/**
 * DocumentsList Component
 * Displays list of supplementary files in the AASX package with download/preview
 */

import { useState, useCallback } from 'react';
import {
  FileText,
  Image,
  File,
  FileCode,
  Archive,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  Box,
} from 'lucide-react';
import type { SupplementaryFile } from '@shared/types';
import type { PreviewableType } from '@shared/types';

// Local type to avoid conflict with AAS Blob type
interface PreviewFileData {
  blobUrl: string;
  blob: globalThis.Blob;
  contentType: string;
  fileName: string;
  previewType: PreviewableType;
}
import { useFileExtractor } from '../hooks/useFileExtractor';
import { FilePreview } from './FilePreview';
import {
  canPreview,
  getPreviewType,
  triggerDownload,
  getFilenameFromPath,
  isSafeForPreview,
} from '@lib/file-utils';

interface DocumentsListProps {
  files: SupplementaryFile[];
  aasxData: ArrayBuffer | null;
}

// Safely convert to array
function safeArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) {
    return <Image size={16} />;
  }
  if (contentType.includes('json') || contentType.includes('xml')) {
    return <FileCode size={16} />;
  }
  if (contentType.includes('pdf')) {
    return <FileText size={16} />;
  }
  if (contentType.includes('zip') || contentType.includes('aasx')) {
    return <Archive size={16} />;
  }
  if (
    contentType.includes('gltf') ||
    contentType.includes('glb') ||
    contentType.includes('obj') ||
    contentType.includes('stl')
  ) {
    return <Box size={16} />;
  }
  return <File size={16} />;
}

export function DocumentsList({ files, aasxData }: DocumentsListProps) {
  const fileList = safeArray(files);
  const { extractFile } = useFileExtractor();
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [previewFile, setPreviewFile] = useState<PreviewFileData | null>(null);

  const handleDownload = useCallback(
    async (file: SupplementaryFile) => {
      if (!aasxData) return;

      const path = file.path;
      setLoadingPaths((prev) => new Set(prev).add(path));
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(path);
        return next;
      });

      try {
        const { blobUrl } = await extractFile(aasxData, path, file.contentType);
        triggerDownload(blobUrl, getFilenameFromPath(path));
      } catch (err) {
        setErrors((prev) => {
          const next = new Map(prev);
          next.set(path, err instanceof Error ? err.message : 'Download failed');
          return next;
        });
      } finally {
        setLoadingPaths((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    },
    [aasxData, extractFile]
  );

  const handlePreview = useCallback(
    async (file: SupplementaryFile) => {
      if (!aasxData) return;

      const path = file.path;
      setLoadingPaths((prev) => new Set(prev).add(path));
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(path);
        return next;
      });

      try {
        const { blobUrl, blob } = await extractFile(aasxData, path, file.contentType);
        setPreviewFile({
          blobUrl,
          blob,
          contentType: file.contentType,
          fileName: getFilenameFromPath(path),
          previewType: getPreviewType(file.contentType),
        });
      } catch (err) {
        setErrors((prev) => {
          const next = new Map(prev);
          next.set(path, err instanceof Error ? err.message : 'Preview failed');
          return next;
        });
      } finally {
        setLoadingPaths((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    },
    [aasxData, extractFile]
  );

  const closePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  if (fileList.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <FileText size={32} className="empty-state-icon" />
          <p>No supplementary files</p>
        </div>
      </div>
    );
  }

  const isPreviewable = (contentType: string) =>
    canPreview(contentType) && isSafeForPreview(contentType);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <FileText size={16} />
          <span className="card-title">
            Supplementary Files ({fileList.length})
          </span>
        </div>

        <div className="documents-list">
          {fileList.map((file, index) => {
            const isLoading = loadingPaths.has(file.path);
            const error = errors.get(file.path);
            const showPreview = isPreviewable(file.contentType);

            return (
              <div key={index} className="document-item">
                <span className="icon">{getFileIcon(file.contentType)}</span>
                <div className="document-info">
                  <span className="name" title={file.path}>
                    {file.path.split('/').pop() || file.path}
                  </span>
                  {error && (
                    <span className="document-error">
                      <AlertCircle size={12} />
                      {error}
                    </span>
                  )}
                </div>
                <span className="size">{formatFileSize(file.size)}</span>
                <div className="document-actions">
                  {showPreview && (
                    <button
                      className="document-action-btn"
                      onClick={() => handlePreview(file)}
                      disabled={isLoading || !aasxData}
                      title="Preview"
                      aria-label={`Preview ${file.path.split('/').pop() || 'file'}`}
                    >
                      {isLoading ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                    </button>
                  )}
                  <button
                    className="document-action-btn"
                    onClick={() => handleDownload(file)}
                    disabled={isLoading || !aasxData}
                    title="Download"
                    aria-label={`Download ${file.path.split('/').pop() || 'file'}`}
                  >
                    {isLoading && !showPreview ? (
                      <Loader2 size={14} className="spin" aria-hidden="true" />
                    ) : (
                      <Download size={14} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {previewFile && <FilePreview file={previewFile} onClose={closePreview} />}
    </>
  );
}
