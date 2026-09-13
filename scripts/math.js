/**
 * Calculate the full angular width of a GURPS cone.
 *
 * @param {number} maximumRangeYards Maximum range in yards.
 * @param {number} maximumWidthYards Maximum width in yards.
 * @returns {number} Full cone angle in degrees.
 */
export function calculateConeAngle(maximumRangeYards, maximumWidthYards) {
  assertPositiveFinite(maximumRangeYards, 'maximumRangeYards');
  assertPositiveFinite(maximumWidthYards, 'maximumWidthYards');

  return (2 * Math.atan(maximumWidthYards / (2 * maximumRangeYards)) * 180) / Math.PI;
}

/**
 * Resolve the maximum width used by the GURPS cone rule.
 * An unspecified width spreads by one yard per yard of range.
 *
 * @param {number} maximumRangeYards Maximum range in yards.
 * @param {number} maximumWidthYards Entered maximum width in yards.
 * @param {boolean} widthUnspecified Whether the one-yard-per-yard rule applies.
 * @returns {number} Effective maximum width in yards.
 */
export function resolveMaximumWidth(maximumRangeYards, maximumWidthYards, widthUnspecified) {
  assertPositiveFinite(maximumRangeYards, 'maximumRangeYards');
  if (widthUnspecified) return maximumRangeYards;

  assertPositiveFinite(maximumWidthYards, 'maximumWidthYards');
  return maximumWidthYards;
}

/**
 * Convert a distance expressed in yards to the distance unit used by the Scene.
 * Unknown units deliberately fall back to a one-to-one conversion.
 *
 * @param {number} yards Distance in yards.
 * @param {string} sceneUnit Scene grid unit label.
 * @returns {{value: number, recognised: boolean, canonicalUnit: string}}
 */
export function yardsToSceneUnits(yards, sceneUnit) {
  assertPositiveFinite(yards, 'yards');

  const unit = normaliseUnit(sceneUnit);
  const conversion = UNIT_CONVERSIONS[unit];
  if (!conversion) {
    return { value: yards, recognised: false, canonicalUnit: unit || 'unit' };
  }

  return {
    value: yards * conversion.factor,
    recognised: true,
    canonicalUnit: conversion.canonicalUnit,
  };
}

function normaliseUnit(unit) {
  return String(unit ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('.', '');
}

function assertPositiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
}

const UNIT_CONVERSIONS = Object.freeze({
  yd: { factor: 1, canonicalUnit: 'yd' },
  yds: { factor: 1, canonicalUnit: 'yd' },
  yard: { factor: 1, canonicalUnit: 'yd' },
  yards: { factor: 1, canonicalUnit: 'yd' },
  ft: { factor: 3, canonicalUnit: 'ft' },
  foot: { factor: 3, canonicalUnit: 'ft' },
  feet: { factor: 3, canonicalUnit: 'ft' },
  in: { factor: 36, canonicalUnit: 'in' },
  inch: { factor: 36, canonicalUnit: 'in' },
  inches: { factor: 36, canonicalUnit: 'in' },
  m: { factor: 0.9144, canonicalUnit: 'm' },
  metre: { factor: 0.9144, canonicalUnit: 'm' },
  metres: { factor: 0.9144, canonicalUnit: 'm' },
  meter: { factor: 0.9144, canonicalUnit: 'm' },
  meters: { factor: 0.9144, canonicalUnit: 'm' },
  cm: { factor: 91.44, canonicalUnit: 'cm' },
  centimetre: { factor: 91.44, canonicalUnit: 'cm' },
  centimetres: { factor: 91.44, canonicalUnit: 'cm' },
  centimeter: { factor: 91.44, canonicalUnit: 'cm' },
  centimeters: { factor: 91.44, canonicalUnit: 'cm' },
  km: { factor: 0.0009144, canonicalUnit: 'km' },
  kilometre: { factor: 0.0009144, canonicalUnit: 'km' },
  kilometres: { factor: 0.0009144, canonicalUnit: 'km' },
  kilometer: { factor: 0.0009144, canonicalUnit: 'km' },
  kilometers: { factor: 0.0009144, canonicalUnit: 'km' },
  mi: { factor: 1 / 1760, canonicalUnit: 'mi' },
  mile: { factor: 1 / 1760, canonicalUnit: 'mi' },
  miles: { factor: 1 / 1760, canonicalUnit: 'mi' },
});
