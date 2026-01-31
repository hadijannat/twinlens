/**
 * TechnicalDataView Component
 * Visual display for Technical Data submodel (IDTA 02003)
 */

import { Settings, Tag, Info } from 'lucide-react';
import type { Submodel } from '@shared/types';
import type { TechnicalDataData } from '@lib/templates/types';
import { extractTechnicalData } from '@lib/templates/extractors/technical-data';

interface TechnicalDataViewProps {
  submodel: Submodel;
}

export function TechnicalDataView({ submodel }: TechnicalDataViewProps) {
  const data: TechnicalDataData = extractTechnicalData(submodel);

  const hasContent = data.generalInformation ||
    (data.productClassifications && data.productClassifications.length > 0) ||
    (data.technicalProperties && data.technicalProperties.length > 0);

  if (!hasContent) {
    return (
      <div className="card">
        <p style={{ color: 'var(--color-gray-500)' }}>
          No technical data found in this submodel.
        </p>
      </div>
    );
  }

  return (
    <div className="technical-data-view">
      {data.generalInformation && (
        <section className="td-section">
          <h4 className="td-section-title">
            <Info size={14} />
            General Information
          </h4>
          <dl className="td-info-list">
            {data.generalInformation.manufacturerName && (
              <>
                <dt>Manufacturer</dt>
                <dd>{data.generalInformation.manufacturerName}</dd>
              </>
            )}
            {data.generalInformation.manufacturerProductDesignation && (
              <>
                <dt>Product</dt>
                <dd>{data.generalInformation.manufacturerProductDesignation}</dd>
              </>
            )}
            {data.generalInformation.manufacturerOrderCode && (
              <>
                <dt>Order Code</dt>
                <dd>{data.generalInformation.manufacturerOrderCode}</dd>
              </>
            )}
            {data.generalInformation.manufacturerProductRoot && (
              <>
                <dt>Product Root</dt>
                <dd>{data.generalInformation.manufacturerProductRoot}</dd>
              </>
            )}
            {data.generalInformation.manufacturerProductFamily && (
              <>
                <dt>Product Family</dt>
                <dd>{data.generalInformation.manufacturerProductFamily}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {data.productClassifications && data.productClassifications.length > 0 && (
        <section className="td-section">
          <h4 className="td-section-title">
            <Tag size={14} />
            Classifications
          </h4>
          <div className="td-classifications">
            {data.productClassifications.map((cls, i) => (
              <div key={i} className="td-classification-badge">
                <span className="td-cls-system">{cls.system}</span>
                <span className="td-cls-id">{cls.classId}</span>
                {cls.version && <span className="td-cls-version">v{cls.version}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {data.technicalProperties && data.technicalProperties.length > 0 && (
        <section className="td-section">
          <h4 className="td-section-title">
            <Settings size={14} />
            Technical Properties ({data.technicalProperties.length})
          </h4>
          <table className="td-properties-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {data.technicalProperties.map((prop, i) => (
                <tr key={i}>
                  <td className="td-prop-name">
                    {prop.label && <span className="td-prop-label">{prop.label} / </span>}
                    {prop.idShort}
                  </td>
                  <td className="td-prop-value">
                    {prop.value}
                    {prop.unit && <span className="td-prop-unit">{prop.unit}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.furtherInformation && (
        <section className="td-section">
          <h4 className="td-section-title">
            <Info size={14} />
            Further Information
          </h4>
          {data.furtherInformation.validDate && (
            <p className="td-valid-date">Valid until: {data.furtherInformation.validDate}</p>
          )}
          {data.furtherInformation.textStatements && data.furtherInformation.textStatements.length > 0 && (
            <ul className="td-text-statements">
              {data.furtherInformation.textStatements.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
