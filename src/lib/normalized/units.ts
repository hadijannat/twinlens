/**
 * Unit Normalization and Conversion
 * Converts values to base SI units for consistent comparison
 */

export interface UnitConversion {
  baseUnit: string;
  factor: number;
  offset?: number;
}

/**
 * Unit conversion definitions
 * Maps common units to their SI base equivalents
 */
const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Power (base: W)
  W: { baseUnit: 'W', factor: 1 },
  kW: { baseUnit: 'W', factor: 1000 },
  MW: { baseUnit: 'W', factor: 1000000 },
  mW: { baseUnit: 'W', factor: 0.001 },
  hp: { baseUnit: 'W', factor: 745.7 },

  // Mass (base: kg)
  kg: { baseUnit: 'kg', factor: 1 },
  g: { baseUnit: 'kg', factor: 0.001 },
  mg: { baseUnit: 'kg', factor: 0.000001 },
  t: { baseUnit: 'kg', factor: 1000 },
  lb: { baseUnit: 'kg', factor: 0.453592 },

  // Length (base: m)
  m: { baseUnit: 'm', factor: 1 },
  mm: { baseUnit: 'm', factor: 0.001 },
  cm: { baseUnit: 'm', factor: 0.01 },
  km: { baseUnit: 'm', factor: 1000 },
  in: { baseUnit: 'm', factor: 0.0254 },
  ft: { baseUnit: 'm', factor: 0.3048 },

  // Voltage (base: V)
  V: { baseUnit: 'V', factor: 1 },
  kV: { baseUnit: 'V', factor: 1000 },
  mV: { baseUnit: 'V', factor: 0.001 },

  // Current (base: A)
  A: { baseUnit: 'A', factor: 1 },
  mA: { baseUnit: 'A', factor: 0.001 },
  kA: { baseUnit: 'A', factor: 1000 },

  // Frequency (base: Hz)
  Hz: { baseUnit: 'Hz', factor: 1 },
  kHz: { baseUnit: 'Hz', factor: 1000 },
  MHz: { baseUnit: 'Hz', factor: 1000000 },

  // Temperature (base: K)
  K: { baseUnit: 'K', factor: 1 },
  '°C': { baseUnit: 'K', factor: 1, offset: 273.15 },
  '°F': { baseUnit: 'K', factor: 5 / 9, offset: 255.372 },

  // CO2 emissions (base: kg CO2e)
  'kg CO2e': { baseUnit: 'kg CO2e', factor: 1 },
  'g CO2e': { baseUnit: 'kg CO2e', factor: 0.001 },
  't CO2e': { baseUnit: 'kg CO2e', factor: 1000 },
  'kg CO2': { baseUnit: 'kg CO2e', factor: 1 },
  'g CO2': { baseUnit: 'kg CO2e', factor: 0.001 },
  't CO2': { baseUnit: 'kg CO2e', factor: 1000 },

  // Speed (base: m/s)
  'm/s': { baseUnit: 'm/s', factor: 1 },
  'km/h': { baseUnit: 'm/s', factor: 0.277778 },
  mph: { baseUnit: 'm/s', factor: 0.44704 },

  // Rotational speed (base: rpm)
  rpm: { baseUnit: 'rpm', factor: 1 },
  'rad/s': { baseUnit: 'rpm', factor: 9.5493 },

  // Pressure (base: Pa)
  Pa: { baseUnit: 'Pa', factor: 1 },
  kPa: { baseUnit: 'Pa', factor: 1000 },
  MPa: { baseUnit: 'Pa', factor: 1000000 },
  bar: { baseUnit: 'Pa', factor: 100000 },
  psi: { baseUnit: 'Pa', factor: 6894.76 },

  // Energy (base: J)
  J: { baseUnit: 'J', factor: 1 },
  kJ: { baseUnit: 'J', factor: 1000 },
  Wh: { baseUnit: 'J', factor: 3600 },
  kWh: { baseUnit: 'J', factor: 3600000 },
};

export interface NormalizedValue {
  value: number;
  unit: string;
  originalValue: number;
  originalUnit: string;
}

/**
 * Normalizes a value to its SI base unit
 */
export function normalizeUnit(value: number, unit: string): NormalizedValue {
  // Clean the unit string
  const cleanUnit = unit.trim();

  const conversion = UNIT_CONVERSIONS[cleanUnit];
  if (!conversion) {
    // No conversion available, return as-is
    return {
      value,
      unit: cleanUnit,
      originalValue: value,
      originalUnit: cleanUnit,
    };
  }

  let normalizedValue = value * conversion.factor;
  if (conversion.offset !== undefined) {
    normalizedValue += conversion.offset;
  }

  return {
    value: normalizedValue,
    unit: conversion.baseUnit,
    originalValue: value,
    originalUnit: cleanUnit,
  };
}

/**
 * Formats a normalized value for display
 */
export function formatValue(normalized: NormalizedValue, precision = 2): string {
  const formatted = Number.isInteger(normalized.value)
    ? normalized.value.toLocaleString()
    : normalized.value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision,
      });

  return normalized.unit ? `${formatted} ${normalized.unit}` : formatted;
}

/**
 * Formats a value with its original unit for display
 */
export function formatOriginalValue(normalized: NormalizedValue, precision = 2): string {
  const formatted = Number.isInteger(normalized.originalValue)
    ? normalized.originalValue.toLocaleString()
    : normalized.originalValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: precision,
      });

  return normalized.originalUnit ? `${formatted} ${normalized.originalUnit}` : formatted;
}

/**
 * Checks if two normalized values can be compared
 * (i.e., they have the same base unit)
 */
export function areComparable(a: NormalizedValue, b: NormalizedValue): boolean {
  return a.unit === b.unit;
}

/**
 * Compares two normalized values
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareValues(a: NormalizedValue, b: NormalizedValue): number {
  if (!areComparable(a, b)) {
    throw new Error(`Cannot compare values with different units: ${a.unit} vs ${b.unit}`);
  }
  return a.value - b.value;
}

/**
 * Parses a unit from a combined value+unit string
 * e.g., "100 kg" -> { value: 100, unit: "kg" }
 */
export function parseValueWithUnit(input: string): { value: number; unit: string } | null {
  const match = input.trim().match(/^([-+]?[\d.,]+)\s*(.*)$/);
  if (!match || match[1] === undefined) return null;

  const value = parseFloat(match[1].replace(',', '.'));
  if (isNaN(value)) return null;

  return {
    value,
    unit: (match[2] ?? '').trim(),
  };
}
