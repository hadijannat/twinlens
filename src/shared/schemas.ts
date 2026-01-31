/**
 * Zod Schemas for AAS Metamodel Runtime Validation
 * These schemas validate incoming AASX data against the AAS specification
 */

import { z } from 'zod';

// ============================================================================
// Base Schemas
// ============================================================================

// Key types for strict validation (kept for reference, relaxed in actual schema)
const _KeyTypeSchema = z.enum([
  'AssetAdministrationShell',
  'Submodel',
  'SubmodelElement',
  'SubmodelElementCollection',
  'SubmodelElementList',
  'Property',
  'MultiLanguageProperty',
  'Range',
  'Blob',
  'File',
  'ReferenceElement',
  'RelationshipElement',
  'AnnotatedRelationshipElement',
  'Entity',
  'EventElement',
  'BasicEventElement',
  'Operation',
  'Capability',
  'ConceptDescription',
  'GlobalReference',
  'FragmentReference',
]);
void _KeyTypeSchema; // Suppress unused warning - kept for documentation

// Key.type is relaxed to accept any string for legacy compatibility
// The mapper normalizes values, but we accept unknowns gracefully
const KeySchema = z.object({
  type: z.string(), // Relaxed from KeyTypeSchema for legacy formats
  value: z.string(),
});

// Helper to coerce single object to array (common in v2 format)
const coerceToArray = <T>(schema: z.ZodType<T>) =>
  z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return [val];
    return val;
  }, z.array(schema));

// Reference.type made optional - can be inferred from keys
// keys can be single object in v2 format, coerce to array
const ReferenceSchema = z.object({
  type: z.enum(['ExternalReference', 'ModelReference']).optional(),
  keys: coerceToArray(KeySchema),
});

const LangStringSetSchema = z.object({
  language: z.string(),
  text: z.string(),
});

const DataTypeDefXsdSchema = z.enum([
  'xs:anyURI',
  'xs:base64Binary',
  'xs:boolean',
  'xs:byte',
  'xs:date',
  'xs:dateTime',
  'xs:decimal',
  'xs:double',
  'xs:duration',
  'xs:float',
  'xs:gDay',
  'xs:gMonth',
  'xs:gMonthDay',
  'xs:gYear',
  'xs:gYearMonth',
  'xs:hexBinary',
  'xs:int',
  'xs:integer',
  'xs:langString',
  'xs:long',
  'xs:negativeInteger',
  'xs:nonNegativeInteger',
  'xs:nonPositiveInteger',
  'xs:positiveInteger',
  'xs:short',
  'xs:string',
  'xs:time',
  'xs:unsignedByte',
  'xs:unsignedInt',
  'xs:unsignedLong',
  'xs:unsignedShort',
]);

const ExtensionSchema = z.object({
  name: z.string(),
  valueType: DataTypeDefXsdSchema.optional(),
  value: z.string().optional(),
  refersTo: z.array(ReferenceSchema).optional(),
});

// Coerce number to string (version can be number in some files)
const stringOrNumber = z.preprocess(
  (val) => (typeof val === 'number' ? String(val) : val),
  z.string()
);

const AdministrativeInformationSchema = z.object({
  version: stringOrNumber.optional(),
  revision: stringOrNumber.optional(),
  creator: ReferenceSchema.optional(),
  templateId: z.string().optional(),
});

const QualifierKindSchema = z.enum(['ConceptQualifier', 'TemplateQualifier', 'ValueQualifier']);

const QualifierSchema = z.object({
  kind: QualifierKindSchema.optional(),
  type: z.string(),
  valueType: DataTypeDefXsdSchema,
  value: z.string().optional(),
  valueId: ReferenceSchema.optional(),
  semanticId: ReferenceSchema.optional(),
  supplementalSemanticIds: z.array(ReferenceSchema).optional(),
});

// ============================================================================
// Asset Information
// ============================================================================

const ResourceSchema = z.object({
  path: z.string(),
  contentType: z.string().optional(),
});

const SpecificAssetIdSchema = z.object({
  name: z.string(),
  value: z.string(),
  externalSubjectId: ReferenceSchema.optional(),
  semanticId: ReferenceSchema.optional(),
  supplementalSemanticIds: z.array(ReferenceSchema).optional(),
});

// Asset kinds for strict validation (kept for reference, relaxed in actual schema)
const _AssetKindSchema = z.enum(['Instance', 'NotApplicable', 'Type']);
void _AssetKindSchema; // Suppress unused warning - kept for documentation

// AssetKind accepts string for legacy 'kind' values
const AssetInformationSchema = z.object({
  assetKind: z.string(), // Relaxed from AssetKindSchema for legacy formats
  globalAssetId: z.string().optional(),
  specificAssetIds: z.array(SpecificAssetIdSchema).optional(),
  assetType: z.string().optional(),
  defaultThumbnail: ResourceSchema.optional(),
});

// ============================================================================
// Submodel Elements (Forward declaration pattern for recursive types)
// ============================================================================

// V2 description format: { langString: [...] }
const LegacyDescriptionSchema = z.object({
  langString: z.array(z.object({
    lang: z.string().optional(),
    language: z.string().optional(),
    '#text': z.string().optional(),
    text: z.string().optional(),
  })).optional(),
}).passthrough();

const SubmodelElementBaseSchema = z.object({
  idShort: z.string().optional(),
  displayName: z.array(LangStringSetSchema).optional(),
  description: z.union([
    z.array(LangStringSetSchema),
    LegacyDescriptionSchema,
  ]).optional(),
  extensions: z.array(ExtensionSchema).optional(),
  semanticId: ReferenceSchema.optional(),
  supplementalSemanticIds: z.array(ReferenceSchema).optional(),
  qualifiers: z.array(QualifierSchema).optional(),
});

const PropertySchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('Property'),
  valueType: DataTypeDefXsdSchema,
  value: z.string().optional(),
  valueId: ReferenceSchema.optional(),
});

const MultiLanguagePropertySchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('MultiLanguageProperty'),
  value: z.array(LangStringSetSchema).optional(),
  valueId: ReferenceSchema.optional(),
});

const RangeSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('Range'),
  valueType: DataTypeDefXsdSchema,
  min: z.string().optional(),
  max: z.string().optional(),
});

const BlobSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('Blob'),
  contentType: z.string(),
  value: z.string().optional(),
});

const FileElementSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('File'),
  contentType: z.string(),
  value: z.string().optional(),
});

const ReferenceElementSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('ReferenceElement'),
  value: ReferenceSchema.optional(),
});

const RelationshipElementSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('RelationshipElement'),
  first: ReferenceSchema,
  second: ReferenceSchema,
});

const CapabilitySchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('Capability'),
});

const DirectionSchema = z.enum(['input', 'output']);
const StateOfEventSchema = z.enum(['off', 'on']);

const BasicEventElementSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('BasicEventElement'),
  observed: ReferenceSchema,
  direction: DirectionSchema,
  state: StateOfEventSchema,
  messageTopic: z.string().optional(),
  messageBroker: ReferenceSchema.optional(),
  lastUpdate: z.string().optional(),
  minInterval: z.string().optional(),
  maxInterval: z.string().optional(),
});

const AnnotatedRelationshipElementSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('AnnotatedRelationshipElement'),
  first: ReferenceSchema,
  second: ReferenceSchema,
  annotations: z.array(z.lazy(() => SubmodelElementSchema)).optional(),
});

const EntityTypeSchema = z.enum(['CoManagedEntity', 'SelfManagedEntity']);

const EntitySchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('Entity'),
  entityType: EntityTypeSchema,
  globalAssetId: z.string().optional(),
  specificAssetIds: z.array(SpecificAssetIdSchema).optional(),
  statements: z.array(z.lazy(() => SubmodelElementSchema)).optional(),
});

const OperationVariableSchema = z.object({
  value: z.lazy(() => SubmodelElementSchema),
});

const OperationSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('Operation'),
  inputVariables: z.array(OperationVariableSchema).optional(),
  outputVariables: z.array(OperationVariableSchema).optional(),
  inoutputVariables: z.array(OperationVariableSchema).optional(),
});

const SubmodelElementCollectionSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('SubmodelElementCollection'),
  value: z.array(z.lazy(() => SubmodelElementSchema)).optional(),
});

const AasSubmodelElementsSchema = z.enum([
  'AnnotatedRelationshipElement',
  'BasicEventElement',
  'Blob',
  'Capability',
  'DataElement',
  'Entity',
  'EventElement',
  'File',
  'MultiLanguageProperty',
  'Operation',
  'Property',
  'Range',
  'ReferenceElement',
  'RelationshipElement',
  'SubmodelElement',
  'SubmodelElementCollection',
  'SubmodelElementList',
]);

const SubmodelElementListSchema = SubmodelElementBaseSchema.extend({
  modelType: z.literal('SubmodelElementList'),
  orderRelevant: z.boolean().optional(),
  semanticIdListElement: ReferenceSchema.optional(),
  typeValueListElement: AasSubmodelElementsSchema,
  valueTypeListElement: DataTypeDefXsdSchema.optional(),
  value: z.array(z.lazy(() => SubmodelElementSchema)).optional(),
});

// Recursive types need lazy evaluation (defined after dependent schemas)
const SubmodelElementSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('modelType', [
    PropertySchema,
    MultiLanguagePropertySchema,
    RangeSchema,
    BlobSchema,
    FileElementSchema,
    ReferenceElementSchema,
    RelationshipElementSchema,
    AnnotatedRelationshipElementSchema,
    EntitySchema,
    BasicEventElementSchema,
    OperationSchema,
    CapabilitySchema,
    SubmodelElementCollectionSchema,
    SubmodelElementListSchema,
  ])
);

// ============================================================================
// Submodel
// ============================================================================

const ModellingKindSchema = z.enum(['Instance', 'Template']);

const SubmodelSchema = z.object({
  modelType: z.literal('Submodel'),
  id: z.string(),
  idShort: z.string().optional(),
  displayName: z.array(LangStringSetSchema).optional(),
  description: z.array(LangStringSetSchema).optional(),
  extensions: z.array(ExtensionSchema).optional(),
  administration: AdministrativeInformationSchema.optional(),
  semanticId: ReferenceSchema.optional(),
  supplementalSemanticIds: z.array(ReferenceSchema).optional(),
  kind: ModellingKindSchema.optional(),
  submodelElements: z.array(SubmodelElementSchema).optional(),
});

// ============================================================================
// Asset Administration Shell
// ============================================================================

// AssetInformation made optional - mapper constructs it from assetRef
const AssetAdministrationShellSchema = z.object({
  modelType: z.literal('AssetAdministrationShell'),
  id: z.string(),
  idShort: z.string().optional(),
  displayName: z.array(LangStringSetSchema).optional(),
  description: z.array(LangStringSetSchema).optional(),
  extensions: z.array(ExtensionSchema).optional(),
  administration: AdministrativeInformationSchema.optional(),
  derivedFrom: ReferenceSchema.optional(),
  assetInformation: AssetInformationSchema.optional(), // Made optional for legacy files
  submodels: z.array(ReferenceSchema).optional(),
  semanticId: ReferenceSchema.optional(),
  supplementalSemanticIds: z.array(ReferenceSchema).optional(),
});

// ============================================================================
// Concept Description
// ============================================================================

const ConceptDescriptionSchema = z.object({
  modelType: z.literal('ConceptDescription'),
  id: z.string(),
  idShort: z.string().optional(),
  displayName: z.array(LangStringSetSchema).optional(),
  description: z.array(LangStringSetSchema).optional(),
  extensions: z.array(ExtensionSchema).optional(),
  administration: AdministrativeInformationSchema.optional(),
  isCaseOf: z.array(ReferenceSchema).optional(),
});

// ============================================================================
// AAS Environment
// ============================================================================

export const AASEnvironmentSchema = z.object({
  assetAdministrationShells: z.array(AssetAdministrationShellSchema),
  submodels: z.array(SubmodelSchema),
  conceptDescriptions: z.array(ConceptDescriptionSchema).optional(),
});

// ============================================================================
// Exports
// ============================================================================

export {
  ReferenceSchema,
  KeySchema,
  LangStringSetSchema,
  AssetAdministrationShellSchema,
  SubmodelSchema,
  SubmodelElementSchema,
  PropertySchema,
  AssetInformationSchema,
};

export type AASEnvironmentInput = z.input<typeof AASEnvironmentSchema>;
export type AASEnvironmentOutput = z.output<typeof AASEnvironmentSchema>;
