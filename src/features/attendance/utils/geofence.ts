import { calculateDistanceMeters, type Coordinates } from "./distance";

export type GeofenceResult = {
  inside: boolean;
  distanceMeters: number;
};

/**
 * Determines whether a user is within a permitted attendance radius.
 */
export function checkGeofence(
  userCoordinates: Coordinates,
  labCoordinates: Coordinates,
  radiusMeters: number,
): GeofenceResult {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new Error("Geofence radius must be a positive number.");
  }

  const distanceMeters = calculateDistanceMeters(
    userCoordinates,
    labCoordinates,
  );

  return {
    inside: distanceMeters <= radiusMeters,
    distanceMeters,
  };
}
