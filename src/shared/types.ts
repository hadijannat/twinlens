/**
 * AAS Metamodel Types
 * Based on the Asset Administration Shell specification
 * https://industrialdigitaltwin.org/content-hub/aasspecifications
 */

// ============================================================================
// Base Types
// ============================================================================

export interface Reference {
  type: 'ExternalReference' | 'ModelReference';
  keys: Key[];
}

export interface Key {
  type: KeyType;
  value: string;
}

export type KeyType =
  | 'AssetAdministrationShell'
  | 'Submodel'
  | 'SubmodelElement'
  | 'SubmodelElementCollection'
  | 'SubmodelElementList'
  | 'Property'
  | 'MultiLanguageProperty'
  | 'Range'
  | 'Blob'
  | 'File'
  | 'ReferenceElement'
  | 'RelationshipElement'
  | 'AnnotatedRelationshipElement'
  | 'Entity'
  | 'EventElement'
  | 'BasicEventElement'
  | 'Operation'
  | 'Capability'
  | 'ConceptDescription'
  | 'GlobalReference'
  | 'FragmentReference';

export interface LangStringSet {
  language: string;
  text: string;
}

export interface Extension {
  name: string;
  valueType?: DataTypeDefXsd;
  value?: string;
  refersTo?: Reference[];
}

export interface HasSemantics {
  semanticId?: Reference;
  supplementalSemanticIds?: Reference[];
}

export interface Identifiable {
  id: string;
  administration?: AdministrativeInformation;
}

export interface AdministrativeInformation {
  version?: string;
  revision?: string;
  creator?: Reference;
  templateId?: string;
}

export interface Referable {
  idShort?: string;
  displayName?: LangStringSet[];
  description?: LangStringSet[];
  extensions?: Extension[];
}

export interface HasDataSpecification {
  embeddedDataSpecifications?: EmbeddedDataSpecification[];
}

export interface EmbeddedDataSpecification {
  dataSpecification: Reference;
  dataSpecificationContent: DataSpecificationContent;
}

export type DataSpecificationContent = DataSpecificationIec61360;

export interface DataSpecificationIec61360 {
  preferredName: LangStringSet[];
  shortName?: LangStringSet[];
  unit?: string;
  unitId?: Reference;
  sourceOfDefinition?: string;
  symbol?: string;
  dataType?: DataTypeIec61360;
  definition?: LangStringSet[];
  valueFormat?: string;
  valueList?: ValueList;
  value?: string;
  levelType?: LevelType;
}

export interface ValueList {
  valueReferencePairs: ValueReferencePair[];
}

export interface ValueReferencePair {
  value: string;
  valueId: Reference;
}

export interface LevelType {
  min: boolean;
  max: boolean;
  nom: boolean;
  typ: boolean;
}

export type DataTypeIec61360 =
  | 'DATE'
  | 'STRING'
  | 'STRING_TRANSLATABLE'
  | 'INTEGER_MEASURE'
  | 'INTEGER_COUNT'
  | 'INTEGER_CURRENCY'
  | 'REAL_MEASURE'
  | 'REAL_COUNT'
  | 'REAL_CURRENCY'
  | 'BOOLEAN'
  | 'IRI'
  | 'IRDI'
  | 'RATIONAL'
  | 'RATIONAL_MEASURE'
  | 'TIME'
  | 'TIMESTAMP'
  | 'HTML'
  | 'BLOB'
  | 'FILE';

// ============================================================================
// Asset Administration Shell
// ============================================================================

export interface AssetAdministrationShell
  extends Identifiable,
    Referable,
    HasSemantics,
    HasDataSpecification {
  modelType: 'AssetAdministrationShell';
  derivedFrom?: Reference;
  assetInformation: AssetInformation;
  submodels?: Reference[];
}

export interface AssetInformation {
  assetKind: AssetKind;
  globalAssetId?: string;
  specificAssetIds?: SpecificAssetId[];
  assetType?: string;
  defaultThumbnail?: Resource;
}

export type AssetKind = 'Instance' | 'NotApplicable' | 'Type';

export interface SpecificAssetId extends HasSemantics {
  name: string;
  value: string;
  externalSubjectId?: Reference;
}

export interface Resource {
  path: string;
  contentType?: string;
}

// ============================================================================
// Submodel
// ============================================================================

export interface Submodel
  extends Identifiable,
    Referable,
    HasSemantics,
    HasDataSpecification {
  modelType: 'Submodel';
  kind?: ModellingKind;
  submodelElements?: SubmodelElement[];
}

export type ModellingKind = 'Instance' | 'Template';

// ============================================================================
// Submodel Elements
// ============================================================================

export type SubmodelElement =
  | Property
  | MultiLanguageProperty
  | Range
  | Blob
  | FileElement
  | ReferenceElement
  | RelationshipElement
  | AnnotatedRelationshipElement
  | Entity
  | BasicEventElement
  | Operation
  | Capability
  | SubmodelElementCollection
  | SubmodelElementList;

export interface SubmodelElementBase
  extends Referable,
    HasSemantics,
    HasDataSpecification {
  qualifiers?: Qualifier[];
}

export interface Qualifier extends HasSemantics {
  kind?: QualifierKind;
  type: string;
  valueType: DataTypeDefXsd;
  value?: string;
  valueId?: Reference;
}

export type QualifierKind = 'ConceptQualifier' | 'TemplateQualifier' | 'ValueQualifier';

export type DataTypeDefXsd =
  | 'xs:anyURI'
  | 'xs:base64Binary'
  | 'xs:boolean'
  | 'xs:byte'
  | 'xs:date'
  | 'xs:dateTime'
  | 'xs:decimal'
  | 'xs:double'
  | 'xs:duration'
  | 'xs:float'
  | 'xs:gDay'
  | 'xs:gMonth'
  | 'xs:gMonthDay'
  | 'xs:gYear'
  | 'xs:gYearMonth'
  | 'xs:hexBinary'
  | 'xs:int'
  | 'xs:integer'
  | 'xs:long'
  | 'xs:negativeInteger'
  | 'xs:nonNegativeInteger'
  | 'xs:nonPositiveInteger'
  | 'xs:positiveInteger'
  | 'xs:short'
  | 'xs:string'
  | 'xs:time'
  | 'xs:unsignedByte'
  | 'xs:unsignedInt'
  | 'xs:unsignedLong'
  | 'xs:unsignedShort';

export interface Property extends SubmodelElementBase {
  modelType: 'Property';
  valueType: DataTypeDefXsd;
  value?: string;
  valueId?: Reference;
}

export interface MultiLanguageProperty extends SubmodelElementBase {
  modelType: 'MultiLanguageProperty';
  value?: LangStringSet[];
  valueId?: Reference;
}

export interface Range extends SubmodelElementBase {
  modelType: 'Range';
  valueType: DataTypeDefXsd;
  min?: string;
  max?: string;
}

export interface Blob extends SubmodelElementBase {
  modelType: 'Blob';
  contentType: string;
  value?: string;
}

export interface FileElement extends SubmodelElementBase {
  modelType: 'File';
  contentType: string;
  value?: string;
}

export interface ReferenceElement extends SubmodelElementBase {
  modelType: 'ReferenceElement';
  value?: Reference;
}

export interface RelationshipElement extends SubmodelElementBase {
  modelType: 'RelationshipElement';
  first: Reference;
  second: Reference;
}

export interface AnnotatedRelationshipElement extends SubmodelElementBase {
  modelType: 'AnnotatedRelationshipElement';
  first: Reference;
  second: Reference;
  annotations?: SubmodelElement[];
}

export interface Entity extends SubmodelElementBase {
  modelType: 'Entity';
  entityType: EntityType;
  globalAssetId?: string;
  specificAssetIds?: SpecificAssetId[];
  statements?: SubmodelElement[];
}

export type EntityType = 'CoManagedEntity' | 'SelfManagedEntity';

export interface BasicEventElement extends SubmodelElementBase {
  modelType: 'BasicEventElement';
  observed: Reference;
  direction: Direction;
  state: StateOfEvent;
  messageTopic?: string;
  messageBroker?: Reference;
  lastUpdate?: string;
  minInterval?: string;
  maxInterval?: string;
}

export type Direction = 'input' | 'output';
export type StateOfEvent = 'off' | 'on';

export interface Operation extends SubmodelElementBase {
  modelType: 'Operation';
  inputVariables?: OperationVariable[];
  outputVariables?: OperationVariable[];
  inoutputVariables?: OperationVariable[];
}

export interface OperationVariable {
  value: SubmodelElement;
}

export interface Capability extends SubmodelElementBase {
  modelType: 'Capability';
}

export interface SubmodelElementCollection extends SubmodelElementBase {
  modelType: 'SubmodelElementCollection';
  value?: SubmodelElement[];
}

export interface SubmodelElementList extends SubmodelElementBase {
  modelType: 'SubmodelElementList';
  orderRelevant?: boolean;
  semanticIdListElement?: Reference;
  typeValueListElement: AasSubmodelElements;
  valueTypeListElement?: DataTypeDefXsd;
  value?: SubmodelElement[];
}

export type AasSubmodelElements =
  | 'AnnotatedRelationshipElement'
  | 'BasicEventElement'
  | 'Blob'
  | 'Capability'
  | 'DataElement'
  | 'Entity'
  | 'EventElement'
  | 'File'
  | 'MultiLanguageProperty'
  | 'Operation'
  | 'Property'
  | 'Range'
  | 'ReferenceElement'
  | 'RelationshipElement'
  | 'SubmodelElement'
  | 'SubmodelElementCollection'
  | 'SubmodelElementList';

// ============================================================================
// Concept Description
// ============================================================================

export interface ConceptDescription
  extends Identifiable,
    Referable,
    HasDataSpecification {
  modelType: 'ConceptDescription';
  isCaseOf?: Reference[];
}

// ============================================================================
// Environment (Root container)
// ============================================================================

export interface AASEnvironment {
  assetAdministrationShells: AssetAdministrationShell[];
  submodels: Submodel[];
  conceptDescriptions?: ConceptDescription[];
}

// ============================================================================
// Parser Result Types
// ============================================================================

export interface ValidationError {
  path: string;
  message: string;
}

export interface SupplementaryFile {
  path: string;
  contentType: string;
  size: number;
}

export interface ParseResult {
  environment: AASEnvironment;
  validationErrors: ValidationError[];
  supplementaryFiles: SupplementaryFile[];
  thumbnail?: string; // Base64 data URL
}

// ============================================================================
// Worker Message Types
// ============================================================================

export interface ParseWorkerRequest {
  type: 'parse';
  fileData: ArrayBuffer;
  fileName: string;
}

export interface ParseWorkerResponse {
  type: 'success' | 'error';
  result?: ParseResult;
  error?: string;
}
