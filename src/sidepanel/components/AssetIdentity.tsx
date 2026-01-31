/**
 * AssetIdentity Component
 * Displays AAS shell information and asset thumbnail
 */

import { Box, Package } from 'lucide-react';
import type { AssetAdministrationShell } from '@shared/types';

interface AssetIdentityProps {
  shells: AssetAdministrationShell[];
  thumbnail?: string;
}

export function AssetIdentity({ shells, thumbnail }: AssetIdentityProps) {
  if (shells.length === 0) {
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
      {shells.map((shell, index) => (
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

              {shell.description && shell.description.length > 0 && (
                <>
                  <dt>Description</dt>
                  <dd style={{ fontFamily: 'inherit' }}>
                    {shell.description[0]?.text || ''}
                  </dd>
                </>
              )}

              {shell.submodels && shell.submodels.length > 0 && (
                <>
                  <dt>Linked Submodels</dt>
                  <dd>{shell.submodels.length}</dd>
                </>
              )}

              {shell.assetInformation?.specificAssetIds &&
                shell.assetInformation.specificAssetIds.length > 0 && (
                  <>
                    <dt>Specific Asset IDs</dt>
                    <dd>
                      {shell.assetInformation.specificAssetIds.map(
                        (id, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: '0.75rem',
                              marginTop: i > 0 ? '0.25rem' : 0,
                            }}
                          >
                            <strong>{id.name}:</strong> {id.value}
                          </div>
                        )
                      )}
                    </dd>
                  </>
                )}
            </dl>
          </div>
        </div>
      ))}
    </>
  );
}
