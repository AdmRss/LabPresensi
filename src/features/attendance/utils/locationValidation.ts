import type { LocationSample } from "../services/locationService";
import { validateCoordinates } from "./distance";

export type LocationValidationOptions = {
  maxAccuracyMeters: number;
  maxAgeMs: number;
};

export type LocationValidationResult = {
  valid: boolean;
  reason?: string;
};

/**
 * Checks whether a GPS sample is suitable for further validation.
 * This does not check laboratory distance or attendance eligibility.
 */
export function validateLocationSample(
  sample: LocationSample,
  options: LocationValidationOptions,
): LocationValidationResult {
  try {
    validateCoordinates({
      latitude: sample.latitude,
      longitude: sample.longitude,
    });
  } catch {
    return {
      valid: false,
      reason: "Invalid GPS coordinates.",
    };
  }

  if (
    sample.accuracyMeters === null ||
    !Number.isFinite(sample.accuracyMeters) ||
    sample.accuracyMeters < 0
  ) {
    return {
      valid: false,
      reason: "GPS accuracy is unavailable.",
    };
  }

  if (
    !Number.isFinite(options.maxAccuracyMeters) ||
    options.maxAccuracyMeters <= 0
  ) {
    return {
      valid: false,
      reason: "Invalid accuracy validation setting.",
    };
  }

  if (sample.accuracyMeters > options.maxAccuracyMeters) {
    return {
      valid: false,
      reason: "GPS accuracy is too poor.",
    };
  }

  if (
    !Number.isFinite(sample.timestamp) ||
    !Number.isFinite(options.maxAgeMs) ||
    options.maxAgeMs <= 0
  ) {
    return {
      valid: false,
      reason: "Invalid location timestamp or freshness setting.",
    };
  }

  const ageMs = Date.now() - sample.timestamp;

  if (ageMs < 0 || ageMs > options.maxAgeMs) {
    return {
      valid: false,
      reason: "GPS location is outdated.",
    };
  }

  return {
    valid: true,
  };
}
