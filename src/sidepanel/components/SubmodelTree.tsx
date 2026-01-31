/**
 * SubmodelTree Component
 * Expandable tree view for submodels and their elements
 * With template detection for specialized rendering
 */

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Hash,
  ToggleLeft,
  Link,
  Box,
  Zap,
  Settings,
  List,
} from 'lucide-react';
import type { Submodel, SubmodelElement } from '@shared/types';
import { detectTemplate, TemplateType } from '@lib/templates/detector';
import { NameplateView } from './templates/NameplateView';
import { CarbonFootprintView } from './templates/CarbonFootprintView';
import { TechnicalDataView } from './templates/TechnicalDataView';
import { HandoverDocsView } from './templates/HandoverDocsView';

interface SubmodelTreeProps {
  submodels: Submodel[];
}

// Helper to safely convert to array
function safeArray<T>(value: T | T[] | Record<string, T> | undefined | null): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && value !== null) {
    return Object.values(value as Record<string, T>);
  }
  return [];
}

interface TreeNodeProps {
  label: string;
  value?: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
}

function TreeNode({
  label,
  value,
  icon,
  children,
  defaultExpanded = false,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = Boolean(children);

  return (
    <div className="tree-item">
      <div
        className="tree-node"
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <span className="tree-toggle">
          {hasChildren &&
            (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </span>
        <span className="tree-icon">{icon}</span>
        <span className="tree-label">{label}</span>
        {value && <span className="tree-value">{value}</span>}
      </div>
      {hasChildren && isExpanded && <div>{children}</div>}
    </div>
  );
}

function getElementIcon(modelType: string) {
  switch (modelType) {
    case 'Property':
      return <Hash size={14} />;
    case 'MultiLanguageProperty':
      return <FileText size={14} />;
    case 'Range':
      return <ToggleLeft size={14} />;
    case 'File':
    case 'Blob':
      return <FileText size={14} />;
    case 'ReferenceElement':
      return <Link size={14} />;
    case 'SubmodelElementCollection':
      return <Folder size={14} />;
    case 'SubmodelElementList':
      return <List size={14} />;
    case 'Entity':
      return <Box size={14} />;
    case 'BasicEventElement':
      return <Zap size={14} />;
    case 'Operation':
      return <Settings size={14} />;
    case 'Capability':
      return <Settings size={14} />;
    case 'RelationshipElement':
    case 'AnnotatedRelationshipElement':
      return <Link size={14} />;
    default:
      return <FileText size={14} />;
  }
}

function formatValue(element: SubmodelElement): string | undefined {
  switch (element.modelType) {
    case 'Property':
      return element.value ?? undefined;
    case 'MultiLanguageProperty':
      return element.value?.[0]?.text;
    case 'Range':
      return `${element.min ?? '?'} - ${element.max ?? '?'}`;
    case 'File':
      return element.value ?? undefined;
    case 'Blob':
      return `[${element.contentType}]`;
    default:
      return undefined;
  }
}

function SubmodelElementNode({ element }: { element: SubmodelElement }) {
  // Defensive: handle missing or malformed elements
  if (!element || typeof element !== 'object') {
    return null;
  }

  const label = element.idShort || element.modelType || 'Unknown';
  const value = formatValue(element);
  const icon = getElementIcon(element.modelType || '');

  // Safely get children for collections/lists
  let children: SubmodelElement[] = [];
  if (
    element.modelType === 'SubmodelElementCollection' ||
    element.modelType === 'SubmodelElementList'
  ) {
    children = safeArray(element.value);
  }

  // Safely get entity statements
  const entityStatements =
    element.modelType === 'Entity' ? safeArray(element.statements) : [];

  const hasChildren = children.length > 0 || entityStatements.length > 0;

  return (
    <TreeNode
      label={label}
      value={value}
      icon={icon}
    >
      {hasChildren && (
        <>
          {children.map((child, index) => (
            <SubmodelElementNode
              key={(child as SubmodelElement)?.idShort || index}
              element={child as SubmodelElement}
            />
          ))}
          {entityStatements.map((statement, index) => (
            <SubmodelElementNode
              key={(statement as SubmodelElement)?.idShort || index}
              element={statement as SubmodelElement}
            />
          ))}
        </>
      )}
    </TreeNode>
  );
}

// Templates that have dedicated renderers
const SUPPORTED_TEMPLATES = new Set([
  TemplateType.NAMEPLATE,
  TemplateType.CARBON_FOOTPRINT,
  TemplateType.TECHNICAL_DATA,
  TemplateType.HANDOVER_DOCUMENTATION,
]);

function hasRenderer(type: TemplateType): boolean {
  return SUPPORTED_TEMPLATES.has(type);
}

function renderTemplateView(type: TemplateType, submodel: Submodel): React.ReactNode {
  switch (type) {
    case TemplateType.NAMEPLATE:
      return <NameplateView submodel={submodel} />;
    case TemplateType.CARBON_FOOTPRINT:
      return <CarbonFootprintView submodel={submodel} />;
    case TemplateType.TECHNICAL_DATA:
      return <TechnicalDataView submodel={submodel} />;
    case TemplateType.HANDOVER_DOCUMENTATION:
      return <HandoverDocsView submodel={submodel} />;
    default:
      return null;
  }
}

function SubmodelGenericTree({ submodel, index }: { submodel: Submodel; index: number }) {
  const elements = safeArray(submodel.submodelElements);

  return (
    <TreeNode
      key={submodel.id || index}
      label={submodel.idShort || `Submodel ${index + 1}`}
      icon={<FolderOpen size={14} />}
      defaultExpanded
    >
      {elements.length > 0 ? (
        elements.map((element, elemIndex) => (
          <SubmodelElementNode
            key={(element as SubmodelElement)?.idShort || elemIndex}
            element={element as SubmodelElement}
          />
        ))
      ) : (
        <div style={{ padding: '0.5rem', color: 'var(--color-gray-400)' }}>
          No elements
        </div>
      )}
    </TreeNode>
  );
}

function SubmodelWithTemplate({ submodel, index }: { submodel: Submodel; index: number }) {
  const [showRaw, setShowRaw] = useState(false);
  const templateType = detectTemplate(submodel);

  // Only show specialized view for templates that have renderers
  if (templateType !== TemplateType.GENERIC && hasRenderer(templateType)) {
    return (
      <div className="tree-item">
        <div className="template-header">
          <span className="template-badge">{templateType.replace('_', ' ')}</span>
          <span className="template-name">{submodel.idShort || `Submodel ${index + 1}`}</span>
          <button
            className="template-toggle"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? 'Card View' : 'Tree View'}
          </button>
        </div>

        {showRaw ? (
          <SubmodelGenericTree submodel={submodel} index={index} />
        ) : (
          renderTemplateView(templateType, submodel)
        )}
      </div>
    );
  }

  // Default: generic tree view (for GENERIC and templates without renderers)
  return <SubmodelGenericTree submodel={submodel} index={index} />;
}

export function SubmodelTree({ submodels }: SubmodelTreeProps) {
  // Safely convert to array
  const submodelList = safeArray(submodels);

  if (submodelList.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <Folder size={32} className="empty-state-icon" />
          <p>No submodels found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tree">
      {submodelList.map((submodel, index) => {
        // Defensive: ensure submodel is valid
        if (!submodel || typeof submodel !== 'object') {
          return null;
        }
        return <SubmodelWithTemplate key={submodel.id || index} submodel={submodel} index={index} />;
      })}
    </div>
  );
}
