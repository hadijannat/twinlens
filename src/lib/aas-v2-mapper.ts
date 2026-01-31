/**
 * AAS 2.0 to 3.0 Field Mapper
 *
 * Maps legacy AAS 2.0 XML field names to AAS 3.0 JSON format.
 * This enables compatibility with older AASX files that use the V2 metamodel.
 *
 * Key differences:
 * - identification → id
 * - assetRef → assetInformation.globalAssetId
 * - keys.key (nested) → keys (flat array)
 * - kind → assetKind
 */

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Ensures a value is always an array
 */
export function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Extracts text value from XML element that may have attributes
 * XML parser returns { '#text': 'value', 'attr': '...' } for elements with attributes
 */
function extractTextValue(obj: unknown): string | undefined {
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return String(obj);
  if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    // Check for #text (XML text content)
    if (record['#text'] !== undefined) {
      return String(record['#text']);
    }
    // Check for direct value
    if (record.value !== undefined) {
      return extractTextValue(record.value);
    }
  }
  return undefined;
}

// ============================================================================
// Reference Mapping (keys.key → keys)
// ============================================================================

interface LegacyKey {
  type?: string;
  local?: boolean | string;
  idType?: string;
  '#text'?: string;
  value?: string;
}

interface LegacyReference {
  keys?: {
    key?: LegacyKey | LegacyKey[];
  };
  key?: LegacyKey | LegacyKey[];
  type?: string;
}

interface MappedKey {
  type: string;
  value: string;
}

interface MappedReference {
  type: string;
  keys: MappedKey[];
}

/**
 * Maps AAS 2.0 reference structure to AAS 3.0 format
 */
export function mapReference(ref: unknown): MappedReference | undefined {
  if (!ref || typeof ref !== 'object') return undefined;

  const legacyRef = ref as LegacyReference;

  // Extract keys array from nested structure
  let keyList: LegacyKey[] = [];

  if (legacyRef.keys?.key) {
    keyList = ensureArray(legacyRef.keys.key);
  } else if (legacyRef.key) {
    keyList = ensureArray(legacyRef.key);
  } else if (Array.isArray(ref)) {
    // Already an array of keys
    return {
      type: 'ModelReference',
      keys: (ref as MappedKey[]).filter((k) => k.type && k.value),
    };
  }

  if (keyList.length === 0) {
    // Check if already in v3 format
    const v3Ref = ref as { type?: string; keys?: MappedKey[] };
    if (v3Ref.keys && Array.isArray(v3Ref.keys)) {
      return {
        type: v3Ref.type || 'ModelReference',
        keys: v3Ref.keys,
      };
    }
    return undefined;
  }

  const mappedKeys: MappedKey[] = keyList
    .map((k) => {
      const keyType = k.type || 'GlobalReference';
      const keyValue = k['#text'] || k.value || '';
      return { type: keyType, value: String(keyValue) };
    })
    .filter((k) => k.value);

  if (mappedKeys.length === 0) return undefined;

  // Infer reference type from first key
  const firstKey = mappedKeys[0];
  const firstKeyType = firstKey?.type ?? 'GlobalReference';
  const refType =
    firstKeyType === 'GlobalReference' || firstKeyType === 'FragmentReference'
      ? 'ExternalReference'
      : 'ModelReference';

  return {
    type: legacyRef.type || refType,
    keys: mappedKeys,
  };
}

/**
 * Extracts the first key value from a reference (for globalAssetId)
 */
export function extractFirstKeyValue(ref: unknown): string | undefined {
  const mapped = mapReference(ref);
  return mapped?.keys[0]?.value;
}

// ============================================================================
// Identification Mapping
// ============================================================================

interface LegacyIdentification {
  id?: string;
  idType?: string;
  '#text'?: string;
}

/**
 * Maps AAS 2.0 identification to AAS 3.0 id string
 * V2: { identification: { id: "urn:...", idType: "IRI" } } or { identification: "urn:..." }
 * V3: { id: "urn:..." }
 */
export function mapIdentification(obj: Record<string, unknown>): string | undefined {
  // Already has v3 id
  if (typeof obj.id === 'string') return obj.id;

  const ident = obj.identification;
  if (!ident) return undefined;

  // String identification
  if (typeof ident === 'string') return ident;

  // Object identification
  if (typeof ident === 'object' && ident !== null) {
    const identObj = ident as LegacyIdentification;
    return identObj['#text'] ?? identObj.id ?? extractTextValue(ident);
  }

  return undefined;
}

// ============================================================================
// Asset Information Mapping
// ============================================================================

interface LegacyAAS {
  identification?: unknown;
  id?: string;
  idShort?: string;
  assetRef?: unknown;
  asset?: unknown;
  assetInformation?: unknown;
  kind?: string;
  derivedFrom?: unknown;
  submodels?: unknown;
  submodelRefs?: unknown;
  [key: string]: unknown;
}

interface MappedAssetInformation {
  assetKind: string;
  globalAssetId?: string;
}

/**
 * Maps AAS 2.0 assetRef to AAS 3.0 assetInformation
 */
export function mapAssetInformation(
  aas: LegacyAAS
): MappedAssetInformation | undefined {
  // Already has v3 assetInformation
  if (aas.assetInformation && typeof aas.assetInformation === 'object') {
    const info = aas.assetInformation as Record<string, unknown>;
    // Ensure assetKind exists
    if (!info.assetKind) {
      return {
        ...info,
        assetKind: (aas.kind as string) || 'Instance',
      } as MappedAssetInformation;
    }
    return aas.assetInformation as MappedAssetInformation;
  }

  // Map from v2 assetRef
  if (aas.assetRef || aas.asset) {
    const assetRef = aas.assetRef || aas.asset;
    const globalAssetId = extractFirstKeyValue(assetRef);

    return {
      assetKind: (aas.kind as string) || 'Instance',
      globalAssetId,
    };
  }

  // Create minimal assetInformation if missing
  return {
    assetKind: (aas.kind as string) || 'Instance',
  };
}

// ============================================================================
// Semantic ID Mapping
// ============================================================================

/**
 * Maps semanticId from v2 to v3 format
 */
export function mapSemanticId(obj: Record<string, unknown>): MappedReference | undefined {
  if (!obj.semanticId) return undefined;

  const semId = obj.semanticId;

  // Already v3 format
  if (
    typeof semId === 'object' &&
    semId !== null &&
    'type' in (semId as object) &&
    'keys' in (semId as object)
  ) {
    const ref = semId as MappedReference;
    if (Array.isArray(ref.keys)) return ref;
  }

  return mapReference(semId);
}

// ============================================================================
// Submodel Reference Mapping
// ============================================================================

/**
 * Maps submodel references from v2 to v3 format
 */
export function mapSubmodelRefs(aas: LegacyAAS): MappedReference[] {
  // Check v3 format first
  if (aas.submodels && Array.isArray(aas.submodels)) {
    return aas.submodels
      .map((sm) => mapReference(sm))
      .filter((ref): ref is MappedReference => ref !== undefined);
  }

  // Check v2 submodelRefs format
  if (aas.submodelRefs) {
    const refs = aas.submodelRefs as { submodelRef?: unknown };
    const refList = ensureArray(refs.submodelRef || aas.submodelRefs);
    return refList
      .map((ref) => mapReference(ref))
      .filter((ref): ref is MappedReference => ref !== undefined);
  }

  return [];
}

// ============================================================================
// Main AAS Mapping
// ============================================================================

/**
 * Maps an AAS 2.0 Asset Administration Shell to AAS 3.0 format
 */
export function mapAAS(aas: unknown): Record<string, unknown> {
  if (!aas || typeof aas !== 'object') return aas as Record<string, unknown>;

  const legacyAAS = aas as LegacyAAS;
  const result: Record<string, unknown> = { ...legacyAAS };

  // Map identification → id
  const id = mapIdentification(legacyAAS as Record<string, unknown>);
  if (id) {
    result.id = id;
    delete result.identification;
  }

  // Map assetRef → assetInformation
  const assetInfo = mapAssetInformation(legacyAAS);
  if (assetInfo) {
    result.assetInformation = assetInfo;
    delete result.assetRef;
    delete result.asset;
    delete result.kind;
  }

  // Map derivedFrom reference
  if (legacyAAS.derivedFrom) {
    const derivedFrom = mapReference(legacyAAS.derivedFrom);
    if (derivedFrom) {
      result.derivedFrom = derivedFrom;
    }
  }

  // Map submodel references
  const submodelRefs = mapSubmodelRefs(legacyAAS);
  if (submodelRefs.length > 0) {
    result.submodels = submodelRefs;
    delete result.submodelRefs;
  }

  // Ensure modelType
  result.modelType = 'AssetAdministrationShell';

  return result;
}

// ============================================================================
// Submodel Mapping
// ============================================================================

interface LegacySubmodel {
  identification?: unknown;
  id?: string;
  idShort?: string;
  semanticId?: unknown;
  kind?: string;
  submodelElements?: unknown;
  [key: string]: unknown;
}

/**
 * Maps an AAS 2.0 Submodel to AAS 3.0 format
 */
export function mapSubmodel(sm: unknown): Record<string, unknown> {
  if (!sm || typeof sm !== 'object') return sm as Record<string, unknown>;

  const legacySM = sm as LegacySubmodel;
  const result: Record<string, unknown> = { ...legacySM };

  // Map identification → id
  const id = mapIdentification(legacySM as Record<string, unknown>);
  if (id) {
    result.id = id;
    delete result.identification;
  }

  // Map semanticId
  const semanticId = mapSemanticId(legacySM as Record<string, unknown>);
  if (semanticId) {
    result.semanticId = semanticId;
  }

  // Map kind (v2 uses 'kind', v3 uses it too but differently)
  // In submodels, keep kind as-is if present

  // Ensure modelType
  result.modelType = 'Submodel';

  return result;
}

// ============================================================================
// Concept Description Mapping
// ============================================================================

interface LegacyConceptDescription {
  identification?: unknown;
  id?: string;
  [key: string]: unknown;
}

/**
 * Maps an AAS 2.0 Concept Description to AAS 3.0 format
 */
export function mapConceptDescription(cd: unknown): Record<string, unknown> {
  if (!cd || typeof cd !== 'object') return cd as Record<string, unknown>;

  const legacyCD = cd as LegacyConceptDescription;
  const result: Record<string, unknown> = { ...legacyCD };

  // Map identification → id
  const id = mapIdentification(legacyCD as Record<string, unknown>);
  if (id) {
    result.id = id;
    delete result.identification;
  }

  // Map isCaseOf references
  if (result.isCaseOf) {
    const isCaseOfRaw = result.isCaseOf as Record<string, unknown>;
    if (isCaseOfRaw.reference) {
      const refs = ensureArray(isCaseOfRaw.reference);
      result.isCaseOf = refs
        .map((ref) => mapReference(ref))
        .filter((ref): ref is MappedReference => ref !== undefined);
    } else if (!Array.isArray(result.isCaseOf)) {
      // Single reference
      const mapped = mapReference(result.isCaseOf);
      result.isCaseOf = mapped ? [mapped] : [];
    }
  }

  // Fix administration.revision - v2 might have different structure
  if (result.administration && typeof result.administration === 'object') {
    const admin = result.administration as Record<string, unknown>;
    // Ensure revision is a string if present
    if (admin.revision !== undefined && typeof admin.revision !== 'string') {
      admin.revision = String(admin.revision);
    }
  }

  // Map description if it's in v2 format
  if (result.description && typeof result.description === 'object' && !Array.isArray(result.description)) {
    const descObj = result.description as Record<string, unknown>;
    if (descObj.langString) {
      result.description = mapMultiLanguageValue(result.description);
    }
  }

  // Ensure modelType
  result.modelType = 'ConceptDescription';

  return result;
}

// ============================================================================
// SubmodelElement Value Mapping
// ============================================================================

/**
 * Maps value field in submodel elements
 * V2 sometimes uses object wrapper, V3 uses direct array
 */
export function mapSubmodelElementValue(value: unknown): unknown {
  if (!value) return value;

  // If it's already an array, return as-is
  if (Array.isArray(value)) return value;

  // Check for wrapper object with submodelElement key
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.submodelElement) {
      return ensureArray(obj.submodelElement);
    }
  }

  return value;
}

interface LegacyLangString {
  lang?: string;
  language?: string;
  '#text'?: string;
  text?: string;
}

interface MappedLangString {
  language: string;
  text: string;
}

/**
 * Maps a single LangString from v2 to v3 format
 * V2: { lang: "de", "#text": "..." }
 * V3: { language: "de", text: "..." }
 */
function mapLangString(ls: unknown): MappedLangString | null {
  if (!ls || typeof ls !== 'object') return null;

  const obj = ls as LegacyLangString;
  const language = obj.language ?? obj.lang ?? '';
  // Ensure text is a string (may be number in some v2 files)
  const rawText = obj.text ?? obj['#text'] ?? '';
  const text = typeof rawText === 'number' ? String(rawText) : String(rawText);

  if (!language && !text) return null;

  return { language, text };
}

/**
 * Maps MultiLanguageProperty value
 * V2 uses { langString: [...] } with { lang, #text }, V3 uses direct array with { language, text }
 */
export function mapMultiLanguageValue(value: unknown): MappedLangString[] {
  if (!value) return [];

  let langStrings: unknown[] = [];

  // Already an array
  if (Array.isArray(value)) {
    langStrings = value;
  } else if (typeof value === 'object' && value !== null) {
    // V2 format: { langString: { lang: "en", "#text": "..." } | [...] }
    const obj = value as Record<string, unknown>;
    if (obj.langString) {
      langStrings = ensureArray(obj.langString);
    }
  }

  // Map each langString to v3 format
  return langStrings
    .map(mapLangString)
    .filter((ls): ls is MappedLangString => ls !== null);
}

/**
 * Maps valueType field - v2 may have empty string or different format
 * V2 uses 'string', V3 uses 'xs:string'
 */
export function mapValueType(valueType: unknown): string {
  if (!valueType || valueType === '') {
    return 'xs:string'; // Default to string for empty valueType
  }

  const vt = String(valueType);

  // If already has xs: prefix, return as-is
  if (vt.startsWith('xs:')) {
    return vt;
  }

  // Map common v2 types to v3 xs: prefix
  const typeMap: Record<string, string> = {
    string: 'xs:string',
    int: 'xs:int',
    integer: 'xs:integer',
    float: 'xs:float',
    double: 'xs:double',
    boolean: 'xs:boolean',
    date: 'xs:date',
    dateTime: 'xs:dateTime',
    time: 'xs:time',
    anyURI: 'xs:anyURI',
    base64Binary: 'xs:base64Binary',
    hexBinary: 'xs:hexBinary',
    decimal: 'xs:decimal',
    long: 'xs:long',
    short: 'xs:short',
    byte: 'xs:byte',
    unsignedInt: 'xs:unsignedInt',
    unsignedLong: 'xs:unsignedLong',
    unsignedShort: 'xs:unsignedShort',
    unsignedByte: 'xs:unsignedByte',
    positiveInteger: 'xs:positiveInteger',
    negativeInteger: 'xs:negativeInteger',
    nonPositiveInteger: 'xs:nonPositiveInteger',
    nonNegativeInteger: 'xs:nonNegativeInteger',
  };

  return typeMap[vt] ?? `xs:${vt}`;
}

// ============================================================================
// Version Detection
// ============================================================================

/**
 * Detects if the data uses AAS 2.0 format
 * Returns true if v2 indicators are found
 */
export function isAASv2(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;

  const obj = data as Record<string, unknown>;

  // Check for v2 indicators in environment
  const aasContainer = obj.assetAdministrationShells as Record<string, unknown>;
  if (aasContainer?.assetAdministrationShell) {
    const aasList = ensureArray(aasContainer.assetAdministrationShell);
    if (aasList.length > 0) {
      const firstAAS = aasList[0] as Record<string, unknown>;
      // v2 uses 'identification' instead of 'id'
      if (firstAAS.identification && !firstAAS.id) return true;
      // v2 uses 'assetRef' instead of 'assetInformation'
      if (firstAAS.assetRef && !firstAAS.assetInformation) return true;
    }
  }

  // Check submodels
  const smContainer = obj.submodels as Record<string, unknown>;
  if (smContainer?.submodel) {
    const smList = ensureArray(smContainer.submodel);
    if (smList.length > 0) {
      const firstSM = smList[0] as Record<string, unknown>;
      if (firstSM.identification && !firstSM.id) return true;
    }
  }

  return false;
}
