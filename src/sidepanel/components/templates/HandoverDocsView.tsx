/**
 * HandoverDocsView Component
 * Visual display for Handover Documentation submodel (IDTA 02004 / VDI 2770)
 */

import { FileText, Download, Eye, File, Image, FileCode, Book, Award, FileCheck } from 'lucide-react';
import type { Submodel } from '@shared/types';
import type { HandoverDocsData, DocumentItem, DocumentClass } from '@lib/templates/types';
import { extractHandoverDocs } from '@lib/templates/extractors/handover-docs';

interface HandoverDocsViewProps {
  submodel: Submodel;
  onPreview?: (path: string) => void;
}

/**
 * Get appropriate icon for document based on mime type
 */
function getDocIcon(mimeType?: string) {
  if (!mimeType) return <File size={16} />;
  if (mimeType.includes('pdf')) return <FileText size={16} />;
  if (mimeType.includes('image')) return <Image size={16} />;
  if (mimeType.includes('xml') || mimeType.includes('json')) return <FileCode size={16} />;
  return <File size={16} />;
}

/**
 * Get icon for document class
 */
function getClassIcon(docClass: DocumentClass | string) {
  switch (docClass) {
    case 'Manual':
      return <Book size={14} />;
    case 'Certificate':
      return <Award size={14} />;
    case 'TechnicalSpecification':
      return <FileCheck size={14} />;
    default:
      return <FileText size={14} />;
  }
}

/**
 * Single document card
 */
function DocumentCard({ doc, onPreview }: { doc: DocumentItem; onPreview?: (path: string) => void }) {
  const handleDownload = () => {
    if (doc.digitalFile) {
      // In a Chrome extension context, this would trigger file download
      console.log('Download:', doc.digitalFile);
    }
  };

  return (
    <div className="handover-doc-card">
      <div className="handover-doc-icon">
        {getDocIcon(doc.mimeType)}
      </div>
      <div className="handover-doc-info">
        <span className="handover-doc-title">{doc.title || doc.documentId}</span>
        {doc.subTitle && <span className="handover-doc-subtitle">{doc.subTitle}</span>}
        <div className="handover-doc-meta">
          <span className="handover-doc-class">{doc.documentClass}</span>
          {doc.language && <span className="handover-doc-lang">{doc.language.toUpperCase()}</span>}
          {doc.documentVersion && <span className="handover-doc-version">v{doc.documentVersion}</span>}
        </div>
      </div>
      {doc.digitalFile && (
        <div className="handover-doc-actions">
          {onPreview && (
            <button
              className="icon-btn"
              onClick={() => onPreview(doc.digitalFile!)}
              title="Preview"
            >
              <Eye size={14} />
            </button>
          )}
          <button
            className="icon-btn"
            onClick={handleDownload}
            title="Download"
          >
            <Download size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function HandoverDocsView({ submodel, onPreview }: HandoverDocsViewProps) {
  const data: HandoverDocsData = extractHandoverDocs(submodel);

  if (data.documents.length === 0) {
    return (
      <div className="handover-empty">
        <FileText size={32} className="handover-empty-icon" />
        <p>No documents found in this submodel</p>
      </div>
    );
  }

  // Group documents by class
  const grouped = data.documents.reduce((acc, doc) => {
    const cls = doc.documentClass || 'Other';
    if (!acc[cls]) acc[cls] = [];
    acc[cls].push(doc);
    return acc;
  }, {} as Record<string, DocumentItem[]>);

  // Sort classes for consistent display
  const sortedClasses = Object.keys(grouped).sort((a, b) => {
    const order: Record<string, number> = {
      'Manual': 1,
      'TechnicalSpecification': 2,
      'Certificate': 3,
      'Drawing': 4,
      'Identification': 5,
      'Contract': 6,
      'Other': 99,
    };
    return (order[a] || 50) - (order[b] || 50);
  });

  return (
    <div className="handover-docs-view">
      <div className="handover-summary">
        <FileText size={16} />
        <span>{data.numberOfDocuments} document{data.numberOfDocuments !== 1 ? 's' : ''}</span>
      </div>

      {sortedClasses.map((cls) => {
        const docs = grouped[cls];
        if (!docs) return null;
        return (
          <section key={cls} className="handover-group">
            <h4 className="handover-group-title">
              {getClassIcon(cls)}
              {cls}
              <span className="handover-group-count">{docs.length}</span>
            </h4>
            <div className="handover-doc-list">
              {docs.map((doc, i) => (
                <DocumentCard key={doc.documentId || i} doc={doc} onPreview={onPreview} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
