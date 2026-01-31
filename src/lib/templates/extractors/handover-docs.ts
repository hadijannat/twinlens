/**
 * Handover Documentation Extractor
 * Extracts document data from IDTA 02004 / VDI 2770 submodel
 */

import type { Submodel, SubmodelElement, SubmodelElementCollection, Property, FileElement, MultiLanguageProperty } from '@shared/types';
import type { HandoverDocsData, DocumentItem, DocumentClass } from '../types';
import { getPreferredText } from '../types';

/**
 * VDI 2770 document class mapping
 * Maps class IDs to human-readable document classes
 */
const DOC_CLASS_MAP: Record<string, DocumentClass> = {
  '02-01': 'Identification',
  '02-02': 'TechnicalSpecification',
  '02-03': 'Drawing',
  '03-01': 'Manual',
  '03-02': 'Manual',
  '03-03': 'Manual',
  '04-01': 'Certificate',
  '04-02': 'Certificate',
  '05-01': 'Contract',
  '05-02': 'Contract',
};

/**
 * Extracts string value from Property or MultiLanguageProperty
 */
function extractValue(element: SubmodelElement): string | undefined {
  if (element.modelType === 'Property') {
    return (element as Property).value;
  }
  if (element.modelType === 'MultiLanguageProperty') {
    return getPreferredText((element as MultiLanguageProperty).value);
  }
  return undefined;
}

/**
 * Extracts a single document from a SubmodelElementCollection
 */
function extractDocumentItem(collection: SubmodelElementCollection): DocumentItem | null {
  const doc: Partial<DocumentItem> = {};

  for (const element of collection.value || []) {
    const idShort = element.idShort || '';

    if (element.modelType === 'Property' || element.modelType === 'MultiLanguageProperty') {
      const value = extractValue(element);
      if (!value) continue;

      switch (idShort) {
        case 'DocumentId':
        case 'DocumentID':
          doc.documentId = value;
          break;
        case 'DocumentClassId':
        case 'DocumentClassID':
          doc.documentClassId = value;
          doc.documentClass = DOC_CLASS_MAP[value] || 'Other';
          break;
        case 'DocumentClassName':
          if (!doc.documentClass || doc.documentClass === 'Other') {
            doc.documentClass = value;
          }
          break;
        case 'DocumentVersion':
        case 'DocumentVersionId':
          doc.documentVersion = value;
          break;
        case 'Title':
        case 'DocumentTitle':
          doc.title = value;
          break;
        case 'SubTitle':
        case 'DocumentSubTitle':
          doc.subTitle = value;
          break;
        case 'Language':
        case 'LanguageCode':
          doc.language = value;
          break;
      }
    }

    if (element.modelType === 'File') {
      const file = element as FileElement;
      const fileIdShort = idShort.toLowerCase();

      if (fileIdShort.includes('digital') || fileIdShort.includes('file') || fileIdShort === 'digitalfile') {
        doc.digitalFile = file.value;
        doc.mimeType = file.contentType;
      } else if (fileIdShort.includes('preview') || fileIdShort.includes('thumbnail')) {
        doc.previewImage = file.value;
      }
    }

    // Handle nested DocumentVersion collection (common in VDI 2770)
    if (element.modelType === 'SubmodelElementCollection') {
      const nested = element as SubmodelElementCollection;
      const nestedIdShort = idShort.toLowerCase();

      if (nestedIdShort.includes('version') || nestedIdShort.includes('digitalfile')) {
        for (const child of nested.value || []) {
          if (child.modelType === 'File') {
            const file = child as FileElement;
            if (!doc.digitalFile) {
              doc.digitalFile = file.value;
              doc.mimeType = file.contentType;
            }
          }
          if (child.modelType === 'Property' || child.modelType === 'MultiLanguageProperty') {
            const value = extractValue(child);
            if (value && child.idShort?.toLowerCase().includes('language')) {
              doc.language = value;
            }
            if (value && child.idShort?.toLowerCase().includes('title')) {
              doc.title = doc.title || value;
            }
          }
        }
      }
    }
  }

  // Must have at least a document ID or file reference
  if (!doc.documentId && !doc.digitalFile) {
    return null;
  }

  // Generate ID from file path if missing
  if (!doc.documentId && doc.digitalFile) {
    const fileName = doc.digitalFile.split('/').pop() || doc.digitalFile;
    doc.documentId = fileName;
  }

  // Default document class
  if (!doc.documentClass) {
    doc.documentClass = 'Other';
  }

  return doc as DocumentItem;
}

/**
 * Recursively searches for document collections
 */
function findDocuments(elements: SubmodelElement[]): DocumentItem[] {
  const documents: DocumentItem[] = [];

  for (const element of elements) {
    if (element.modelType !== 'SubmodelElementCollection') continue;

    const collection = element as SubmodelElementCollection;
    const idShort = (element.idShort || '').toLowerCase();

    // Check if this is a Documents container
    if (idShort === 'documents' || idShort === 'documentlist') {
      // Look for document entries inside
      for (const child of collection.value || []) {
        if (child.modelType === 'SubmodelElementCollection') {
          const doc = extractDocumentItem(child as SubmodelElementCollection);
          if (doc) documents.push(doc);
        }
      }
    } else if (idShort.startsWith('document') || idShort.includes('doc')) {
      // This might be a document entry itself
      const doc = extractDocumentItem(collection);
      if (doc) {
        documents.push(doc);
      } else {
        // Search children
        const nested = findDocuments(collection.value || []);
        documents.push(...nested);
      }
    } else {
      // Keep searching recursively
      const nested = findDocuments(collection.value || []);
      documents.push(...nested);
    }
  }

  return documents;
}

/**
 * Extracts Handover Documentation from an IDTA 02004 submodel
 */
export function extractHandoverDocs(submodel: Submodel): HandoverDocsData {
  const documents = findDocuments(submodel.submodelElements || []);

  return {
    documents,
    numberOfDocuments: documents.length,
  };
}
