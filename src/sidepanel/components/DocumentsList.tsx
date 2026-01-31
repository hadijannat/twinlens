/**
 * DocumentsList Component
 * Displays list of supplementary files in the AASX package
 */

import { FileText, Image, File, FileCode, Archive } from 'lucide-react';
import type { SupplementaryFile } from '@shared/types';

interface DocumentsListProps {
  files: SupplementaryFile[];
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
  return <File size={16} />;
}

export function DocumentsList({ files }: DocumentsListProps) {
  if (files.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <FileText size={32} className="empty-state-icon" />
          <p>No supplementary files</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <FileText size={16} />
        <span className="card-title">
          Supplementary Files ({files.length})
        </span>
      </div>

      <div className="documents-list">
        {files.map((file, index) => (
          <div key={index} className="document-item">
            <span className="icon">{getFileIcon(file.contentType)}</span>
            <span className="name" title={file.path}>
              {file.path.split('/').pop() || file.path}
            </span>
            <span className="size">{formatFileSize(file.size)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
