/**
 * AssetIdentity Component
 * Displays AAS shell information and asset thumbnail
 */

import { Box, Package } from 'lucide-react';
import type { AssetAdministrationShell, LangStringSet, LegacyDescription } from '@shared/types';

interface AssetIdentityProps {
  shells: AssetAdministrationShell[];
  thumbnail?: string;
}

// Safely convert to array
function safeArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

// Extract first description text from either v3 LangStringSet[] or v2 LegacyDescription format
function getDescriptionText(
  description: LangStringSet[] | LegacyDescription | undefined
): string | undefined {
  if (!description) return undefined;

  // v3 format: LangStringSet[]
  if (Array.isArray(description)) {
    return description[0]?.text;
  }

  // v2 format: { langString: [...] }
  const legacy = description as LegacyDescription;
  if (legacy.langString && legacy.langString.length > 0) {
    const first = legacy.langString[0];
    return first?.text ?? first?.['#text'];
  }

  return undefined;
}

export function AssetIdentity({ shells, thumbnail }: AssetIdentityProps) {
  const shellList = safeArray(shells);

  if (shellList.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <Package size={32} className="empty-state-icon" />
          <p>No Asset Administration Shell found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {shellList.map((shell, index) => {
        const descriptionText = getDescriptionText(shell.description);
        const submodels = safeArray(shell.submodels);
        const specificAssetIds = safeArray(shell.assetInformation?.specificAssetIds);

        return (
          <div key={shell.id || index} className="card">
            <div className="card-header">
              <Box size={16} />
              <span className="card-title">
                {shell.idShort || `Shell ${index + 1}`}
              </span>
            </div>

            <div className="asset-identity">
              {thumbnail && (
                <div className="asset-thumbnail">
                  <img src={thumbnail} alt="Asset thumbnail" />
                </div>
              )}

              <dl className="asset-info">
                <dt>Shell ID</dt>
                <dd>{shell.id}</dd>

                {shell.assetInformation?.globalAssetId && (
                  <>
                    <dt>Global Asset ID</dt>
                    <dd>{shell.assetInformation.globalAssetId}</dd>
                  </>
                )}

                <dt>Asset Kind</dt>
                <dd>{shell.assetInformation?.assetKind || 'Instance'}</dd>

                {shell.assetInformation?.assetType && (
                  <>
                    <dt>Asset Type</dt>
                    <dd>{shell.assetInformation.assetType}</dd>
                  </>
                )}

                {shell.administration?.version && (
                  <>
                    <dt>Version</dt>
                    <dd>
                      {shell.administration.version}
                      {shell.administration.revision &&
                        `.${shell.administration.revision}`}
                    </dd>
                  </>
                )}

                {descriptionText && (
                  <>
                    <dt>Description</dt>
                    <dd style={{ fontFamily: 'inherit' }}>
                      {descriptionText}
                    </dd>
                  </>
                )}

                {submodels.length > 0 && (
                  <>
                    <dt>Linked Submodels</dt>
                    <dd>{submodels.length}</dd>
                  </>
                )}

                {specificAssetIds.length > 0 && (
                  <>
                    <dt>Specific Asset IDs</dt>
                    <dd>
                      {specificAssetIds.map((id, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: '0.75rem',
                            marginTop: i > 0 ? '0.25rem' : 0,
                          }}
                        >
                          <strong>{id.name}:</strong> {id.value}
                        </div>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        );
      })}
    </>
  );
}
