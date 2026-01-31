/**
 * Documents Builder
 * Extracts and categorizes documents from AAS environment
 */

import type { AASEnvironment, Submodel } from '@shared/types';
import type { Documents, NormalizedDocument, DocumentCategory } from './types';
import { detectTemplate, TemplateType } from '@lib/templates/detector';
import { extractHandoverDocs } from '@lib/templates/extractors/handover-docs';
import type { DocumentClass } from '@lib/templates/types';

/**
 * Maps VDI 2770 document classes to normalized categories
 */
const DOCUMENT_CLASS_MAP: Record<DocumentClass | string, DocumentCategory> = {
  Identification: 'identification',
  TechnicalSpecification: 'technical_specification',
  Drawing: 'drawing',
  Manual: 'manual',
  Certificate: 'certificate',
  Contract: 'contract',
  Other: 'other',
};

/**
 * Converts a DocumentClass to DocumentCategory
 */
function mapDocumentCategory(
  docClass: DocumentClass | string
): DocumentCategory {
  return DOCUMENT_CLASS_MAP[docClass] ?? 'other';
}

/**
 * Finds the handover documentation submodel in an environment
 */
function findHandoverDocsSubmodel(
  environment: AASEnvironment
): Submodel | undefined {
  return environment.submodels?.find(
    (sm) => detectTemplate(sm) === TemplateType.HANDOVER_DOCUMENTATION
  );
}

/**
 * Builds Documents data from an AAS environment
 */
export function buildDocuments(environment: AASEnvironment): Documents {
  const items: NormalizedDocument[] = [];
  const byCategory = new Map<DocumentCategory, NormalizedDocument[]>();

  // Find and process handover documentation submodel
  const docsSubmodel = findHandoverDocsSubmodel(environment);
  if (docsSubmodel) {
    const handoverDocs = extractHandoverDocs(docsSubmodel);

    for (const doc of handoverDocs.documents) {
      const category = mapDocumentCategory(doc.documentClass);

      const normalizedDoc: NormalizedDocument = {
        id: doc.documentId,
        category,
      };

      if (doc.title) {
        normalizedDoc.title = doc.title;
      }

      if (doc.language) {
        normalizedDoc.language = doc.language;
      }

      if (doc.digitalFile) {
        normalizedDoc.filePath = doc.digitalFile;
      }

      if (doc.mimeType) {
        normalizedDoc.mimeType = doc.mimeType;
      }

      items.push(normalizedDoc);

      // Group by category
      const categoryDocs = byCategory.get(category) ?? [];
      categoryDocs.push(normalizedDoc);
      byCategory.set(category, categoryDocs);
    }
  }

  return {
    items,
    byCategory,
  };
}
