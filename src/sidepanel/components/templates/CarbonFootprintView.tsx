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
