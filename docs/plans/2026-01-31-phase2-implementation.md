# Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 2 features: fix validation edge cases, add IDTA template renderers (Digital Nameplate, Carbon Footprint), and build the Compare Cart feature.

**Architecture:** Template-based rendering with semantic ID detection. Compare Cart uses chrome.storage.local for persistence. Normalization layer provides unified data model.

**Tech Stack:** React, TypeScript, Zod, Vitest, Chrome Extension APIs

---

## Task 1: Fix `xs:langString` Validation

**Files:**
- Modify: `src/shared/schemas.ts:56-87`
- Test: `tests/unit/schemas.test.ts`

**Step 1: Write the failing test**

Add to `tests/unit/schemas.test.ts`:

```typescript
it('validates Property with xs:langString valueType', () => {
  const envWithLangString = {
    assetAdministrationShells: [],
    submodels: [
      {
        modelType: 'Submodel',
        id: 'urn:example:submodel:langstring',
        submodelElements: [
          {
            modelType: 'Property',
            idShort: 'LocalizedDescription',
            valueType: 'xs:langString',
            value: 'Hello',
          },
        ],
      },
    ],
  };

  const result = AASEnvironmentSchema.safeParse(envWithLangString);
  expect(result.success).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/schemas.test.ts`
Expected: FAIL with "Invalid enum value. Expected 'xs:anyURI' | ... | 'xs:unsignedShort', received 'xs:langString'"

**Step 3: Add xs:langString to DataTypeDefXsdSchema**

In `src/shared/schemas.ts`, add `'xs:langString'` to the enum at line 56:

```typescript
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
  'xs:langString',  // Add this line
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/schemas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/schemas.ts tests/unit/schemas.test.ts
git commit -m "fix: add xs:langString to DataTypeDefXsd enum

Fixes validation error for AAS files using xs:langString valueType."
```

---

## Task 2: Fix Nested Description Field Mapping

**Files:**
- Modify: `src/shared/schemas.ts:149-157`
- Test: `tests/unit/schemas.test.ts`

**Step 1: Write the failing test**

Add to `tests/unit/schemas.test.ts`:

```typescript
it('validates nested SubmodelElement with object description (v2 format)', () => {
  const envWithNestedDesc = {
    assetAdministrationShells: [],
    submodels: [
      {
        modelType: 'Submodel',
        id: 'urn:example:submodel:nested-desc',
        submodelElements: [
          {
            modelType: 'SubmodelElementCollection',
            idShort: 'ContactInfo',
            description: { langString: [{ lang: 'en', '#text': 'Contact details' }] },
            value: [
              {
                modelType: 'Property',
                idShort: 'Phone',
                valueType: 'xs:string',
                value: '+1234567890',
                description: { langString: [{ lang: 'en', '#text': 'Phone number' }] },
              },
            ],
          },
        ],
      },
    ],
  };

  const result = AASEnvironmentSchema.safeParse(envWithNestedDesc);
  expect(result.success).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/schemas.test.ts`
Expected: FAIL with "Expected array, received object"

**Step 3: Relax description schema to accept object OR array**

In `src/shared/schemas.ts`, modify `SubmodelElementBaseSchema`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/schemas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/schemas.ts tests/unit/schemas.test.ts
git commit -m "fix: allow object format for description in SubmodelElements

Some v2 files use { langString: [...] } format for descriptions.
Accept both array and object formats for backward compatibility."
```

---

## Task 3: Create Template Detection System

**Files:**
- Create: `src/lib/templates/detector.ts`
- Create: `src/lib/templates/types.ts`
- Test: `tests/unit/template-detector.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/template-detector.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { detectTemplate, TemplateType } from '../../src/lib/templates/detector';
import type { Submodel } from '../../src/shared/types';

describe('detectTemplate', () => {
  it('detects Digital Nameplate template', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nameplate',
      semanticId: {
        type: 'ExternalReference',
        keys: [{ type: 'GlobalReference', value: 'https://admin-shell.io/zvei/nameplate/2/0/Nameplate' }],
      },
    };

    expect(detectTemplate(submodel)).toBe(TemplateType.NAMEPLATE);
  });

  it('detects Carbon Footprint template', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:pcf',
      semanticId: {
        type: 'ExternalReference',
        keys: [{ type: 'GlobalReference', value: 'https://admin-shell.io/idta/CarbonFootprint/ProductCarbonFootprint/0/9' }],
      },
    };

    expect(detectTemplate(submodel)).toBe(TemplateType.CARBON_FOOTPRINT);
  });

  it('returns GENERIC for unknown templates', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:unknown',
      semanticId: {
        type: 'ExternalReference',
        keys: [{ type: 'GlobalReference', value: 'https://example.com/custom/template' }],
      },
    };

    expect(detectTemplate(submodel)).toBe(TemplateType.GENERIC);
  });

  it('returns GENERIC when no semanticId', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nosemantic',
    };

    expect(detectTemplate(submodel)).toBe(TemplateType.GENERIC);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/template-detector.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create types file**

Create `src/lib/templates/types.ts`:

```typescript
/**
 * Template Types for IDTA Submodel Rendering
 */

import type { LangStringSet } from '@shared/types';

export enum TemplateType {
  NAMEPLATE = 'nameplate',
  CARBON_FOOTPRINT = 'carbon_footprint',
  TECHNICAL_DATA = 'technical_data',
  HANDOVER_DOCUMENTATION = 'handover_documentation',
  GENERIC = 'generic',
}

/**
 * Digital Nameplate data extracted from IDTA 02006-3-0 template
 */
export interface NameplateData {
  manufacturerName?: string;
  manufacturerProductDesignation?: string;
  manufacturerProductFamily?: string;
  serialNumber?: string;
  batchNumber?: string;
  productCountryOfOrigin?: string;
  yearOfConstruction?: string;
  dateOfManufacture?: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  softwareVersion?: string;
  contactInfo?: ContactInfo;
  markings?: Marking[];
}

export interface ContactInfo {
  companyName?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

export interface Marking {
  name: string;
  file?: string;
  additionalText?: string;
}

/**
 * Carbon Footprint data extracted from IDTA 02023-0-9 template
 */
export interface CarbonFootprintData {
  pcfTotal?: number;
  pcfUnit?: string;
  pcfCalculationMethod?: string;
  pcfReferenceValueForCalculation?: string;
  pcfQuantityOfMeasureForCalculation?: number;
  pcfLifeCyclePhases?: LifeCyclePhase[];
  pcfGoodsAddressHandover?: AddressInfo;
  publicationDate?: string;
  expirationDate?: string;
}

export interface LifeCyclePhase {
  phase: string;
  value: number;
  unit: string;
}

export interface AddressInfo {
  street?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}

/**
 * Multi-language text helper
 */
export function getPreferredText(
  langStrings: LangStringSet[] | undefined,
  preferredLang = 'en'
): string | undefined {
  if (!langStrings || langStrings.length === 0) return undefined;

  // Try preferred language first
  const preferred = langStrings.find((ls) => ls.language === preferredLang);
  if (preferred) return preferred.text;

  // Fall back to first available
  return langStrings[0]?.text;
}
```

**Step 4: Create detector file**

Create `src/lib/templates/detector.ts`:

```typescript
/**
 * Template Detector
 * Detects IDTA template type from Submodel semanticId
 */

import type { Submodel } from '@shared/types';
import { TemplateType } from './types';

export { TemplateType };

/**
 * Semantic ID patterns for template detection
 * Matches partial URIs to handle version variations
 */
const SEMANTIC_ID_PATTERNS: Record<string, TemplateType> = {
  'https://admin-shell.io/zvei/nameplate': TemplateType.NAMEPLATE,
  'https://admin-shell.io/idta/CarbonFootprint': TemplateType.CARBON_FOOTPRINT,
  'https://admin-shell.io/ZVEI/TechnicalData': TemplateType.TECHNICAL_DATA,
  'https://admin-shell.io/vdi/2770/1/0/Documentation': TemplateType.HANDOVER_DOCUMENTATION,
};

/**
 * Extracts the first key value from a submodel's semanticId
 */
function getSemanticIdValue(submodel: Submodel): string | undefined {
  return submodel.semanticId?.keys?.[0]?.value;
}

/**
 * Detects the template type for a given submodel based on its semanticId
 */
export function detectTemplate(submodel: Submodel): TemplateType {
  const semanticId = getSemanticIdValue(submodel);
  if (!semanticId) return TemplateType.GENERIC;

  // Check each pattern (partial match to handle version differences)
  for (const [pattern, templateType] of Object.entries(SEMANTIC_ID_PATTERNS)) {
    if (semanticId.startsWith(pattern)) {
      return templateType;
    }
  }

  return TemplateType.GENERIC;
}

/**
 * Checks if a submodel has a specific template type
 */
export function isTemplateType(submodel: Submodel, type: TemplateType): boolean {
  return detectTemplate(submodel) === type;
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/template-detector.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/templates/types.ts src/lib/templates/detector.ts tests/unit/template-detector.test.ts
git commit -m "feat: add template detection system for IDTA submodels

Detects template type from submodel semanticId.
Supports: Digital Nameplate, Carbon Footprint, Technical Data, Documentation."
```

---

## Task 4: Create Nameplate Field Extractor

**Files:**
- Create: `src/lib/templates/extractors/nameplate.ts`
- Test: `tests/unit/nameplate-extractor.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/nameplate-extractor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractNameplateData } from '../../src/lib/templates/extractors/nameplate';
import type { Submodel } from '../../src/shared/types';

describe('extractNameplateData', () => {
  it('extracts manufacturer name from MLP', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nameplate',
      submodelElements: [
        {
          modelType: 'MultiLanguageProperty',
          idShort: 'ManufacturerName',
          value: [{ language: 'en', text: 'Festo SE' }],
        },
      ],
    };

    const data = extractNameplateData(submodel);
    expect(data.manufacturerName).toBe('Festo SE');
  });

  it('extracts serial number from Property', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nameplate',
      submodelElements: [
        {
          modelType: 'Property',
          idShort: 'SerialNumber',
          valueType: 'xs:string',
          value: 'SN-12345',
        },
      ],
    };

    const data = extractNameplateData(submodel);
    expect(data.serialNumber).toBe('SN-12345');
  });

  it('extracts contact info from nested collection', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:nameplate',
      submodelElements: [
        {
          modelType: 'SubmodelElementCollection',
          idShort: 'ContactInformation',
          value: [
            {
              modelType: 'MultiLanguageProperty',
              idShort: 'Company',
              value: [{ language: 'en', text: 'Acme Corp' }],
            },
            {
              modelType: 'Property',
              idShort: 'Phone',
              valueType: 'xs:string',
              value: '+1-555-1234',
            },
          ],
        },
      ],
    };

    const data = extractNameplateData(submodel);
    expect(data.contactInfo?.companyName).toBe('Acme Corp');
    expect(data.contactInfo?.phone).toBe('+1-555-1234');
  });

  it('returns empty object for empty submodel', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:empty',
    };

    const data = extractNameplateData(submodel);
    expect(data).toEqual({});
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/nameplate-extractor.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create nameplate extractor**

Create `src/lib/templates/extractors/nameplate.ts`:

```typescript
/**
 * Nameplate Data Extractor
 * Extracts Digital Nameplate fields from IDTA 02006-3-0 submodel
 */

import type { Submodel, SubmodelElement, SubmodelElementCollection, Property, MultiLanguageProperty } from '@shared/types';
import type { NameplateData, ContactInfo, Marking } from '../types';
import { getPreferredText } from '../types';

/**
 * Field mappings from IDTA nameplate idShort to our data model
 */
const FIELD_MAPPINGS: Record<string, keyof NameplateData> = {
  ManufacturerName: 'manufacturerName',
  ManufacturerProductDesignation: 'manufacturerProductDesignation',
  ManufacturerProductFamily: 'manufacturerProductFamily',
  SerialNumber: 'serialNumber',
  BatchNumber: 'batchNumber',
  ProductCountryOfOrigin: 'productCountryOfOrigin',
  YearOfConstruction: 'yearOfConstruction',
  DateOfManufacture: 'dateOfManufacture',
  HardwareVersion: 'hardwareVersion',
  FirmwareVersion: 'firmwareVersion',
  SoftwareVersion: 'softwareVersion',
};

const CONTACT_FIELD_MAPPINGS: Record<string, keyof ContactInfo> = {
  Company: 'companyName',
  CompanyName: 'companyName',
  Street: 'street',
  ZipCode: 'zipCode',
  Zipcode: 'zipCode',
  CityTown: 'city',
  City: 'city',
  NationalCode: 'country',
  Country: 'country',
  Phone: 'phone',
  Telefon: 'phone',
  Fax: 'fax',
  Email: 'email',
  EmailAddress: 'email',
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
 * Extracts contact information from ContactInformation collection
 */
function extractContactInfo(collection: SubmodelElementCollection): ContactInfo {
  const info: ContactInfo = {};
  const elements = collection.value || [];

  for (const element of elements) {
    const idShort = element.idShort || '';
    const mappedField = CONTACT_FIELD_MAPPINGS[idShort];

    if (mappedField) {
      const value = extractValue(element);
      if (value) {
        info[mappedField] = value;
      }
    }
  }

  return info;
}

/**
 * Extracts markings from Markings collection
 */
function extractMarkings(collection: SubmodelElementCollection): Marking[] {
  const markings: Marking[] = [];
  const elements = collection.value || [];

  for (const element of elements) {
    if (element.modelType === 'SubmodelElementCollection') {
      const markingCollection = element as SubmodelElementCollection;
      const marking: Marking = {
        name: element.idShort || 'Unknown',
      };

      for (const child of markingCollection.value || []) {
        if (child.modelType === 'File' && child.idShort === 'MarkingFile') {
          marking.file = (child as { value?: string }).value;
        }
        if (child.idShort === 'MarkingAdditionalText') {
          marking.additionalText = extractValue(child);
        }
      }

      markings.push(marking);
    }
  }

  return markings;
}

/**
 * Extracts nameplate data from a Digital Nameplate submodel
 */
export function extractNameplateData(submodel: Submodel): NameplateData {
  const data: NameplateData = {};
  const elements = submodel.submodelElements || [];

  for (const element of elements) {
    const idShort = element.idShort || '';

    // Handle direct field mappings
    const mappedField = FIELD_MAPPINGS[idShort];
    if (mappedField) {
      const value = extractValue(element);
      if (value) {
        (data as Record<string, string>)[mappedField] = value;
      }
      continue;
    }

    // Handle ContactInformation collection
    if (idShort === 'ContactInformation' && element.modelType === 'SubmodelElementCollection') {
      data.contactInfo = extractContactInfo(element as SubmodelElementCollection);
      continue;
    }

    // Handle Markings collection
    if (idShort === 'Markings' && element.modelType === 'SubmodelElementCollection') {
      data.markings = extractMarkings(element as SubmodelElementCollection);
      continue;
    }
  }

  return data;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/nameplate-extractor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/templates/extractors/nameplate.ts tests/unit/nameplate-extractor.test.ts
git commit -m "feat: add Digital Nameplate field extractor

Extracts nameplate fields per IDTA 02006-3-0 spec:
- Manufacturer info, serial/batch numbers, versions
- Contact information from nested collection
- Markings (CE, regulatory certifications)"
```

---

## Task 5: Create NameplateView Component

**Files:**
- Create: `src/sidepanel/components/templates/NameplateView.tsx`

**Step 1: Create the component**

Create `src/sidepanel/components/templates/NameplateView.tsx`:

```typescript
/**
 * NameplateView Component
 * Card-based UI for Digital Nameplate submodel
 */

import { Building2, Package, Hash, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import type { Submodel } from '@shared/types';
import { extractNameplateData } from '@lib/templates/extractors/nameplate';
import type { NameplateData, ContactInfo } from '@lib/templates/types';

interface NameplateViewProps {
  submodel: Submodel;
}

function InfoRow({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
  if (!value) return null;

  return (
    <div className="nameplate-row">
      {icon && <span className="nameplate-icon">{icon}</span>}
      <span className="nameplate-label">{label}:</span>
      <span className="nameplate-value">{value}</span>
    </div>
  );
}

function ContactCard({ contact }: { contact: ContactInfo }) {
  const hasAddress = contact.street || contact.city || contact.country;
  const hasContact = contact.phone || contact.email || contact.fax;

  if (!contact.companyName && !hasAddress && !hasContact) return null;

  return (
    <div className="nameplate-section">
      <h4 className="nameplate-section-title">Contact Information</h4>
      {contact.companyName && (
        <InfoRow label="Company" value={contact.companyName} icon={<Building2 size={14} />} />
      )}
      {hasAddress && (
        <InfoRow
          label="Address"
          value={[contact.street, contact.zipCode, contact.city, contact.country].filter(Boolean).join(', ')}
          icon={<MapPin size={14} />}
        />
      )}
      {contact.phone && (
        <InfoRow label="Phone" value={contact.phone} icon={<Phone size={14} />} />
      )}
      {contact.email && (
        <InfoRow label="Email" value={contact.email} icon={<Mail size={14} />} />
      )}
    </div>
  );
}

export function NameplateView({ submodel }: NameplateViewProps) {
  const data: NameplateData = extractNameplateData(submodel);

  // Check if we have any data to display
  const hasData = Object.values(data).some((v) => v !== undefined);
  if (!hasData) {
    return (
      <div className="card">
        <p style={{ color: 'var(--color-gray-500)' }}>No nameplate data found in this submodel.</p>
      </div>
    );
  }

  return (
    <div className="nameplate-card">
      {/* Header: Manufacturer & Product */}
      <div className="nameplate-header">
        {data.manufacturerName && (
          <h3 className="nameplate-manufacturer">{data.manufacturerName}</h3>
        )}
        {data.manufacturerProductDesignation && (
          <p className="nameplate-product">{data.manufacturerProductDesignation}</p>
        )}
        {data.manufacturerProductFamily && (
          <p className="nameplate-family">{data.manufacturerProductFamily}</p>
        )}
      </div>

      {/* Identification Section */}
      <div className="nameplate-section">
        <h4 className="nameplate-section-title">Identification</h4>
        <InfoRow label="Serial Number" value={data.serialNumber} icon={<Hash size={14} />} />
        <InfoRow label="Batch Number" value={data.batchNumber} icon={<Package size={14} />} />
        <InfoRow label="Country of Origin" value={data.productCountryOfOrigin} icon={<MapPin size={14} />} />
      </div>

      {/* Manufacturing Section */}
      {(data.yearOfConstruction || data.dateOfManufacture) && (
        <div className="nameplate-section">
          <h4 className="nameplate-section-title">Manufacturing</h4>
          <InfoRow label="Year of Construction" value={data.yearOfConstruction} icon={<Calendar size={14} />} />
          <InfoRow label="Date of Manufacture" value={data.dateOfManufacture} icon={<Calendar size={14} />} />
        </div>
      )}

      {/* Version Section */}
      {(data.hardwareVersion || data.firmwareVersion || data.softwareVersion) && (
        <div className="nameplate-section">
          <h4 className="nameplate-section-title">Versions</h4>
          <InfoRow label="Hardware" value={data.hardwareVersion} />
          <InfoRow label="Firmware" value={data.firmwareVersion} />
          <InfoRow label="Software" value={data.softwareVersion} />
        </div>
      )}

      {/* Contact Information */}
      {data.contactInfo && <ContactCard contact={data.contactInfo} />}

      {/* Markings */}
      {data.markings && data.markings.length > 0 && (
        <div className="nameplate-section">
          <h4 className="nameplate-section-title">Markings & Certifications</h4>
          <div className="nameplate-markings">
            {data.markings.map((marking, index) => (
              <span key={index} className="nameplate-marking">
                {marking.name}
                {marking.additionalText && ` (${marking.additionalText})`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add CSS styles**

Add to `src/sidepanel/sidepanel.css`:

```css
/* Nameplate View Styles */
.nameplate-card {
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.nameplate-header {
  border-bottom: 1px solid var(--color-gray-200);
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
}

.nameplate-manufacturer {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-gray-900);
  margin: 0;
}

.nameplate-product {
  font-size: 0.875rem;
  color: var(--color-gray-600);
  margin: 0.25rem 0 0;
}

.nameplate-family {
  font-size: 0.75rem;
  color: var(--color-gray-500);
  margin: 0.125rem 0 0;
}

.nameplate-section {
  margin-top: 0.75rem;
}

.nameplate-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem;
}

.nameplate-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}

.nameplate-icon {
  color: var(--color-gray-400);
  flex-shrink: 0;
}

.nameplate-label {
  color: var(--color-gray-600);
  flex-shrink: 0;
}

.nameplate-value {
  color: var(--color-gray-900);
  font-weight: 500;
}

.nameplate-markings {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.nameplate-marking {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}
```

**Step 3: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/sidepanel/components/templates/NameplateView.tsx src/sidepanel/sidepanel.css
git commit -m "feat: add NameplateView component for Digital Nameplate rendering

Card-based UI displaying:
- Manufacturer header with product designation
- Identification section (serial, batch, origin)
- Manufacturing dates
- Version information
- Contact details
- Markings and certifications"
```

---

## Task 6: Integrate Template Rendering in SubmodelTree

**Files:**
- Modify: `src/sidepanel/components/SubmodelTree.tsx`

**Step 1: Import template detection and views**

Add imports at top of `src/sidepanel/components/SubmodelTree.tsx`:

```typescript
import { detectTemplate, TemplateType } from '@lib/templates/detector';
import { NameplateView } from './templates/NameplateView';
```

**Step 2: Create SubmodelWithTemplate component**

Add before the `SubmodelTree` component:

```typescript
function SubmodelWithTemplate({ submodel, index }: { submodel: Submodel; index: number }) {
  const [showRaw, setShowRaw] = useState(false);
  const templateType = detectTemplate(submodel);

  // For known templates, render specialized view with toggle
  if (templateType !== TemplateType.GENERIC) {
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

  // Default: generic tree view
  return <SubmodelGenericTree submodel={submodel} index={index} />;
}

function renderTemplateView(type: TemplateType, submodel: Submodel): React.ReactNode {
  switch (type) {
    case TemplateType.NAMEPLATE:
      return <NameplateView submodel={submodel} />;
    // Future: Add more template views here
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
```

**Step 3: Update SubmodelTree to use new component**

Replace the map in `SubmodelTree`:

```typescript
export function SubmodelTree({ submodels }: SubmodelTreeProps) {
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
        if (!submodel || typeof submodel !== 'object') {
          return null;
        }
        return <SubmodelWithTemplate key={submodel.id || index} submodel={submodel} index={index} />;
      })}
    </div>
  );
}
```

**Step 4: Add template toggle CSS**

Add to `src/sidepanel/sidepanel.css`:

```css
/* Template Header Styles */
.template-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-gray-100);
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
}

.template-badge {
  background: var(--color-primary);
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
}

.template-name {
  font-weight: 500;
  flex: 1;
}

.template-toggle {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-gray-200);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.template-toggle:hover {
  background: var(--color-gray-300);
}
```

**Step 5: Verify build passes**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/sidepanel/components/SubmodelTree.tsx src/sidepanel/sidepanel.css
git commit -m "feat: integrate template rendering in SubmodelTree

- Detects template type from submodel semanticId
- Renders NameplateView for Digital Nameplate submodels
- Adds toggle between card view and tree view
- Falls back to generic tree for unknown templates"
```

---

## Task 7: Create Carbon Footprint Extractor

**Files:**
- Create: `src/lib/templates/extractors/carbon-footprint.ts`
- Test: `tests/unit/carbon-footprint-extractor.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/carbon-footprint-extractor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractCarbonFootprintData } from '../../src/lib/templates/extractors/carbon-footprint';
import type { Submodel } from '../../src/shared/types';

describe('extractCarbonFootprintData', () => {
  it('extracts PCF total value', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:pcf',
      submodelElements: [
        {
          modelType: 'SubmodelElementCollection',
          idShort: 'ProductCarbonFootprint',
          value: [
            {
              modelType: 'Property',
              idShort: 'PCFGoodsAddressHandover',
              valueType: 'xs:string',
              value: 'Germany',
            },
            {
              modelType: 'Property',
              idShort: 'PCFCO2eq',
              valueType: 'xs:double',
              value: '12.5',
            },
          ],
        },
      ],
    };

    const data = extractCarbonFootprintData(submodel);
    expect(data.pcfTotal).toBe(12.5);
  });

  it('extracts calculation method', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:pcf',
      submodelElements: [
        {
          modelType: 'SubmodelElementCollection',
          idShort: 'ProductCarbonFootprint',
          value: [
            {
              modelType: 'Property',
              idShort: 'PCFCalculationMethod',
              valueType: 'xs:string',
              value: 'GHG Protocol',
            },
          ],
        },
      ],
    };

    const data = extractCarbonFootprintData(submodel);
    expect(data.pcfCalculationMethod).toBe('GHG Protocol');
  });

  it('returns empty object for empty submodel', () => {
    const submodel: Submodel = {
      modelType: 'Submodel',
      id: 'urn:example:empty',
    };

    const data = extractCarbonFootprintData(submodel);
    expect(data).toEqual({});
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/carbon-footprint-extractor.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create carbon footprint extractor**

Create `src/lib/templates/extractors/carbon-footprint.ts`:

```typescript
/**
 * Carbon Footprint Data Extractor
 * Extracts PCF data from IDTA 02023-0-9 submodel
 */

import type { Submodel, SubmodelElement, SubmodelElementCollection, Property } from '@shared/types';
import type { CarbonFootprintData } from '../types';

/**
 * Field mappings for Carbon Footprint submodel
 */
const FIELD_MAPPINGS: Record<string, keyof CarbonFootprintData | 'pcfTotal'> = {
  PCFCO2eq: 'pcfTotal',
  PCFTotal: 'pcfTotal',
  PCFCalculationMethod: 'pcfCalculationMethod',
  PCFReferenceValueForCalculation: 'pcfReferenceValueForCalculation',
  PCFQuantityOfMeasureForCalculation: 'pcfQuantityOfMeasureForCalculation',
  PublicationDate: 'publicationDate',
  ExpirationDate: 'expirationDate',
};

/**
 * Extracts numeric value from a Property
 */
function extractNumericValue(element: SubmodelElement): number | undefined {
  if (element.modelType !== 'Property') return undefined;
  const prop = element as Property;
  if (!prop.value) return undefined;
  const num = parseFloat(prop.value);
  return isNaN(num) ? undefined : num;
}

/**
 * Extracts string value from a Property
 */
function extractStringValue(element: SubmodelElement): string | undefined {
  if (element.modelType !== 'Property') return undefined;
  return (element as Property).value;
}

/**
 * Recursively searches for PCF fields in submodel elements
 */
function processElements(elements: SubmodelElement[], data: CarbonFootprintData): void {
  for (const element of elements) {
    const idShort = element.idShort || '';
    const mappedField = FIELD_MAPPINGS[idShort];

    if (mappedField) {
      if (mappedField === 'pcfTotal' || mappedField === 'pcfQuantityOfMeasureForCalculation') {
        const value = extractNumericValue(element);
        if (value !== undefined) {
          (data as Record<string, number>)[mappedField] = value;
        }
      } else {
        const value = extractStringValue(element);
        if (value) {
          (data as Record<string, string>)[mappedField] = value;
        }
      }
    }

    // Recursively process collections
    if (element.modelType === 'SubmodelElementCollection') {
      const collection = element as SubmodelElementCollection;
      if (collection.value) {
        processElements(collection.value, data);
      }
    }
  }
}

/**
 * Extracts carbon footprint data from a PCF submodel
 */
export function extractCarbonFootprintData(submodel: Submodel): CarbonFootprintData {
  const data: CarbonFootprintData = {};
  const elements = submodel.submodelElements || [];

  processElements(elements, data);

  // Set default unit if we have a total
  if (data.pcfTotal !== undefined && !data.pcfUnit) {
    data.pcfUnit = 'kg CO2e';
  }

  return data;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/carbon-footprint-extractor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/templates/extractors/carbon-footprint.ts tests/unit/carbon-footprint-extractor.test.ts
git commit -m "feat: add Carbon Footprint data extractor

Extracts PCF fields per IDTA 02023-0-9 spec:
- PCF total (CO2 equivalent)
- Calculation method and reference values
- Publication and expiration dates"
```

---

## Task 8: Create CarbonFootprintView Component

**Files:**
- Create: `src/sidepanel/components/templates/CarbonFootprintView.tsx`

**Step 1: Create the component**

Create `src/sidepanel/components/templates/CarbonFootprintView.tsx`:

```typescript
/**
 * CarbonFootprintView Component
 * Visual display for Carbon Footprint submodel with gauge
 */

import { Leaf, Calendar, Calculator } from 'lucide-react';
import type { Submodel } from '@shared/types';
import { extractCarbonFootprintData } from '@lib/templates/extractors/carbon-footprint';
import type { CarbonFootprintData } from '@lib/templates/types';

interface CarbonFootprintViewProps {
  submodel: Submodel;
}

function CO2Gauge({ value, unit }: { value: number; unit: string }) {
  // Color scale: green (low) -> yellow -> red (high)
  const getColor = (val: number) => {
    if (val < 5) return 'var(--color-success)';
    if (val < 20) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className="pcf-gauge">
      <div className="pcf-gauge-circle" style={{ borderColor: getColor(value) }}>
        <span className="pcf-gauge-value">{value.toFixed(1)}</span>
        <span className="pcf-gauge-unit">{unit}</span>
      </div>
      <div className="pcf-gauge-label">Carbon Footprint</div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="pcf-info-item">
      <span className="pcf-info-icon">{icon}</span>
      <div>
        <div className="pcf-info-label">{label}</div>
        <div className="pcf-info-value">{value}</div>
      </div>
    </div>
  );
}

export function CarbonFootprintView({ submodel }: CarbonFootprintViewProps) {
  const data: CarbonFootprintData = extractCarbonFootprintData(submodel);

  // Check if we have the main PCF value
  if (data.pcfTotal === undefined) {
    return (
      <div className="card">
        <p style={{ color: 'var(--color-gray-500)' }}>
          No carbon footprint data found in this submodel.
        </p>
      </div>
    );
  }

  return (
    <div className="pcf-card">
      <CO2Gauge value={data.pcfTotal} unit={data.pcfUnit || 'kg CO2e'} />

      <div className="pcf-details">
        <InfoItem
          icon={<Calculator size={16} />}
          label="Calculation Method"
          value={data.pcfCalculationMethod}
        />
        <InfoItem
          icon={<Leaf size={16} />}
          label="Reference Value"
          value={data.pcfReferenceValueForCalculation}
        />
        <InfoItem
          icon={<Calendar size={16} />}
          label="Valid Until"
          value={data.expirationDate}
        />
      </div>
    </div>
  );
}
```

**Step 2: Add CSS styles**

Add to `src/sidepanel/sidepanel.css`:

```css
/* Carbon Footprint View Styles */
.pcf-card {
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  text-align: center;
}

.pcf-gauge {
  margin-bottom: 1.5rem;
}

.pcf-gauge-circle {
  width: 120px;
  height: 120px;
  border: 4px solid;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  background: white;
}

.pcf-gauge-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-gray-900);
}

.pcf-gauge-unit {
  font-size: 0.75rem;
  color: var(--color-gray-500);
}

.pcf-gauge-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-gray-600);
  margin-top: 0.5rem;
}

.pcf-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
  border-top: 1px solid var(--color-gray-200);
  padding-top: 1rem;
}

.pcf-info-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.pcf-info-icon {
  color: var(--color-gray-400);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.pcf-info-label {
  font-size: 0.75rem;
  color: var(--color-gray-500);
}

.pcf-info-value {
  font-size: 0.875rem;
  color: var(--color-gray-900);
  font-weight: 500;
}
```

**Step 3: Update SubmodelTree to include CarbonFootprintView**

In `src/sidepanel/components/SubmodelTree.tsx`, add import and case:

```typescript
import { CarbonFootprintView } from './templates/CarbonFootprintView';

// In renderTemplateView function:
function renderTemplateView(type: TemplateType, submodel: Submodel): React.ReactNode {
  switch (type) {
    case TemplateType.NAMEPLATE:
      return <NameplateView submodel={submodel} />;
    case TemplateType.CARBON_FOOTPRINT:
      return <CarbonFootprintView submodel={submodel} />;
    default:
      return null;
  }
}
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/sidepanel/components/templates/CarbonFootprintView.tsx src/sidepanel/components/SubmodelTree.tsx src/sidepanel/sidepanel.css
git commit -m "feat: add CarbonFootprintView component

Visual CO2 gauge display with:
- Circular gauge with color-coded value
- Calculation method and reference info
- Expiration date display"
```

---

## Task 9: Create Compare Store (Chrome Storage)

**Files:**
- Create: `src/lib/compare/store.ts`
- Create: `src/lib/compare/types.ts`
- Test: `tests/unit/compare-store.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/compare-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompareStore } from '../../src/lib/compare/store';
import type { CompareItem } from '../../src/lib/compare/types';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string[]) => Promise.resolve(
        keys.reduce((acc, key) => ({ ...acc, [key]: mockStorage[key] }), {})
      )),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string[]) => {
        keys.forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      }),
    },
  },
});

describe('CompareStore', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  it('adds an item to the compare list', async () => {
    const item: Omit<CompareItem, 'id' | 'timestamp'> = {
      name: 'Test Asset',
      data: { assetAdministrationShells: [], submodels: [] },
    };

    const store = new CompareStore();
    const id = await store.addItem(item);

    expect(id).toBeDefined();
    const items = await store.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Test Asset');
  });

  it('removes an item from the compare list', async () => {
    const store = new CompareStore();
    const id = await store.addItem({
      name: 'Test Asset',
      data: { assetAdministrationShells: [], submodels: [] },
    });

    await store.removeItem(id);
    const items = await store.getItems();
    expect(items).toHaveLength(0);
  });

  it('clears all items', async () => {
    const store = new CompareStore();
    await store.addItem({ name: 'Asset 1', data: { assetAdministrationShells: [], submodels: [] } });
    await store.addItem({ name: 'Asset 2', data: { assetAdministrationShells: [], submodels: [] } });

    await store.clear();
    const items = await store.getItems();
    expect(items).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/compare-store.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create types file**

Create `src/lib/compare/types.ts`:

```typescript
/**
 * Compare Cart Types
 */

import type { AASEnvironment } from '@shared/types';

export interface CompareItem {
  id: string;
  name: string;
  timestamp: number;
  thumbnail?: string;
  data: AASEnvironment;
}

export interface CompareState {
  items: CompareItem[];
  maxItems: number;
}

export const COMPARE_STORAGE_KEY = 'twinlens_compare_items';
export const MAX_COMPARE_ITEMS = 4;
```

**Step 4: Create store file**

Create `src/lib/compare/store.ts`:

```typescript
/**
 * Compare Store
 * Manages compare cart items in chrome.storage.local
 */

import type { CompareItem, CompareState } from './types';
import { COMPARE_STORAGE_KEY, MAX_COMPARE_ITEMS } from './types';
import type { AASEnvironment } from '@shared/types';

export class CompareStore {
  private maxItems: number;

  constructor(maxItems = MAX_COMPARE_ITEMS) {
    this.maxItems = maxItems;
  }

  /**
   * Generates a unique ID for a compare item
   */
  private generateId(): string {
    return `compare_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets all items from storage
   */
  async getItems(): Promise<CompareItem[]> {
    const result = await chrome.storage.local.get([COMPARE_STORAGE_KEY]);
    const state = result[COMPARE_STORAGE_KEY] as CompareState | undefined;
    return state?.items || [];
  }

  /**
   * Saves items to storage
   */
  private async saveItems(items: CompareItem[]): Promise<void> {
    const state: CompareState = {
      items,
      maxItems: this.maxItems,
    };
    await chrome.storage.local.set({ [COMPARE_STORAGE_KEY]: state });
  }

  /**
   * Adds an item to the compare list
   * Returns the ID of the added item
   */
  async addItem(item: Omit<CompareItem, 'id' | 'timestamp'>): Promise<string> {
    const items = await this.getItems();

    // Enforce max items limit
    if (items.length >= this.maxItems) {
      throw new Error(`Compare cart is full (max ${this.maxItems} items)`);
    }

    const newItem: CompareItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    items.push(newItem);
    await this.saveItems(items);

    return newItem.id;
  }

  /**
   * Removes an item by ID
   */
  async removeItem(id: string): Promise<void> {
    const items = await this.getItems();
    const filtered = items.filter(item => item.id !== id);
    await this.saveItems(filtered);
  }

  /**
   * Clears all items
   */
  async clear(): Promise<void> {
    await chrome.storage.local.remove([COMPARE_STORAGE_KEY]);
  }

  /**
   * Checks if an environment is already in the compare list
   * Uses globalAssetId as the identifier
   */
  async hasItem(env: AASEnvironment): Promise<boolean> {
    const items = await this.getItems();
    const assetId = env.assetAdministrationShells[0]?.assetInformation?.globalAssetId;

    if (!assetId) return false;

    return items.some(item =>
      item.data.assetAdministrationShells[0]?.assetInformation?.globalAssetId === assetId
    );
  }

  /**
   * Gets the current item count
   */
  async getCount(): Promise<number> {
    const items = await this.getItems();
    return items.length;
  }
}

// Singleton instance
export const compareStore = new CompareStore();
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/compare-store.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/compare/types.ts src/lib/compare/store.ts tests/unit/compare-store.test.ts
git commit -m "feat: add Compare Store for persisting pinned assets

Uses chrome.storage.local to persist compare items across sessions.
Supports: add, remove, clear, has, getCount operations.
Enforces max 4 items limit."
```

---

## Task 10: Create Compare Cart UI Component

**Files:**
- Create: `src/sidepanel/components/CompareCart.tsx`

**Step 1: Create the component**

Create `src/sidepanel/components/CompareCart.tsx`:

```typescript
/**
 * CompareCart Component
 * Shows pinned items for comparison
 */

import { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight } from 'lucide-react';
import { compareStore } from '@lib/compare/store';
import type { CompareItem } from '@lib/compare/types';

interface CompareCartProps {
  onCompare: () => void;
}

export function CompareCart({ onCompare }: CompareCartProps) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const stored = await compareStore.getItems();
    setItems(stored);
    setLoading(false);
  }

  async function handleRemove(id: string) {
    await compareStore.removeItem(id);
    await loadItems();
  }

  async function handleClear() {
    await compareStore.clear();
    setItems([]);
  }

  if (loading) {
    return (
      <div className="compare-cart loading">
        <div className="spinner" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="compare-cart empty">
        <p>No items pinned for comparison.</p>
        <p className="compare-hint">Load an AASX file and click "Pin to Compare" to add it here.</p>
      </div>
    );
  }

  return (
    <div className="compare-cart">
      <div className="compare-cart-header">
        <h3>Pinned for Comparison ({items.length}/4)</h3>
        <button className="compare-clear-btn" onClick={handleClear}>
          <Trash2 size={14} /> Clear All
        </button>
      </div>

      <div className="compare-cart-items">
        {items.map((item) => (
          <div key={item.id} className="compare-cart-item">
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="compare-item-thumb" />
            )}
            <div className="compare-item-info">
              <span className="compare-item-name">{item.name}</span>
              <span className="compare-item-date">
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
            </div>
            <button
              className="compare-item-remove"
              onClick={() => handleRemove(item.id)}
              aria-label="Remove"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {items.length >= 2 && (
        <button className="compare-action-btn" onClick={onCompare}>
          Compare {items.length} Items <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
```

**Step 2: Add CSS styles**

Add to `src/sidepanel/sidepanel.css`:

```css
/* Compare Cart Styles */
.compare-cart {
  padding: 1rem;
}

.compare-cart.empty {
  text-align: center;
  color: var(--color-gray-500);
}

.compare-hint {
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.compare-cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.compare-cart-header h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.compare-clear-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-gray-100);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-gray-600);
}

.compare-clear-btn:hover {
  background: var(--color-gray-200);
}

.compare-cart-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.compare-cart-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
}

.compare-item-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-gray-100);
}

.compare-item-info {
  flex: 1;
  min-width: 0;
}

.compare-item-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compare-item-date {
  display: block;
  font-size: 0.75rem;
  color: var(--color-gray-500);
}

.compare-item-remove {
  padding: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-gray-400);
}

.compare-item-remove:hover {
  color: var(--color-error);
}

.compare-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
}

.compare-action-btn:hover {
  background: var(--color-primary-dark);
}
```

**Step 3: Verify build passes**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/sidepanel/components/CompareCart.tsx src/sidepanel/sidepanel.css
git commit -m "feat: add CompareCart component

Shows pinned items with:
- Thumbnail, name, and date added
- Remove individual items
- Clear all button
- Compare action when 2+ items pinned"
```

---

## Task 11: Create Compare View Component

**Files:**
- Create: `src/sidepanel/components/CompareView.tsx`
- Create: `src/lib/compare/diff.ts`

**Step 1: Create diff utility**

Create `src/lib/compare/diff.ts`:

```typescript
/**
 * Compare Diff Utilities
 * Comparison logic for AAS environments
 */

import type { AASEnvironment, Submodel, SubmodelElement, Property } from '@shared/types';

export interface ComparedField {
  label: string;
  values: (string | undefined)[];
  isDifferent: boolean;
}

/**
 * Extracts a flat list of key properties from an environment
 */
export function extractKeyFields(env: AASEnvironment): Map<string, string | undefined> {
  const fields = new Map<string, string | undefined>();

  // Asset info
  const shell = env.assetAdministrationShells[0];
  if (shell) {
    fields.set('Asset ID', shell.assetInformation?.globalAssetId);
    fields.set('Asset Kind', shell.assetInformation?.assetKind);
    fields.set('Shell ID', shell.id);
    fields.set('Shell Name', shell.idShort);
  }

  // Extract properties from all submodels
  for (const submodel of env.submodels) {
    extractSubmodelFields(submodel, fields);
  }

  return fields;
}

function extractSubmodelFields(submodel: Submodel, fields: Map<string, string | undefined>, prefix = ''): void {
  const elements = submodel.submodelElements || [];
  const submodelPrefix = prefix || submodel.idShort || '';

  for (const element of elements) {
    extractElementValue(element, fields, submodelPrefix);
  }
}

function extractElementValue(element: SubmodelElement, fields: Map<string, string | undefined>, prefix: string): void {
  const key = prefix ? `${prefix} > ${element.idShort}` : element.idShort || '';

  if (element.modelType === 'Property') {
    const prop = element as Property;
    fields.set(key, prop.value);
  } else if (element.modelType === 'MultiLanguageProperty') {
    const mlp = element as { value?: { language: string; text: string }[] };
    fields.set(key, mlp.value?.[0]?.text);
  } else if (element.modelType === 'SubmodelElementCollection') {
    const collection = element as { value?: SubmodelElement[] };
    for (const child of collection.value || []) {
      extractElementValue(child, fields, key);
    }
  }
}

/**
 * Compares multiple environments and returns compared fields
 */
export function compareEnvironments(environments: AASEnvironment[]): ComparedField[] {
  const allFieldMaps = environments.map(extractKeyFields);

  // Collect all unique field names
  const allKeys = new Set<string>();
  allFieldMaps.forEach(map => map.forEach((_, key) => allKeys.add(key)));

  // Build comparison result
  const compared: ComparedField[] = [];

  for (const label of allKeys) {
    const values = allFieldMaps.map(map => map.get(label));
    const nonEmpty = values.filter(v => v !== undefined);
    const isDifferent = nonEmpty.length > 1 && new Set(nonEmpty).size > 1;

    compared.push({ label, values, isDifferent });
  }

  // Sort: different fields first, then alphabetically
  compared.sort((a, b) => {
    if (a.isDifferent !== b.isDifferent) return a.isDifferent ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return compared;
}
```

**Step 2: Create CompareView component**

Create `src/sidepanel/components/CompareView.tsx`:

```typescript
/**
 * CompareView Component
 * Side-by-side comparison of pinned assets
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { compareStore } from '@lib/compare/store';
import { compareEnvironments } from '@lib/compare/diff';
import type { CompareItem } from '@lib/compare/types';
import type { ComparedField } from '@lib/compare/diff';

interface CompareViewProps {
  onBack: () => void;
}

export function CompareView({ onBack }: CompareViewProps) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [fields, setFields] = useState<ComparedField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDiffOnly, setShowDiffOnly] = useState(false);

  useEffect(() => {
    loadAndCompare();
  }, []);

  async function loadAndCompare() {
    setLoading(true);
    const stored = await compareStore.getItems();
    setItems(stored);

    if (stored.length >= 2) {
      const environments = stored.map(item => item.data);
      const compared = compareEnvironments(environments);
      setFields(compared);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="compare-view loading">
        <div className="spinner" />
      </div>
    );
  }

  if (items.length < 2) {
    return (
      <div className="compare-view">
        <button className="compare-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="compare-empty">
          <AlertCircle size={32} />
          <p>Need at least 2 items to compare.</p>
        </div>
      </div>
    );
  }

  const displayFields = showDiffOnly
    ? fields.filter(f => f.isDifferent)
    : fields;

  const diffCount = fields.filter(f => f.isDifferent).length;

  return (
    <div className="compare-view">
      <div className="compare-view-header">
        <button className="compare-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <label className="compare-diff-toggle">
          <input
            type="checkbox"
            checked={showDiffOnly}
            onChange={(e) => setShowDiffOnly(e.target.checked)}
          />
          Show differences only ({diffCount})
        </label>
      </div>

      <div className="compare-table-container">
        <table className="compare-table">
          <thead>
            <tr>
              <th className="compare-field-col">Field</th>
              {items.map((item) => (
                <th key={item.id} className="compare-value-col">
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayFields.map((field) => (
              <tr key={field.label} className={field.isDifferent ? 'diff-row' : ''}>
                <td className="compare-field-name">{field.label}</td>
                {field.values.map((value, idx) => (
                  <td key={idx} className="compare-field-value">
                    {value ?? <span className="compare-empty-value">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 3: Add CSS styles**

Add to `src/sidepanel/sidepanel.css`:

```css
/* Compare View Styles */
.compare-view {
  padding: 1rem;
}

.compare-view.loading {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.compare-view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.compare-back-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-gray-100);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.875rem;
}

.compare-back-btn:hover {
  background: var(--color-gray-200);
}

.compare-diff-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-gray-600);
}

.compare-empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-gray-500);
}

.compare-table-container {
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}

.compare-table th,
.compare-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--color-gray-200);
}

.compare-table th {
  background: var(--color-gray-100);
  font-weight: 600;
  position: sticky;
  top: 0;
}

.compare-field-col {
  min-width: 150px;
}

.compare-value-col {
  min-width: 120px;
}

.compare-field-name {
  font-weight: 500;
  color: var(--color-gray-700);
}

.compare-field-value {
  color: var(--color-gray-900);
}

.compare-empty-value {
  color: var(--color-gray-400);
}

.diff-row {
  background: var(--color-warning-light);
}

.diff-row .compare-field-name {
  color: var(--color-warning-dark);
}
```

**Step 4: Verify build passes**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/compare/diff.ts src/sidepanel/components/CompareView.tsx src/sidepanel/sidepanel.css
git commit -m "feat: add CompareView component for side-by-side comparison

Compares multiple AAS environments:
- Extracts and flattens all properties
- Highlights differences
- Toggle to show only differing fields
- Responsive table layout"
```

---

## Task 12: Integrate Compare Tab in App

**Files:**
- Modify: `src/sidepanel/App.tsx`

**Step 1: Add Compare tab and integration**

Update `src/sidepanel/App.tsx`:

1. Add imports:
```typescript
import { CompareCart } from './components/CompareCart';
import { CompareView } from './components/CompareView';
import { compareStore } from '@lib/compare/store';
```

2. Update TabId type and TABS:
```typescript
type TabId = 'overview' | 'submodels' | 'documents' | 'compliance' | 'raw' | 'compare';

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'submodels', label: 'Submodels' },
  { id: 'documents', label: 'Documents' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'raw', label: 'Raw JSON' },
  { id: 'compare', label: 'Compare' },
];
```

3. Add state for compare mode:
```typescript
const [compareMode, setCompareMode] = useState<'cart' | 'view'>('cart');
const [isPinned, setIsPinned] = useState(false);
```

4. Add pin handler:
```typescript
const handlePin = async () => {
  if (state.status !== 'success') return;

  const name = state.result.environment.assetAdministrationShells[0]?.idShort
    || state.fileName
    || 'Unnamed Asset';

  try {
    await compareStore.addItem({
      name,
      thumbnail: state.result.thumbnail,
      data: state.result.environment,
    });
    setIsPinned(true);
  } catch (err) {
    console.error('Failed to pin item:', err);
  }
};

// Check if already pinned when loading
useEffect(() => {
  if (state.status === 'success') {
    compareStore.hasItem(state.result.environment).then(setIsPinned);
  }
}, [state]);
```

5. Add Pin button in header (after ExportMenu):
```typescript
{state.status === 'success' && !isPinned && (
  <button
    onClick={handlePin}
    style={{
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
      background: 'var(--color-gray-100)',
      color: 'var(--color-gray-600)',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
    }}
  >
    Pin to Compare
  </button>
)}
{state.status === 'success' && isPinned && (
  <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>
    ✓ Pinned
  </span>
)}
```

6. Add compare case in renderContent:
```typescript
case 'compare':
  return (
    <ErrorBoundary>
      {compareMode === 'cart' ? (
        <CompareCart onCompare={() => setCompareMode('view')} />
      ) : (
        <CompareView onBack={() => setCompareMode('cart')} />
      )}
    </ErrorBoundary>
  );
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/sidepanel/App.tsx
git commit -m "feat: integrate Compare tab in App

- Add Compare tab to navigation
- Pin to Compare button in header when asset loaded
- Toggle between cart view and comparison view
- Track pinned state to prevent duplicates"
```

---

## Task 13: Run Full Test Suite and Build

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: Build successful

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Phase 2 implementation complete

Completed features:
- Fix xs:langString validation
- Fix nested description mapping
- Digital Nameplate template renderer
- Carbon Footprint template renderer
- Compare Cart with chrome.storage persistence
- Side-by-side comparison view with diff highlighting"
```

---

## Verification Checklist

After each major feature, verify:

- [ ] `npm run typecheck` passes
- [ ] `npm test` all tests pass
- [ ] `npm run build` succeeds
- [ ] Manual test: Load Festo fixture, verify nameplate detection
- [ ] Manual test: Pin 2 assets, verify compare works

---

## Files Summary

### New Files Created
| File | Purpose |
|------|---------|
| `src/lib/templates/types.ts` | Template data types |
| `src/lib/templates/detector.ts` | Semantic ID → template detection |
| `src/lib/templates/extractors/nameplate.ts` | Nameplate field extraction |
| `src/lib/templates/extractors/carbon-footprint.ts` | PCF field extraction |
| `src/sidepanel/components/templates/NameplateView.tsx` | Nameplate card UI |
| `src/sidepanel/components/templates/CarbonFootprintView.tsx` | PCF gauge UI |
| `src/lib/compare/types.ts` | Compare cart types |
| `src/lib/compare/store.ts` | Chrome storage CRUD |
| `src/lib/compare/diff.ts` | Environment comparison |
| `src/sidepanel/components/CompareCart.tsx` | Pinned items list |
| `src/sidepanel/components/CompareView.tsx` | Side-by-side table |

### Modified Files
| File | Changes |
|------|---------|
| `src/shared/schemas.ts` | Add xs:langString, relax description |
| `src/sidepanel/components/SubmodelTree.tsx` | Template detection + specialized views |
| `src/sidepanel/App.tsx` | Compare tab + Pin button |
| `src/sidepanel/sidepanel.css` | New component styles |

### Test Files
| File | Purpose |
|------|---------|
| `tests/unit/template-detector.test.ts` | Template detection tests |
| `tests/unit/nameplate-extractor.test.ts` | Nameplate extraction tests |
| `tests/unit/carbon-footprint-extractor.test.ts` | PCF extraction tests |
| `tests/unit/compare-store.test.ts` | Compare store tests |
