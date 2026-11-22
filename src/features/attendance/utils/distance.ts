export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Calculates the straight-line distance between two GPS coordinates
 * using the Haversine formula.
 *
 * @returns Distance in meters.
 */
export function calculateDistanceMeters(
  pointA: Coordinates,
  pointB: Coordinates,
): number {
  validateCoordinates(pointA);
  validateCoordinates(pointB);

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const latitudeA = toRadians(pointA.latitude);
  const latitudeB = toRadians(pointB.latitude);

  const deltaLatitude = toRadians(pointB.latitude - pointA.latitude);
  const deltaLongitude = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Ensures coordinates are valid GPS coordinates.
 */
export function validateCoordinates(point: Coordinates): void {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    throw new Error("Coordinates must be valid numbers.");
  }

  if (point.latitude < -90 || point.latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  if (point.longitude < -180 || point.longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }
}
