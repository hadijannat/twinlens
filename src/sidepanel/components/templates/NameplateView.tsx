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
